"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { cn } from "@/app/lib/utils";

const tabs = [
  {
    name: "홈",
    href: "/manager",
    icon: Home,
  },
];

export default function ManagerTabbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 min-w-[80px] transition-colors",
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
