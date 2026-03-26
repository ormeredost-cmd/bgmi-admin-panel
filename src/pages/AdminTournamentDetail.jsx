// src/pages/AdminTournamentDetail.jsx

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./../styles/tournamentDetail.css";

const TOURNAMENT_API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5004"
    : "https://admin-dashboard-server.onrender.com";

const AdminTournamentDetail = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [users, setUsers] = useState([]); // 2 users hi rahein
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      console.log("Fetching tournament joins for:", id);
      try {
        const res = await axios.get(
          `${TOURNAMENT_API_BASE}/admin/tournament-joins/${id}`
        );
        console.log("Response:", res);
        console.log("users:", res.data.users);

        setTournament(res.data.tournament);
        setUsers(res.data.users || []);
      } catch (err) {
        console.error("Failed to fetch tournament:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [id]);

  const handleApprove = async (userId) => {
    try {
      await axios.put(
        `${TOURNAMENT_API_BASE}/admin/tournament-joins/${id}/approve`,
        { userId }
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: "approved" } : u
        )
      );
    } catch (err) {
      console.error("Approve failed:", err);
    }
  };

  const handleReject = async (userId) => {
    try {
      await axios.put(
        `${TOURNAMENT_API_BASE}/admin/tournament-joins/${id}/reject`,
        { userId }
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: "rejected" } : u
        )
      );
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(
        `${TOURNAMENT_API_BASE}/admin/tournament-joins/${id}`,
        { data: { userId } }
      );
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleWinnerDeclare = async (winnerId) => {
    try {
      await axios.post(
        `${TOURNAMENT_API_BASE}/admin/tournament-declare-winner/${id}`,
        { winnerId }
      );

      // Local UI me bhi winner status
      setUsers((prev) =>
        prev.map((u) =>
          u.id === winnerId
            ? { ...u, status: "winner", walletBonus: 80 }
            : { ...u, status: "loser" }
        )
      );
    } catch (err) {
      console.error("Declare winner failed:", err);
    }
  };

  if (!users.length && loading) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  const slot1 = users[0] || null;
  const slot2 = users[1] || null;

  return (
    <div className="page">
      {/* TOURNAMENT CARD */}
      <div className="tournament-card">
        <h2 className="tournament-title">
          {tournament?.name || "BGMI TDM 1v1"}
        </h2>

        <div className="tournament-details">
          <p>Map: {tournament?.map || "Warehouse"}</p>
          <p>Mode: 1v1 M416</p>
          <p>Time: {tournament?.time || "21:00"}</p>
          <p>Entry: ₹{tournament?.entryFee || 50}</p>
          <p>Prize: ₹{tournament?.prizePool || 80}</p>
          <p>
            Slots: {users.length}/2
            {users.length >= 2 && "🟢 FULL"}
          </p>
        </div>
      </div>

      {/* 1v1 CARD */}
      {users.length > 0 && (
        <div className="battle-card">
          <div className="player-slot">
            {slot1 ? (
              <>
                <p className="user-name">
                  {slot1.player_name}{" "}
                  <span className="user-id">({slot1.bgmi_id})</span>
                </p>
                <div className="user-actions">
                  <button
                    onClick={() => handleApprove(slot1.id)}
                    disabled={slot1.status === "approved"}
                    className="btn-approve"
                  >
                    ✔️ Approve
                  </button>
                  <button
                    onClick={() => handleReject(slot1.id)}
                    disabled={slot1.status === "rejected"}
                    className="btn-reject"
                  >
                    ❌ Reject
                  </button>
                  <button
                    onClick={() => handleDelete(slot1.id)}
                    className="btn-delete"
                  >
                    🗑️ Delete
                  </button>
                </div>
                {slot1.status && (
                  <span
                    className={`status-badge status-${slot1.status}`}
                  >
                    {slot1.status}
                  </span>
                )}
              </>
            ) : (
              <p>Slot 1</p>
            )}
          </div>

          <div className="vs-line">👉 vs 👈</div>

          <div className="player-slot">
            {slot2 ? (
              <>
                <p className="user-name">
                  {slot2.player_name}{" "}
                  <span className="user-id">({slot2.bgmi_id})</span>
                </p>
                <div className="user-actions">
                  <button
                    onClick={() => handleApprove(slot2.id)}
                    disabled={slot2.status === "approved"}
                    className="btn-approve"
                  >
                    ✔️ Approve
                  </button>
                  <button
                    onClick={() => handleReject(slot2.id)}
                    disabled={slot2.status === "rejected"}
                    className="btn-reject"
                  >
                    ❌ Reject
                  </button>
                  <button
                    onClick={() => handleDelete(slot2.id)}
                    className="btn-delete"
                  >
                    🗑️ Delete
                  </button>
                </div>
                {slot2.status && (
                  <span
                    className={`status-badge status-${slot2.status}`}
                  >
                    {slot2.status}
                  </span>
                )}
              </>
            ) : (
              <p>Slot 2</p>
            )}
          </div>
        </div>
      )}

      {/* WINNER BUTTON */}
      {users.length === 2 &&
        users.every((u) => u.status === "approved") && (
          <div className="winner-panel">
            <h3>Declare Winner</h3>
            <button
              onClick={() => handleWinnerDeclare(slot1.id)}
              className="btn-winner"
            >
              {slot1?.player_name} Won (₹80)
            </button>
            <button
              onClick={() => handleWinnerDeclare(slot2.id)}
              className="btn-winner"
            >
              {slot2?.player_name} Won (₹80)
            </button>
          </div>
        )}
    </div>
  );
};

export default AdminTournamentDetail;