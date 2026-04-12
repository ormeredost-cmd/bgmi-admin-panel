import React, { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5004"
    : "https://dashboard-server-tera.onrender.com";

const defaultStats = {
  totalUsers: 0,
  activeUsers: 0,
  totalDeposits: 0,
  totalWithdraws: 0,
  commission: 0,
  netProfit: 0,
  totalTournaments: 0,
  pendingWithdrawals: 0,
  liveTournaments: 0,
  upcomingTournaments: 0,
  completedTournaments: 0,
  totalJoins: 0
};

const defaultDashboardData = {
  stats: defaultStats,
  recentUsers: [],
  recentTournaments: [],
  recentTransactions: [],
  recentJoins: []
};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const normalizeStatusClass = (value) => {
  const status = String(value || "").trim().toLowerCase();

  if (
    [
      "success",
      "approved",
      "completed",
      "active",
      "verified",
      "live",
      "vip",
      "paid",
      "registered",
      "joined"
    ].includes(status)
  ) {
    return "success";
  }

  if (["pending", "review", "processing", "upcoming"].includes(status)) {
    return "pending";
  }

  if (
    ["rejected", "failed", "blocked", "danger", "cancelled"].includes(status)
  ) {
    return "rejected";
  }

  return "neutral";
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("transactions");
  const [range, setRange] = useState("30d");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dashboardData, setDashboardData] = useState(defaultDashboardData);

  useEffect(() => {
    let ignore = false;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/api/admin/dashboard?range=${range}`
        );

        const text = await response.text();

        let result;
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error(text || "Invalid server response");
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || result.message || "Failed to fetch dashboard data"
          );
        }

        if (ignore) return;

        setDashboardData({
          stats: { ...defaultStats, ...(result.stats || {}) },
          recentUsers: Array.isArray(result.recentUsers)
            ? result.recentUsers
            : [],
          recentTournaments: Array.isArray(result.recentTournaments)
            ? result.recentTournaments
            : [],
          recentTransactions: Array.isArray(result.recentTransactions)
            ? result.recentTransactions
            : [],
          recentJoins: Array.isArray(result.recentJoins)
            ? result.recentJoins
            : []
        });
      } catch (err) {
        if (ignore) return;
        console.error("Dashboard fetch error:", err);
        setError(
          err.message || "Something went wrong while loading dashboard"
        );
        setDashboardData(defaultDashboardData);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      ignore = true;
    };
  }, [range, refreshKey]);

  const {
    stats,
    recentUsers,
    recentTournaments,
    recentTransactions,
    recentJoins
  } = dashboardData;

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      range,
      ...dashboardData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-report-${range}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      title: "Total Users",
      value: formatNumber(stats.totalUsers),
      change: `${formatNumber(stats.activeUsers)} Active`,
      icon: "👥",
      tone: "cyan"
    },
    {
      title: "Active Users",
      value: formatNumber(stats.activeUsers),
      change: "Live user base",
      icon: "🔥",
      tone: "purple"
    },
    {
      title: "Deposits",
      value: formatCurrency(stats.totalDeposits),
      change: "Approved deposits",
      icon: "💰",
      tone: "green"
    },
    {
      title: "Withdrawals",
      value: formatCurrency(stats.totalWithdraws),
      change: "Approved withdraws",
      icon: "🏧",
      tone: "orange"
    },
    {
      title: "Commission",
      value: formatCurrency(stats.commission),
      change: "Platform share",
      icon: "📈",
      tone: "gold"
    },
    {
      title: "Net Profit",
      value: formatCurrency(stats.netProfit),
      change: "Live margin",
      icon: "🧾",
      tone: "pink"
    },
    {
      title: "Tournaments",
      value: formatNumber(stats.totalTournaments),
      change: `${formatNumber(stats.liveTournaments)} Live`,
      icon: "🏆",
      tone: "blue"
    },
    {
      title: "Pending Withdraw",
      value: formatNumber(stats.pendingWithdrawals),
      change: "Needs Review",
      icon: "⏳",
      tone: "red"
    }
  ];

  const financeData = [
    { label: "Total Deposit", value: formatCurrency(stats.totalDeposits) },
    { label: "Total Withdraw", value: formatCurrency(stats.totalWithdraws) },
    { label: "Commission", value: formatCurrency(stats.commission) },
    { label: "Net Profit", value: formatCurrency(stats.netProfit) },
    { label: "Tournament Joins", value: formatNumber(stats.totalJoins) },
    { label: "Active Users", value: formatNumber(stats.activeUsers) }
  ];

  const alertData = [
    {
      text: `${formatNumber(
        stats.pendingWithdrawals
      )} withdrawals waiting for review`,
      type: "warning"
    },
    {
      text: `${formatNumber(
        stats.liveTournaments
      )} tournaments are live now`,
      type: "info"
    },
    {
      text: `${formatNumber(
        stats.upcomingTournaments
      )} tournaments are upcoming`,
      type: "success"
    },
    {
      text: `${formatNumber(
        stats.completedTournaments
      )} tournaments completed`,
      type: "danger"
    }
  ];

  const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recentTransactions.filter((item) => {
      return (
        String(item.user || "").toLowerCase().includes(q) ||
        String(item.id || "").toLowerCase().includes(q) ||
        String(item.type || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q) ||
        String(item.method || "").toLowerCase().includes(q)
      );
    });
  }, [search, recentTransactions]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recentUsers.filter((item) => {
      return (
        String(item.username || "").toLowerCase().includes(q) ||
        String(item.profile_id || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q)
      );
    });
  }, [search, recentUsers]);

  const filteredTournaments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recentTournaments.filter((item) => {
      return (
        String(item.title || "").toLowerCase().includes(q) ||
        String(item.id || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q) ||
        String(item.match_type || "").toLowerCase().includes(q)
      );
    });
  }, [search, recentTournaments]);

  const filteredJoins = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recentJoins.filter((item) => {
      return (
        String(item.profile_name || "").toLowerCase().includes(q) ||
        String(item.profile_id || "").toLowerCase().includes(q) ||
        String(item.tournament_name || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q)
      );
    });
  }, [search, recentJoins]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div className="dashboard-title-wrap">
            <p className="dashboard-tag">BGMI ESPORTS ADMIN PANEL</p>
            <h1>Dashboard Overview</h1>
            <p className="dashboard-subtitle">
              All records, finance, user activity, tournament health and
              platform control in one powerful view.
            </p>
          </div>

          <div className="dashboard-top-actions">
            <div className="range-switch">
              {[
                { key: "today", label: "TODAY" },
                { key: "7d", label: "7 DAYS" },
                { key: "30d", label: "30 DAYS" },
                { key: "90d", label: "90 DAYS" }
              ].map((item) => (
                <button
                  key={item.key}
                  className={
                    range === item.key ? "range-btn active" : "range-btn"
                  }
                  onClick={() => setRange(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button className="export-btn" onClick={handleRefresh}>
              Refresh
            </button>

            <button className="export-btn" onClick={handleExport}>
              Export Report
            </button>
          </div>
        </header>

        {loading && (
          <div className="dashboard-message loading">
            Loading live dashboard data...
          </div>
        )}

        {!loading && error && (
          <div className="dashboard-message error">
            Failed to load dashboard: {error}
            <div style={{ marginTop: "12px" }}>
              <button className="export-btn" onClick={handleRefresh}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="stats-grid">
              {statCards.map((item) => (
                <div className={`stat-card ${item.tone}`} key={item.title}>
                  <div className="stat-card-top">
                    <div className="stat-icon">{item.icon}</div>
                    <span className="stat-change">{item.change}</span>
                  </div>
                  <p>{item.title}</p>
                  <h3>{item.value}</h3>
                </div>
              ))}
            </section>

            <section className="dashboard-main-grid">
              <div className="panel finance-panel">
                <div className="panel-head">
                  <div>
                    <span className="panel-tag">Finance</span>
                    <h2>Revenue & Cashflow</h2>
                  </div>
                  <button className="panel-btn" onClick={handleExport}>
                    Export JSON
                  </button>
                </div>

                <div className="finance-grid">
                  {financeData.map((item) => (
                    <div className="finance-box" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="fake-chart">
                  <div className="chart-lines">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <div className="chart-bars">
                    <div
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(20, stats.totalDeposits ? 42 : 20)
                        )}%`
                      }}
                    ></div>
                    <div
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(20, stats.totalWithdraws ? 58 : 20)
                        )}%`
                      }}
                    ></div>
                    <div
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(20, stats.commission ? 63 : 20)
                        )}%`
                      }}
                    ></div>
                    <div
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(20, stats.netProfit ? 84 : 20)
                        )}%`
                      }}
                    ></div>
                    <div
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(20, stats.totalJoins ? 69 : 20)
                        )}%`
                      }}
                    ></div>
                    <div
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(20, stats.activeUsers ? 88 : 20)
                        )}%`
                      }}
                    ></div>
                    <div
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(20, stats.liveTournaments ? 74 : 20)
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="side-panels">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="panel-tag">Tournament</span>
                      <h2>Quick Status</h2>
                    </div>
                  </div>

                  <div className="quick-list">
                    <div className="quick-box">
                      <span>Live Tournaments</span>
                      <strong>{formatNumber(stats.liveTournaments)}</strong>
                    </div>
                    <div className="quick-box">
                      <span>Upcoming</span>
                      <strong>
                        {formatNumber(stats.upcomingTournaments)}
                      </strong>
                    </div>
                    <div className="quick-box">
                      <span>Completed</span>
                      <strong>
                        {formatNumber(stats.completedTournaments)}
                      </strong>
                    </div>
                    <div className="quick-box">
                      <span>Total Joins</span>
                      <strong>{formatNumber(stats.totalJoins)}</strong>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="panel-tag">Alerts</span>
                      <h2>Review Center</h2>
                    </div>
                  </div>

                  <div className="alert-list">
                    {alertData.map((item, index) => (
                      <div className={`alert-item ${item.type}`} key={index}>
                        <span className="alert-dot"></span>
                        <p>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel table-panel">
              <div className="panel-head table-panel-head">
                <div>
                  <span className="panel-tag">Records</span>
                  <h2>Detailed Data Records</h2>
                </div>

                <div className="table-tools">
                  <input
                    type="text"
                    placeholder="Search by user, id, type, status..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="tab-row">
                <button
                  className={
                    activeTab === "transactions" ? "tab-btn active" : "tab-btn"
                  }
                  onClick={() => setActiveTab("transactions")}
                >
                  Transactions
                </button>

                <button
                  className={
                    activeTab === "users" ? "tab-btn active" : "tab-btn"
                  }
                  onClick={() => setActiveTab("users")}
                >
                  Users
                </button>

                <button
                  className={
                    activeTab === "tournaments" ? "tab-btn active" : "tab-btn"
                  }
                  onClick={() => setActiveTab("tournaments")}
                >
                  Tournaments
                </button>

                <button
                  className={
                    activeTab === "joins" ? "tab-btn active" : "tab-btn"
                  }
                  onClick={() => setActiveTab("joins")}
                >
                  Joins
                </button>
              </div>

              {activeTab === "transactions" && (
                <div className="table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Txn ID</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Method</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((item, index) => (
                          <tr key={item.id || index}>
                            <td>{item.id || "N/A"}</td>
                            <td>{item.user || "Unknown"}</td>
                            <td>{item.type || "N/A"}</td>
                            <td>{formatCurrency(item.amount)}</td>
                            <td>
                              <span
                                className={`status-pill ${normalizeStatusClass(
                                  item.status
                                )}`}
                              >
                                {item.status || "N/A"}
                              </span>
                            </td>
                            <td>{item.method || "N/A"}</td>
                            <td>{formatDateTime(item.date)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="empty-row">
                            No transaction records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "users" && (
                <div className="table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Profile ID</th>
                        <th>Name</th>
                        <th>Joined</th>
                        <th>Wallet</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((item, index) => (
                          <tr key={item.id || item.profile_id || index}>
                            <td>{item.profile_id || "N/A"}</td>
                            <td>{item.username || "Unknown"}</td>
                            <td>{formatDateTime(item.created_at)}</td>
                            <td>{formatCurrency(item.wallet_balance)}</td>
                            <td>
                              <span
                                className={`status-pill ${normalizeStatusClass(
                                  item.status
                                )}`}
                              >
                                {item.status || "Active"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="empty-row">
                            No user records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "tournaments" && (
                <div className="table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Tournament ID</th>
                        <th>Name</th>
                        <th>Mode</th>
                        <th>Entry Fee</th>
                        <th>Prize Pool</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTournaments.length > 0 ? (
                        filteredTournaments.map((item, index) => (
                          <tr key={item.id || index}>
                            <td>{item.id || "N/A"}</td>
                            <td>{item.title || "Tournament"}</td>
                            <td>{item.match_type || "Classic"}</td>
                            <td>{formatCurrency(item.entry_fee)}</td>
                            <td>{formatCurrency(item.prize_pool)}</td>
                            <td>
                              <span
                                className={`status-pill ${normalizeStatusClass(
                                  item.status
                                )}`}
                              >
                                {item.status || "Upcoming"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="empty-row">
                            No tournament records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "joins" && (
                <div className="table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Join ID</th>
                        <th>Player</th>
                        <th>Profile ID</th>
                        <th>Tournament</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Joined At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJoins.length > 0 ? (
                        filteredJoins.map((item, index) => (
                          <tr key={item.id || index}>
                            <td>{item.id || "N/A"}</td>
                            <td>{item.profile_name || "Unknown"}</td>
                            <td>{item.profile_id || "N/A"}</td>
                            <td>{item.tournament_name || "Tournament"}</td>
                            <td>{formatCurrency(item.amount)}</td>
                            <td>
                              <span
                                className={`status-pill ${normalizeStatusClass(
                                  item.status
                                )}`}
                              >
                                {item.status || "Joined"}
                              </span>
                            </td>
                            <td>{formatDateTime(item.created_at)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="empty-row">
                            No join records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;