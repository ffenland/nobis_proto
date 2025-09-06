import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getManagerDashboardPT } from "@/app/services/manager/dashboard.service";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Manager role required" }, { status: 403 });
    }
    
    const ptData = await getManagerDashboardPT(session.roleId);
    return NextResponse.json(ptData);
  } catch (error) {
    console.error("Manager dashboard PT API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}