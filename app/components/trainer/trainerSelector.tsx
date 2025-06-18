"use client";

import { ITrainerForSelect } from "@/app/manager/product/pt/new/actions";

interface TrainerCardProps {
  trainer: ITrainerForSelect;
  size: "S" | "M" | "L";
  onClick: () => void;
}

interface TrainerSelectorProps {
  trainers: ITrainerForSelect[];
  onTrainerClick: (newTrainers: ITrainerForSelect[]) => void;
  isOnly: boolean;
  size: "S" | "M" | "L";
}

const TrainerCard: React.FC<TrainerCardProps> = ({
  trainer,
  onClick,
  size,
}) => {
  return (
    <div
      onClick={onClick}
      className={` ${size === "S" ? "" : ""} ${
        trainer.chosen
          ? "border-green-600 bg-green-200"
          : "border-red-700 bg-gray-200 text-gray-500"
      } flex cursor-pointer items-center justify-between rounded-lg border p-2 shadow-md ${
        trainer.chosen ? "bg-white" : "bg-gray-700"
      } `}
    >
      <div className="flex flex-col w-full items-center justify-between px-4">
        <span className={`${trainer.chosen ? "font-bold" : ""}`}>
          {trainer.username}
        </span>
        <span
          className={`${
            trainer.chosen ? "font-bold text-green-900" : "text-red-800"
          }`}
        >{`${trainer.chosen ? "수업가능" : "수업불가"}`}</span>
      </div>
    </div>
  );
};

const TrainerSelector: React.FC<TrainerSelectorProps> = ({
  trainers,
  onTrainerClick,
  isOnly,
  size,
}) => {
  const toggleTrainer = (id: string) => {
    const newTrainers = [...trainers].map((trainer) => {
      if (trainer.trainerId === id) {
        // 선택한 Triner에 대한 작업
        return { ...trainer, chosen: !trainer.chosen };
      } else {
        // 선택되지 않은 Trainer에 대한 작업
        if (isOnly) {
          return { ...trainer, chosen: false };
        } else {
          return trainer;
        }
      }
    });
    onTrainerClick(newTrainers);
  };

  return (
    <div className={`grid gap-1 ${size === "S" ? "grid-cols-2" : ""}`}>
      {trainers.map((trainer) => (
        <TrainerCard
          key={trainer.trainerId}
          trainer={trainer}
          onClick={() => toggleTrainer(trainer.trainerId)}
          size={size}
        />
      ))}
    </div>
  );
};

export default TrainerSelector;
