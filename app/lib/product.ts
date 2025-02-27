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
