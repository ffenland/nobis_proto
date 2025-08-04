import Link from "next/link";
import { notFound } from "next/navigation";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { getMembershipProductDetailService } from "./actions";

type Params = Promise<{ id: string }>;

const MembershipProductDetailPage = async (props: { params: Params }) => {
  const params = await props.params;
  const product = await getMembershipProductDetailService(params.id);

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
        subtitle="멤버십 상품 상세 정보"
        action={
          <div className="flex gap-3">
            <Link href={`/manager/product/membership/${product.id}/edit`}>
              <Button variant="primary">수정</Button>
            </Link>
            {/* 목록으로 이동 */}
            <Link href={"/manager/product/"}>
              <Button variant="primary">목록으로</Button>
            </Link>
          </div>
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
                    이용 기간
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {product.totalCount}일
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    일일 가격
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {Math.round(
                      product.price / product.totalCount
                    ).toLocaleString()}
                    원
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

          {/* 최근 가입자 */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                최근 가입자 (최근 10명)
              </h3>
            </CardHeader>
            <CardContent>
              {product.recentMemberships.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">아직 가입자가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {product.recentMemberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {membership.memberName}
                          </div>
                          <div className="text-sm text-gray-600">
                            가입일: {formatDate(membership.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              membership.isActive
                                ? "success"
                                : membership.startedAt
                                ? "default"
                                : "warning"
                            }
                          >
                            {membership.isActive
                              ? "활성"
                              : membership.startedAt
                              ? "만료"
                              : "미시작"}
                          </Badge>
                          {membership.isActive && (
                            <div className="text-xs text-gray-500 mt-1">
                              {membership.remainingDays}일 남음
                            </div>
                          )}
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
                <dt className="text-sm font-medium text-gray-500">총 가입자</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {product.stats.totalMemberships}명
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">활성 회원</dt>
                <dd className="text-2xl font-bold text-green-600">
                  {product.stats.activeMemberships}명
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">만료 회원</dt>
                <dd className="text-2xl font-bold text-gray-600">
                  {product.stats.expiredMemberships}명
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  미시작 회원
                </dt>
                <dd className="text-2xl font-bold text-orange-600">
                  {product.stats.pendingMemberships}명
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
                  {(
                    product.stats.totalMemberships * product.price
                  ).toLocaleString()}
                  원
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  이번 달 매출
                </dt>
                <dd className="text-lg font-semibold text-gray-600">
                  {(
                    product.stats.thisMonthMemberships * product.price
                  ).toLocaleString()}
                  원
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  평균 월 매출
                </dt>
                <dd className="text-lg font-semibold text-gray-600">
                  {product.stats.averageMonthlyRevenue.toLocaleString()}원
                </dd>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">기간 정보</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">생성일</dt>
                <dd className="text-gray-900">
                  {formatDate(product.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  최종 수정일
                </dt>
                <dd className="text-gray-900">
                  {formatDate(product.updatedAt)}
                </dd>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default MembershipProductDetailPage;
