export interface ChatMessage {
  id: string;
  createdAt: string;
  roomId: string;
  senderId: string;
  content: string;
  isRead: boolean;
}
