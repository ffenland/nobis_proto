import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getAllTrainers } from "@/app/services/mananger/manager-trainer.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const trainers = await getAllTrainers();
    return NextResponse.json(trainers);
  } catch (error) {
    console.error("Failed to get trainers:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}