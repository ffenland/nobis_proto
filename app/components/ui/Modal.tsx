// app/components/ui/Modal.tsx
import React from "react";
import { cn } from "@/app/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = "md",
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={cn(
          "bg-white rounded-xl w-full max-h-[70vh] overflow-hidden flex flex-col", // 변경된 부분
          sizes[size]
        )}
      >
        {children}
      </div>
    </div>
  );
};

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ children, onClose }) => {
  return (
    <div className="p-6 border-b border-gray-200 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900">{children}</h3>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

const ModalContent: React.FC<ModalContentProps> = ({ children, className }) => {
  return (
    <div className={cn("p-4 flex-1 overflow-y-auto", className)}>
      {" "}
      {/* 변경된 부분 */}
      {children}
    </div>
  );
};

interface ModalFooterProps {
  children: React.ReactNode;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ children }) => {
  return <div className="p-4 border-t border-gray-200">{children}</div>;
};

export { Modal, ModalHeader, ModalContent, ModalFooter };
