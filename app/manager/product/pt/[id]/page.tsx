import Link from "next/link";
import { notFound } from "next/navigation";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { getPtProductDetailService } from "./actions";

interface PtProductDetailPageProps {
  params: {
    id: string;
  };
}

const PtProductDetailPage = async ({ params }: PtProductDetailPageProps) => {
  const product = await getPtProductDetailService(params.id);

  if (!product) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = new Date(product.closedAt) < new Date();
  const isUnlimited =
    new Date(product.closedAt).getTime() > new Date("2099-01-01").getTime();

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title={product.title}
        subtitle="PT 상품 상세 정보"
        action={
          <Link href={`/manager/product/pt/${product.id}/edit`}>
            <Button variant="primary">수정</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">가격</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {product.price.toLocaleString()}원
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    총 수업 횟수
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {product.totalCount}회
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    수업 시간
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {product.time}시간
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    판매 상태
                  </dt>
                  <dd>
                    <Badge variant={product.onSale ? "success" : "default"}>
                      {product.onSale ? "판매중" : "판매중단"}
                    </Badge>
                  </dd>
                </div>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 mb-2">
                  상품 설명
                </dt>
                <dd className="text-gray-900 whitespace-pre-wrap">
                  {product.description || "설명이 없습니다."}
                </dd>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    판매 시작일
                  </dt>
                  <dd className="text-gray-900">
                    {formatDate(product.openedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    판매 종료일
                  </dt>
                  <dd className="text-gray-900">
                    {isUnlimited ? "무제한" : formatDate(product.closedAt)}
                    {isExpired && !isUnlimited && (
                      <span className="ml-2 text-xs text-red-600">
                        (만료됨)
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 담당 트레이너 */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                담당 트레이너 ({product.trainers.length}명)
              </h3>
            </CardHeader>
            <CardContent>
              {product.trainers.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">등록된 트레이너가 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.trainers.map((trainer) => (
                    <div
                      key={trainer.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {trainer.username[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {trainer.username}
                          </div>
                          <div className="text-sm text-gray-600">
                            {trainer.introduce}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 통계 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">통계</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  총 PT 신청
                </dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {product.stats.totalPt}개
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  승인 대기중
                </dt>
                <dd className="text-2xl font-bold text-orange-600">
                  {product.stats.pendingPt}개
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">진행중</dt>
                <dd className="text-2xl font-bold text-green-600">
                  {product.stats.confirmedPt}개
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">완료</dt>
                <dd className="text-2xl font-bold text-blue-600">
                  {product.stats.completedPt}개
                </dd>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">수익 정보</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">총 매출</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {(product.stats.confirmedPt * product.price).toLocaleString()}
                  원
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">예상 매출</dt>
                <dd className="text-lg font-semibold text-gray-600">
                  {(product.stats.pendingPt * product.price).toLocaleString()}원
                </dd>
                <p className="text-xs text-gray-500 mt-1">(승인 대기중 기준)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default PtProductDetailPage;
