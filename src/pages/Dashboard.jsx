// ========================== IMPORTS ==========================
import { useState, useEffect } from "react";
import axios from "axios";
import CardStat from "../components/CardStat";
import "./Dashboard.css";

// ========================== API ==========================
const DASHBOARD_API =
  window.location.hostname === "localhost"
    ? "http://localhost:5004"
    : "https://admin-dashboard-server.onrender.com";

// ========================== COMPONENT ==========================
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdraws: 0,
    totalCommission: 0,
    totalProfit: 0,
    activeTournaments: 0,
    totalJoins: 0,
    loading: true,
  });

  const [recent, setRecent] = useState({
    deposits: [],
    withdraws: [],
    joins: [],
  });

  const [topUsers, setTopUsers] = useState([]);

  const [error, setError] = useState(null);

  // ================= FORMAT =================
  const formatMoney = (num) => {
    return `₹${Number(num || 0).toLocaleString("en-IN")}`;
  };

  // ================= FETCH =================
  const fetchDashboard = async () => {
    try {
      setError(null);

      const res = await axios.get(`${DASHBOARD_API}/admin/dashboard`);
      const data = res.data || {};

      setStats({
        totalUsers: data?.summary?.totalUsers || 0,
        totalDeposits: data?.summary?.totalDepositAmount || 0,
        totalWithdraws: data?.summary?.totalWithdrawAmount || 0,
        totalCommission: data?.summary?.totalCommission || 0,
        totalProfit: data?.summary?.totalProfit || 0,
        activeTournaments: data?.summary?.activeTournaments || 0,
        totalJoins: data?.tournaments?.totalJoins || 0,
        loading: false,
      });

      setRecent({
        deposits: data?.recent?.deposits || [],
        withdraws: data?.recent?.withdraws || [],
        joins: data?.recent?.joins || [],
      });

      setTopUsers(data?.topUsers || []);

    } catch (err) {
      console.error("❌ Dashboard fetch error:", err);
      setError("Server not responding");
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  // ================= EFFECT =================
  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(fetchDashboard, 20000); // auto refresh
    return () => clearInterval(interval);
  }, []);

  // ================= LOADING =================
  if (stats.loading) {
    return (
      <div className="loading">
        ⏳ Loading Dashboard...
      </div>
    );
  }

  // ================= ERROR =================
  if (error) {
    return (
      <div className="error-box">
        ❌ {error}
      </div>
    );
  }

  // ================= UI =================
  return (
    <div className="dashboard">

      {/* HEADER */}
      <div className="dashboard-header">
        <h1>🚀 Admin Dashboard</h1>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <CardStat label="Users" value={stats.totalUsers} />
        <CardStat label="Deposits" value={formatMoney(stats.totalDeposits)} />
        <CardStat label="Withdraws" value={formatMoney(stats.totalWithdraws)} />
        <CardStat label="Commission" value={formatMoney(stats.totalCommission)} />
        <CardStat label="Profit" value={formatMoney(stats.totalProfit)} />
        <CardStat label="Active Tournaments" value={stats.activeTournaments} />
        <CardStat label="Total Joins" value={stats.totalJoins} />
      </div>

      {/* TOP USERS */}
      <div className="panel">
        <h2>🏆 Top Users</h2>

        {topUsers.length === 0 ? (
          <p className="empty">No users found</p>
        ) : (
          topUsers.map((u, i) => (
            <div key={i} className="row">
              <span>{u.username || "Unknown"}</span>
              <span>{formatMoney(u.balance)}</span>
            </div>
          ))
        )}
      </div>

      {/* RECENT SECTION */}
      <div className="grid-2">

        {/* DEPOSITS */}
        <div className="panel">
          <h2>💰 Recent Deposits</h2>

          {recent.deposits.length === 0 ? (
            <p className="empty">No deposits</p>
          ) : (
            recent.deposits.map((d, i) => (
              <div key={i} className="row">
                <span>{d.profile_id}</span>
                <span>{formatMoney(d.amount)}</span>
              </div>
            ))
          )}
        </div>

        {/* WITHDRAWS */}
        <div className="panel">
          <h2>💸 Recent Withdraws</h2>

          {recent.withdraws.length === 0 ? (
            <p className="empty">No withdraws</p>
          ) : (
            recent.withdraws.map((w, i) => (
              <div key={i} className="row">
                <span>{w.profile_id}</span>
                <span>{formatMoney(w.withdraw_amount)}</span>
              </div>
            ))
          )}
        </div>

      </div>

      {/* TOURNAMENT JOINS */}
      <div className="panel">
        <h2>🎮 Recent Tournament Joins</h2>

        {recent.joins.length === 0 ? (
          <p className="empty">No joins yet</p>
        ) : (
          recent.joins.map((j, i) => (
            <div key={i} className="row">
              <span>{j.player_name}</span>
              <span>{j.tournament_name}</span>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Dashboard;