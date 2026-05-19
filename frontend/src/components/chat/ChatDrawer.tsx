import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import AscentLinkHubLogo from "./AscentLinkHubLogo";
import SearchableSelect from "../common/SearchableSelect";
import {
  fetchChatConversations,
  fetchChatMessages,
  fetchChatUsers,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
  type ChatUser,
} from "../../api/chatApi";

type ChatDrawerProps = {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  onRefresh?: () => void | Promise<void>;
};

type ChatPeer = ChatUser | ChatConversation;

function getDisplayName(user: Partial<ChatPeer> | null | undefined) {
  if (!user) return "Select a user";
  return user.staff_name?.trim() || user.user_name?.trim() || user.staff_id?.trim() || "User";
}

function getDisplayMeta(user: Partial<ChatPeer> | null | undefined) {
  if (!user) return "";
  const parts = [user.user_type?.trim(), user.staff_id?.trim()].filter(Boolean);
  return parts.join(" • ");
}

function getInitials(user: Partial<ChatPeer> | null | undefined) {
  const base = getDisplayName(user);
  const parts = base.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function formatConversationPreview(conversation: ChatConversation, currentUserId: string) {
  if (!conversation.last_message) return "Start a new conversation";
  const prefix = conversation.last_sender_user_id === currentUserId ? "You: " : "";
  return `${prefix}${conversation.last_message}`;
}

export default function ChatDrawer({
  open,
  onClose,
  currentUserId,
  currentUserName,
  onRefresh,
}: ChatDrawerProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const usersById = useMemo(() => new Map(users.map((user) => [user.unique_id, user])), [users]);
  const conversationsById = useMemo(
    () => new Map(conversations.map((conversation) => [conversation.other_user_id, conversation])),
    [conversations]
  );

  const activePeer = useMemo<ChatPeer | null>(() => {
    if (!activeUserId) return null;
    return usersById.get(activeUserId) ?? conversationsById.get(activeUserId) ?? null;
  }, [activeUserId, usersById, conversationsById]);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.unique_id,
        label: `${getDisplayName(user)}${user.user_type ? ` • ${user.user_type}` : ""}`,
        keywords: [user.staff_id, user.user_name, user.email_id, user.mobile_no].filter(Boolean).join(" "),
      })),
    [users]
  );

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetchChatUsers("", 250);
      setUsers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await fetchChatConversations(30);
      setConversations(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (targetUserId: string) => {
    if (!targetUserId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const res = await fetchChatMessages(targetUserId, 200);
      setMessages(res.data || []);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!open || !currentUserId) return;
    setError("");
    void Promise.all([loadUsers(), loadConversations()]);
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open || !currentUserId) return;
    const timer = window.setInterval(() => {
      void loadConversations();
      if (activeUserId) {
        void loadMessages(activeUserId);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [open, currentUserId, activeUserId]);

  useEffect(() => {
    if (!open) return;
    if (activeUserId) return;
    if (conversations.length > 0) {
      setActiveUserId(conversations[0].other_user_id);
    }
  }, [open, conversations, activeUserId]);

  useEffect(() => {
    if (!open || !activeUserId) return;
    void loadMessages(activeUserId);
  }, [open, activeUserId]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const handleSelectUser = (userId: string) => {
    setActiveUserId(userId);
    setDraft("");
    setError("");
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!activeUserId || !text || sending) return;

    setSending(true);
    setError("");
    try {
      const res = await sendChatMessage(activeUserId, text);
      if (!res.status || !res.data) throw new Error(res.message || "Failed to send chat message.");
      setMessages((prev) => [...prev, res.data as ChatMessage]);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "52px";
      await loadConversations();
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send chat message.");
    } finally {
      setSending(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[96]">
      <div className="absolute inset-0 bg-[#1f2d16]/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-3 top-[88px] bottom-3 md:inset-x-auto md:right-5 md:top-[92px] md:bottom-5 md:w-[min(960px,calc(100vw-332px))]">
        <div className="h-full overflow-hidden rounded-[30px] border border-[#d8e1c4] bg-[linear-gradient(180deg,#f8fbf3_0%,#f1f6e8_100%)] shadow-[0_30px_70px_rgba(33,52,18,0.22)]">
          <div className="flex h-full flex-col md:flex-row">
            <aside className="flex w-full shrink-0 flex-col border-b border-[#dfe6cf] bg-[linear-gradient(180deg,#edf5de_0%,#f6f9ef_100%)] md:w-[320px] md:border-b-0 md:border-r">
              <div className="border-b border-[#dde6ca] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <AscentLinkHubLogo subtitle="Connect instantly" />
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d4dcc0] bg-white text-[#5d6942] transition-colors hover:border-[#aab88b] hover:text-[#4f7a2b] cursor-pointer"
                  >
                    <i className="fa fa-xmark text-[18px]" />
                  </button>
                </div>
                <div className="mt-4">
                  <SearchableSelect
                    value={activeUserId}
                    onChange={handleSelectUser}
                    options={userOptions}
                    placeholder={loadingUsers ? "Loading users..." : "Select a teammate"}
                    searchPlaceholder="Search name, ID, email..."
                    className="w-full"
                    buttonClassName="py-3.5 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-5 py-3 text-[12px] text-[#73815a]">
                <span className="font-semibold uppercase tracking-[0.14em]">Recent Chats</span>
                <span>{loadingConversations ? "Refreshing..." : `${conversations.length} chats`}</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                {conversations.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#ced8b9] bg-white/75 px-4 py-6 text-center text-[13px] text-[#7d8665]">
                    Start a chat by choosing any user from the selector above.
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const isActive = conversation.other_user_id === activeUserId;
                    return (
                      <button
                        key={conversation.other_user_id}
                        type="button"
                        onClick={() => handleSelectUser(conversation.other_user_id)}
                        className={`mb-2 flex w-full items-start gap-3 rounded-[24px] border px-3 py-3 text-left transition-all cursor-pointer ${
                          isActive
                            ? "border-[#8eaf54] bg-[linear-gradient(135deg,#f8ffe9_0%,#eef7d8_100%)] shadow-[0_14px_28px_rgba(94,129,40,0.16)]"
                            : "border-[#e2e8d5] bg-white/88 hover:border-[#c4d2a4] hover:bg-white"
                        }`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6f9535_0%,#4f7a2b_100%)] text-[13px] font-bold text-white">
                          {getInitials(conversation)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="truncate text-[14px] font-semibold text-[#233116]">{getDisplayName(conversation)}</div>
                            <div className="shrink-0 text-[10.5px] text-[#7f8a68]">{conversation.last_message_at || ""}</div>
                          </div>
                          <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#5f6d48]">
                            {formatConversationPreview(conversation, currentUserId)}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#8a9572]">{getDisplayMeta(conversation)}</div>
                            {Number(conversation.unread_count || 0) > 0 ? (
                              <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#4f7a2b] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {Number(conversation.unread_count) > 9 ? "9+" : conversation.unread_count}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#f4f8ea_0%,#eef5e0_100%)]">
              {activePeer ? (
                <>
                  <div className="flex items-center gap-3 border-b border-[#dfe6cf] bg-white/75 px-5 py-4 backdrop-blur">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7aa53c_0%,#4f7a2b_100%)] text-[13px] font-bold text-white">
                      {getInitials(activePeer)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-bold text-[#223016]">{getDisplayName(activePeer)}</div>
                      <div className="truncate text-[11.5px] text-[#708055]">{getDisplayMeta(activePeer) || "Two-way direct chat"}</div>
                    </div>
                  </div>

                  <div
                    className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 25px 25px, rgba(126,160,76,0.10) 2px, transparent 0), radial-gradient(circle at 75px 75px, rgba(126,160,76,0.08) 2px, transparent 0)",
                      backgroundSize: "100px 100px",
                    }}
                  >
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center text-[13px] text-[#7b8767]">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="max-w-[320px] rounded-[28px] border border-[#dce5c8] bg-white/92 px-5 py-6 text-center shadow-[0_18px_36px_rgba(66,88,27,0.10)]">
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7aa53c_0%,#4f7a2b_100%)] text-white">
                            <i className="fa fa-comments text-[20px]" />
                          </div>
                          <div className="text-[15px] font-semibold text-[#233116]">No messages yet</div>
                          <div className="mt-2 text-[12px] leading-5 text-[#718058]">
                            Say hello to {getDisplayName(activePeer)} and start the conversation.
                          </div>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const mine = message.sender_user_id === currentUserId;
                        return (
                          <div key={message.unique_id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[82%] rounded-[24px] px-4 py-3 shadow-sm ${
                                mine
                                  ? "rounded-br-[8px] bg-[linear-gradient(135deg,#dff1bf_0%,#cfe89f_100%)] text-[#243416]"
                                  : "rounded-bl-[8px] border border-[#dfe6cf] bg-white text-[#314122]"
                              }`}
                            >
                              <div className="whitespace-pre-wrap break-words text-[13px] leading-6">{message.message_text}</div>
                              <div className={`mt-2 flex items-center justify-end gap-2 text-[10.5px] ${mine ? "text-[#5f7440]" : "text-[#869275]"}`}>
                                <span>{message.created_at}</span>
                                {mine ? <i className={`fa fa-check-double ${Number(message.is_read) ? "text-[#4f7a2b]" : "text-[#91a17b]"}`} /> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messageEndRef} />
                  </div>

                  <div className="border-t border-[#dfe6cf] bg-white/88 px-4 py-4 backdrop-blur md:px-5">
                    {error ? (
                      <div className="mb-3 rounded-2xl border border-[#efc7c7] bg-[#fff3f2] px-4 py-2 text-[12px] text-[#b14b4b]">{error}</div>
                    ) : null}
                    <div className="flex items-end gap-3">
                      <textarea name="draft"
                        ref={textareaRef}
                        value={draft}
                        onChange={(event) => {
                          setDraft(event.target.value);
                          event.target.style.height = "52px";
                          event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSend();
                          }
                        }}
                        rows={1}
                        placeholder={`Message ${getDisplayName(activePeer)}...`}
                        className="min-h-[52px] flex-1 resize-none rounded-[24px] border border-[#d5dfbf] bg-[#f8fbf1] px-4 py-3 text-[13px] text-[#2b391d] outline-none transition focus:border-[#7ea04c] focus:ring-4 focus:ring-[#8db356]/15"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={!draft.trim() || sending}
                        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[#4f7a2b] bg-[linear-gradient(135deg,#7aa53c_0%,#4f7a2b_100%)] text-white shadow-[0_16px_30px_rgba(79,122,43,0.24)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        {sending ? <i className="fa fa-spinner animate-spin" /> : <i className="fa fa-paper-plane" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="max-w-[360px] rounded-[32px] border border-[#dbe5c5] bg-white/92 px-6 py-7 text-center shadow-[0_20px_40px_rgba(66,88,27,0.10)]">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7aa53c_0%,#4f7a2b_100%)] text-white">
                      <i className="fa fa-comment-dots text-[24px]" />
                    </div>
                    <div className="text-[18px] font-bold text-[#233116]">Welcome, {currentUserName || "User"}</div>
                    <div className="mt-2 text-[13px] leading-6 text-[#6f7e55]">
                      Pick any teammate from the left and start chatting in a new WhatsApp-style workspace.
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
