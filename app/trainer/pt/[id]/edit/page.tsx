"use client";

import { use, useState } from "react";
import PaymentEditCard from "./components/PaymentEditCard";
import PtState from "./components/PtState";
import PtPauseManager from "./components/PtPauseManager";

interface PageProps {
  params: Promise<{ id: string }>;
}

type TabType = "state" | "payment" | "pause";

const PtEditPage = ({ params }: PageProps) => {
  const { id } = use(params);
  const [selectedTab, setSelectedTab] = useState<TabType>("state");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PT 수정</h1>
      </div>

      {/* 탭 선택 UI */}
      <div className="tabs tabs-boxed bg-base-200">
        <button
          className={`tab ${selectedTab === "state" ? "tab-active" : ""}`}
          onClick={() => setSelectedTab("state")}
        >
          PT 상태
        </button>
        <button
          className={`tab ${selectedTab === "payment" ? "tab-active" : ""}`}
          onClick={() => setSelectedTab("payment")}
        >
          결제 정보
        </button>
        <button
          className={`tab ${selectedTab === "pause" ? "tab-active" : ""}`}
          onClick={() => setSelectedTab("pause")}
        >
          일시정지 관리
        </button>
      </div>

      {/* 선택된 탭에 따라 컴포넌트 렌더링 */}
      <div>
        {selectedTab === "state" && <PtState ptId={id} />}
        {selectedTab === "payment" && <PaymentEditCard ptId={id} />}
        {selectedTab === "pause" && <PtPauseManager ptId={id} />}
      </div>
    </div>
  );
};

export default PtEditPage;
