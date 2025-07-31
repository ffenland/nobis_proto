// app/manager/centers/[id]/machines/[machineId]/page.tsx
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { getMachineDetail } from "@/app/lib/services/machine.service";
import MachineDetailClient from "./MachineDetailClient";
import Link from "next/link";
import { Button } from "@/app/components/ui/Button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string; machineId: string }>;
}

export default async function MachineDetailPage({ params }: PageProps) {
  const { id: centerId, machineId } = await params;
  
  let machine;
  
  try {
    machine = await getMachineDetail(machineId);
  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            머신을 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href={`/manager/centers/${centerId}/machines`}>
            <Button variant="primary">머신 목록으로</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (!machine) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            머신을 찾을 수 없습니다
          </h2>
          <Link href={`/manager/centers/${centerId}/machines`}>
            <Button variant="primary">머신 목록으로</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader 
        title={machine.title} 
        subtitle={machine.fitnessCenter?.title || ""}
      />
      
      <div className="mb-4">
        <Link href={`/manager/centers/${centerId}/machines`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
        </Link>
      </div>

      <MachineDetailClient 
        machineId={machineId}
        centerId={centerId}
        initialData={machine}
      />
    </PageLayout>
  );
}