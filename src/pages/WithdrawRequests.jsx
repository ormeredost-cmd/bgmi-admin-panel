import { useEffect, useState, useCallback } from "react";
import "./WithdrawRequests.css";

const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5003"  // ✅ WALLET SERVER 5003 (Primary)
    : "https://withdraw-server.onrender.com";

const BACKUP_API =
  window.location.hostname === "localhost"
    ? "http://localhost:5002"  // ✅ Backup Server 5002  
    : "https://deposit-and-join-tournament-server.onrender.com";

const WithdrawRequests = () => {
  const [withdraws, setWithdraws] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ============================= DATE FORMAT (INDIA) ============================= */
  const formatIndianDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (err) {
      return dateString;
    }
  };

  /* ============================= FETCH WITHDRAW REQUESTS (DEBUG + ERROR HANDLING) ============================= */
  const fetchWithdraws = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 Trying 5003:", `${API}/api/admin/withdraw-requests`);

      // ✅ Primary: Wallet Server 5003
      let res = await fetch(`${API}/api/admin/withdraw-requests`, { 
        cache: 'no-store' 
      });
      
      if (!res.ok) {
        console.log(`❌ 5003 failed (${res.status}):`, await res.text());
        
        // ✅ Backup: Tournament Server 5002
        console.log("🔄 Trying 5002:", `${BACKUP_API}/api/admin/withdraw-requests`);
        res = await fetch(`${BACKUP_API}/api/admin/withdraw-requests`, { 
          cache: 'no-store' 
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`❌ 5002 also failed (${res.status}):`, errorText);
          throw new Error(`Both servers down (${res.status})`);
        }
      }

      const data = await res.json();
      console.log("✅ Data loaded:", data);
      
      // Handle different response formats
      const withdrawList = data.withdraws || data.data || data || [];
      setWithdraws(withdrawList);
      
    } catch (err) {
      console.error("💥 Fetch error:", err);
      setError(`Server Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [API, BACKUP_API]);

  useEffect(() => {
    fetchWithdraws();
  }, [fetchWithdraws]);

  /* ============================= UPDATE STATUS ============================= */
  const updateStatus = async (id, status) => {
    try {
      console.log(`🔄 Updating ${id} to ${status} on 5003...`);
      
      // Primary: Wallet Server 5003
      let res = await fetch(`${API}/api/admin/withdraw-status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        console.log("⚠️ 5003 update failed, trying 5002...");
        res = await fetch(`${BACKUP_API}/api/admin/withdraw-status/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
      }

      if (res.ok) {
        console.log("✅ Status updated!");
        fetchWithdraws();
      } else {
        alert("Update failed - Check console");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Network error");
    }
  };

  /* ============================= DELETE WITHDRAW ============================= */
  const deleteWithdraw = async (id) => {
    if (!window.confirm("Are you sure you want to delete this withdraw request?")) return;

    try {
      let res = await fetch(`${API}/api/admin/withdraw/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        res = await fetch(`${BACKUP_API}/api/admin/withdraw/${id}`, {
          method: "DELETE"
        });
      }

      if (res.ok) {
        fetchWithdraws();
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  /* ============================= FILTER ============================= */
  const filteredWithdraws = withdraws.filter(
    (w) => w.status === filter
  );

  const getCount = (s) =>
    withdraws.filter((w) => w.status === s).length;

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        🔄 Loading withdraw requests...
        <br />
        <small>Checking servers 5003 & 5002...</small>
      </div>
    );
  }

  return (
    <div className="withdraw-admin">
      <h2>💸 Withdraw Requests (Admin)</h2>

      {/* FILTER */}
      <div className="withdraw-filter">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            className={filter === s ? "active" : ""}
            onClick={() => setFilter(s)}
          >
            {s.toUpperCase()} ({getCount(s)})
          </button>
        ))}
      </div>

      {error && (
        <div style={{ 
          color: "red", 
          background: "#fee", 
          padding: "12px", 
          borderRadius: "8px", 
          marginBottom: "16px",
          border: "1px solid #f87171"
        }}>
          ❌ {error}
          <br />
          <small>
            🔍 Check Console (F12) → Network tab for details
          </small>
        </div>
      )}

      {/* TABLE */}
      <table className="withdraw-table">
        <thead>
          <tr>
            <th>Profile Name</th>
            <th>Profile ID</th>
            <th>Email</th>
            <th>Withdraw ID</th>
            <th>Amount</th>
            <th>Date/Time (IST)</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredWithdraws.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                {error ? "⚠️ No data - Server issue" : `No ${filter} withdraw requests`}
                <br />
                <small style={{ color: "#6b7280" }}>
                  {error ? "Start wallet server (5003)" : "All good!"}
                </small>
              </td>
            </tr>
          ) : (
            filteredWithdraws.map((w) => (
              <tr key={w.id}>
                <td>{w.profile_name || "Unknown"}</td>
                <td>{w.profile_id}</td>
                <td>{w.user_email}</td>
                <td>{w.withdraw_id}</td>
                <td>₹{w.withdraw_amount}</td>
                <td>{w.date_ist || formatIndianDate(w.created_at)}</td>
                <td>
                  <span className={`status ${w.status}`}>
                    {w.status}
                  </span>
                </td>
                <td>
                  {w.status === "pending" ? (
                    <>
                      <button 
                        className="approve"
                        onClick={() => updateStatus(w.id, "approved")}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="reject"
                        onClick={() => updateStatus(w.id, "rejected")}
                      >
                        ❌ Reject
                      </button>
                    </>
                  ) : (
                    <button 
                      className="delete-btn"
                      onClick={() => deleteWithdraw(w.id)}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* DEBUG INFO */}
      {!loading && !error && withdraws.length === 0 && (
        <div style={{ 
          padding: "12px", 
          background: "#eff6ff", 
          borderRadius: "8px", 
          marginTop: "16px",
          fontSize: "13px"
        }}>
          ℹ️ Debug: Connected to servers but no withdraw data yet
          <br />💡 Send a test withdraw request from user app
        </div>
      )}
    </div>
  );
};

export default WithdrawRequests;
