import { useState, useEffect, useCallback, useMemo } from "react";
import "./TdmJoins.css";

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5002"
    : "https://deposit-and-join-tournament-server.onrender.com";

const TdmJoins = () => {
  const [joins, setJoins] = useState([]);
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingTournamentId, setSavingTournamentId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");

  const groupedFirstRowMap = useMemo(() => {
    const seen = new Set();
    const firstMap = {};
    joins.forEach((j) => {
      if (!seen.has(j.tournament_id)) {
        seen.add(j.tournament_id);
        firstMap[j.tournament_id] = j.id;
      }
    });
    return firstMap;
  }, [joins]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_URL}/api/admin/joins`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      const joinsData = Array.isArray(data.tournamentJoins)
        ? data.tournamentJoins
        : [];

      setJoins(joinsData);

      const roomMap = {};
      joinsData.forEach((j) => {
        if (!roomMap[j.tournament_id]) {
          roomMap[j.tournament_id] = {
            roomId: j.room_id || "",
            roomPassword: j.room_password || "",
          };
        }
      });

      setRooms(roomMap);
    } catch (error) {
      console.error("Fetch admin joins error:", error);
      setMessage(`❌ Failed to load data: ${error.message}`);
      setJoins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRoomField = (tournamentId, field, value) => {
    setRooms((prev) => ({
      ...prev,
      [tournamentId]: {
        roomId: prev[tournamentId]?.roomId || "",
        roomPassword: prev[tournamentId]?.roomPassword || "",
        [field]: value,
      },
    }));
  };

  const saveRoom = async (tournamentId) => {
    setSavingTournamentId(tournamentId);
    setMessage("");

    try {
      const roomData = rooms[tournamentId] || {
        roomId: "",
        roomPassword: "",
      };

      if (!roomData.roomId.trim() && !roomData.roomPassword.trim()) {
        throw new Error("Enter Room ID or Password first");
      }

      const res = await fetch(`${API_URL}/api/admin/set-room-by-tournament`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          roomId: roomData.roomId.trim(),
          roomPassword: roomData.roomPassword.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      setMessage(`✅ ${data.message || "Room saved successfully"}`);
      await fetchData();
    } catch (error) {
      console.error("Save room error:", error);
      setMessage(`❌ Save failed: ${error.message}`);
    } finally {
      setSavingTournamentId("");
    }
  };

  const clearRoom = async (tournamentId) => {
    setSavingTournamentId(tournamentId);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/set-room-by-tournament`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          roomId: "",
          roomPassword: "",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      setMessage(`🧹 ${data.message || "Room cleared successfully"}`);
      await fetchData();
    } catch (error) {
      console.error("Clear room error:", error);
      setMessage(`❌ Clear failed: ${error.message}`);
    } finally {
      setSavingTournamentId("");
    }
  };

  const deleteUser = async (id) => {
    const confirmDelete = window.confirm(
      "Kya tum sure ho? Ye join record delete ho jayega."
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/admin/tournament/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      setMessage("🗑️ User deleted successfully");
      await fetchData();
    } catch (error) {
      console.error("Delete user error:", error);
      setMessage(`❌ Delete failed: ${error.message}`);
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return <h2 style={{ padding: 30, textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div className="page">
      <h1>🏆 Tournament Joins (Admin)</h1>

      {message && <div className="admin-message">{message}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Profile Name</th>
              <th>Profile ID</th>
              <th>Tournament ID</th>
              <th>Tournament Name</th>
              <th>Free Fire Name</th>
              <th>Free Fire ID</th>
              <th>Entry</th>
              <th>Prize</th>
              <th>Mode</th>
              <th>Map</th>
              <th>Team Type</th>
              <th>Per Kill</th>
              <th>Custom ID</th>
              <th>Custom Pass</th>
              <th>Date</th>
              <th>Save</th>
              <th>Clear</th>
              <th>Delete</th>
            </tr>
          </thead>

          <tbody>
            {joins.map((j, i) => {
              const isPrimaryTournamentRow =
                groupedFirstRowMap[j.tournament_id] === j.id;
              const isSaving = savingTournamentId === j.tournament_id;
              const isDeleting = deletingId === j.id;

              return (
                <tr key={j.id}>
                  <td>{i + 1}</td>
                  <td>{j.profile_name || "N/A"}</td>
                  <td>{j.profile_id || "N/A"}</td>
                  <td>{j.tournament_id || "N/A"}</td>
                  <td>{j.tournament_name || "N/A"}</td>
                  <td>{j.player_name || "N/A"}</td>
                  <td>{j.bgmi_id || "N/A"}</td>
                  <td>₹{Number(j.entry_fee || 0)}</td>
                  <td>₹{Number(j.prize_pool || 0)}</td>
                  <td>{j.mode || "Battle Royal"}</td>
                  <td>{j.map || "N/A"}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {j.team_type || "N/A"}
                  </td>
                  <td>
                    {j.per_kill !== null && j.per_kill !== undefined
                      ? `₹${j.per_kill}`
                      : "N/A"}
                  </td>

                  <td>
                    <input
                      className="room-input"
                      value={rooms[j.tournament_id]?.roomId || ""}
                      onChange={(e) =>
                        updateRoomField(
                          j.tournament_id,
                          "roomId",
                          e.target.value
                        )
                      }
                      placeholder="Room ID"
                      disabled={!isPrimaryTournamentRow || !!savingTournamentId}
                    />
                  </td>

                  <td>
                    <input
                      className="room-input"
                      type="text"
                      value={rooms[j.tournament_id]?.roomPassword || ""}
                      onChange={(e) =>
                        updateRoomField(
                          j.tournament_id,
                          "roomPassword",
                          e.target.value
                        )
                      }
                      placeholder="Pass"
                      disabled={!isPrimaryTournamentRow || !!savingTournamentId}
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
                      disabled={!isPrimaryTournamentRow || !!savingTournamentId}
                      title={
                        isPrimaryTournamentRow
                          ? "Save"
                          : "Use first row of this tournament"
                      }
                    >
                      {isSaving ? "..." : "💾"}
                    </button>
                  </td>

                  <td>
                    <button
                      className="clear-btn"
                      onClick={() => clearRoom(j.tournament_id)}
                      disabled={!isPrimaryTournamentRow || !!savingTournamentId}
                      title={
                        isPrimaryTournamentRow
                          ? "Clear"
                          : "Use first row of this tournament"
                      }
                    >
                      {isSaving ? "..." : "🧹"}
                    </button>
                  </td>

                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => deleteUser(j.id)}
                      disabled={!!deletingId}
                      title="Delete"
                    >
                      {isDeleting ? "..." : "🗑️"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {joins.length === 0 && (
              <tr>
                <td className="no-data" colSpan="19">
                  📭 No tournament joins found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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