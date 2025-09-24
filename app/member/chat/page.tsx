"use client";

import { Card, CardContent } from "@/app/components/ui/Card";
import { MessageCircle, Clock } from "lucide-react";

const ChatPage = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-sm w-full">
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <MessageCircle className="w-16 h-16 text-gray-400" />
              <Clock className="w-6 h-6 text-orange-500 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            채팅 기능 준비 중
          </h3>

          <p className="text-sm text-gray-600 mb-2">
            현재 채팅 기능은 사용할 수 없습니다.
          </p>

          <p className="text-sm text-gray-600">
            조속한 시일 내에 제공될 수 있도록 하겠습니다.
          </p>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 궁금한 점이 있으시면 트레이너에게 직접 연락해주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatPage;