import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getFreeExercises, createFreeExercise } from "@/app/lib/services/free-exercise.service";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const freeExercises = await getFreeExercises();

    return NextResponse.json(freeExercises);
  } catch (error) {
    console.error("GET /api/trainer/free-exercises error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "운동명을 입력해주세요." },
        { status: 400 }
      );
    }

    // 중복 체크
    const existingExercise = await prisma.freeExercise.findFirst({
      where: {
        title: {
          equals: title.trim(),
          mode: "insensitive",
        },
      },
    });

    if (existingExercise) {
      return NextResponse.json(
        { error: "이미 존재하는 운동명입니다." },
        { status: 409 }
      );
    }

    const freeExercise = await createFreeExercise({
      title: title.trim(),
      description: description?.trim(),
    });

    return NextResponse.json(freeExercise);
  } catch (error) {
    console.error("POST /api/trainer/free-exercises error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}