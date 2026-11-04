import { NextRequest, NextResponse } from "next/server";
import { checkIn } from "@/lib/data";

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

    const duration = parseInt(durationMinutes, 10) || 120;
    const result = checkIn(deskId, studentId.trim(), studentName?.trim() || "", duration);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Invalid request payload", error: String(error) },
      { status: 400 }
    );
  }
}
