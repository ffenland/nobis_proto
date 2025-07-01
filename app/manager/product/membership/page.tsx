import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { getMembershipsOverviewService } from "./actions";

const MembershipManagementPage = async () => {
  const { memberships, stats } = await getMembershipsOverviewService();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateRemainingDays = (closedAt: Date | null) => {
    if (!closedAt) return 0;
    const now = new Date();
    const diff = closedAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getMembershipStatus = (membership: (typeof memberships)[0]) => {
    if (!membership.isActive) {
      if (membership.startedAt && membership.closedAt) {
        return {
          text: "만료",
          variant: "default" as const,
        };
      }
      return {
        text: "미시작",
        variant: "warning" as const,
      };
    }

    const remainingDays = calculateRemainingDays(membership.closedAt);
    if (remainingDays <= 7) {
      return {
        text: "곧 만료",
        variant: "error" as const,
      };
    } else if (remainingDays <= 30) {
      return {
        text: "만료 임박",
        variant: "warning" as const,
      };
    }
    return {
      text: "활성",
      variant: "success" as const,
    };
  };

  return (
    <PageLayout maxWidth="xl">
      <PageHeader
        title="멤버십 관리"
        subtitle="회원들의 멤버십 현황을 관리합니다"
        action={
          <Link href="/manager/product/membership/new">
            <Button variant="primary">새 멤버십 상품 추가</Button>
          </Link>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalMemberships}
              </div>
              <div className="text-sm text-gray-600">전체 멤버십</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.activeMemberships}
              </div>
              <div className="text-sm text-gray-600">활성 멤버십</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.expiringMemberships}
              </div>
              <div className="text-sm text-gray-600">만료 임박 (30일 이내)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {stats.expiredMemberships}
              </div>
              <div className="text-sm text-gray-600">만료/미시작</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 멤버십 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">멤버십 현황</h2>
            <div className="text-sm text-gray-600">
              총 {memberships.length}개
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎫</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                등록된 멤버십이 없습니다
              </h3>
              <p className="text-gray-600 mb-4">
                첫 번째 멤버십 상품을 만들어보세요
              </p>
              <Link href="/manager/product/membership/new">
                <Button variant="outline">멤버십 상품 만들기</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      회원명
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      멤버십 상품
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      상태
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      시작일
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      종료일
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      남은 일수
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      결제
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((membership) => {
                    const status = getMembershipStatus(membership);
                    const remainingDays = calculateRemainingDays(
                      membership.closedAt
                    );

                    return (
                      <tr
                        key={membership.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">
                            {membership.memberName}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-gray-900">
                            {membership.productTitle}
                          </div>
                          <div className="text-sm text-gray-600">
                            {membership.totalDays}일 /{" "}
                            {membership.price.toLocaleString()}원
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={status.variant}>{status.text}</Badge>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {membership.startedAt
                            ? formatDate(membership.startedAt)
                            : "-"}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {membership.closedAt
                            ? formatDate(membership.closedAt)
                            : "-"}
                        </td>
                        <td className="py-4 px-4">
                          {membership.isActive ? (
                            <span
                              className={`font-medium ${
                                remainingDays <= 7
                                  ? "text-red-600"
                                  : remainingDays <= 30
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }`}
                            >
                              {remainingDays}일
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={membership.paid ? "success" : "warning"}
                          >
                            {membership.paid ? "완료" : "미완료"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!membership.isActive && !membership.startedAt && (
                              <Button variant="outline" size="sm">
                                활성화
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              연장
                            </Button>
                            <Button variant="outline" size="sm">
                              상세
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default MembershipManagementPage;
