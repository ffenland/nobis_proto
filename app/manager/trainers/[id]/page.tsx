"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Params = Promise<{ id: string }>;

import React from "react";
import {
  getTrainerDetailForManager,
  ITrainerDetailForManager,
} from "./actions";
import { PageTitle } from "@/app/components/base/page_text";

const ManageTrainerDetail = (props: { params: Params }) => {
  const params = use(props.params);
  const id = params.id;
  const router = useRouter();
  const [trainer, setTrainer] = useState<ITrainerDetailForManager>();

  useEffect(() => {
    if (!id) {
      router.push("/manager/trainers");
    }
    const getTrainerDetail = async (id: string) => {
      const trainer = await getTrainerDetailForManager(id);
      if (trainer) {
        setTrainer(trainer);
      }
    };
    getTrainerDetail(id);
  }, [id, router]);

  return (
    <div className="flex w-full flex-col max-w-sm mx-auto">
      <PageTitle text="트레이너 상세 정보" />
      <div className="flex flex-col border rounded-md shadow-md">
        <div className="flex flex-col p-4">
          <div className="flex gap-2">
            <span>이름</span>
            <span>{trainer?.user.username}</span>
          </div>
          <div className="flex gap-2">
            <span>소속</span>
            <span>{trainer?.fitnessCenter?.title ?? "무소속"}</span>
          </div>
          <div className="flex gap-2">
            <span>PT 쿠폰</span>
            <span>{trainer?.ptCoupon.length}개 남음</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTrainerDetail;
