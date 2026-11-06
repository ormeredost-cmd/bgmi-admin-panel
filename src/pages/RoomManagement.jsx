
import { useCallback, useEffect, useState } from "react";

const ADMIN_API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5004"
    : "https://dashboard-server-tera.onrender.com";

const TOURNAMENT_API_BASE = (
  window.location.hostname === "localhost"
    ? "http://localhost:5005"
    : process.env.REACT_APP_TOURNAMENT_API_URL || ""
).replace(/\/+$/, "");

// ============================================================
// HELPERS
// ============================================================

const getJsonResponse = async (response) => {
  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

// Different possible backend count field names
const getPlayerCount = (data) => {
  const possibleCounts = [
    data?.participantCount,
    data?.playersUpdated,
    data?.updatedPlayers,
    data?.players_updated,
    data?.updated_players,
    data?.joinedPlayers,
    data?.joinedCount,
    data?.totalPlayers,
    data?.count,
  ];

  for (const value of possibleCounts) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return 0;
};

const normalizeRoomData = (data) => {
  return {
    roomId: data?.roomId || data?.room_id || "",
    roomPassword:
      data?.roomPassword ||
      data?.password ||
      data?.room_password ||
      "",
    participantCount: getPlayerCount(data),
  };
};

// ============================================================
// COMPONENT
// ============================================================

const RoomManagement = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");

  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");

  const [participantCount, setParticipantCount] = useState(0);
  const [roomPublished, setRoomPublished] = useState(false);

  const [loading, setLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [roomMap, setRoomMap] = useState({});

  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ============================================================
  // API: LOAD ROOM DETAILS
  // ============================================================

  const fetchRoomDetails = useCallback(async (tournamentId) => {
    const response = await fetch(
      `${ADMIN_API_BASE}/admin/rooms/${encodeURIComponent(
        tournamentId
      )}`
    );

    const data = await getJsonResponse(response);

    return {
      ...normalizeRoomData(data),
      success: true,
    };
  }, []);

  // ============================================================
  // LOAD TOURNAMENTS
  // ============================================================

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const response = await fetch(
        `${ADMIN_API_BASE}/api/admin/tournaments`
      );

      const data = await getJsonResponse(response);

      const list = Array.isArray(data.tournaments)
        ? data.tournaments
        : [];

      setTournaments(list);

      if (list.length === 0) {
        setRoomMap({});
        return;
      }

      const roomEntries = await Promise.all(
        list.map(async (tournament) => {
          try {
            const roomData = await fetchRoomDetails(
              tournament.id
            );

            return [
              String(tournament.id),
              roomData,
            ];
          } catch (error) {
            console.error(
              `ROOM LOAD ERROR - ${tournament.id}:`,
              error
            );

            return [
              String(tournament.id),
              null,
            ];
          }
        })
      );

      setRoomMap(
        Object.fromEntries(roomEntries)
      );
    } catch (error) {
      console.error("LOAD TOURNAMENTS ERROR:", error);

      setErrorMsg(
        error.message || "Failed to load tournaments."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchRoomDetails]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // ============================================================
  // LOAD SELECTED TOURNAMENT ROOM
  // ============================================================

  const loadRoomDetails = async (tournamentId) => {
    setMessage("");
    setErrorMsg("");

    setRoomId("");
    setPassword("");
    setParticipantCount(0);
    setRoomPublished(false);

    if (!tournamentId) return;

    try {
      setRoomLoading(true);

      const data = await fetchRoomDetails(tournamentId);

      setRoomId(data.roomId);
      setPassword(data.roomPassword);
      setParticipantCount(data.participantCount);

      setRoomPublished(
        Boolean(data.roomId || data.roomPassword)
      );

      setRoomMap((previous) => ({
        ...previous,
        [String(tournamentId)]: data,
      }));
    } catch (error) {
      console.error("LOAD ROOM ERROR:", error);

      setErrorMsg(
        error.message || "Failed to load room details."
      );
    } finally {
      setRoomLoading(false);
    }
  };

  // ============================================================
  // TOURNAMENT SELECT
  // ============================================================

  const handleTournamentChange = (event) => {
    const tournamentId = event.target.value;

    setSelectedTournament(tournamentId);

    loadRoomDetails(tournamentId);
  };

  // ============================================================
  // PUBLISH / UPDATE ROOM + NOTIFICATIONS
  // ============================================================

  const handleSaveRoom = async (event) => {
    event.preventDefault();

    setMessage("");
    setErrorMsg("");

    if (!selectedTournament) {
      setErrorMsg("Please select a tournament.");
      return;
    }

    const cleanRoomId = roomId.trim();
    const cleanPassword = password.trim();

    if (!cleanRoomId) {
      setErrorMsg("Please enter Room ID.");
      return;
    }

    if (!cleanPassword) {
      setErrorMsg("Please enter Room Password.");
      return;
    }

    try {
      setSaving(true);

      // ========================================================
      // STEP 1: SAVE ROOM DETAILS ON EXISTING SERVER (5004)
      // ========================================================

      const response = await fetch(
        `${ADMIN_API_BASE}/admin/rooms/${encodeURIComponent(
          selectedTournament
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: cleanRoomId,
            password: cleanPassword,
          }),
        }
      );

      const saveData = await getJsonResponse(response);

      console.log("ROOM SAVE RESPONSE:", saveData);

      // ========================================================
      // STEP 2: SHARE ROOM + CREATE PLAYER NOTIFICATIONS (5005)
      // ========================================================

      if (!TOURNAMENT_API_BASE) {
        throw new Error(
          "Tournament API URL missing. Set REACT_APP_TOURNAMENT_API_URL."
        );
      }

      const adminToken = localStorage.getItem("adminToken");

      if (!adminToken) {
        throw new Error(
          "Admin token nahi mila. Please logout karke login karo."
        );
      }

      const notificationResponse = await fetch(
        `${TOURNAMENT_API_BASE}/api/admin/tournaments/${encodeURIComponent(
          selectedTournament
        )}/share-room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            room_id: cleanRoomId,
            room_password: cleanPassword,
          }),
        }
      );

      const notificationData = await getJsonResponse(
        notificationResponse
      );

      console.log(
        "ROOM NOTIFICATION RESPONSE:",
        notificationData
      );

      // ========================================================
      // STEP 3: GET LATEST ROOM DETAILS
      // ========================================================

      const responseCount = getPlayerCount(saveData);

      let freshRoomData = null;

      try {
        freshRoomData = await fetchRoomDetails(
          selectedTournament
        );
      } catch (refreshError) {
        console.error(
          "ROOM REFRESH ERROR:",
          refreshError
        );
      }

      const finalCount = freshRoomData
        ? freshRoomData.participantCount
        : responseCount;

      const finalRoomData = {
        roomId:
          freshRoomData?.roomId || cleanRoomId,

        roomPassword:
          freshRoomData?.roomPassword || cleanPassword,

        participantCount: finalCount,
      };

      setRoomId(finalRoomData.roomId);
      setPassword(finalRoomData.roomPassword);
      setParticipantCount(finalCount);
      setRoomPublished(true);

      setRoomMap((previous) => ({
        ...previous,
        [String(selectedTournament)]: finalRoomData,
      }));

      // ========================================================
      // STEP 4: SUCCESS MESSAGE
      // ========================================================

      const notificationCount = Number(
        notificationData.notificationsSent || 0
      );

      setMessage(
        `Room saved successfully. ${finalCount} player(s) updated. ${notificationCount} notification(s) created.`
      );

      console.log(
        "ROOM DATABASE DETAILS:",
        freshRoomData
      );

      console.log(
        "FINAL PLAYER COUNT:",
        finalCount
      );

      console.log(
        "NOTIFICATIONS CREATED:",
        notificationCount
      );

      if (notificationData.notificationError) {
        console.error(
          "NOTIFICATION DATABASE ERROR:",
          notificationData.notificationError
        );
      }

    } catch (error) {
      console.error("PUBLISH ROOM ERROR:", error);

      setErrorMsg(
        error.message || "Failed to publish room."
      );

      // Room may already have been saved on port 5004.
      // Refresh the displayed room data even if notification
      // creation fails on port 5005.

      try {
        const freshRoomData = await fetchRoomDetails(
          selectedTournament
        );

        setRoomId(freshRoomData.roomId);
        setPassword(freshRoomData.roomPassword);
        setParticipantCount(freshRoomData.participantCount);

        setRoomPublished(
          Boolean(
            freshRoomData.roomId ||
            freshRoomData.roomPassword
          )
        );

        setRoomMap((previous) => ({
          ...previous,
          [String(selectedTournament)]: freshRoomData,
        }));
      } catch (refreshError) {
        console.error(
          "ERROR REFRESHING ROOM AFTER FAILURE:",
          refreshError
        );
      }

    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CLEAR ROOM
  // ============================================================

  const handleClearRoom = async () => {
    if (!selectedTournament) {
      setErrorMsg("Please select a tournament.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove room details from all joined players?"
    );

    if (!confirmed) return;

    try {
      setClearing(true);
      setMessage("");
      setErrorMsg("");

      const response = await fetch(
        `${ADMIN_API_BASE}/admin/rooms/${encodeURIComponent(
          selectedTournament
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await getJsonResponse(response);

      const clearedCount = getPlayerCount(data);

      setRoomId("");
      setPassword("");
      setRoomPublished(false);

      let freshRoomData = null;

      try {
        freshRoomData = await fetchRoomDetails(
          selectedTournament
        );
      } catch (refreshError) {
        console.error(
          "ROOM CLEAR REFRESH ERROR:",
          refreshError
        );
      }

      const finalCount = freshRoomData
        ? freshRoomData.participantCount
        : 0;

      setParticipantCount(finalCount);

      setRoomMap((previous) => ({
        ...previous,
        [String(selectedTournament)]: {
          roomId: "",
          roomPassword: "",
          participantCount: finalCount,
        },
      }));

      setMessage(
        `Room details cleared. ${clearedCount} player(s) updated.`
      );

      console.log("ROOM CLEAR RESPONSE:", data);
      console.log("ROOM COUNT AFTER CLEAR:", finalCount);

    } catch (error) {
      console.error("CLEAR ROOM ERROR:", error);

      setErrorMsg(
        error.message || "Failed to clear room."
      );

    } finally {
      setClearing(false);
    }
  };

  // ============================================================
  // CURRENT TOURNAMENT
  // ============================================================

  const currentTournament = tournaments.find(
    (tournament) =>
      String(tournament.id) ===
      String(selectedTournament)
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="page">

      <h2 className="page-title">
        Room Management
      </h2>

      <p className="page-subtitle">
        Publish BGMI Room ID and Password to users who joined a tournament.
      </p>

      {/* ROOM FORM */}

      <form
        className="form-grid"
        onSubmit={handleSaveRoom}
      >

        <select
          value={selectedTournament}
          onChange={handleTournamentChange}
          disabled={
            loading ||
            roomLoading ||
            saving ||
            clearing
          }
        >

          <option value="">
            Select Tournament
          </option>

          {tournaments.map((tournament) => (
            <option
              key={tournament.id}
              value={tournament.id}
            >
              {tournament.name || "Tournament"} -{" "}
              {tournament.id}
            </option>
          ))}

        </select>

        {/* ROOM ID */}

        <input
          type="text"
          name="roomId"
          placeholder="BGMI Room ID"
          value={roomId}
          onChange={(event) =>
            setRoomId(event.target.value)
          }
          disabled={
            !selectedTournament ||
            roomLoading ||
            saving ||
            clearing
          }
        />

        {/* ROOM PASSWORD */}

        <input
          type="text"
          name="password"
          placeholder="BGMI Room Password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          disabled={
            !selectedTournament ||
            roomLoading ||
            saving ||
            clearing
          }
        />

        {/* PUBLISH / UPDATE */}

        <button
          className="btn-primary"
          type="submit"
          disabled={
            !selectedTournament ||
            roomLoading ||
            saving ||
            clearing
          }
        >
          {saving
            ? "Publishing..."
            : roomPublished
            ? "Update Room"
            : "Publish Room"}
        </button>

        {/* CLEAR */}

        <button
          className="btn-danger"
          type="button"
          onClick={handleClearRoom}
          disabled={
            !selectedTournament ||
            roomLoading ||
            saving ||
            clearing ||
            !roomPublished
          }
        >
          {clearing
            ? "Clearing..."
            : "Clear Room"}
        </button>

      </form>

      {/* SUCCESS MESSAGE */}

      {message && (
        <p
          style={{
            marginTop: "12px",
            fontWeight: 700,
            color: "#16a34a",
          }}
        >
          {message}
        </p>
      )}

      {/* ERROR MESSAGE */}

      {errorMsg && (
        <p
          style={{
            marginTop: "12px",
            fontWeight: 700,
            color: "#ef4444",
          }}
        >
          Error: {errorMsg}
        </p>
      )}

      {/* SELECTED TOURNAMENT INFO */}

      {currentTournament && (
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >

          <h3
            style={{
              margin: "0 0 12px",
            }}
          >
            {currentTournament.name || "Tournament"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
            }}
          >

            <div>
              <small>Tournament ID</small>
              <div>
                <strong>{currentTournament.id}</strong>
              </div>
            </div>

            <div>
              <small>Type</small>
              <div>
                <strong>
                  {currentTournament.team_type ||
                    currentTournament.teamType ||
                    "-"}
                </strong>
              </div>
            </div>

            <div>
              <small>Map</small>
              <div>
                <strong>
                  {currentTournament.map || "-"}
                </strong>
              </div>
            </div>

            <div>
              <small>Joined Players</small>
              <div>
                <strong>{participantCount}</strong>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TOURNAMENT TABLE */}

      <table className="data-table">

        <thead>
          <tr>
            <th>#</th>
            <th>Tournament</th>
            <th>Tournament ID</th>
            <th>Room ID</th>
            <th>Password</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {loading ? (
            <tr>
              <td
                colSpan="8"
                className="empty-row"
              >
                Loading tournaments...
              </td>
            </tr>
          ) : tournaments.length === 0 ? (
            <tr>
              <td
                colSpan="8"
                className="empty-row"
              >
                No tournaments found.
              </td>
            </tr>
          ) : (
            tournaments.map((tournament, index) => {
              const room =
                roomMap[String(tournament.id)] || null;

              const hasRoom = Boolean(
                room?.roomId || room?.roomPassword
              );

              return (
                <tr key={tournament.id}>

                  <td>{index + 1}</td>

                  <td>
                    {tournament.name || "Tournament"}
                  </td>

                  <td>
                    <strong>{tournament.id}</strong>
                  </td>

                  <td>
                    {room?.roomId || "-"}
                  </td>

                  <td>
                    {room?.roomPassword || "-"}
                  </td>

                  <td>
                    {Number(room?.participantCount ?? 0)}
                  </td>

                  <td>
                    {hasRoom ? (
                      <span className="status approved">
                        Published
                      </span>
                    ) : (
                      <span className="status pending">
                        Not Published
                      </span>
                    )}
                  </td>

                  <td>
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={
                        roomLoading ||
                        saving ||
                        clearing
                      }
                      onClick={() => {
                        setSelectedTournament(
                          String(tournament.id)
                        );

                        loadRoomDetails(tournament.id);
                      }}
                    >
                      {hasRoom ? "Edit Room" : "Manage"}
                    </button>
                  </td>

                </tr>
              );
            })
          )}

        </tbody>

      </table>

    </div>
  );
};

export default RoomManagement;
