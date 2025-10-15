import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { getProductsOverviewService } from "./actions";

const ProductsPage = async () => {
  const { ptProducts, membershipProducts } = await getProductsOverviewService();

  return (
    <div className="h-full p-2">
      <PageHeader
        title="제품 관리"
        subtitle="PT 상품과 멤버십 상품을 관리합니다"
      />

      {/* 운동 프로그램 관리 버튼 */}
      <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <Link href="/manager/exercise">
          <Button variant="outline" size="lg" className="w-full">
            운동 프로그램 관리
          </Button>
        </Link>
        <p className="text-sm text-gray-600 mt-3 text-center">
          PT 수업에 필요한 웨이트운동, 스트레칭 운동에 대한 프리셋을 관리합니다
        </p>
      </div>

      <div className="grid grid-cols-1  gap-8">
        {/* PT 상품 섹션 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">PT 상품</h2>
              {ptProducts.length === 0 ? null : (
                <Link href="/manager/product/new-pt">
                  <Button variant="primary" size="sm">
                    새 PT 상품 추가
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {ptProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🏋️‍♀️</div>
                <p className="text-gray-600 mb-4">등록된 PT 상품이 없습니다</p>
                <Link href="/manager/product/new-pt">
                  <Button variant="outline">첫 PT 상품 만들기</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {ptProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/manager/product/pt/${product.id}`}
                    className="block"
                  >
                    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {product.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{product.price.toLocaleString()}원</span>
                            <span>총 {product.totalCount}회</span>
                            <span>회당 {product.time}분</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                product.onSale
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {product.onSale ? "판매중" : "판매중단"}
                            </span>
                            <span className="text-xs text-gray-500">
                              활성 PT: {product.activePtCount}개
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>트레이너 레벨</div>
                          <div className="font-medium text-gray-900">
                            {product.trainerLevelCount}개
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 멤버십 상품 섹션 */}
        {/* <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                멤버십 상품
              </h2>
              <Link href="/manager/product/membership/new">
                <Button variant="primary" size="sm">
                  새 멤버십 상품 추가
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {membershipProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎫</div>
                <p className="text-gray-600 mb-4">
                  등록된 멤버십 상품이 없습니다
                </p>
                <Link href="/manager/product/membership/new">
                  <Button variant="outline">첫 멤버십 상품 만들기</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {membershipProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/manager/product/membership/${product.id}`}
                    className="block"
                  >
                    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {product.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{product.price.toLocaleString()}원</span>
                            <span>{product.totalCount}일</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                product.onSale
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {product.onSale ? "판매중" : "판매중단"}
                            </span>
                            <span className="text-xs text-gray-500">
                              활성 멤버십: {product.activeMembershipCount}개
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>
                            {new Date(product.closedAt).getTime() >
                            new Date("2099-01-01").getTime()
                              ? "무제한"
                              : new Date(product.closedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
};

export default ProductsPage;
