import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    // 1. Auto-release any seats whose time has expired
    await prisma.desk.updateMany({
      where: {
        status: "occupied",
        expiresAt: { lt: now },
      },
      data: {
        status: "available",
        studentId: null,
        studentName: null,
        checkedInAt: null,
        expiresAt: null,
      },
    });

    // 2. Fetch all desks from PostgreSQL
    const rawDesks = await prisma.desk.findMany({
      orderBy: [{ floor: "asc" }, { seatNumber: "asc" }],
    });

    // 3. Fetch library config
    let config = await prisma.libraryConfig.findFirst();
    if (!config) {
      config = await prisma.libraryConfig.create({
        data: {
          name: "Central University Library",
          closeTime: "22:00",
          announcement: "Please keep quiet on Floor 2.",
        },
      });
    }

    // Format desks for frontend compatibility
    const desks = rawDesks.map((d) => ({
      ...d,
      occupiedBy:
        d.status === "occupied" && d.studentId
          ? {
              studentId: d.studentId,
              studentName: d.studentName || `Student ${d.studentId}`,
              checkedInAt: d.checkedInAt?.toISOString() || "",
              expiresAt: d.expiresAt?.toISOString() || "",
            }
          : undefined,
    }));

    const totalSeats = desks.length;
    const occupiedSeats = desks.filter((d) => d.status === "occupied").length;
    const availableSeats = totalSeats - occupiedSeats;

    // Floor-level summaries
    const floorsMap = new Map<
      number,
      { floor: number; name: string; total: number; available: number; occupied: number }
    >();

    desks.forEach((d) => {
      if (!floorsMap.has(d.floor)) {
        floorsMap.set(d.floor, {
          floor: d.floor,
          name: d.floorName,
          total: 0,
          available: 0,
          occupied: 0,
        });
      }
      const f = floorsMap.get(d.floor)!;
      f.total++;
      if (d.status === "occupied") {
        f.occupied++;
      } else {
        f.available++;
      }
    });

    const floors = Array.from(floorsMap.values()).sort((a, b) => a.floor - b.floor);

    return NextResponse.json({
      success: true,
      stats: {
        totalSeats,
        availableSeats,
        occupiedSeats,
        occupancyPercentage: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
      },
      floors,
      desks,
      config,
    });
  } catch (error) {
    console.error("Database fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Database error", error: String(error) },
      { status: 500 }
    );
  }
}
