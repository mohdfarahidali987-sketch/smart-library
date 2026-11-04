import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawDesk = await prisma.desk.findUnique({
      where: { id: id.toUpperCase() },
    });

    if (!rawDesk) {
      return NextResponse.json(
        { success: false, message: `Desk ${id} not found.` },
        { status: 404 }
      );
    }

    const desk = {
      ...rawDesk,
      occupiedBy:
        rawDesk.status === "occupied" && rawDesk.studentId
          ? {
              studentId: rawDesk.studentId,
              studentName: rawDesk.studentName || `Student ${rawDesk.studentId}`,
              checkedInAt: rawDesk.checkedInAt?.toISOString() || "",
              expiresAt: rawDesk.expiresAt?.toISOString() || "",
            }
          : undefined,
    };

    return NextResponse.json({ success: true, desk });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Database query failed", error: String(error) },
      { status: 500 }
    );
  }
}
