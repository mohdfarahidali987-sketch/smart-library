import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deskId, extraMinutes } = body;

    if (!deskId) {
      return NextResponse.json(
        { success: false, message: "Missing deskId" },
        { status: 400 }
      );
    }

    const cleanDeskId = deskId.trim().toUpperCase();
    const minutes = parseInt(extraMinutes, 10) || 60;

    const desk = await prisma.desk.findUnique({
      where: { id: cleanDeskId },
    });

    if (!desk || desk.status !== "occupied" || !desk.expiresAt) {
      return NextResponse.json(
        { success: false, message: "Desk is not currently occupied." },
        { status: 400 }
      );
    }

    const currentExpiry = new Date(desk.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + minutes * 60000);

    const updated = await prisma.desk.update({
      where: { id: cleanDeskId },
      data: { expiresAt: newExpiry },
    });

    return NextResponse.json({
      success: true,
      message: `Extended by ${minutes} minutes.`,
      desk: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Extend failed", error: String(error) },
      { status: 500 }
    );
  }
}
