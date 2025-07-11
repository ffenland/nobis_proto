// components/LoadingOverlay.tsx
"use client";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const LoadingOverlay = ({ isVisible, message = "처리 중..." }: LoadingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;