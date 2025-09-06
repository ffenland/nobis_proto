import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getManagerDashboardSchedule } from "@/app/services/manager/dashboard.service";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Manager role required" }, { status: 403 });
    }
    
    const schedule = await getManagerDashboardSchedule(session.roleId);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Manager dashboard schedule API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}