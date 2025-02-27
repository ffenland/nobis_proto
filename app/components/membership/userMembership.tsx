const UserMembership = ({}) => {
  const title = "100일권";
  const activeState = "12일 남음, 8월 3일까지 사용가능";
  const description = "설명설명";

  return (
    <div className="w-full flex flex-col">
      <div className="HEAD flex items-center justify-between">
        <span className="TITLE font-bold text-lg">{title}</span>
        <span className="ISACTIVE">사용중</span>
      </div>
      <div className="REMAIN">
        <span>{activeState}</span>
      </div>
      <div className="DESC">
        <p>{description}</p>
      </div>
    </div>
  );
};

export default UserMembership;
