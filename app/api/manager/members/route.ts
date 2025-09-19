import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getAllMembers } from "@/app/services/manager/manager-member.service";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await getAllMembers();

    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to get members:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
