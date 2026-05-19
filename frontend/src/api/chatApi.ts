import api from "./axios";

const BASE = "/master/chat";

export type ChatUser = {
  unique_id: string;
  staff_name: string;
  user_name: string;
  staff_id: string;
  email_id: string;
  mobile_no: string;
  user_type: string;
};

export type ChatConversation = {
  other_user_id: string;
  staff_name: string;
  user_name: string;
  staff_id: string;
  email_id: string;
  mobile_no: string;
  user_type: string;
  last_message: string;
  last_sender_user_id: string;
  last_message_at: string;
  unread_count: number;
};

export type ChatMessage = {
  unique_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  message_text: string;
  is_read: number;
  created_at: string;
  read_at: string;
};

type ChatUserListResponse = {
  status: boolean;
  data: ChatUser[];
};

type ChatConversationListResponse = {
  status: boolean;
  data: ChatConversation[];
  unread_count: number;
};

type ChatMessageListResponse = {
  status: boolean;
  data: ChatMessage[];
};

function extractError(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: { message?: string; msg?: string; detail?: string } } }).response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) return responseData.message;
  if (typeof responseData?.msg === "string" && responseData.msg.trim()) return responseData.msg;
  if (typeof responseData?.detail === "string" && responseData.detail.trim()) return responseData.detail;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export async function fetchChatUsers(search = "", limit = 250) {
  try {
    const { data } = await api.get(`${BASE}/users/`, { params: { search, limit } });
    return data as ChatUserListResponse;
  } catch (error) {
    throw new Error(extractError(error, "Failed to load chat users."));
  }
}

export async function fetchChatConversations(limit = 25) {
  try {
    const { data } = await api.get(`${BASE}/conversations/`, { params: { limit } });
    return data as ChatConversationListResponse;
  } catch (error) {
    throw new Error(extractError(error, "Failed to load conversations."));
  }
}

export async function fetchChatMessages(otherUserId: string, limit = 200) {
  try {
    const { data } = await api.get(`${BASE}/messages/`, { params: { other_user_id: otherUserId, limit } });
    return data as ChatMessageListResponse;
  } catch (error) {
    throw new Error(extractError(error, "Failed to load chat messages."));
  }
}

export async function sendChatMessage(recipientUserId: string, messageText: string) {
  try {
    const { data } = await api.post(`${BASE}/messages/`, {
      recipient_user_id: recipientUserId,
      message_text: messageText,
    });
    return data as { status: boolean; data: ChatMessage | null; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to send chat message."));
  }
}
