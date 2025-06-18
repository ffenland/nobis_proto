import { redirect } from "next/navigation";
import { getPtProduct } from "./edit/actions";
import Link from "next/link";

function formatPrice(price: number) {
  return price.toLocaleString("ko-KR") + "원";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ko-KR");
}

type Params = Promise<{ id: string }>;

const PtProductDetail = async (props: { params: Params }) => {
  const params = await props.params;
  const id = params.id;
  if (!id) {
    redirect("/manager/product/pt");
  }
  const ptProduct = await getPtProduct(id);
  if (!ptProduct) {
    redirect("/manager/product/pt");
  }
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex w-full justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">{ptProduct.title}</h1>
        <div className="flex gap-2">
          <Link href="/manager/product/pt">
            <button className="btn btn-sm">목록으로</button>
          </Link>
          <Link href={`/manager/product/pt/${ptProduct.id}/edit`}>
            <button className="btn btn-primary btn-sm">수정하기</button>
          </Link>
        </div>
      </div>
      <div className="card bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-gray-500 text-sm mb-1">가격</div>
            <div className="font-semibold text-lg">
              {formatPrice(ptProduct.price)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-1">총 횟수</div>
            <div className="font-semibold text-lg">
              {ptProduct.totalCount}회
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-1">판매 상태</div>
            <div
              className={
                ptProduct.onSale
                  ? "text-green-600 font-semibold"
                  : "text-red-500 font-semibold"
              }
            >
              {ptProduct.onSale ? "판매중" : "비활성화"}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-1">판매 시작일</div>
            <div>{formatDate(String(ptProduct.openedAt))}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm mb-1">판매 종료일</div>
            <div>{formatDate(String(ptProduct.closedAt))}</div>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-gray-500 text-sm mb-1">설명</div>
          <div className="whitespace-pre-line text-base">
            {ptProduct.description}
          </div>
        </div>
        <div className="mb-2">
          <div className="text-gray-500 text-sm mb-1">PT 1회 소요 시간</div>
          <div>{ptProduct.time}분</div>
        </div>
        <div className="mt-6">
          <h2 className="mb-2 text-xl font-semibold">담당 트레이너</h2>
          <ul className="flex flex-wrap gap-3">
            {ptProduct.trainers.map((trainer) => (
              <li
                key={trainer.trainerId}
                className="flex w-full items-center gap-2 bg-base-200 rounded px-3 py-2"
              >
                {/* 아바타(이니셜) */}
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                  {trainer.username?.[0] || "?"}
                </div>
                <span className="font-medium">{trainer.username}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PtProductDetail;
