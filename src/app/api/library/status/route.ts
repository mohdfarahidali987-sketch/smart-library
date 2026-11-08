import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGuardAnnouncement } from "@/lib/socket";

export async function GET() {
  try {
    let config = await prisma.libraryConfig.findFirst();
    if (!config) {
      config = await prisma.libraryConfig.create({
        data: {
          name: "NIT Srinagar Library",
          closeTime: "22:00",
          announcement: "Please keep quiet on Floor 2.",
        },
      });
    }

    const now = new Date();
    const [closeHours, closeMinutes] = config.closeTime.split(":").map(Number);
    const closingDate = new Date();
    closingDate.setHours(closeHours, closeMinutes, 0, 0);

    const diffMs = closingDate.getTime() - now.getTime();
    const minutesUntilClose = Math.round(diffMs / 60000);

    let status: "open" | "closing_soon" | "closed" = "open";
    let alertLevel: "none" | "warning_30" | "warning_15" | "final" = "none";

    if (minutesUntilClose <= 0) {
      status = "closed";
      alertLevel = "final";
    } else if (minutesUntilClose <= 15) {
      status = "closing_soon";
      alertLevel = "warning_15";
    } else if (minutesUntilClose <= 30) {
      status = "closing_soon";
      alertLevel = "warning_30";
    }

    return NextResponse.json({
      success: true,
      config,
      currentTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      minutesUntilClose,
      status,
      alertLevel,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch library status", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = await prisma.libraryConfig.findFirst();

    const updated = await prisma.libraryConfig.upsert({
      where: { id: config?.id || 1 },
      update: body,
      create: {
        id: 1,
        name: body.name || "NIT Srinagar Library",
        closeTime: body.closeTime || "22:00",
        announcement: body.announcement || "",
      },
    });

    // ⚡ Emit real-time WebSocket alert for instant chime & broadcast on all phones
    emitGuardAnnouncement({
      announcement: updated.announcement,
      closeTime: updated.closeTime,
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Invalid payload", error: String(error) },
      { status: 400 }
    );
  }
}
