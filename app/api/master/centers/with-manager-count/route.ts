import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getCentersWithManagerCount } from "@/app/services/master/master-trainer.service";
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
    const centers = await getCentersWithManagerCount();
    return NextResponse.json(centers);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_CENTERS_MANAGER_COUNT",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getCentersWithManagerCount",
      },
      tags: ["api", "master", "centers"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
