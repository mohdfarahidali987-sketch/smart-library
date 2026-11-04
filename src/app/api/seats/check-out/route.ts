import { NextRequest, NextResponse } from "next/server";
import { checkOut } from "@/lib/data";

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

    const result = checkOut(deskId, studentId);
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
