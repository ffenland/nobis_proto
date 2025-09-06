import TrainerTabBar from "@/app/components/trainer/trainerTabBar";

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  // Trainer 화면 - 반응형 디자인 (모바일, 태블릿, 데스크톱)
  return (
    <div className="flex h-full w-full flex-col">
      {/* 메인 콘텐츠 영역 - 반응형 너비 제한 */}
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-7xl mx-auto py-3">{children}</div>
      </div>
      {/* TabBar - 모바일/태블릿에서만 표시 */}
      <div className="lg:hidden">
        <TrainerTabBar />
      </div>
    </div>
  );
};

export default TabLayout;
