// src/App.jsx - ROUTING 100% FIXED ✅
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import RegisterUsers from "./pages/RegisterUsers";
import RoomManagement from "./pages/RoomManagement";
import TdmJoins from "./pages/TdmJoins";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";

// 🔥 DEPOSIT USERS Admin Page
import DepositUsers from "./pages/DepositUsers";
// 🔥 WITHDRAW REQUESTS Admin Page
import WithdrawRequests from "./pages/WithdrawRequests";

// 🔥 USER BANK DETAILS PAGE - FIXED ROUTE WITH PARAM!
import UserBankDetails from "./pages/UserBankDetails";

import "./styles/theme.css";

// ===== helper: admin login check =====
const isAdminLoggedIn = () =>
  localStorage.getItem("bgmi_admin_logged_in") === "true";

// ===== layout for all admin pages =====
const AdminLayout = () => (
  <div className="app-root">
    <Sidebar />

    <div className="app-main">
      <Topbar />

      <div className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register-users" element={<RegisterUsers />} />
          <Route path="/rooms" element={<RoomManagement />} />
          <Route path="/tdm-joins" element={<TdmJoins />} />

          {/* 🔥 DEPOSIT USERS ROUTE */}
          <Route path="/deposit-users" element={<DepositUsers />} />
          
          {/* 🔥 WITHDRAW REQUESTS ROUTE */}
          <Route path="/withdraw-requests" element={<WithdrawRequests />} />

          {/* 🔥 USER BANK DETAILS ROUTE - FIXED WITH :userId PARAM! */}
          <Route path="/user-bank-details/:userId" element={<UserBankDetails />} />

          <Route path="/settings" element={<Settings />} />

          {/* unknown route → dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  </div>
);

// ===== protected wrapper =====
const ProtectedApp = () => {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin-login" replace />;
  }
  return <AdminLayout />;
};

// ===== main app =====
function App() {
  return (
    <Router>
      <Routes>
        {/* admin login (no sidebar/topbar) */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* all admin pages */}
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </Router>
  );
}

export default App;