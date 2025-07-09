"use server";

import { logoutSession } from "@/app/lib/session";

interface LogoutButtonProps {
  variant?: 'default' | 'manager';
  size?: 'sm' | 'md';
  className?: string;
}

const LogoutButton = ({ variant = 'default', size = 'sm', className = '' }: LogoutButtonProps) => {
  const getButtonClasses = () => {
    const baseClasses = "transition-colors font-medium";
    
    if (variant === 'manager') {
      const sizeClasses = size === 'md' ? 'px-4 py-2' : 'px-3 py-1.5';
      return `${baseClasses} ${sizeClasses} text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md border border-gray-300 ${className}`;
    }
    
    // default variant (DaisyUI)
    const sizeClasses = size === 'md' ? 'btn btn-error btn-outline' : 'btn btn-error btn-sm btn-outline';
    return `${sizeClasses} ${className}`;
  };

  return (
    <form action={logoutSession} className="flex justify-center items-center">
      <button type="submit" className={getButtonClasses()}>
        로그아웃
      </button>
    </form>
  );
};

export default LogoutButton;
