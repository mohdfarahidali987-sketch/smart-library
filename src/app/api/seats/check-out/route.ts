import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deskId, studentId } = body;

    if (!deskId) {
      return NextResponse.json(
        { success: false, message: "Missing deskId" },
        { status: 400 }
      );
    }

    const cleanDeskId = deskId.trim().toUpperCase();
    const desk = await prisma.desk.findUnique({
      where: { id: cleanDeskId },
    });

    if (!desk) {
      return NextResponse.json(
        { success: false, message: `Desk ${cleanDeskId} not found.` },
        { status: 404 }
      );
    }

    if (desk.status === "available") {
      return NextResponse.json({
        success: true,
        message: `Desk ${cleanDeskId} is already available.`,
        desk,
      });
    }

    if (studentId && desk.studentId && desk.studentId !== studentId.trim()) {
      return NextResponse.json(
        { success: false, message: "You cannot check out someone else's desk." },
        { status: 403 }
      );
    }

    const updated = await prisma.desk.update({
      where: { id: cleanDeskId },
      data: {
        status: "available",
        studentId: null,
        studentName: null,
        checkedInAt: null,
        expiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Checked out of ${cleanDeskId}. Desk is now free.`,
      desk: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Checkout failed", error: String(error) },
      { status: 500 }
    );
  }
}
