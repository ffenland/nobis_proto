// app/manager/centers/[id]/machines/new/page.tsx
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import MachineForm from "./MachineForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewMachinePage({ params }: PageProps) {
  const { id: centerId } = await params;

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader 
        title="새 머신 등록" 
        subtitle="센터에 새로운 머신을 등록합니다"
      />
      
      <MachineForm centerId={centerId} />
    </PageLayout>
  );
}