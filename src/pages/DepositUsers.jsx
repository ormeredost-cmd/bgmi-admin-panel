import { useEffect, useState, useCallback } from "react";
import "./DepositUsers.css";

const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5002"
    : "https://bgmi-server-save-tournament-data.onrender.com";

const DepositUsers = () => {
  const [deposits, setDeposits] = useState([]);
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

  /* ============================= FETCH DEPOSITS ============================= */
  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/api/admin/deposits`);
      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();
      setDeposits(data.deposits || []);
    } catch (err) {
      setError("Server down");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  /* ============================= UPDATE STATUS (API CALL) ============================= */
  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API}/api/admin/deposit-status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchDeposits(); // Refresh data from Supabase
      } else {
        alert("Update failed");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  /* ============================= DELETE DEPOSIT (API CALL) ============================= */
  const deleteDeposit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this deposit?")) return;

    try {
      const res = await fetch(`${API}/api/admin/deposit/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        fetchDeposits(); // Refresh data from Supabase
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  /* ============================= FILTER ============================= */
  const filteredDeposits = deposits.filter(
    (d) => d.status === filter
  );

  const getCount = (s) =>
    deposits.filter((d) => d.status === s).length;

  if (loading) return <div style={{ padding: 50 }}>🔄 Loading deposits...</div>;

  /* ============================= RENDER ============================= */
  return (
    <div className="deposit-admin">
      <h2>💰 Deposit Requests (Admin)</h2>

      {/* FILTER */}
      <div className="deposit-filter">
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

      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* TABLE */}
      <table className="deposit-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Profile ID</th>
            <th>Email</th>
            <th>Amount</th>
            <th>UTR</th>
            <th>Date/Time (IST)</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredDeposits.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: "center" }}>
                No {filter} deposits
              </td>
            </tr>
          ) : (
            filteredDeposits.map((d) => (
              <tr key={d.id}>
                <td>{d.name || "Unknown"}</td>
                <td>{d.profile_id}</td>
                <td>{d.email}</td>
                <td>₹{d.amount}</td>
                <td>{d.utr}</td>
                <td>{d.date_ist || formatIndianDate(d.date)}</td>
                <td>{d.status}</td>
                <td>
                  {d.status === "pending" ? (
                    <>
                      <button 
                        onClick={() => updateStatus(d.id, "approved")}
                        style={{ marginRight: 5, background: '#4CAF50' }}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        onClick={() => updateStatus(d.id, "rejected")}
                        style={{ marginRight: 5, background: '#f44336' }}
                      >
                        ❌ Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => deleteDeposit(d.id)}
                        style={{ 
                          color: 'red', 
                          background: 'none', 
                          border: '1px solid red',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </>
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

export default DepositUsers;