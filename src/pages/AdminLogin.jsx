// src/pages/AdminLogin.jsx - FINAL FIXED CODE ✅
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminLogin.css";

/* ===============================
   API BASE - AUTO DETECT ✅
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
     LOGIN HANDLER - FIXED ✅
  ================================ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_URL}/admin/login`, // ✅ API_URL FIXED (was API_BASE)
        {
          id: adminId.trim(),
          password: password.trim(),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.success) {
        localStorage.setItem("bgmi_admin_logged_in", "true");
        localStorage.setItem("adminToken", res.data.token);
        navigate("/", { replace: true });
        return;
      }

      setError("Invalid admin credentials");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Admin login failed. Check ID & Password."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     UI - FIXED ✅
  ================================ */
  return (
    <div className="auth-page hacker-bg">
      <div className="auth-card hacker-card">
        <div className="auth-header">
          <span className="auth-badge">ADMIN ACCESS</span>
          <h2 className="page-title">BGMI Admin Login</h2>
          <p className="page-subtitle">Authorized access only</p>
          <small style={{ color: "#777" }}>API: {API_URL}</small> {/* ✅ API_URL */}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-label">
            <span>Admin ID</span>
            <input
              type="text"
              className="form-input hacker-input"
              placeholder="bgmiadmin"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              required
            />
          </label>

          <label className="form-label">
            <span>Password</span>
            <input
              type="password"
              className="form-input hacker-input"
              placeholder="supersecret123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
  );
};

export default AdminLogin;
