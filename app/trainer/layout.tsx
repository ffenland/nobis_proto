import TrainerTabBar from "@/app/components/trainer/trainerTabBar";

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  // Trainer 화면 - 반응형 디자인 (모바일, 태블릿, 데스크톱)
  return (
    <div className="flex flex-1 w-full flex-col overflow-hidden">
      {/* 메인 콘텐츠 영역 - 반응형 너비 제한 */}
      <div className="flex-1 overflow-auto">{children}</div>
      {/* TabBar */}
      <div className="">
        <TrainerTabBar />
      </div>
    </div>
  );
};

export default TabLayout;
