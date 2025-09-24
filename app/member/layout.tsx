import MemberTabBar from "../components/member/member_tabbar";

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  // Member 화면 - 모바일 우선, 반응형 광고 레이아웃
  return (
    <div className="w-full mx-auto max-w-md  flex flex-col flex-1 overflow-hidden">
      {/* 메인 콘텐츠 영역 - 모바일 너비 고정, 반응형 위치 */}

      <div className="flex-1 overflow-auto flex flex-col">{children}</div>
      {/* TabBar */}
      <div className="border-t bg-white">
        <MemberTabBar />
      </div>
    </div>
  );
};

export default TabLayout;
