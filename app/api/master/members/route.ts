import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getAllMembers } from "@/app/services/master/master-member.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const members = await getAllMembers();

    return NextResponse.json(members);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_MEMBERS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getAllMembers",
      },
      tags: ["api", "master", "members"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
