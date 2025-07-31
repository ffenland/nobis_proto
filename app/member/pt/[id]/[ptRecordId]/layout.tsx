import { Toaster } from 'react-hot-toast';

export default function PtRecordDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  );
}