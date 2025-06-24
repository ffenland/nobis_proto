import LogoutButton from "../components/base/s_logout_button";
import { UnreadMessageAlert } from "../components/chat/UnreadMessageAlert";

const Manager = async () => {
  return (
    <div className="flex w-full flex-col">
      <div className="w-full flex justify-end">
        <LogoutButton />
      </div>
      <div className="m-5 flex items-center justify-center">
        <span className="text-xl font-bold">관리자페이지</span>
      </div>
      {/* 안읽은 메시지 알림 */}
      <UnreadMessageAlert userRole="MANAGER" />

      <div className="flex w-full flex-col gap-3 *:mx-auto *:flex *:w-2/3 *:items-center *:justify-center *:rounded-md *:bg-slate-300 *:py-4 *:shadow-md">
        <div>
          <span>이번달 신규 PT등록 수</span>
        </div>
        <div>
          <span>이번달 신규 회원 가입 수</span>
        </div>
        <div>
          <span>일주일내로 회원권이 종료되는 회원 : 3명</span>
        </div>
      </div>
    </div>
  );
};

export default Manager;
