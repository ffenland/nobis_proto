import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getCenterEquipments,
  createEquipment,
  type CreateEquipmentInput,
} from "@/app/services/fitness-center/equipment.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const params = await segmentData.params;
    const { id: centerId } = params;

    const equipments = await getCenterEquipments(centerId);
    return NextResponse.json(equipments);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_CENTER_EQUIPMENT_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getCenterEquipments",
      },
      tags: ["api", "equipment", "fitness-center"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id: centerId } = params;

    const body: CreateEquipmentInput = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const createdEquipment = await createEquipment(centerId, body);

    return NextResponse.json(createdEquipment, { status: 201 });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_CENTER_EQUIPMENT_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "createEquipment",
      },
      tags: ["api", "equipment", "fitness-center", "create"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
