export const PageTitle = ({ text }: { text: string }) => {
  return (
    <div className="flex justify-center items-center">
      <span className="text-3xl font-bold">{text}</span>
    </div>
  );
};

export const PageSubtitle = ({ text }: { text: string }) => {
  return (
    <div className="flex justify-center items-center">
      <span className="text-xl font-bold">{text}</span>
    </div>
  );
};

export const PageHeading = ({ text }: { text: string }) => {
  return (
    <div className="flex justify-start items-center">
      <span className="text-lg">{text}</span>
    </div>
  );
};

export const PageLabel = ({ text }: { text: string }) => {
  return (
    <div className="flex justify-start items-center">
      <span className="font-bold">{text}</span>
    </div>
  );
};
