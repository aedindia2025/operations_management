import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AscentLinkHubLogo from "../chat/AscentLinkHubLogo";
import ChatDrawer from "../chat/ChatDrawer";
import { fetchChatConversations } from "../../api/chatApi";
import {
  fetchPaymentNotifications,
  markAllPaymentNotificationsRead,
  markPaymentNotificationRead,
  type PaymentNotification,
} from "../../api/notificationApi";

interface NavbarProps {
  onToggleSidebar: () => void;
}

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/admin": "Admin",
  "/settings": "Settings",
  "/order": "Order",
  "/purchase": "Purchase",
  "/stores": "Stores",
  "/operation": "Operation",
  "/accounts": "Accounts",
  "/service": "Service & Support",
  "/vendor": "Vendor",
  "/reports": "Reports",
  "/documents": "Documents",
};

const ALLOWED_NOTIFICATION_USER_TYPES = [
  "65efd97b4df4040205",
  "68cba503472bd48995",
];

const normalizeRole = (value?: string) => (value || "").trim().toLowerCase().replace(/[\s_&-]+/g, "");
const isConsigneeNotification = (notification: PaymentNotification) => notification.notification_type === "consignee_updated";

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [popupNotification, setPopupNotification] = useState<PaymentNotification | null>(null);
  const [dismissedPopupId, setDismissedPopupId] = useState("");
  const userRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const title = Object.entries(TITLES).find(([k]) => location.pathname.startsWith(k))?.[1] ?? "Dashboard";
  const currentUserId = user?.unique_id || user?.id || "";
  const currentUserType = user?.user_type_unique_id || "";
  const currentRole = normalizeRole(user?.role);
  const displayName = user?.staff_name || user?.name || user?.username || "User";
  const companyName = user?.company_name || (user?.sess_company_id ? "Company" : "Product Owner");
  const companyCode = user?.company_code || "";
  const canViewPaymentNotifications = ALLOWED_NOTIFICATION_USER_TYPES.includes(currentUserType) || currentRole === "stores";

  const loadChatSummary = async () => {
    if (!currentUserId) {
      setChatUnreadCount(0);
      return;
    }
    try {
      const res = await fetchChatConversations(20);
      setChatUnreadCount(Number(res.unread_count || 0));
    } catch {
      setChatUnreadCount(0);
    }
  };

  const loadNotifications = async () => {
    if (!currentUserId || !currentUserType || !canViewPaymentNotifications) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoadingNotifications(true);
    try {
      const res = await fetchPaymentNotifications(currentUserId, currentUserType, 12);
      setNotifications(res.data || []);
      setUnreadCount(Number(res.unread_count || 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    void loadChatSummary();
    const onFocus = () => {
      void loadChatSummary();
    };
    const timer = window.setInterval(() => {
      void loadChatSummary();
    }, 5000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !currentUserType || !canViewPaymentNotifications) return;
    void loadNotifications();
    const onFocus = () => {
      void loadNotifications();
    };
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 5000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUserId, currentUserType, canViewPaymentNotifications]);

  useEffect(() => {
    if (!canViewPaymentNotifications || notifications.length === 0) {
      setPopupNotification(null);
      return;
    }

    const latestUnread = notifications.find((item) => !Number(item.is_read));
    if (!latestUnread) {
      setPopupNotification(null);
      return;
    }
    if (dismissedPopupId && latestUnread.unique_id === dismissedPopupId) return;
    setPopupNotification(latestUnread);
  }, [notifications, canViewPaymentNotifications, dismissedPopupId]);

  const handleBellToggle = async () => {
    if (!canViewPaymentNotifications) return;
    const next = !bellOpen;
    setBellOpen(next);
    if (next) {
      await loadNotifications();
    }
  };

  const handleNotificationClick = async (notification: PaymentNotification) => {
    if (!currentUserId) return;
    if (!Number(notification.is_read)) {
      try {
        await markPaymentNotificationRead(notification.unique_id, currentUserId);
      } catch {
        return;
      }
      setNotifications((prev) =>
        prev.map((item) => (item.unique_id === notification.unique_id ? { ...item, is_read: 1 } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (popupNotification?.unique_id === notification.unique_id) {
        setPopupNotification(null);
        setDismissedPopupId(notification.unique_id);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUserId || !currentUserType || unreadCount <= 0) return;
    try {
      await markAllPaymentNotificationsRead(currentUserId, currentUserType);
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
      setUnreadCount(0);
      setPopupNotification(null);
      setDismissedPopupId("");
    } catch {
      return;
    }
  };

  return (
    <>
      {popupNotification && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed bottom-5 right-5 w-[360px] max-w-[calc(100vw-24px)] bg-[#1f3a24] text-white rounded-xl shadow-2xl z-[90] overflow-hidden border border-[#2d5b37]">
              <div className="h-1.5 bg-gradient-to-r from-[#8fd694] via-[#d7f171] to-[#8fd694]" />
              <div className="px-4 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2d5b37] text-[#d7f171] flex items-center justify-center shrink-0">
                  <i className="fa fa-bolt" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-bold tracking-wide uppercase">
                      {isConsigneeNotification(popupNotification) ? "Stores Alert" : "Payment Toast"}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#d7f171] text-[#1f3a24] text-[10px] font-bold uppercase">Live</span>
                  </div>
                  <div className="text-[15px] font-semibold mt-1">{popupNotification.title}</div>
                  <div className="text-[12px] text-white/80 mt-2 leading-5">{popupNotification.message}</div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/70">
                    <span>{isConsigneeNotification(popupNotification) ? "PO No" : "Bill No"}: {popupNotification.bill_no}</span>
                    <span>{popupNotification.created_at}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (popupNotification?.unique_id) setDismissedPopupId(popupNotification.unique_id);
                    setPopupNotification(null);
                  }}
                  className="border-none bg-transparent text-white/70 hover:text-white cursor-pointer"
                >
                  <i className="fa fa-xmark" />
                </button>
              </div>
            </div>,
            document.body
          )
        : null}

      <header className="fixed top-3 left-3 right-3 lg:left-[260px] lg:right-5 h-[58px] rounded-[22px] border border-[#e4e8d7] bg-white/88 shadow-[0_22px_40px_rgba(52,67,29,0.08)] backdrop-blur flex items-center px-3 lg:px-4 z-40 gap-3">
      <button
        onClick={onToggleSidebar}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9ddcf] bg-[#f7f9f2] text-[#5d6942] transition-colors hover:border-[#b8c28f] hover:bg-white hover:text-[#4f7a2b] border-none cursor-pointer flex-shrink-0"
      >
        <i className="fa fa-bars" />
      </button>

      <div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#92a06e]">Workspace</div><span className="block truncate text-[16px] font-bold text-[#223016]">{title}</span></div>

      <div className="flex-1" />

      <div
        className="hidden min-w-0 max-w-[300px] items-center gap-3 rounded-xl border border-[#dfe6ce] bg-[#fbfcf7] px-3 py-1.5 shadow-sm md:flex"
        title={companyCode ? `${companyName} (${companyCode})` : companyName}
      >
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-[#edf4df] text-[#577326]">
          <i className="fa fa-building" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#92a06e]">Company</div>
          <div className="truncate text-[13px] font-bold text-[#243018]">
            {companyName}
            {companyCode ? <span className="ml-1 font-semibold text-[#7d8665]">({companyCode})</span> : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        disabled={!currentUserId}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9ddcf] bg-[#f7f9f2] text-[#5d6942] text-sm hover:border-[#97b86a] hover:bg-white hover:text-[#4f7a2b] transition-colors cursor-pointer flex-shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
        title="AscentLink Hub"
        aria-label="Open AscentLink Hub"
      >
        <AscentLinkHubLogo compact />
        {chatUnreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#4f7a2b] text-white text-[10px] font-bold flex items-center justify-center">
            {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
          </span>
        ) : null}
      </button>

      <div className="relative" ref={bellRef}>
        <button
          onClick={() => void handleBellToggle()}
          disabled={!canViewPaymentNotifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9ddcf] bg-[#f7f9f2] text-[#5d6942] text-sm hover:border-[#b8c28f] hover:bg-white hover:text-[#4f7a2b] transition-colors cursor-pointer flex-shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <i className="fa fa-bell" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>

        {bellOpen && (
          <div className="absolute top-[calc(100%+10px)] right-0 w-[360px] max-w-[calc(100vw-32px)] rounded-[24px] border border-[#e4e8d7] bg-white shadow-[0_22px_40px_rgba(52,67,29,0.14)] overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-[#edf1e4] flex items-center justify-between gap-3 bg-[linear-gradient(135deg,#fcfdf8_0%,#eef4e1_100%)]">
              <div>
                <div className="text-[13px] font-semibold text-ink">Notifications</div>
                <div className="text-[11px] text-ink-muted">Payment and Stores updates</div>
              </div>
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-[11px] font-semibold text-brand-700 bg-transparent border-none cursor-pointer disabled:opacity-50"
                disabled={unreadCount <= 0}
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loadingNotifications ? (
                <div className="px-4 py-6 text-[12px] text-ink-muted text-center">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-[12px] text-ink-muted text-center">No notifications available.</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.unique_id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-line last:border-b-0 cursor-pointer transition-colors ${
                      Number(notification.is_read) ? "bg-white hover:bg-surface-2" : "bg-[#fff8e8] hover:bg-[#fff2cf]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="text-[13px] font-semibold text-ink">{notification.title}</div>
                      <span className="px-2 py-0.5 rounded-full bg-[#eef3d5] text-[10px] font-bold uppercase tracking-wide text-[#5b641d]">
                        {isConsigneeNotification(notification) ? "STORES" : "PAYMENT"}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink-secondary leading-5">{notification.message}</div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-ink-muted">
                      <span>{isConsigneeNotification(notification) ? "PO No" : "Bill No"}: {notification.bill_no}</span>
                      <span>{notification.created_at}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={userRef}>
        <div
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 lg:gap-2 pl-1.5 pr-2 lg:pr-3 py-1.5 rounded-full bg-[linear-gradient(135deg,#fcfdf8_0%,#eef4e1_100%)] border border-[#dce3ca] cursor-pointer hover:border-[#b8c28f] hover:bg-white transition-all"
        >
          <div className="w-[28px] h-[28px] rounded-full bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <span className="max-w-[130px] truncate text-[13px] font-semibold text-[#2e3b1d] hidden sm:block">{displayName}</span>
          <i className="fa fa-chevron-down text-[10px] text-[#7d8665] hidden sm:block" />
        </div>

        {open && (
          <div className="absolute top-[calc(100%+8px)] right-0 min-w-[200px] rounded-[22px] border border-[#e4e8d7] bg-white shadow-[0_22px_40px_rgba(52,67,29,0.14)] overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-[#edf1e4] bg-[linear-gradient(135deg,#fcfdf8_0%,#eef4e1_100%)]">
              <div className="text-[13px] font-semibold text-ink">{displayName}</div>
              <div className="text-[11px] text-ink-muted">{user?.role}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#5d6f32]">
                <i className="fa fa-building text-[10px]" />
                <span className="max-w-[180px] truncate">{companyName}{companyCode ? ` (${companyCode})` : ""}</span>
              </div>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2 text-[13px] text-ink cursor-pointer hover:bg-surface-2">
              <i className="fa fa-user w-4 text-center text-ink-muted" /> Profile
            </div>
            <div
              onClick={() => {
                if (window.confirm("Logout?")) {
                  logout();
                  window.location.href = "/login";
                }
              }}
              className="px-4 py-2.5 flex items-center gap-2 text-[13px] text-danger cursor-pointer hover:bg-danger-light"
            >
              <i className="fa fa-right-from-bracket w-4 text-center" /> Logout
            </div>
          </div>
        )}
      </div>
      </header>

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUserId={currentUserId}
        currentUserName={user?.name || user?.username || "User"}
        onRefresh={() => void loadChatSummary()}
      />
    </>
  );
}


