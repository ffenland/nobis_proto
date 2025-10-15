import ManagerTabbar from "../components/manager/manager_tabbar";

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  // Manager 화면 - 주로 태블릿/데스크톱 사용
  return (
    <div className="flex flex-1 w-full flex-col overflow-hidden">
      {/* 메인 콘텐츠 영역 - 반응형 너비 제한 */}
      <div className="flex-1 overflow-hidden w-full mx-auto p-3">
        <div className="h-full w-full overflow-auto">{children}</div>
      </div>
      {/* TabBar - 태블릿 이하에서 표시 (Manager는 주로 데스크톱 사용) */}
      <div>
        <ManagerTabbar />
      </div>
    </div>
  );
};

export default TabLayout;
