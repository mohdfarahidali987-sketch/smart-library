import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitSeatsUpdated } from "@/lib/socket";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deskId, studentId, studentName, durationMinutes } = body;

    if (!deskId || !studentId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: deskId, studentId" },
        { status: 400 }
      );
    }

    const cleanDeskId = deskId.trim().toUpperCase();
    const cleanStudentId = studentId.trim();
    const cleanStudentName = studentName?.trim() || `Student ${cleanStudentId}`;
    const duration = parseInt(durationMinutes, 10) || 120;

    // Check desk current state
    const desk = await prisma.desk.findUnique({
      where: { id: cleanDeskId },
    });

    if (!desk) {
      return NextResponse.json(
        { success: false, message: `Desk ${cleanDeskId} not found.` },
        { status: 404 }
      );
    }

    if (desk.status === "occupied") {
      if (desk.studentId === cleanStudentId) {
        return NextResponse.json({
          success: true,
          message: `Already checked into ${cleanDeskId}.`,
          desk,
        });
      }
      return NextResponse.json(
        { success: false, message: `Desk ${cleanDeskId} is currently occupied by someone else.` },
        { status: 400 }
      );
    }

    // Auto-release any previous seat held by this student (1 seat per student rule)
    await prisma.desk.updateMany({
      where: { studentId: cleanStudentId, id: { not: cleanDeskId } },
      data: {
        status: "available",
        studentId: null,
        studentName: null,
        checkedInAt: null,
        expiresAt: null,
      },
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60000);

    const updated = await prisma.desk.update({
      where: { id: cleanDeskId },
      data: {
        status: "occupied",
        studentId: cleanStudentId,
        studentName: cleanStudentName,
        checkedInAt: now,
        expiresAt,
      },
    });

    // ⚡ Emit real-time WebSocket event to all connected students
    emitSeatsUpdated({
      type: "check-in",
      deskId: cleanDeskId,
      status: "occupied",
      studentName: cleanStudentName,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully checked into ${cleanDeskId}!`,
      desk: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Check-in failed", error: String(error) },
      { status: 500 }
    );
  }
}
