import { getSessionOrRedirect } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { TrainerProfile } from "@/app/components/trainer/profile/trainerProfile";

export default async function TrainerProfilePage() {
  const session = await getSessionOrRedirect();
  if (session.role !== "TRAINER") {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">트레이너 프로필</h1>
      <TrainerProfile userId={session.id} />
    </div>
  );
}
