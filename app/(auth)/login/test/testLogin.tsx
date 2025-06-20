import { UserRole } from "@prisma/client";
import {
  createDummyData,
  createDummyMachine,
  createDummyStretchingExercises,
  createDummyWeights,
  createRandomUser,
  getUserList,
  submitLogin,
} from "./actions";

export const TestLogin = async () => {
  const userList = await getUserList();

  return (
    <div className="flex w-full flex-col">
      <form action={createDummyData}>
        <button className="btn" type="submit">
          더미 데이터 생성
        </button>
      </form>
      <form action={createDummyMachine}>
        <button className="btn" type="submit">
          더미 머신 생성
        </button>
      </form>
      <form action={createDummyWeights}>
        <button className="btn" type="submit">
          더미 도구 생성
        </button>
      </form>
      <form action={createDummyStretchingExercises}>
        <button className="btn" type="submit">
          스트레칭 운동 생성
        </button>
      </form>
      <div>
        <span>클릭하면 해당 유저로 로그인됩니다.</span>
      </div>
      <div className="flex w-full flex-col gap-2">
        <span>TEST 회원계정 목록</span>
        {userList.memberList.map((user) => (
          <form
            key={user.id}
            className="flex items-center justify-between gap-2 rounded-lg border"
            action={submitLogin}
          >
            <div className="flex flex-col">
              <div className="flex gap-1">
                <span>이름 :</span>
                <span>{user.user.username}</span>
              </div>
              <input type="text" name="id" value={user.id} hidden readOnly />
              <input
                type="text"
                name="userId"
                value={user.user.id}
                hidden
                readOnly
              />
              <input
                type="text"
                name="role"
                value={UserRole.MEMBER}
                hidden
                readOnly
              />
            </div>
            <button className="btn" type="submit">
              로그인
            </button>
          </form>
        ))}
      </div>
      <div className="flex w-full flex-col gap-2">
        <span>TEST 트레이너계정 목록</span>
        {userList.trainerList.map((user) => (
          <form
            key={user.id}
            className="flex items-center justify-between gap-2 rounded-lg border"
            action={submitLogin}
          >
            <div className="flex flex-col">
              <div className="flex gap-1">
                <span>이름 :</span>
                <span>{user.user.username}</span>
              </div>
              <input type="text" name="id" value={user.id} hidden readOnly />
              <input
                type="text"
                name="userId"
                value={user.user.id}
                hidden
                readOnly
              />
              <input
                type="text"
                name="role"
                value={UserRole.TRAINER}
                hidden
                readOnly
              />
            </div>
            <button className="btn" type="submit">
              로그인
            </button>
          </form>
        ))}
      </div>
      <div className="flex w-full flex-col gap-2">
        <span>TEST 관리자 목록</span>
        {userList.managerList.map((user) => (
          <form
            key={user.id}
            className="flex items-center justify-between gap-2 rounded-lg border"
            action={submitLogin}
          >
            <div className="flex flex-col">
              <div className="flex gap-1">
                <span>이름 :</span>
                <span>{user.user.username}</span>
              </div>
              <input type="text" name="id" value={user.id} hidden readOnly />
              <input
                type="text"
                name="userId"
                value={user.user.id}
                hidden
                readOnly
              />
              <input
                type="text"
                name="role"
                value={UserRole.MANAGER}
                hidden
                readOnly
              />
            </div>
            <button className="btn" type="submit">
              로그인
            </button>
          </form>
        ))}
      </div>
      <div className="max-w-md rounded-2xl bg-slate-300 p-2">
        <form action={createRandomUser}>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">매니저</span>
              <input
                type="radio"
                name="role"
                className="radio checked:bg-red-500"
                value={UserRole.MANAGER}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">회원</span>
              <input
                type="radio"
                name="role"
                className="radio checked:bg-blue-500"
                defaultChecked
                value={UserRole.MEMBER}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">트레이너</span>
              <input
                type="radio"
                name="role"
                className="radio checked:bg-green-500"
                value={UserRole.TRAINER}
              />
            </label>
          </div>
          <button className="btn btn-primary">랜덤 유저 만들기</button>
        </form>
      </div>
    </div>
  );
};

export default TestLogin;
