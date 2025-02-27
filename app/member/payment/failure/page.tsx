"use client";

import { useParams } from "next/navigation";

const PaymentFailure = () => {
  const params = useParams();
  console.log(params);
  if (params.membershipId) return <div>PaymentFailure</div>;
};

export default PaymentFailure;
