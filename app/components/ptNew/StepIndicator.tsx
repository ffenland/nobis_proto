// components/ptNew/StepIndicator.tsx
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

export const StepIndicator = ({
  currentStep,
  totalSteps,
  stepTitles,
}: StepIndicatorProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < currentStep
                    ? "bg-gray-900 text-white"
                    : i === currentStep
                    ? "bg-gray-200 text-gray-900 border-2 border-gray-900"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    i < currentStep ? "bg-gray-900" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {stepTitles[currentStep]}
        </h2>
        <p className="text-sm text-gray-600">
          {currentStep + 1} / {totalSteps} 단계
        </p>
      </div>
    </div>
  );
};
