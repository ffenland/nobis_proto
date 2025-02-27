export const getDiscountPrice = ({
  discount,
  maxPrice,
  productPrice,
}: {
  discount: number;
  maxPrice: number;
  productPrice: number;
}) => {
  const discountedProductPrice = (productPrice * discount) / 100;

  return maxPrice - discountedProductPrice > 0
    ? discountedProductPrice
    : maxPrice;
};
