import TrainerTabBar from "@/app/components/trainer/trainerTabBar";

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  // Member 화면은 모바일 View를 기준으로 디자인
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">
      <div className="flex-1 overflow-auto">{children}</div>
      <TrainerTabBar />
    </div>
  );
};

export default TabLayout;
