import MemberTabBar from "../components/member/member_tabbar";

const TabLayout = ({ children }: { children: React.ReactNode }) => {
  // Member 화면 - 모바일 우선, 반응형 광고 레이아웃
  return (
    <div className="flex h-full w-full bg-gray-100">
      {/* 좌측 광고 영역 - 태블릿 이상에서 표시 */}
      <div className="hidden md:flex md:flex-1 xl:flex-1 p-4">
        <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
          <img 
            src={`https://picsum.photos/300/600?random=${Math.floor(Math.random() * 1000)}`}
            alt="광고"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 메인 콘텐츠 영역 - 모바일 너비 고정, 반응형 위치 */}
      <div className="flex flex-col w-full md:w-96 xl:w-96 bg-white min-h-screen shadow-lg md:ml-auto xl:mx-0">
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-6">
            {children}
          </div>
        </div>
        
        {/* TabBar */}
        <div className="border-t bg-white">
          <MemberTabBar />
        </div>
      </div>

      {/* 우측 광고 영역 - 데스크탑에서만 표시 */}
      <div className="hidden xl:flex flex-1 p-4">
        <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
          <img 
            src={`https://picsum.photos/300/600?random=${Math.floor(Math.random() * 1000) + 500}`}
            alt="광고"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default TabLayout;
