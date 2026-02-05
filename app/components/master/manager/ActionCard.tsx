import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/Card";

interface ActionCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  href: string;
  variant?: "warning" | "info" | "success" | "danger";
  description?: string;
}

const variantStyles = {
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    iconBg: "bg-yellow-100",
    iconText: "text-yellow-600",
    countText: "text-yellow-900",
    titleText: "text-yellow-900",
    descText: "text-yellow-700",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    countText: "text-blue-900",
    titleText: "text-blue-900",
    descText: "text-blue-700",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    iconBg: "bg-green-100",
    iconText: "text-green-600",
    countText: "text-green-900",
    titleText: "text-green-900",
    descText: "text-green-700",
  },
  danger: {
    bg: "bg-red-50",
    border: "border-red-200",
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    countText: "text-red-900",
    titleText: "text-red-900",
    descText: "text-red-700",
  },
};

export default function ActionCard({
  title,
  count,
  icon,
  href,
  variant = "info",
  description,
}: ActionCardProps) {
  const styles = variantStyles[variant];

  return (
    <Link href={href} className="block">
      <Card
        className={`${styles.bg} ${styles.border} hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`${styles.iconBg} ${styles.iconText} p-2 rounded-lg`}
                >
                  {icon}
                </div>
                <h3 className={`font-semibold text-lg ${styles.titleText}`}>
                  {title}
                </h3>
              </div>

              <div className="mb-2">
                <span className={`text-4xl font-bold ${styles.countText}`}>
                  {count}
                </span>
                <span className={`text-sm ml-2 ${styles.descText}`}>건</span>
              </div>

              {description && (
                <p className={`text-sm ${styles.descText}`}>{description}</p>
              )}
            </div>

            <div className={`${styles.iconText} mt-2`}>
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
