// app/components/ui/Loading.tsx
import React from "react";
import { cn } from "@/app/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className,
}) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={cn(
        "border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin",
        sizes[size],
        className
      )}
    />
  );
};

interface LoadingPageProps {
  message?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({
  message = "로딩 중...",
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
};

// Badge 컴포넌트
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error";
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  children,
  className,
  ...props
}) => {
  const variants = {
    default: "bg-gray-200 text-gray-800",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    error: "bg-red-50 text-red-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// ErrorMessage 컴포넌트
interface ErrorMessageProps {
  message: string;
  action?: React.ReactNode;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, action }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="w-5 h-5 text-red-500 mt-0.5">⚠️</div>
        <div className="flex-1">
          <p className="text-red-800">{message}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
};

export { LoadingSpinner, LoadingPage, Badge, ErrorMessage };
