// app/components/ui/Dropdown.tsx
import React from "react";
import { cn } from "@/app/lib/utils";

interface DropdownOption {
  id: string;
  label: string;
  description?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  onSelect: (option: DropdownOption) => void;
  placeholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isOpen: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  onSelect,
  placeholder = "검색하세요",
  searchValue,
  onSearchChange,
  isOpen,
  className,
}) => {
  return (
    <div className="relative">
      <input
        type="text"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all",
          className
        )}
      />

      {isOpen && searchValue && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length > 0 ? (
            options.map((option) => (
              <button
                key={option.id}
                onClick={() => onSelect(option)}
                className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-600 mt-1 truncate">
                    {option.description}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-4 text-gray-500 text-sm">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Layout 컴포넌트들
interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = "md",
}) => {
  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  };

  return (
    <div className="flex-1 bg-gray-50">
      <div className={cn("w-full py-2", maxWidths[maxWidth])}>{children}</div>
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// Tag/Pill 컴포넌트 (선택된 아이템 표시용)
interface TagProps {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}

const Tag: React.FC<TagProps> = ({ children, onRemove, className }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm",
        className
      )}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export { Dropdown, PageLayout, PageHeader, Tag };
