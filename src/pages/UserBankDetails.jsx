// src/pages/UserBankDetails.jsx - NO VERIFIED COLUMN ✅
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./UserBankDetails.css";

const ADMIN_API =
  window.location.hostname === "localhost"
    ? "http://localhost:5003"
    : "https://withdraw-server.onrender.com";

const UserBankDetails = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllBanks = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${ADMIN_API}/api/admin/all-banks`);
      const bankList = data.banks || [];

      const enhancedBanks = bankList.map((bank) => ({
        ...bank,
        displayUserId: bank.user_id || "N/A",
        displayName: bank.profile_name || bank.account_holder || "Unknown",
        displayTime: bank.created_at_ist
          ? new Date(bank.created_at_ist).toLocaleString("en-IN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "-",
      }));

      console.log("✅ IST TIME:", enhancedBanks[0]?.displayTime);
      console.log("🔥 RAW DATA:", enhancedBanks[0]);
      setBanks(enhancedBanks);
    } catch (err) {
      console.error("❌ ERROR:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBanks();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loading">🔄 Loading Bank Details...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>🏦 User Bank Details</h1>
      <button onClick={fetchAllBanks} className="refresh-btn">
        🔄 Refresh
      </button>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Profile</th>
              <th>Account Holder</th>
              <th>Bank</th>
              <th>Account No</th>
              <th>IFSC</th>
              <th>Time (IST)</th>
            </tr>
          </thead>
          <tbody>
            {banks.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No Bank Details Found
                </td>
              </tr>
            ) : (
              banks.map((bank, index) => (
                <tr key={bank.id || bank.user_id || index}>
                  <td>{bank.id}</td>
                  <td>
                    <code className="user-id">{bank.displayUserId}</code>
                  </td>
                  <td>{bank.displayName}</td>
                  <td>{bank.account_holder}</td>
                  <td>
                    <span className="bank-icon">{bank.bank_name}</span>
                  </td>
                  <td>
                    <code className="account-no">{bank.account_number}</code>
                  </td>
                  <td>
                    <code>{bank.ifsc_code}</code>
                  </td>
                  <td>
                    <strong>{bank.displayTime}</strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {banks.length > 0 && (
        <div className="debug-box">
          <strong>Sample:</strong> {banks[0].displayUserId} |{" "}
          <strong>IST Time:</strong> {banks[0].displayTime}
        </div>
      )}
    </div>
  );
};

export default UserBankDetails;