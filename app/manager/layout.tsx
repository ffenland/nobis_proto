import ManagerTabbar from '../components/manager/manager_tabbar'

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  // Manager 화면 - 주로 태블릿/데스크톱 사용
  return (
    <div className="flex h-full w-full flex-col">
      {/* 메인 콘텐츠 영역 - 반응형 너비 제한 */}
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
          {children}
        </div>
      </div>
      {/* TabBar - 태블릿 이하에서 표시 (Manager는 주로 데스크톱 사용) */}
      <div className="xl:hidden">
        <ManagerTabbar />
      </div>
    </div>
  )
}

export default TabLayout
