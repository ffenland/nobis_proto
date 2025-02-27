
  const CenterCard = ({ center }: { center:  }) => {
    return (
      <div className="flex w-full flex-col rounded-md border p-2 shadow-md">
        <div className="text-center text-lg font-bold">
          <span>{center.title}</span>
        </div>
        <div className="ADDRESS">
          <span className="text-sm">{center.address}</span>
        </div>
        <div className="ISOFF">
          {center.offDays.length > 0 ? (
            <span className="text-red-500">휴무일</span>
          ) : (
            <span className="text-green-500">운영중</span>
          )}
        </div>
      </div>
    )
  }
  
  const CenterInfo = async () => {
    const serverList = await getCentersShowInfo()
    return (
      <div className="flex w-full flex-col gap-2">
        <span>노비스짐 지점별 안내</span>
        <div className="flex w-full flex-wrap">
          {serverList.map(center => (
            <CenterCard
              key={center.id}
              center={center}
            />
          ))}
        </div>
      </div>
    )
  }
  
  export default CenterInfo
  