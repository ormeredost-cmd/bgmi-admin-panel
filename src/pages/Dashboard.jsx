import React, { useEffect, useState } from "react";
import "./Dashboard.css";

const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5004" 
  : "https://dashboard-server-tera.onrender.com";

const Dashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/tournaments`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setTournaments(data.tournaments);
        setLoading(false);
      });
  }, []);

  const hideTournament = async (id) => {
    setUpdatingId(id);
    await fetch(`${API_BASE}/api/admin/tournaments/${id}/hide`, { method: "PUT" });
    setTournaments(tournaments.map(t => t.id === id ? {...t, is_visible: false} : t));
    setUpdatingId("");
  };

  const unhideTournament = async (id) => {
    setUpdatingId(id);
    await fetch(`${API_BASE}/api/admin/tournaments/${id}/unhide`, { method: "PUT" });
    setTournaments(tournaments.map(t => t.id === id ? {...t, is_visible: true} : t));
    setUpdatingId("");
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Mode</th><th>Entry</th><th>Prize</th><th>Status</th><th>Visible</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map(t => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.name}</td>
              <td>{t.mode}</td>
              <td>₹{t.entry_fee}</td>
              <td>₹{t.prize_pool}</td>
              <td>{t.status}</td>
              <td className={t.is_visible ? "visible" : "hidden"}>
                {t.is_visible ? "Yes" : "No"}
              </td>
              <td>
                {t.is_visible ? 
                  <button className="hide-btn" onClick={() => hideTournament(t.id)} 
                    disabled={updatingId === t.id}>
                    {updatingId === t.id ? "..." : "Hide"}
                  </button> : 
                  <button className="unhide-btn" onClick={() => unhideTournament(t.id)}
                    disabled={updatingId === t.id}>
                    {updatingId === t.id ? "..." : "Unhide"}
                  </button>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;