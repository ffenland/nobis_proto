// app/trainer/profile/page.tsx
import { getTrainerProfileAction, type ITrainerProfile } from "./actions";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import Link from "next/link";
import Image from "next/image";
import { getCloudflareImageUrl } from "@/app/lib/utils/media.utils";

export default async function TrainerProfilePage() {
  let trainerProfile: ITrainerProfile;

  try {
    trainerProfile = await getTrainerProfileAction();
  } catch (error) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            프로필을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href="/trainer/dashboard">
            <Button variant="primary">대시보드로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  return (
    <PageLayout maxWidth="lg">
      <PageHeader title="내 프로필" />

      <div className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
              <Link href="/trainer/profile/edit">
                <Button variant="outline">프로필 수정</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 프로필 사진과 기본 정보 */}
              <div className="flex items-start space-x-6">
                {/* 프로필 사진 */}
                <div className="flex-shrink-0">
                  {trainerProfile.user.avatarImage?.cloudflareId ? (
                    <Image
                      src={getCloudflareImageUrl(
                        trainerProfile.user.avatarImage.cloudflareId,
                        "avatarSM"
                      )}
                      alt="프로필 사진"
                      width={120}
                      height={120}
                      className="w-30 h-30 rounded-full object-cover border-4 border-gray-100"
                      priority
                    />
                  ) : (
                    <div className="w-30 h-30 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-100">
                      <span className="text-3xl text-gray-400">👤</span>
                    </div>
                  )}
                </div>

                {/* 기본 정보 */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {trainerProfile.user.username}
                  </h3>
                  <div className="space-y-2 text-gray-600">
                    <p>
                      <span className="font-medium">이메일:</span>{" "}
                      {trainerProfile.user.email}
                    </p>
                    <p>
                      <span className="font-medium">가입일:</span>{" "}
                      {formatDate(trainerProfile.user.createdAt)}
                    </p>
                    {trainerProfile.fitnessCenter && (
                      <p>
                        <span className="font-medium">소속 센터:</span>{" "}
                        {trainerProfile.fitnessCenter.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 자기소개 */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  자기소개
                </h4>
                {trainerProfile.introduce ? (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {trainerProfile.introduce}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">
                    아직 자기소개를 작성하지 않았습니다.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PT 통계 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">PT 통계</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {trainerProfile.ptStats.totalPt}
                </div>
                <div className="text-sm text-blue-700">총 PT 수</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {trainerProfile.ptStats.activePt}
                </div>
                <div className="text-sm text-green-700">진행중 PT</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {trainerProfile.ptStats.completedSessions}
                </div>
                <div className="text-sm text-purple-700">완료 세션</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {trainerProfile.ptStats.totalSessions}
                </div>
                <div className="text-sm text-orange-700">총 세션</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PT 상품 목록 */}
        {trainerProfile.ptProduct.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                판매중인 PT 상품
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainerProfile.ptProduct.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {product.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {product.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>{product.totalCount}회</span>
                        <span>{product.time}시간</span>
                        <span
                          className={
                            product.onSale ? "text-green-600" : "text-red-600"
                          }
                        >
                          {product.onSale ? "판매중" : "판매중단"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatPrice(product.price)}원
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 최근 PT 회원 */}
        {trainerProfile.recentMembers.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                최근 PT 회원
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trainerProfile.recentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {member.memberName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        시작일: {formatDate(member.startedAt)}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-900">
                        {member.completedSessions}/{member.totalSessions} 세션
                      </div>
                      <div className="text-gray-500">
                        진행률:{" "}
                        {member.totalSessions > 0
                          ? Math.round(
                              (member.completedSessions /
                                member.totalSessions) *
                                100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 소속 센터 정보 */}
        {trainerProfile.fitnessCenter && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">소속 센터</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">
                  {trainerProfile.fitnessCenter.title}
                </h4>
                {trainerProfile.fitnessCenter.address && (
                  <p className="text-gray-600">
                    📍 {trainerProfile.fitnessCenter.address}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 빠른 액션 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">빠른 액션</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/trainer/profile/edit">
                <Button variant="outline" className="w-full">
                  프로필 수정
                </Button>
              </Link>
              <Link href="/trainer/schedule/off-days">
                <Button variant="outline" className="w-full">
                  휴무 관리
                </Button>
              </Link>
              <Link href="/trainer/pt-list">
                <Button variant="outline" className="w-full">
                  PT 목록 보기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
