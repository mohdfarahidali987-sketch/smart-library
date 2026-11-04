import { NextRequest, NextResponse } from "next/server";
import { getLibraryState, updateConfig } from "@/lib/data";

export async function GET() {
  const { config } = getLibraryState();

  // Calculate time until close
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = updateConfig(body);
    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Invalid payload", error: String(error) },
      { status: 400 }
    );
  }
}
