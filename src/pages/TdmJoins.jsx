import { useState, useEffect, useCallback } from "react";
import "./TdmJoins.css";

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5002"
    : "https://deposit-and-join-tournament-server.onrender.com";

const TdmJoins = () => {
  const [joins, setJoins] = useState([]);
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    if (saving) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/joins`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setJoins(data.tournamentJoins || []);

      const map = {};
      (data.tournamentJoins || []).forEach((j) => {
        map[j.tournament_id] = { roomId: "", roomPassword: "" };
      });
      setRooms(map);
    } catch (error) {
      setMessage("❌ Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [saving]);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 10000);
    return () => clearInterval(i);
  }, [fetchData]);

  const saveRoom = async (tournamentId) => {
    setSaving(true);
    setMessage("");

    try {
      const roomData = rooms[tournamentId];

      if (!roomData || (!roomData.roomId && !roomData.roomPassword)) {
        setMessage("❌ Enter Room ID or Password first");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/set-room-by-tournament`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, ...roomData }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessage(`✅ ${data.message || "Room saved successfully"}`);
    } catch (error) {
      setMessage(`❌ Save failed: ${error.message}`);
    } finally {
      setSaving(false);
      fetchData();
    }
  };

  const clearRoom = async (tournamentId) => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/set-room-by-tournament`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setMessage("🧹 Room cleared");
    } catch (error) {
      setMessage("❌ Clear failed");
    } finally {
      setSaving(false);
      fetchData();
    }
  };

  const deleteUser = async (id) => {
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/tournament/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setMessage("🗑️ User deleted");
      fetchData();
    } catch (error) {
      setMessage("❌ Delete failed");
    }
  };

  if (loading)
    return <h2 style={{ padding: 30, textAlign: "center" }}>Loading...</h2>;

  return (
    <div className="page">
      <h1>🏆 Tournament Joins (Admin)</h1>

      {message && <div className="admin-message">{message}</div>}

      {/* ✅ MOST IMPORTANT WRAPPER */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Profile Name</th>
              <th>Profile ID</th>
              <th>Tournament</th>
              <th>Player</th>
              <th>BGMI ID</th>
              <th>Entry</th>
              <th>Prize</th>
              <th>Mode</th>
              <th>Map</th>
              <th>Room ID</th>
              <th>Room Pass</th>
              <th>Date</th>
              <th>Save</th>
              <th>Clear</th>
              <th>Delete</th>
            </tr>
          </thead>

          <tbody>
            {joins.map((j, i) => (
              <tr key={j.id}>
                <td>{i + 1}</td>
                <td>{j.profile_name || "N/A"}</td>
                <td>{j.profile_id || "N/A"}</td>
                <td>{j.tournament_name || "N/A"}</td>
                <td>{j.player_name || "N/A"}</td>
                <td>{j.bgmi_id || "N/A"}</td>
                <td>₹{j.entry_fee || 0}</td>
                <td>₹{j.prize_pool || 0}</td>
                <td>{j.mode || "TDM"}</td>
                <td>{j.map || "Erangel"}</td>

                <td>
                  <input
                    className="room-input"
                    value={rooms[j.tournament_id]?.roomId || ""}
                    onChange={(e) =>
                      setRooms((r) => ({
                        ...r,
                        [j.tournament_id]: {
                          ...r[j.tournament_id],
                          roomId: e.target.value,
                        },
                      }))
                    }
                    placeholder="Room ID"
                    disabled={saving}
                  />
                </td>

                <td>
                  <input
                    className="room-input"
                    type="password"
                    value={rooms[j.tournament_id]?.roomPassword || ""}
                    onChange={(e) =>
                      setRooms((r) => ({
                        ...r,
                        [j.tournament_id]: {
                          ...r[j.tournament_id],
                          roomPassword: e.target.value,
                        },
                      }))
                    }
                    placeholder="Pass"
                    disabled={saving}
                  />
                </td>

                <td>
                  {j.joined_at
                    ? new Date(j.joined_at).toLocaleString("en-IN")
                    : "N/A"}
                </td>

                <td>
                  <button
                    className="save-btn"
                    onClick={() => saveRoom(j.tournament_id)}
                    disabled={saving}
                    title="Save"
                  >
                    💾
                  </button>
                </td>

                <td>
                  <button
                    className="clear-btn"
                    onClick={() => clearRoom(j.tournament_id)}
                    disabled={saving}
                    title="Clear"
                  >
                    🧹
                  </button>
                </td>

                <td>
                  <button
                    className="delete-btn"
                    onClick={() => deleteUser(j.id)}
                    disabled={saving}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {joins.length === 0 && (
              <tr>
                <td className="no-data" colSpan="16">
                  📭 No tournament joins found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Debug (optional) */}
      <div className="debug-box">
        <details>
          <summary>🔍 Debug Info</summary>
          <pre>
            {JSON.stringify(
              {
                totalJoins: joins.length,
                roomsCount: Object.keys(rooms).length,
                sampleData: joins[0] || "No data",
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default TdmJoins;
