import { useEffect, useState } from "react";
import axios from "axios";

// 🔥 USER SERVER (5001) - registeruser table
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : "https://main-server-firebase.onrender.com";

// 🔥 DEPOSIT SERVER (5002) - DepositUser table  
const DEPOSIT_API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5002"
    : "https://bgmi-server-save-tournament-data.onrender.com";

const RegisterUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===============================
    LOAD USERS FROM SERVER (5001)
  =============================== */
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("🔍 Loading BGMI users from 5001:", `${API_BASE}/api/admin/users`);
      const res = await axios.get(`${API_BASE}/api/admin/users`);
      console.log("🔍 API Response:", res.data);

      if (!res.data?.users?.length) {
        setUsers([]);
        console.log("✅ ADMIN USERS LOADED: 0 users");
        return;
      }

      const list = res.data.users.map((u, idx) => ({
        id: u.id,
        index: idx + 1,
        profileId: u.profile_id,
        name: u.username,
        email: u.email,
        userPassword: u["User Password"] || "******",
        balance: u.balance || 0,
        register_time_ist: u.register_time_ist,
        createdAt: u.register_time_ist
          ? new Date(u.register_time_ist + " Asia/Kolkata")
          : new Date(u.createdAt),
      }));

      setUsers(list);
      console.log("✅ ADMIN USERS LOADED:", list.length, "users");
    } catch (err) {
      console.error("❌ Load users error:", err.response?.data || err.message);
      setError(
        `Failed to load users: ${err.response?.statusText || "Server not reachable"}`
      );
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
    🔥 CLEAR APPROVED DEPOSITS (5002 SERVER - WALLET SAFE!)
  =============================== */
  const clearApprovedHistory = async (profileId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Clear APPROVED deposits for ${profileId}?\n\n✅ Wallet balance SAME rahega!\n💰 Sirf DepositUser history saaf hogi`)) return;

    try {
      console.log("🧹 Clearing approved history for:", profileId);
      console.log("📡 Calling DEPOSIT SERVER (5002):", `${DEPOSIT_API_BASE}/api/admin/clear-approved/${profileId}`);
      
      const res = await axios.delete(`${DEPOSIT_API_BASE}/api/admin/clear-approved/${profileId}`);
      
      console.log("✅ DEPOSIT SERVER RESPONSE:", res.data);
      
      if (res.data.success) {
        // eslint-disable-next-line no-restricted-globals
        alert(`✅ ${res.data.cleared || 0} approved deposits cleared!\n💰 Wallet balance safe!`);
        loadUsers(); // Refresh user list
      } else {
        // eslint-disable-next-line no-restricted-globals
        alert("❌ Server returned error response");
      }
    } catch (err) {
      console.error("❌ Clear history error:", err.response?.status, err.response?.data || err.message);
      // eslint-disable-next-line no-restricted-globals
      alert(`❌ Failed to clear history\nStatus: ${err.response?.status || 'Unknown'}`);
    }
  };

  /* ===============================
    DELETE USER (5001 SERVER)
  =============================== */
  const handleDelete = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Delete this BGMI player permanently?")) return;

    try {
      await axios.delete(`${API_BASE}/api/admin/users/${id}`);
      loadUsers();
      console.log("🗑️ User deleted:", id);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Delete failed - try again");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">👥 BGMI Esports – Registered Players</h2>
        <p className="page-subtitle">Admin View - {users.length} Players Total</p>
        <button
          onClick={loadUsers}
          className="btn-refresh"
          style={{
            padding: "8px 16px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fee",
            color: "#c53030",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            borderLeft: "4px solid #f56565",
          }}
        >
          ❌ {error}
          <br />
          <small>Make sure BGMI backend is running</small>
        </div>
      )}

      {loading && (
        <div
          style={{
            background: "#ebf8ff",
            color: "#2c5282",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          ⏳ Loading registered BGMI players...
        </div>
      )}

      <div className="table-container" style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <thead style={{ background: "#f7fafc" }}>
            <tr>
              <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600" }}>
                #
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600" }}>
                Profile ID
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600" }}>
                Name
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600" }}>
                Email
              </th>
              <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>
                Password
              </th>
              <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>
                Balance
              </th>
              <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600" }}>
                Register Time
              </th>
              <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <td style={{ padding: "12px 8px", fontWeight: "500" }}>{u.index}</td>
                <td style={{ padding: "12px 8px" }}>
                  <strong
                    style={{
                      color: "#ff4444",
                      fontFamily: "monospace",
                      background: "#fff5f5",
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {u.profileId}
                  </strong>
                </td>
                <td style={{ padding: "12px 8px", fontWeight: "600" }}>{u.name}</td>
                <td style={{ padding: "12px 8px" }}>
                  <small style={{ color: "#666" }}>{u.email}</small>
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  <small style={{ color: "#000", fontFamily: "monospace" }}>
                    {u.userPassword}
                  </small>
                </td>
                <td
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    fontWeight: "bold",
                    color: u.balance > 0 ? "#38a169" : "#666",
                  }}
                >
                  ₹{u.balance.toLocaleString()}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <small style={{ color: "#666" }}>
                    {u.createdAt.toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </small>
                </td>
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  {/* 🔥 NEW BUTTON - CLEAR APPROVED HISTORY (5002 SERVER) */}
                  <button
                    onClick={() => clearApprovedHistory(u.profileId)}
                    style={{
                      padding: "6px 10px",
                      marginRight: "4px",
                      background: "#FF5722",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "500",
                    }}
                    title="Clear only APPROVED deposits from 5002 server (Wallet safe)"
                  >
                    🧹 Clear Approved
                  </button>

                  <button
                    className="btn-secondary"
                    disabled
                    title="Coming soon"
                    style={{
                      padding: "6px 12px",
                      marginRight: "4px",
                      background: "#cbd5e0",
                      color: "#4a5568",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "not-allowed",
                      fontSize: "12px",
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(u.id)}
                    style={{
                      padding: "6px 12px",
                      background: "#f56565",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    padding: "60px",
                    textAlign: "center",
                    color: "#a0aec0",
                  }}
                >
                  <div>
                    👥 No BGMI players registered yet
                    <br />
                    <small style={{ fontSize: "14px" }}>
                      Players will appear here after registration from frontend
                    </small>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegisterUsers;
