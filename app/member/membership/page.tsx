import { getMembershipProducts } from "./actions";
import { styleClassName } from "@/app/lib/constants";
import { formatNumberWithCommas } from "@/app/lib/utils";
import Link from "next/link";

const ProductCard = ({
  membership,
}: {
  membership: {
    id: string;
    title: string;
    price: number;
    description: string;
    totalCount: number;
  };
}) => {
  return (
    <div
      key={membership.id}
      className={`${styleClassName.cardbox} p-2 flex flex-col gap-2 shadow-md`}
    >
      <div className="flex justify-between">
        <div className="TITLE text-lg font-bold">
          <span>{membership.title}</span>
        </div>
      </div>
      <div className="PRICE COUNT flex justify-start gap-4">
        <div className="PRICE flex gap-1">
          <span className="font-bold">가격 </span>
          <span>{formatNumberWithCommas(membership.price)}</span>
          <span>원</span>
        </div>
        <div className="COUNT flex gap-1">
          <span className="font-bold">횟수 </span>
          <span>{membership.totalCount}</span>
          <span>회</span>
        </div>
      </div>

      <div className="DESCRIPTION flex flex-col">
        <span className="font-bold">상세설명</span>
        <p className="whitespace-pre-wrap">{membership.description}</p>
      </div>

      <Link
        href={`/member/membership/enroll?id=${membership.id}`}
        className="EDIT flex justify-center items-center"
      >
        <button className="btn bg-slate-600 text-white">구매</button>
      </Link>
    </div>
  );
};

const Membership = async () => {
  const membershipProducts = await getMembershipProducts();

  return (
    <div className="w-full flex flex-col">
      <div className="flex justify-center items-center">
        <span>현재 판매중인 회원권 상품</span>
      </div>
      <div className="flex flex-col">
        {membershipProducts.map((membership) => (
          <ProductCard key={membership.id} membership={membership} />
        ))}
      </div>
    </div>
  );
};

export default Membership;
