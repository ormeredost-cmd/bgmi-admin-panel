// src/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminLogin.css";

/* ===============================
   API BASE - AUTO DETECT
================================ */
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://admin-login-server.onrender.com";

const AdminLogin = () => {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* ===============================
     LOGIN HANDLER
  ================================ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_URL}/admin/login`,
        { id: adminId.trim(), password: password.trim() },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.success) {
        localStorage.setItem("bgmi_admin_logged_in", "true");
        localStorage.setItem("adminToken", res.data.token);

        const verify = await axios.get(`${API_URL}/admin/verify`, {
          headers: { Authorization: `Bearer ${res.data.token}` },
        });

        if (verify.data?.success) {
          navigate("/", { replace: true });
          return;
        } else {
          setError("Token verification failed. Try login again.");
          localStorage.removeItem("adminToken");
          localStorage.removeItem("bgmi_admin_logged_in");
        }
      } else {
        setError("Invalid admin credentials");
      }
    } catch (err) {
      console.error("Login error:", err.response || err.message);
      setError(
        err.response?.data?.message ||
          "Admin login failed. Check ID & Password."
      );
      localStorage.removeItem("adminToken");
      localStorage.removeItem("bgmi_admin_logged_in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page hacker-bg">
      <div className="auth-shell">
        <div className="auth-card hacker-card">
          <div className="auth-header">
            <span className="auth-badge">ADMIN ACCESS</span>
            <h2 className="page-title">Free Fire Admin Login</h2>
            <p className="page-subtitle">Authorized access only</p>
            <small className="api-text">API: {API_URL}</small>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="adminId">
              <span>Admin ID</span>
              <input
                id="adminId"
                type="text"
                className="form-input hacker-input"
                placeholder="Enter admin ID"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                required
                autoComplete="username"
              />
            </label>

            <label className="form-label" htmlFor="password">
              <span>Password</span>
              <input
                id="password"
                type="password"
                className="form-input hacker-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              className="btn-primary hacker-btn"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Login"}
            </button>

            <p className="auth-footer-text">
              Unauthorized access is prohibited 🚫
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;