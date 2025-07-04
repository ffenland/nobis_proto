// app/api/manager/machines/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getMachineDetail,
  updateMachineDetail,
  deleteMachine,
  type MachineUpdateData,
} from "@/app/lib/services/machine.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - 머신 상세 정보 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const machine = await getMachineDetail(id);

    return NextResponse.json(machine);
  } catch (error) {
    console.error("Machine detail fetch error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "머신 정보를 가져올 수 없습니다.",
      },
      {
        status:
          error instanceof Error && error.message.includes("권한") ? 403 : 500,
      }
    );
  }
}

// PUT - 머신 정보 업데이트
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const updateData: MachineUpdateData = await request.json();

    const updatedMachine = await updateMachineDetail(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  } catch (error) {
    console.error("Machine update error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "머신 업데이트에 실패했습니다.",
      },
      {
        status:
          error instanceof Error && error.message.includes("권한") ? 403 : 500,
      }
    );
  }
}

// DELETE - 머신 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deleteMachine(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Machine delete error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "머신 삭제에 실패했습니다.",
      },
      {
        status:
          error instanceof Error && error.message.includes("권한") ? 403 : 500,
      }
    );
  }
}
