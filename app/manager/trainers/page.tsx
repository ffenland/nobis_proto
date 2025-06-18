import { PageLabel, PageTitle } from "@/app/components/base/page_text";
import { getTrainerForManager } from "./actions";
import Image from "next/image";
import Link from "next/link";

const ManageTrainers = async () => {
  const trainerList = await getTrainerForManager();
  return (
    <div className="w-full flex flex-col">
      <PageTitle text="트레이너 관리" />
      <div className="flex flex-wrap items-center">
        {trainerList.map((trainer) => (
          <Link
            href={`/manager/trainers/${trainer.id}`}
            key={trainer.id}
            className="flex flex-col items-start p-4 border-b border-gray-200 rounded-md shadow-lg"
          >
            <div className="w-full flex justify-center items-center">
              <Image
                src="/images/default_profile.jpg"
                alt="프로필 이미지"
                width={40}
                height={40}
              />
            </div>
            <div className="flex gap-2">
              <PageLabel text="이름" />
              <span>{trainer.username}</span>
            </div>
            <div className="flex gap-2">
              <PageLabel text="소속" />
              <span>{trainer.center}</span>
            </div>
            <div className="flex gap-2">
              <PageLabel text="PT수업 수" />
              <span>{trainer.ptCount}개</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ManageTrainers;
