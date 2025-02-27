"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getMyMembership, IMyMembership } from "./actions";
import Loading from "@/app/components/base/loading";
import { formatDateUnitlMinitue } from "@/app/lib/utils";

const MembershipDetail = () => {
  const params = useParams();
  const id = params.id as string;
  const modalRef = useRef<HTMLDialogElement>(null);

  const [membership, setMembership] = useState<IMyMembership>();

  const onActivate = () => {
    // check current active membership
    // if nothing do activate, else reserve
  };

  useEffect(() => {
    const initMyMembership = async (membershipId: string) => {
      const dbMembership = await getMyMembership({
        membershipId: membershipId,
      });
      if (dbMembership.ok && dbMembership.membership) {
        setMembership(dbMembership.membership);
      }
    };
    if (id) {
      initMyMembership(id);
    }
  }, [id]);
  if (!membership) {
    return <Loading message="멤버쉽 정보를 불러오고 있습니다." />;
  }
  return (
    <div className="w-full flex flex-col items-center justify-center p-2 gap-2">
      <span className="font-extrabold text-2xl">회원권 상세보기</span>
      <div className="MEMBERSHIP w-full flex border rounded-lg shadow-lg flex-col p-5 gap-3">
        <div className="TITLE font-bold text-lg">
          {membership.membershipProduct.title}
        </div>
        <div className="DESC">{membership.membershipProduct.description}</div>
        <div className="PAY">
          <span className="font-bold">결제정보</span>
          <div className="m-2 bg-gray-100 p-2 rounded-md">
            <div className="flex">
              {membership.membershipPayment ? (
                membership.membershipPayment.paidAt ? (
                  <span>
                    결제완료 (
                    {formatDateUnitlMinitue(
                      membership.membershipPayment.paidAt
                    )}
                    )
                  </span>
                ) : (
                  <span>미결제</span>
                )
              ) : (
                <span>결제오류 - 관리자에게 문의하세요.</span>
              )}
            </div>
          </div>
        </div>
        <div className="ACTIVATE">
          <span className="font-bold">활성화 정보</span>
          <div className="m-2 bg-gray-100 p-2">
            {membership.startedAt ? (
              <div>시작일 : {formatDateUnitlMinitue(membership.startedAt)}</div>
            ) : (
              <div className="flex justify-between items-center">
                <span>미사용</span>
                <button
                  onClick={onActivate}
                  className="btn btn-sm btn-success  text-white"
                >
                  활성화하기
                </button>
              </div>
            )}
          </div>
        </div>
        <div>{}</div>
      </div>
      <dialog id="active_modal" className="modal" ref={modalRef}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Hello!</h3>
          <p className="py-4">
            Press ESC key or click the button below to close
          </p>
          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default MembershipDetail;
