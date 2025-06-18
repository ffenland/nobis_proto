export const membershipActiveState = ({
  startedAt,
  closedAt,
}: {
  startedAt: Date;
  closedAt: Date;
}) => {
  const getToday = () => new Date();
  const today = getToday();
  if (today < startedAt) {
    return "예약됨";
  } else if (today >= startedAt && today <= closedAt) {
    return "사용중";
  } else {
    return "사용완료";
  }
};

export const calculateEndDate = ({
  startDate,
  totalCount,
  enuriDay,
}: {
  startDate: Date;
  totalCount: number;
  enuriDay: number;
}) => {
  let addMonth = 1;
  if (totalCount < 11) {
    addMonth = 2;
  } else if (totalCount < 21) {
    addMonth = 3;
  } else if (totalCount < 31) {
    addMonth = 4;
  } else {
    addMonth = 6;
  }
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + addMonth);
  endDate.setDate(endDate.getDate() + enuriDay);
  return endDate;
};
