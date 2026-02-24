import { useEffect, useState, useCallback } from "react";
import "./WithdrawRequests.css";

const PRIMARY_API =
  window.location.hostname === "localhost"
    ? "http://localhost:5003"
    : "https://withdraw-server.onrender.com";

const BACKUP_API =
  window.location.hostname === "localhost"
    ? "http://localhost:5002"
    : "https://deposit-and-join-tournament-server.onrender.com";

const WithdrawRequests = () => {
  const [withdraws, setWithdraws] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  /* ================= DATE FORMAT ================= */
  const formatIndianDate = (dateString) => {
    if (!dateString) return "-";
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
  };

  /* ================= FETCH ================= */
  const fetchWithdraws = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let res = await fetch(`${PRIMARY_API}/api/admin/withdraw-requests`, {
        cache: "no-store",
      });

      if (!res.ok) {
        res = await fetch(`${BACKUP_API}/api/admin/withdraw-requests`, {
          cache: "no-store",
        });
      }

      if (!res.ok) throw new Error("Server not responding");

      const data = await res.json();
      setWithdraws(data.withdraws || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdraws();
  }, [fetchWithdraws]);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (withdrawId, status) => {
    if (processingId) return;
    setProcessingId(withdrawId);

    try {
      let res = await fetch(
        `${PRIMARY_API}/api/admin/withdraw-status/${withdrawId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (!res.ok) {
        res = await fetch(
          `${BACKUP_API}/api/admin/withdraw-status/${withdrawId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
      }

      if (!res.ok) throw new Error("Update failed");

      await fetchWithdraws();
    } catch (err) {
      alert("Status update failed");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= DELETE ================= */
  const deleteWithdraw = async (withdrawId) => {
    if (!window.confirm("Delete this withdraw request?")) return;

    try {
      let res = await fetch(
        `${PRIMARY_API}/api/admin/withdraw/${withdrawId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        res = await fetch(
          `${BACKUP_API}/api/admin/withdraw/${withdrawId}`,
          { method: "DELETE" }
        );
      }

      if (!res.ok) throw new Error("Delete failed");

      fetchWithdraws();
    } catch {
      alert("Delete failed");
    }
  };

  /* ================= FILTER ================= */
  const filtered = withdraws.filter((w) => w.status === filter);
  const getCount = (s) => withdraws.filter((w) => w.status === s).length;

  if (loading) {
    return <div style={{ padding: 40 }}>🔄 Loading withdraw requests...</div>;
  }

  return (
    <div className="withdraw-admin">
      <h2>💸 Withdraw Requests (Admin)</h2>

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
        <div style={{ color: "red", marginBottom: 15 }}>
          ❌ {error}
        </div>
      )}

      <table className="withdraw-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Profile ID</th>
            <th>Email</th>
            <th>Withdraw ID</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: "center", padding: 30 }}>
                No {filter} withdraw requests
              </td>
            </tr>
          ) : (
            filtered.map((w) => (
              <tr key={w.withdraw_id}>
                <td>{w.profile_name}</td>
                <td>{w.profile_id}</td>
                <td>{w.user_email}</td>
                <td>{w.withdraw_id}</td>
                <td>₹{w.withdraw_amount}</td>
                <td>{formatIndianDate(w.created_at)}</td>
                <td>
                  <span className={`status ${w.status}`}>
                    {w.status}
                  </span>
                </td>
                <td>
                  {w.status === "pending" ? (
                    <>
                      <button
                        disabled={processingId === w.withdraw_id}
                        className="approve"
                        onClick={() =>
                          updateStatus(w.withdraw_id, "approved")
                        }
                      >
                        ✅ Approve
                      </button>
                      <button
                        disabled={processingId === w.withdraw_id}
                        className="reject"
                        onClick={() =>
                          updateStatus(w.withdraw_id, "rejected")
                        }
                      >
                        ❌ Reject
                      </button>
                    </>
                  ) : (
                    <button
                      className="delete-btn"
                      onClick={() =>
                        deleteWithdraw(w.withdraw_id)
                      }
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
    </div>
  );
};

export default WithdrawRequests;