import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./Dashboard.css";

const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5004"
    : "https://dashboard-server-tera.onrender.com";

// ============================================================
// HELPERS
// ============================================================
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const timeAgo = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const diff = Date.now() - date.getTime();

  const seconds = Math.max(
    0,
    Math.floor(diff / 1000)
  );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
};

// ============================================================
// ACTIVITY ICONS
// ============================================================
const activityIcon = {
  deposit: "💰",
  withdraw: "💸",
};

const activityTitle = {
  deposit: "Deposit",
  withdraw: "Withdrawal",
};

// ============================================================
// DASHBOARD
// ============================================================
const Dashboard = () => {

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================
  const loadDashboard = useCallback(
    async (silent = false) => {

      try {

        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const res = await fetch(
          `${API_BASE}/api/admin/dashboard-overview`,
          {
            cache: "no-store",
          }
        );

        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(
            result.error || `HTTP ${res.status}`
          );
        }

        setData(result);

        setLastUpdated(
          new Date(
            result.generatedAt || Date.now()
          )
        );

      } catch (err) {

        console.error(
          "Dashboard load error:",
          err
        );

        setError(
          err.message ||
            "Dashboard data load failed"
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }

    },
    []
  );

  // ==========================================================
  // INITIAL LOAD + AUTO REFRESH
  // ==========================================================
  useEffect(() => {

    loadDashboard(false);

    const timer = setInterval(() => {
      loadDashboard(true);
    }, 10000);

    return () => clearInterval(timer);

  }, [loadDashboard]);

  // ==========================================================
  // SUMMARY CARDS
  // ==========================================================
  const summary = useMemo(() => {

    const stats = data?.stats || {};

    return [

      {
        icon: "👥",
        label: "Registered Users",
        value: stats.users?.total || 0,
        meta: `${
          stats.users?.verified || 0
        } verified`,
        tone: "blue",
      },

      {
        icon: "💳",
        label: "Wallet Balance",
        value: money(
          stats.users?.walletBalance
        ),
        meta: "Total user wallet funds",
        tone: "green",
      },

      {
        icon: "⏳",
        label: "Pending Deposits",
        value: stats.deposits?.pending || 0,
        meta: money(
          stats.deposits?.pendingAmount
        ),
        tone: "yellow",
      },

      {
        icon: "💸",
        label: "Pending Withdrawals",
        value: stats.withdrawals?.pending || 0,
        meta: money(
          stats.withdrawals?.pendingAmount
        ),
        tone: "red",
      },

    ];

  }, [data]);

  // ==========================================================
  // INITIAL LOADING
  // ==========================================================
  if (loading && !data) {

    return (
      <div className="admin-dashboard loading-state">
        Loading live dashboard…
      </div>
    );

  }

  // ==========================================================
  // UI
  // ==========================================================
  return (

    <div className="admin-dashboard">

      {/* ======================================================
          TOP BAR
      ====================================================== */}
      <div className="dashboard-topbar">

        <div>

          <div className="eyebrow">
            ADMIN CONTROL CENTER
          </div>

          <h1>
            BGMI Admin Dashboard
          </h1>

          <p>
            Live overview of users, wallet activity,
            deposits, withdrawals and bank operations.
          </p>

        </div>

        <div className="dashboard-top-actions">

          <div className="live-status">

            <span className="live-dot" />

            LIVE

          </div>

          <div className="updated-text">

            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString(
                  "en-IN"
                )}`
              : "Updating…"}

          </div>

          <button
            type="button"
            className="refresh-dashboard"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >

            {refreshing
              ? "↻ Updating…"
              : "↻ Refresh"}

          </button>

        </div>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}
      {error && (

        <div className="dashboard-alert">
          ⚠️ {error}
        </div>

      )}

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}
      <div className="stat-grid">

        {summary.map((item) => (

          <div
            className={`stat-card ${item.tone}`}
            key={item.label}
          >

            <div className="stat-icon">
              {item.icon}
            </div>

            <div className="stat-content">

              <div className="stat-label">
                {item.label}
              </div>

              <div className="stat-value">
                {item.value}
              </div>

              <div className="stat-meta">
                {item.meta}
              </div>

            </div>

          </div>

        ))}

      </div>

      {/* ======================================================
          ANALYTICS GRID
      ====================================================== */}
      <div className="analytics-grid">

        {/* ====================================================
            FINANCIAL OVERVIEW
        ==================================================== */}
        <section className="panel">

          <div className="panel-head">

            <div>

              <h2>
                Financial Overview
              </h2>

              <p>
                Approved and pending wallet-related activity.
              </p>

            </div>

          </div>

          <div className="finance-grid">

            <div className="finance-item">

              <span>
                Approved Deposits
              </span>

              <strong>
                {money(
                  data?.stats?.deposits?.approvedAmount
                )}
              </strong>

            </div>

            <div className="finance-item">

              <span>
                Approved Withdrawals
              </span>

              <strong>
                {money(
                  data?.stats?.withdrawals?.approvedAmount
                )}
              </strong>

            </div>

            <div className="finance-item">

              <span>
                Verified Bank Accounts
              </span>

              <strong>
                {data?.stats?.banks?.verified || 0}
              </strong>

            </div>

            <div className="finance-item">

              <span>
                Total Bank Accounts
              </span>

              <strong>
                {data?.stats?.banks?.total || 0}
              </strong>

            </div>

          </div>

        </section>

        {/* ====================================================
            SYSTEM MODULES
        ==================================================== */}
        <section className="panel">

          <div className="panel-head">

            <div>

              <h2>
                System Modules
              </h2>

              <p>
                Live database connectivity for each module.
              </p>

            </div>

          </div>

          <div className="module-list">

            {Object.entries(
              data?.modules || {}
            ).map(([name, ok]) => (

              <div
                className="module-row"
                key={name}
              >

                <span>
                  {name.replace(
                    /^./,
                    (c) => c.toUpperCase()
                  )}
                </span>

                <span
                  className={`module-badge ${
                    ok ? "ok" : "down"
                  }`}
                >

                  {ok
                    ? "● ONLINE"
                    : "● ERROR"}

                </span>

              </div>

            ))}

          </div>

        </section>

      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}
      <div className="content-grid">

        {/* ====================================================
            LIVE ACTIVITY
        ==================================================== */}
        <section className="panel activity-panel">

          <div className="panel-head">

            <div>

              <h2>
                Live Activity
              </h2>

              <p>
                Latest deposit and withdrawal events.
              </p>

            </div>

          </div>

          <div className="activity-list">

            {(data?.recentActivity || [])
              .filter((item) =>
                ["deposit", "withdraw"].includes(
                  String(item.type).toLowerCase()
                )
              )
              .map((item) => (

                <div
                  className="activity-item"
                  key={item.id}
                >

                  <div className="activity-icon">

                    {activityIcon[item.type] || "•"}

                  </div>

                  <div className="activity-main">

                    <strong>
                      {item.title}
                    </strong>

                    <span>
                      {item.subtitle}
                    </span>

                    <small>

                      {activityTitle[item.type] ||
                        item.type}

                      {" • "}

                      {timeAgo(item.timestamp)}

                    </small>

                  </div>

                  <div className="activity-right">

                    {Number(item.amount || 0) > 0 && (

                      <strong>
                        {money(item.amount)}
                      </strong>

                    )}

                    <span
                      className={`activity-status ${String(
                        item.status || ""
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >

                      {item.status || "—"}

                    </span>

                  </div>

                </div>

              ))}

            {!data?.recentActivity?.some((item) =>
              ["deposit", "withdraw"].includes(
                String(item.type).toLowerCase()
              )
            ) && (

              <div className="empty-row">
                No recent deposit or withdrawal activity.
              </div>

            )}

          </div>

        </section>

      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}
      <div className="footer-strip">

        <span>

          Database:

          {" "}

          <b
            className={
              data?.modules?.database
                ? "online-text"
                : "error-text"
            }
          >

            {data?.modules?.database
              ? "Connected"
              : "Issue detected"}

          </b>

        </span>

        <span>

          Auto refresh:

          {" "}

          <b>
            10 seconds
          </b>

        </span>

        <span>

          Dashboard scope:

          {" "}

          <b>
            Users • Wallet • Deposits • Withdrawals • Banks
          </b>

        </span>

      </div>

    </div>

  );

};

export default Dashboard;