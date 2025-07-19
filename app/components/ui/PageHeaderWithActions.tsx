import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "./Button";
import { PageHeader } from "./Dropdown";

interface PageHeaderWithActionsProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  actionButton?: {
    label: string;
    loadingLabel?: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    className?: string;
  };
}

export function PageHeaderWithActions({
  title,
  subtitle,
  backHref,
  backLabel = "뒤로",
  actionButton,
}: PageHeaderWithActionsProps) {
  return (
    <div className="mb-6">
      {/* 상단: 뒤로가기 버튼과 액션 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <Link href={backHref}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">뒤로</span>
          </Button>
        </Link>
        
        {actionButton && (
          <Button
            onClick={actionButton.onClick}
            disabled={actionButton.disabled || actionButton.loading}
            size="sm"
            className={actionButton.className}
          >
            {actionButton.icon && (
              <span className="w-4 h-4 mr-1">{actionButton.icon}</span>
            )}
            <span className="hidden sm:inline">
              {actionButton.loading ? actionButton.loadingLabel || "처리 중..." : actionButton.label}
            </span>
            <span className="sm:hidden">
              {actionButton.loading ? "처리중" : actionButton.label}
            </span>
          </Button>
        )}
      </div>
      
      {/* 하단: 페이지 제목과 설명 */}
      <div>
        <PageHeader title={title} subtitle={subtitle} />
      </div>
    </div>
  );
}