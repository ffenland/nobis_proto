import Link from "next/link";
import {
  getMembershipProductLookUpList,
  getPtProductLookUpList,
  IPtProductLookUp,
  IMembershipProductLookUp,
} from "./actions";

const PtProductLookup = ({
  ptProductLookupList,
}: {
  ptProductLookupList: IPtProductLookUp[];
}) => {
  return (
    <div className="bg-base-100 rounded-lg shadow">
      <div className="p-4 border-b border-base-300">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">PT 상품</h2>
          <Link
            href="/manager/product/pt/new"
            className="btn btn-primary btn-sm"
          >
            PT 상품 추가
          </Link>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ptProductLookupList.map((ptProduct) => (
            <div
              key={ptProduct.id}
              className="bg-base-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">{ptProduct.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-base-content/70">
                    진행중인 회원
                  </span>
                  <span className="badge badge-primary">
                    {ptProduct._count.pt}
                  </span>
                </div>
                <div className="flex justify-end mt-1">
                  <Link
                    href={`/manager/product/pt/${ptProduct.id}`}
                    className="btn btn-sm btn-ghost"
                  >
                    상세보기
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MembershipProductLookup = ({
  membershipProductLookupList,
}: {
  membershipProductLookupList: IMembershipProductLookUp[];
}) => {
  return (
    <div className="bg-base-100 rounded-lg shadow mt-4">
      <div className="p-4 border-b border-base-300">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">멤버십 상품</h2>
          <Link
            href="/manager/products/membership/upsert"
            className="btn btn-primary btn-sm"
          >
            멤버십 상품 추가
          </Link>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {membershipProductLookupList.map((membershipProduct) => (
            <div
              key={membershipProduct.id}
              className="bg-base-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">
                  {membershipProduct.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-base-content/70">
                    사용중인 회원
                  </span>
                  <span className="badge badge-primary">
                    {membershipProduct._count.membership}
                  </span>
                </div>
                <div className="flex justify-end mt-1">
                  <Link
                    href={`/manager/products/membership/${membershipProduct.id}`}
                    className="btn btn-sm btn-ghost"
                  >
                    상세보기
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProductSummary = async () => {
  const ptProductLookUpList = await getPtProductLookUpList();
  const membershipProductLookupList = await getMembershipProductLookUpList();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">상품 관리</h1>
      </div>

      <PtProductLookup ptProductLookupList={ptProductLookUpList} />
      <MembershipProductLookup
        membershipProductLookupList={membershipProductLookupList}
      />
    </div>
  );
};

export default ProductSummary;
