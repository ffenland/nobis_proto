"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getMembershipProduct,
  IMembershipProductResult,
  makePendingMembership,
} from "./actions";
import { formatNumberWithCommas, showRemainDays } from "@/app/lib/utils";
import { getMembershipCoupons, ICoupon } from "../actions";
import MembershipProduct from "@/app/components/membership/membershipProduct";
import { getDiscountPrice } from "@/app/lib/coupon";

interface IMembershipState extends NonNullable<IMembershipProductResult> {
  id: string;
}
const EnrollMembership = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [membership, setMembership] = useState<IMembershipState>();
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [chosenCoupon, setChosenCoupon] = useState<ICoupon>();
  const [errorMessage, setErrorMessage] = useState("");
  const discountPrice =
    chosenCoupon && membership
      ? getDiscountPrice({
          discount: chosenCoupon.discount,
          maxPrice: chosenCoupon.maxPrice,
          productPrice: membership.price,
        })
      : 0;

  const onCheckOut = async () => {
    if (!id) return;
    const result = await makePendingMembership({
      membershipId: id,
      ...(chosenCoupon && { couponId: chosenCoupon.id }),
    });
    if (result.ok && result.paymentId) {
      // success
      router.push(`/member/payment/${result.paymentId}`);
    } else {
      if (result.error?.message) {
        setErrorMessage(result.error.message);
      }
      // 3초 뒤에 "/member/membership/" 페이지로 이동하는 로직이 필요
      setTimeout(() => {
        router.push("/member/membership/");
      }, 3000);
    }
  };

  useEffect(() => {
    if (id) {
      const getMembershipInfo = async (id: string) => {
        const dbMembership = await getMembershipProduct(id);
        if (!dbMembership) {
          router.push("/member/membership");
        } else {
          setMembership({ ...dbMembership, id: id });
        }
      };
      const getCouponsInfo = async () => {
        const dbCoupons = await getMembershipCoupons();

        setCoupons(dbCoupons);
      };
      getMembershipInfo(id);
      getCouponsInfo();
    }
  }, []);
  useEffect(() => {
    // 스크립트가 로드된 후에만 함수 사용 가능
    if (typeof window !== "undefined" && window.AUTHNICE) {
      console.log("AUTHNICE is available");
    }
  }, []);

  if (!membership) {
    return (
      <div className="flex flex-col w-full items-center mt-5 gap-5">
        <span className="text-2xl font-bold text-slate-600">loading</span>
      </div>
    );
  } else {
    return (
      <>
        <div className="w-full flex flex-col gap-3">
          <div className="flex justify-center items-center">
            <span className="text-lg font-bold">회원권 결제</span>
          </div>
          <MembershipProduct membership={membership} />
          <div className="COUPONS">
            <div className="flex justify-center items-center">
              <span className="font-bold text-lg">사용가능 쿠폰</span>
            </div>
            <div className="flex flex-col gap-1">
              {coupons
                .sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime())
                .map((coupon) => {
                  return (
                    <div
                      key={coupon.id}
                      className={`border-2 rounded-lg p-2 shadow-lg ${
                        chosenCoupon?.id === coupon.id
                          ? "border-green-900 bg-green-200"
                          : "border-slate-500"
                      }`}
                      onClick={() => {
                        setChosenCoupon((prev) => {
                          if (!prev || prev.id !== coupon.id) {
                            return coupon;
                          } else {
                            return undefined;
                          }
                        });
                      }}
                    >
                      <div className="NAME DISCOUNT">
                        <span>{coupon.discount} % 쿠폰</span>
                      </div>
                      <div className="MAXPRICE">
                        <span>쿠폰 최대 할인금액 </span>
                        <span>
                          {formatNumberWithCommas(coupon.maxPrice)} 원
                        </span>
                      </div>
                      <div className="EXP">
                        <span>
                          쿠폰만료일 : {showRemainDays(coupon.closedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="SUMMARY border rounded-md p-1">
            <div className="flex justify-center items-center font-bold text-lg">
              할인내역
            </div>
            <div className="TOTALPRICE flex flex-col ">
              <div className="w-full px-4 flex justify-between">
                <span>회원권 가격 :</span>
                <span>{formatNumberWithCommas(membership.price)}원</span>
              </div>

              <div className="w-full px-4 flex justify-between">
                <span>쿠폰 할인금액 :</span>
                <span>- {formatNumberWithCommas(discountPrice)}원</span>
              </div>
            </div>
            <div className="CHECKOUT flex flex-col items-center *:font-bold *:text-lg">
              <span>최종 결제금액</span>
              <span>
                {formatNumberWithCommas(membership.price - discountPrice)}원
              </span>
            </div>
          </div>
          <div className="flex justify-center items-center">
            {!errorMessage ? (
              <button className="btn btn-lg" onClick={onCheckOut}>
                결제하기
              </button>
            ) : (
              <div className="flex flex-col justify-center items-center">
                <span>{errorMessage}</span>
                <span>
                  에러가 발생했습니다. 회원권 선택페이지로 돌아갑니다.
                </span>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
};

export default EnrollMembership;
