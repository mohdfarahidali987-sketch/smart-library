import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Neon PostgreSQL database with library desks...");

  const floors = [
    { floor: 1, name: "Ground Floor - General Reading", count: 12 },
    { floor: 2, name: "1st Floor - Silent Study Zone", count: 16 },
    { floor: 3, name: "2nd Floor - Discussion & Tech Commons", count: 12 },
  ];

  for (const f of floors) {
    for (let i = 1; i <= f.count; i++) {
      const id = `F${f.floor}-${i.toString().padStart(2, "0")}`;
      const hasSocket = i % 2 === 1 || i % 3 === 0;
      const nearWindow = i <= 4 || i >= f.count - 3;

      let status = "available";
      let studentId = null;
      let studentName = null;
      let checkedInAt = null;
      let expiresAt = null;

      // Seed a few occupied seats for realistic demo
      if ((f.floor === 1 && (i === 2 || i === 5)) || (f.floor === 2 && (i === 1 || i === 7))) {
        status = "occupied";
        studentId = `STU-2024${f.floor}${i}`;
        studentName = `Student ${f.floor}0${i}`;
        const now = new Date();
        checkedInAt = new Date(now.getTime() - 40 * 60000);
        expiresAt = new Date(now.getTime() + 80 * 60000);
      }

      await prisma.desk.upsert({
        where: { id },
        update: {},
        create: {
          id,
          floor: f.floor,
          floorName: f.name,
          seatNumber: i,
          hasSocket,
          nearWindow,
          status,
          studentId,
          studentName,
          checkedInAt,
          expiresAt,
        },
      });
    }
  }

  await prisma.libraryConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Central University Library",
      openTime: "08:00",
      closeTime: "22:00",
      isOpen: true,
      announcement: "Please keep quiet on Floor 2 (Silent Study Zone). All readers exit by 10:00 PM.",
    },
  });

  console.log("✅ Successfully seeded 40 desks and library config into Neon PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
