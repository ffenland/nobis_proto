import React from "react";
import { LucideIcon } from "lucide-react";

export type BadgeVariant =
  | "amber"
  | "indigo"
  | "blue"
  | "green"
  | "red"
  | "purple"
  | "gray"
  | "pink"
  | "orange";

export type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  gray: "bg-gray-50 text-gray-700 border-gray-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
};

const sizeStyles: Record<BadgeSize, { container: string; icon: string }> = {
  sm: {
    container: "px-2 py-0.5 text-xs",
    icon: "w-2.5 h-2.5",
  },
  md: {
    container: "px-3 py-1 text-xs",
    icon: "w-3 h-3",
  },
  lg: {
    container: "px-3 py-1.5 text-sm",
    icon: "w-4 h-4",
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "gray",
  size = "md",
  icon: Icon,
  className = "",
}) => {
  const variantClass = variantStyles[variant];
  const sizeClass = sizeStyles[size];

  return (
    <div
      className={`inline-flex items-center gap-1 ${sizeClass.container} ${variantClass} rounded-full font-medium border ${className}`}
    >
      {Icon && <Icon className={sizeClass.icon} />}
      {children}
    </div>
  );
};

// 자주 사용되는 특정 뱃지 타입을 위한 유틸리티 컴포넌트
export const ManagerBadge: React.FC<{ icon?: LucideIcon; size?: BadgeSize }> =
  ({ icon, size = "md" }) => (
    <Badge variant="amber" size={size} icon={icon}>
      매니저
    </Badge>
  );

export const LevelBadge: React.FC<{
  level: string;
  icon?: LucideIcon;
  size?: BadgeSize;
}> = ({ level, icon, size = "md" }) => (
  <Badge variant="indigo" size={size} icon={icon}>
    {level}
  </Badge>
);

export const StatusBadge: React.FC<{
  status: "active" | "pending" | "completed" | "canceled";
  size?: BadgeSize;
}> = ({ status, size = "md" }) => {
  const statusConfig = {
    active: { variant: "green" as BadgeVariant, label: "활성" },
    pending: { variant: "amber" as BadgeVariant, label: "대기중" },
    completed: { variant: "blue" as BadgeVariant, label: "완료" },
    canceled: { variant: "red" as BadgeVariant, label: "취소됨" },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};
