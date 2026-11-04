import { NextResponse } from "next/server";
import { getLibraryState } from "@/lib/data";

export async function GET() {
  const { desks, config } = getLibraryState();

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
      occupancyPercentage: Math.round((occupiedSeats / totalSeats) * 100),
    },
    floors,
    desks,
    config,
  });
}
