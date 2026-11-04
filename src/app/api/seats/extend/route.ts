import { NextRequest, NextResponse } from "next/server";
import { extendTime } from "@/lib/data";

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

    const minutes = parseInt(extraMinutes, 10) || 60;
    const result = extendTime(deskId, minutes);

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
