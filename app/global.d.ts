interface Window {
  AUTHNICE?: {
    requestPay: (options: {
      clientId: string;
      method: string;
      orderId: string;
      amount: number;
      goodsName: string;
      returnUrl: string;
      fnError?: (result: { errorMsg: string }) => void;
    }) => void;
  };
}
