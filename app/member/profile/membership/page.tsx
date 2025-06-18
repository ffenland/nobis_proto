// "use server" 제거

import { getMyMemberships } from "./actions";

//미사용, 사용중, 사용완료 순으로 보여주자.
const MyMemberships = async () => {
  const myMemberships = await getMyMemberships();
  return (
    <div className="w-full flex flex-col p-2">
      {myMemberships.map((ms) => {
        return (
          <div key={ms.id} className="w-full p-2 flex flex-col">
            <div className="TITLE">
              <span>{ms.membershipProduct.title}</span>
            </div>
            <div className="">
              <span>{}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MyMemberships;
