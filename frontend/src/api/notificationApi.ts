import api from "./axios";

const BASE = "/master/payment-transaction/notifications";

export type PaymentNotification = {
  unique_id: string;
  recipient_user_id: string;
  bill_no: string;
  notification_type: string;
  title: string;
  message: string;
  source_module: string;
  source_path: string;
  is_read: number;
  created_by: string;
  created_at: string;
  read_at: string;
  reference_label?: string;
  reference_no?: string;
};

export type PaymentNotificationListResponse = {
  status: boolean;
  data: PaymentNotification[];
  unread_count: number;
};

function extractError(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: { message?: string; msg?: string; detail?: string } } }).response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) return responseData.message;
  if (typeof responseData?.msg === "string" && responseData.msg.trim()) return responseData.msg;
  if (typeof responseData?.detail === "string" && responseData.detail.trim()) return responseData.detail;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export async function fetchPaymentNotifications(userId: string, userType: string, limit = 10) {
  try {
    const { data } = await api.get(`${BASE}/`, { params: { user_id: userId, user_type: userType, limit } });
    return data as PaymentNotificationListResponse;
  } catch (error) {
    throw new Error(extractError(error, "Failed to load notifications."));
  }
}

export async function markPaymentNotificationRead(notificationId: string, userId: string) {
  try {
    const { data } = await api.post(`${BASE}/`, {
      action: "mark_read",
      notification_id: notificationId,
      user_id: userId,
    });
    return data as { status: boolean; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to mark notification as read."));
  }
}

export async function markAllPaymentNotificationsRead(userId: string, userType: string) {
  try {
    const { data } = await api.post(`${BASE}/`, {
      action: "mark_all_read",
      user_id: userId,
      user_type: userType,
    });
    return data as { status: boolean; message?: string };
  } catch (error) {
    throw new Error(extractError(error, "Failed to mark all notifications as read."));
  }
}

export async function markPaymentNotificationsReadByBills(userId: string, billNos: string[]) {
  try {
    await Promise.all(
      billNos
        .filter(Boolean)
        .map((billNo) =>
          api.post(`${BASE}/`, {
            action: "mark_read_by_bill",
            user_id: userId,
            bill_no: billNo,
          })
        )
    );
    return { status: true };
  } catch (error) {
    throw new Error(extractError(error, "Failed to mark bill notifications as read."));
  }
}
