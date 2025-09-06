"use client";

import useSWR from 'swr';
import UserDropdownMenu from '@/app/components/base/UserDropdownMenu';
import { LoadingSpinner } from '@/app/components/ui/Loading';
import type { SessionResponse } from '@/app/services/auth/auth.service';

const GlobalHeader = () => {
  const { data, error, isLoading } = useSWR<SessionResponse>('/api/auth/session');

  if (isLoading) {
    return (
      <header className="w-full bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              NobisGym PulsePT
            </h1>
          </div>
          <div className="flex items-center">
            <LoadingSpinner size="sm" />
          </div>
        </div>
      </header>
    );
  }

  // 인증되지 않은 경우 헤더를 표시하지 않음
  if (error || !data?.isAuthenticated || !data?.user) {
    return null;
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-900">
            NobisGym PulsePT
          </h1>
        </div>
        <div className="flex items-center">
          <UserDropdownMenu
            username={data.user.name}
            showRoleSwitch={
              (data.user.role === 'TRAINER' && data.user.hasManagerProfile) ||
              (data.user.role === 'MANAGER' && data.user.hasTrainerProfile)
            }
            targetRole={
              data.user.role === 'TRAINER' ? 'MANAGER' : 
              data.user.role === 'MANAGER' ? 'TRAINER' : 
              undefined
            }
          />
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;