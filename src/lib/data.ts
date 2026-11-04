export interface Desk {
  id: string; // e.g. "F1-01"
  floor: number;
  floorName: string;
  seatNumber: number;
  hasSocket: boolean;
  nearWindow: boolean;
  status: "available" | "occupied" | "reserved";
  occupiedBy?: {
    studentId: string;
    studentName: string;
    checkedInAt: string; // ISO string
    expiresAt: string; // ISO string
  };
}

export interface LibraryConfig {
  name: string;
  openTime: string; // "08:00"
  closeTime: string; // "22:00" (10 PM)
  isOpen: boolean;
  announcement: string;
}

// In-memory persistent state (persists across API requests in Node runtime)
declare global {
  // eslint-disable-next-line no-var
  var __smartLibraryDesks: Desk[] | undefined;
  // eslint-disable-next-line no-var
  var __smartLibraryConfig: LibraryConfig | undefined;
}

const initialConfig: LibraryConfig = {
  name: "NIT Srinagar",
  openTime: "09:00",
  closeTime: "11:45",
  isOpen: true,
  announcement: "Please keep quiet on Floor 2 (Silent Study Zone). All readers must exit by 11:45 PM.",
};

function generateInitialDesks(): Desk[] {
  const desks: Desk[] = [];

  const floors = [
    { floor: 1, name: "Ground Floor - General Reading", count: 12 },
    { floor: 2, name: "1st Floor - Silent Study Zone", count: 16 },
    { floor: 3, name: "2nd Floor - Discussion & Tech Commons", count: 12 },
  ];

  floors.forEach((f) => {
    for (let i = 1; i <= f.count; i++) {
      const seatNumber = i;
      const id = `F${f.floor}-${seatNumber.toString().padStart(2, "0")}`;
      const hasSocket = i % 2 === 1 || i % 3 === 0;
      const nearWindow = i <= 4 || i >= f.count - 3;

      // Seed a few occupied seats initially for realistic demo
      let status: Desk["status"] = "available";
      let occupiedBy: Desk["occupiedBy"] = undefined;

      if ((f.floor === 1 && (i === 2 || i === 5 || i === 8)) ||
          (f.floor === 2 && (i === 1 || i === 3 || i === 7 || i === 12))) {
        status = "occupied";
        const now = new Date();
        const checkIn = new Date(now.getTime() - (30 + i * 5) * 60000);
        const expires = new Date(now.getTime() + (60 - i * 3) * 60000);

        occupiedBy = {
          studentId: `STU-2024${f.floor}${i}`,
          studentName: `Student ${f.floor}0${i}`,
          checkedInAt: checkIn.toISOString(),
          expiresAt: expires.toISOString(),
        };
      }

      desks.push({
        id,
        floor: f.floor,
        floorName: f.name,
        seatNumber,
        hasSocket,
        nearWindow,
        status,
        occupiedBy,
      });
    }
  });

  return desks;
}

export function getLibraryState(): { desks: Desk[]; config: LibraryConfig } {
  if (!global.__smartLibraryDesks) {
    global.__smartLibraryDesks = generateInitialDesks();
  }
  if (!global.__smartLibraryConfig) {
    global.__smartLibraryConfig = initialConfig;
  }

  // Auto-expire occupied desks whose expiry time has passed
  const now = new Date();
  global.__smartLibraryDesks.forEach((desk) => {
    if (desk.status === "occupied" && desk.occupiedBy) {
      const expiresAt = new Date(desk.occupiedBy.expiresAt);
      if (now > expiresAt) {
        desk.status = "available";
        desk.occupiedBy = undefined;
      }
    }
  });

  return {
    desks: global.__smartLibraryDesks,
    config: global.__smartLibraryConfig,
  };
}

export function checkIn(
  deskId: string,
  studentId: string,
  studentName: string,
  durationMinutes: number = 120
): { success: boolean; message: string; desk?: Desk } {
  const { desks } = getLibraryState();
  const desk = desks.find((d) => d.id === deskId);

  if (!desk) {
    return { success: false, message: `Desk ${deskId} not found.` };
  }

  if (desk.status === "occupied") {
    // If it's already occupied by this exact student, extend or inform
    if (desk.occupiedBy?.studentId === studentId) {
      return { success: true, message: `Already checked into ${deskId}.`, desk };
    }
    return { success: false, message: `Desk ${deskId} is currently occupied by someone else.` };
  }

  // Check if student is already checked in to another desk
  const existingDesk = desks.find(
    (d) => d.status === "occupied" && d.occupiedBy?.studentId === studentId
  );
  if (existingDesk && existingDesk.id !== deskId) {
    // Auto check out of previous desk
    existingDesk.status = "available";
    existingDesk.occupiedBy = undefined;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60000);

  desk.status = "occupied";
  desk.occupiedBy = {
    studentId,
    studentName: studentName || `Student ${studentId}`,
    checkedInAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  return { success: true, message: `Successfully checked into ${deskId}!`, desk };
}

export function checkOut(deskId: string, studentId?: string): { success: boolean; message: string; desk?: Desk } {
  const { desks } = getLibraryState();
  const desk = desks.find((d) => d.id === deskId);

  if (!desk) {
    return { success: false, message: `Desk ${deskId} not found.` };
  }

  if (desk.status === "available") {
    return { success: true, message: `Desk ${deskId} is already available.`, desk };
  }

  if (studentId && desk.occupiedBy?.studentId && desk.occupiedBy.studentId !== studentId) {
    return { success: false, message: "You cannot check out someone else's desk." };
  }

  desk.status = "available";
  desk.occupiedBy = undefined;

  return { success: true, message: `Checked out of ${deskId}. Desk is now free.`, desk };
}

export function extendTime(deskId: string, extraMinutes: number = 60): { success: boolean; message: string; desk?: Desk } {
  const { desks } = getLibraryState();
  const desk = desks.find((d) => d.id === deskId);

  if (!desk || desk.status !== "occupied" || !desk.occupiedBy) {
    return { success: false, message: "Desk is not currently occupied." };
  }

  const currentExpiry = new Date(desk.occupiedBy.expiresAt);
  const newExpiry = new Date(currentExpiry.getTime() + extraMinutes * 60000);
  desk.occupiedBy.expiresAt = newExpiry.toISOString();

  return { success: true, message: `Extended by ${extraMinutes} minutes.`, desk };
}

export function updateConfig(newConfig: Partial<LibraryConfig>): LibraryConfig {
  const { config } = getLibraryState();
  Object.assign(config, newConfig);
  return config;
}
