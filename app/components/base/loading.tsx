const Loading = ({ message }: { message?: string }) => {
  return (
    <div className="w-full mt-10 flex flex-col items-center">
      <span className="font-bold text-2xl">Loading</span>
      <span>{message}</span>
    </div>
  );
};

export default Loading;
