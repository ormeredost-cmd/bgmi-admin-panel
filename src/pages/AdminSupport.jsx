import {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import "./AdminSupport.css";

// ======================================================
// API CONFIGURATION (Port 5006 Support Server)
// ======================================================

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]";

const API_BASE = (
  isLocalhost
    ? "http://localhost:5006"
    : import.meta.env.VITE_SUPPORT_API_URL || "https://your-production-support-server.onrender.com"
).replace(/\/$/, "");

// ======================================================
// ADMIN SUPPORT COMPONENT
// ======================================================

const AdminSupport = () => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ======================================================
  // AUTHENTICATED API REQUEST
  // ======================================================

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      throw new Error("Admin token missing. Please login again.");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Admin session expired or unauthorized. Please login again."
        );
      }

      throw new Error(
        data.error ||
          data.message ||
          `Request failed with status ${response.status}`
      );
    }

    return data;
  }, []);

  // ======================================================
  // LOAD ALL CHATS
  // ======================================================

  const loadChats = useCallback(async (showLoading = false) => {
    try {
      if (!localStorage.getItem("adminToken")) {
        throw new Error("Admin login required.");
      }

      if (showLoading) {
        setLoading(true);
      }

      const data = await apiRequest("/api/admin/support/chats");

      const chatList = Array.isArray(data.chats)
        ? data.chats
        : Array.isArray(data.data)
          ? data.data
          : [];

      setChats(chatList);

      // Keep selected chat updated with latest information.
      setActiveChat((previous) => {
        if (!previous) return previous;

        const updatedChat = chatList.find(
          (chat) => String(chat.id) === String(previous.id)
        );

        return updatedChat || previous;
      });

      setError("");
    } catch (err) {
      console.error("Admin support chats error:", err);
      setError(err.message || "Unable to load support chats.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [apiRequest]);

  // ======================================================
  // INITIAL LOAD + CHAT LIST POLLING
  // ======================================================

  useEffect(() => {
    loadChats(true);

    const interval = setInterval(() => {
      loadChats(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadChats]);

  // ======================================================
  // LOAD SELECTED CHAT MESSAGES
  // ======================================================

  const loadMessages = useCallback(async (chatId, showLoading = false) => {
    if (!chatId) return;

    try {
      if (showLoading) {
        setMessagesLoading(true);
      }

      const data = await apiRequest(
        `/api/admin/support/chats/${encodeURIComponent(chatId)}/messages`
      );

      const messageList = Array.isArray(data.messages)
        ? data.messages
        : Array.isArray(data.data)
          ? data.data
          : [];

      setMessages(messageList);
    } catch (err) {
      console.error("Support messages error:", err);
      setError(err.message || "Unable to load messages.");
    } finally {
      if (showLoading) {
        setMessagesLoading(false);
      }
    }
  }, [apiRequest]);

  // ======================================================
  // SELECTED CHAT MESSAGE POLLING
  // ======================================================

  useEffect(() => {
    if (!activeChat?.id) {
      setMessages([]);
      return;
    }

    const chatId = activeChat.id;

    loadMessages(chatId, true);

    const interval = setInterval(() => {
      loadMessages(chatId, false);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeChat?.id, loadMessages]);

  // ======================================================
  // MARK USER MESSAGES AS READ
  // ======================================================

  const markMessagesRead = useCallback(async (chatId) => {
    if (!chatId) return;

    try {
      await apiRequest(
        `/api/admin/support/chats/${encodeURIComponent(chatId)}/read`,
        {
          method: "PUT",
          body: JSON.stringify({}),
        }
      );

      setChats((previous) =>
        previous.map((chat) =>
          String(chat.id) === String(chatId)
            ? { ...chat, admin_unread_count: 0 }
            : chat
        )
      );

      setActiveChat((previous) =>
        previous && String(previous.id) === String(chatId)
          ? { ...previous, admin_unread_count: 0 }
          : previous
      );
    } catch (err) {
      console.error("Mark messages read error:", err);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (!activeChat?.id) return;

    markMessagesRead(activeChat.id);
  }, [activeChat?.id, markMessagesRead]);

  // ======================================================
  // AUTO SCROLL
  // ======================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  // ======================================================
  // SELECT CHAT
  // ======================================================

  const selectChat = (chat) => {
    setActiveChat(chat);
    setMessages([]);
    setError("");
    setSuccess("");
  };

  // ======================================================
  // SEND ADMIN MESSAGE
  // ======================================================

  const sendMessage = async (event) => {
    event.preventDefault();

    const text = message.trim();

    if (!text || sending || !activeChat?.id) return;

    try {
      setSending(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/admin/support/chats/${encodeURIComponent(activeChat.id)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            message: text,
          }),
        }
      );

      const newMessage = data.message_data || data.message_record;

      if (newMessage && typeof newMessage === "object") {
        setMessages((previous) => {
          const exists = previous.some(
            (item) => String(item.id) === String(newMessage.id)
          );

          return exists ? previous : [...previous, newMessage];
        });
      } else {
        await loadMessages(activeChat.id, false);
      }

      setMessage("");
      setSuccess("Message sent successfully.");

      await loadChats(false);

      inputRef.current?.focus();
    } catch (err) {
      console.error("Send support message error:", err);
      setError(err.message || "Message send nahi ho paya.");
    } finally {
      setSending(false);
    }
  };

  // ======================================================
  // HELPERS
  // ======================================================

  const getUserName = (chat) =>
    chat?.profile?.username ||
    chat?.user?.username ||
    chat?.username ||
    chat?.player_name ||
    "Player";

  const getUserEmail = (chat) =>
    chat?.profile?.email ||
    chat?.user?.email ||
    chat?.email ||
    "";

  const getInitial = (name) =>
    String(name || "U").trim().charAt(0).toUpperCase() || "U";

  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredChats = chats.filter((chat) => {
    const searchText = search.toLowerCase();

    return (
      getUserName(chat).toLowerCase().includes(searchText) ||
      getUserEmail(chat).toLowerCase().includes(searchText) ||
      String(chat.last_message || "").toLowerCase().includes(searchText)
    );
  });

  // ======================================================
  // LOGIN CHECK
  // ======================================================

  if (!localStorage.getItem("adminToken")) {
    return (
      <main className="admin-support-page">
        <div className="admin-support-login-error">
          <div className="admin-support-error-icon">🔒</div>
          <h2>Admin Login Required</h2>
          <p>Please login to your admin panel first.</p>
        </div>
      </main>
    );
  }

  // ======================================================
  // LOADING SCREEN
  // ======================================================

  if (loading) {
    return (
      <main className="admin-support-page">
        <div className="admin-support-loading">
          <div className="admin-support-spinner"></div>
          <p>Loading support chats...</p>
        </div>
      </main>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <main className="admin-support-page">
      <div className="admin-support-container">

        {/* PAGE HEADER */}

        <div className="admin-support-header">
          <div>
            <span className="admin-support-label">
              BGMI ESPORTS ADMIN PANEL
            </span>

            <h1>
              LIVE CHAT <span>SUPPORT</span>
            </h1>

            <p>
              Manage player conversations and respond to support requests.
            </p>
          </div>

          <button
            type="button"
            className="admin-support-refresh"
            onClick={() => loadChats(true)}
          >
            ↻ Refresh Chats
          </button>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="admin-support-alert error">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="admin-support-alert success">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Close success"
            >
              ×
            </button>
          </div>
        )}

        {/* CHAT LAYOUT */}

        <div className="admin-support-layout">

          {/* LEFT: USER LIST */}

          <aside className="admin-chat-list">

            <div className="admin-chat-list-header">
              <div>
                <h2>All Conversations</h2>
                <p>Player support inbox</p>
              </div>

              <span className="admin-chat-total">
                {chats.length}
              </span>
            </div>

            <div className="admin-chat-search">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search player..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="admin-chat-users">

              {filteredChats.length === 0 ? (
                <div className="admin-chat-list-empty">
                  <span>💬</span>
                  <p>
                    {search
                      ? "No matching conversations found."
                      : "No support conversations yet."}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const userName = getUserName(chat);

                  return (
                    <button
                      type="button"
                      key={chat.id}
                      className={`admin-chat-user ${
                        String(activeChat?.id) === String(chat.id)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => selectChat(chat)}
                    >
                      <div className="admin-user-avatar">
                        {getInitial(userName)}
                      </div>

                      <div className="admin-user-info">
                        <p className="admin-user-name">
                          {userName}
                        </p>

                        <p className="admin-user-last-message">
                          {chat.last_message || "No messages yet"}
                        </p>
                      </div>

                      <div className="admin-chat-meta">
                        <span className="admin-chat-time">
                          {formatTime(chat.last_message_at)}
                        </span>

                        {Number(chat.admin_unread_count) > 0 && (
                          <span className="admin-unread-badge">
                            {chat.admin_unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}

            </div>
          </aside>

          {/* RIGHT: CHAT WINDOW */}

          <section className="admin-chat-window">

            {!activeChat ? (
              <div className="admin-chat-empty">
                <div className="admin-chat-empty-icon">💬</div>
                <h2>Select a Conversation</h2>
                <p>
                  Select a player from the left side to view messages
                  and reply to their support request.
                </p>
              </div>
            ) : (
              <>
                {/* CHAT HEADER */}

                <div className="admin-chat-header">
                  <div className="admin-chat-user-info">
                    <div className="admin-user-avatar">
                      {getInitial(getUserName(activeChat))}
                    </div>

                    <div>
                      <h3>{getUserName(activeChat)}</h3>
                      <p>{getUserEmail(activeChat) || "Player Support Chat"}</p>
                    </div>
                  </div>

                  <div className="admin-support-live-status">
                    <span></span>
                    Port 5006 Connected
                  </div>
                </div>

                {/* MESSAGE BODY */}

                <div className="admin-chat-body">

                  {messagesLoading ? (
                    <div className="admin-chat-message-loading">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="admin-chat-no-messages">
                      <span>👋</span>
                      <h3>Start the conversation</h3>
                      <p>No messages in this conversation yet.</p>
                    </div>
                  ) : (
                    messages.map((item) => {
                      const isAdmin = item.sender_type === "admin";

                      return (
                        <div
                          key={item.id}
                          className={`admin-message-row ${
                            isAdmin
                              ? "admin-message-right"
                              : "admin-message-left"
                          }`}
                        >
                          <div className="admin-message-content">

                            <div className="admin-message-name">
                              {isAdmin ? "You" : getUserName(activeChat)}
                            </div>

                            <div className="admin-message-bubble">
                              {item.image_url && (
                                <a
                                  href={item.image_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={item.image_url}
                                    alt="Player attachment"
                                    className="admin-message-image"
                                  />
                                </a>
                              )}

                              {item.message && (
                                <p>{item.message}</p>
                              )}
                            </div>

                            <div className="admin-message-time">
                              {formatTime(item.created_at)}
                            </div>

                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* MESSAGE INPUT */}

                <form
                  className="admin-chat-input-area"
                  onSubmit={sendMessage}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Type your reply to player..."
                    maxLength={1000}
                    disabled={sending}
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || sending}
                  >
                    {sending ? "SENDING..." : "SEND ➤"}
                  </button>
                </form>

                <div className="admin-chat-footer">
                  Press Enter or click Send to reply
                </div>
              </>
            )}

          </section>
        </div>
      </div>
    </main>
  );
};

export default AdminSupport;