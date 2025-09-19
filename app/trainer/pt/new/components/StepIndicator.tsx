"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

const StepIndicator = ({ currentStep, totalSteps, stepNames }: StepIndicatorProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {stepNames.map((stepName, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isLast = index === stepNames.length - 1;

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              {/* 스텝 원 */}
              <div className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 text-gray-600"
                    }
                  `}
                >
                  {isCompleted ? "✓" : stepNumber}
                </div>
                <div className="ml-3">
                  <span
                    className={`
                      text-sm font-medium
                      ${
                        isActive
                          ? "text-blue-600"
                          : isCompleted
                          ? "text-green-600"
                          : "text-gray-600"
                      }
                    `}
                  >
                    {stepName}
                  </span>
                </div>
              </div>

              {/* 연결선 */}
              {!isLast && (
                <div
                  className={`
                    flex-1 h-0.5 mx-4 transition-colors
                    ${isCompleted ? "bg-green-500" : "bg-gray-300"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 현재 단계 설명 */}
      <div className="mt-4 text-center">
        <p className="text-gray-600 text-sm">
          단계 {currentStep}/{totalSteps}: {stepNames[currentStep - 1]}
        </p>
      </div>
    </div>
  );
};

export default StepIndicator;