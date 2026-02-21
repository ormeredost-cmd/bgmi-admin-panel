// src/pages/UserBankDetails.jsx - 100% SUPABASE DATA ✅
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "./UserBankDetails.css";

const ADMIN_API = window.location.hostname === "localhost" 
  ? "http://localhost:5003"
  : "https://withdraw-server.onrender.com";

const AdminUserBankDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [bankDetailsList, setBankDetailsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("🔍 User ID:", userId);
    
    if (!userId) {
      setError("❌ No User ID!");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // 🔥 DIRECT SUPABASE DATA - NO registeruser JOIN
        console.log(`🔄 Fetching /api/admin/user-banks/${userId}`);
        const res = await axios.get(`${ADMIN_API}/api/admin/user-banks/${userId}`, {
          timeout: 10000
        });

        console.log("✅ DATA:", res.data);
        
        setUser({ username: userId, profile_id: userId });
        setBankDetailsList(res.data.banks || []);

      } catch (err) {
        console.error("❌ API Error:", err.response?.data || err.message);
        
        // 🔥 FALLBACK - All banks filter
        try {
          const allRes = await axios.get(`${ADMIN_API}/api/admin/all-banks`);
          const userBanks = allRes.data.banks.filter(bank => bank.user_id === userId);
          
          console.log("✅ FALLBACK banks:", userBanks.length);
          setBankDetailsList(userBanks);
          setUser({ username: userId, profile_id: userId });
          
        } catch (fallbackErr) {
          setError("No bank data found");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleVerify = async (userId) => {
    try {
      await axios.put(`${ADMIN_API}/api/admin/verify-bank/${userId}`);
      setBankDetailsList(prev => 
        prev.map(bank => bank.user_id === userId
          ? { ...bank, is_verified: true, is_active: true, verified_by: "admin" }
          : bank
        )
      );
    } catch (err) {
      setError("Verify failed");
    }
  };

  const handleReject = async (userId) => {
    try {
      await axios.put(`${ADMIN_API}/api/admin/reject-bank/${userId}`);
      setBankDetailsList(prev => 
        prev.map(bank => bank.user_id === userId
          ? { ...bank, is_verified: false, is_active: false, verified_by: null }
          : bank
        )
      );
    } catch (err) {
      setError("Reject failed");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div>🔄 Loading banks for {userId}...</div>
        <div style={{ fontSize: 12, color: '#666' }}>
          <a href="http://localhost:5003/health" target="_blank">Server Status</a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-bank-container">
      <div className="admin-header">
        <button 
          className="back-btn" 
          onClick={() => navigate("/register-users")}
          style={{ marginBottom: 20 }}
        >
          ← Back to Users
        </button>
        <h1>🏦 Bank Details - {userId}</h1>
        <div>Accounts: <strong>{bankDetailsList.length}</strong></div>
      </div>

      {error && (
        <div className="error-message" style={{ padding: 20, background: '#fee', border: '1px solid #fcc' }}>
          ❌ {error}
          <br/>
          <small>Check: Server running? Data exists for {userId}?</small>
        </div>
      )}

      {bankDetailsList.length === 0 ? (
        <div className="no-data" style={{ padding: 40, textAlign: 'center', color: '#666' }}>
          📭 No bank details found for <code>{userId}</code>
          <br/>
          <small>User must add bank details first</small>
        </div>
      ) : (
        <div className="bank-table-container">
          <table className="bank-details-table">
            <thead>
              <tr>
                <th>Bank Name</th>
                <th>Account Holder</th>
                <th>Account No.</th>
                <th>UPI ID</th>
                <th>IFSC</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bankDetailsList.map((bank, index) => (
                <tr key={bank.id || index}>
                  <td>{bank.bank_name || '-'}</td>
                  <td>{bank.account_holder || '-'}</td>
                  <td>{bank.account_number ? `****${bank.account_number.slice(-4)}` : '-'}</td>
                  <td>{bank.upi_id || '-'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{bank.ifsc || '-'}</td>
                  <td>
                    <span className={`status-badge ${bank.is_verified ? 'verified' : 'pending'}`}>
                      {bank.is_verified ? '✅ Verified' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>{bank.created_at ? new Date(bank.created_at).toLocaleString('en-IN') : '-'}</td>
                  <td>
                    {!bank.is_verified ? (
                      <>
                        <button 
                          className="verify-btn"
                          onClick={() => handleVerify(bank.user_id)}
                          style={{ marginRight: 8 }}
                        >
                          ✅ Verify
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleReject(bank.user_id)}
                        >
                          ❌ Reject
                        </button>
                      </>
                    ) : (
                      <span style={{ color: 'green' }}>✓ Verified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUserBankDetails;
