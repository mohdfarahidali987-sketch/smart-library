import { NextRequest, NextResponse } from "next/server";
import { getLibraryState } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { desks } = getLibraryState();
  const desk = desks.find((d) => d.id.toLowerCase() === id.toLowerCase());

  if (!desk) {
    return NextResponse.json(
      { success: false, message: `Desk ${id} not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    desk,
  });
}
