import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getManagerDashboardCenters } from "@/app/services/manager/dashboard.service";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Manager role required" }, { status: 403 });
    }
    
    const centersData = await getManagerDashboardCenters(session.roleId);
    return NextResponse.json(centersData);
  } catch (error) {
    console.error("Manager dashboard centers API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}