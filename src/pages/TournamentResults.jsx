
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./TournamentResults.css";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE = (
  import.meta.env.VITE_TOURNAMENT_API_URL ||
  "http://localhost:5005"
).replace(/\/$/, "");

// ============================================================
// HELPERS
// ============================================================

const getTournamentId = (tournament) =>
  tournament?.tournament_id ||
  tournament?.id ||
  "";

const getTournamentName = (tournament) =>
  tournament?.tournament_name ||
  tournament?.name ||
  "Unnamed Tournament";

const getTournamentStatus = (tournament) =>
  tournament?.tournament_status ||
  tournament?.status ||
  "Draft";

const normalizeStatus = (status) =>
  String(status || "").trim().toLowerCase();

const formatStatus = (status) => {
  if (!status) return "Not Started";

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

// ============================================================
// COMPONENT
// ============================================================

const TournamentResults = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] =
    useState(null);

  const [players, setPlayers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // AUTHENTICATED API REQUEST
  // ==========================================================

  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        throw new Error(
          "Admin token missing. Please login again."
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      };

      if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
          ...options,
          headers,
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Admin session expired or unauthorized. Please login again."
          );
        }

        throw new Error(
          data.error ||
            data.message ||
            `Request failed with status ${response.status}`
        );
      }

      return data;
    },
    []
  );

  // ==========================================================
  // LOAD TOURNAMENTS
  // ==========================================================

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/api/admin/tournaments"
      );

      const tournamentList = Array.isArray(data.tournaments)
        ? data.tournaments
        : [];

      setTournaments(tournamentList);

      setSelectedTournament((previous) => {
        if (tournamentList.length === 0) {
          return null;
        }

        if (!previous) {
          return tournamentList[0];
        }

        const previousId = getTournamentId(previous);

        return (
          tournamentList.find(
            (item) =>
              String(getTournamentId(item)) ===
              String(previousId)
          ) || tournamentList[0]
        );
      });

      return tournamentList;
    } catch (err) {
      console.error("Tournament loading error:", err);

      setError(
        err.message || "Failed to load tournaments."
      );

      setTournaments([]);
      setSelectedTournament(null);

      return [];
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // ==========================================================
  // LOAD PLAYERS AND SAVED RESULTS
  // ==========================================================

  const loadPlayersAgain = useCallback(
    async (tournamentId) => {
      if (!tournamentId) {
        return null;
      }

      const data = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(
          tournamentId
        )}/players`
      );

      return data;
    },
    [apiRequest]
  );

  useEffect(() => {
    const tournamentId = getTournamentId(
      selectedTournament
    );

    if (!tournamentId) {
      setPlayers([]);
      setPlayersLoading(false);
      return;
    }

    let cancelled = false;

    const loadPlayers = async () => {
      try {
        setPlayersLoading(true);
        setError("");
        setPlayers([]);

        const data = await loadPlayersAgain(tournamentId);

        if (cancelled) return;

        const playerList = Array.isArray(data.players)
          ? data.players
          : [];

        setPlayers(playerList);

        if (data.tournament) {
          setSelectedTournament((previous) => {
            if (
              String(getTournamentId(previous)) !==
              String(tournamentId)
            ) {
              return previous;
            }

            return {
              ...previous,
              ...data.tournament,
            };
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Player loading error:", err);

          setPlayers([]);

          setError(
            err.message || "Failed to load registered players."
          );
        }
      } finally {
        if (!cancelled) {
          setPlayersLoading(false);
        }
      }
    };

    loadPlayers();

    return () => {
      cancelled = true;
    };
  }, [
    selectedTournament?.tournament_id,
    selectedTournament?.id,
    loadPlayersAgain,
  ]);

  // ==========================================================
  // RELOAD CURRENT TOURNAMENT PLAYERS
  // ==========================================================

  const reloadCurrentPlayers = async () => {
    const tournamentId = getTournamentId(
      selectedTournament
    );

    if (!tournamentId) return;

    const data = await loadPlayersAgain(tournamentId);

    // Prevent applying data to a different selected tournament.
    if (
      String(getTournamentId(selectedTournament)) !==
      String(tournamentId)
    ) {
      return;
    }

    setPlayers(
      Array.isArray(data.players) ? data.players : []
    );

    if (data.tournament) {
      setSelectedTournament((previous) => {
        if (
          String(getTournamentId(previous)) !==
          String(tournamentId)
        ) {
          return previous;
        }

        return {
          ...previous,
          ...data.tournament,
        };
      });
    }
  };

  // ==========================================================
  // UPDATE PLAYER INPUT
  // ==========================================================

  const updatePlayer = (joinId, field, value) => {
    setPlayers((previous) =>
      previous.map((player) => {
        if (
          String(player.join_id) !== String(joinId)
        ) {
          return player;
        }

        return {
          ...player,
          [field]: value,
        };
      })
    );
  };

  const toggleWinner = (joinId, checked) => {
    setPlayers((previous) =>
      previous.map((player) => {
        if (
          String(player.join_id) !== String(joinId)
        ) {
          return player;
        }

        return {
          ...player,
          is_winner: checked,
          winner_prize: checked
            ? player.winner_prize ?? 0
            : 0,
        };
      })
    );
  };

  // ==========================================================
  // SELECTED TOURNAMENT INFORMATION
  // ==========================================================

  const tournamentId = getTournamentId(
    selectedTournament
  );

  const tournamentName = getTournamentName(
    selectedTournament
  );

  const tournamentStatus = getTournamentStatus(
    selectedTournament
  );

  const normalizedTournamentStatus =
    normalizeStatus(tournamentStatus);

  const isCompleted =
    normalizedTournamentStatus === "completed";

  const isCancelled =
    normalizedTournamentStatus === "cancelled";

  const perKill = toNumber(
    selectedTournament?.per_kill ??
      selectedTournament?.perKill
  );

  // ==========================================================
  // RESULT CALCULATIONS
  // ==========================================================

  const totalPlayers = players.length;

  const savedPlayers = useMemo(() => {
    return players.filter((player) => {
      const status = normalizeStatus(player.status);

      return (
        status !== "" &&
        status !== "not_saved"
      );
    }).length;
  }, [players]);

  const paidPlayers = useMemo(() => {
    return players.filter(
      (player) =>
        normalizeStatus(player.status) === "paid"
    ).length;
  }, [players]);

  const creditedAmount = useMemo(() => {
    return players.reduce((total, player) => {
      if (
        normalizeStatus(player.status) !== "paid"
      ) {
        return total;
      }

      return (
        total + toNumber(player.total_winning)
      );
    }, 0);
  }, [players]);

  const totalDraftWinning = useMemo(() => {
    return players.reduce((total, player) => {
      const kills = toNumber(player.kills);

      const prize = player.is_winner
        ? toNumber(player.winner_prize)
        : 0;

      return total + kills * perKill + prize;
    }, 0);
  }, [players, perKill]);

  const hasPaidResults = paidPlayers > 0;

  const editingLocked =
    isCompleted ||
    isCancelled ||
    hasPaidResults;

  // ==========================================================
  // RESULT VALIDATION
  // ==========================================================

  const validatePlayers = () => {
    if (!players.length) {
      throw new Error(
        "No registered players available."
      );
    }

    for (const player of players) {
      const playerName =
        player.player_name || "Unknown Player";

      const kills = Number(player.kills);
      const points = Number(player.points);
      const winnerPrize = Number(
        player.winner_prize || 0
      );

      const rank =
        player.rank_position === "" ||
        player.rank_position === null ||
        player.rank_position === undefined
          ? null
          : Number(player.rank_position);

      if (
        !Number.isFinite(kills) ||
        kills < 0 ||
        !Number.isInteger(kills)
      ) {
        throw new Error(
          `Invalid kills entered for ${playerName}. Kills must be a non-negative whole number.`
        );
      }

      if (
        !Number.isFinite(points) ||
        points < 0
      ) {
        throw new Error(
          `Invalid points entered for ${playerName}.`
        );
      }

      if (
        rank !== null &&
        (
          !Number.isFinite(rank) ||
          rank < 1 ||
          !Number.isInteger(rank)
        )
      ) {
        throw new Error(
          `Invalid rank entered for ${playerName}. Rank must be a positive whole number.`
        );
      }

      if (
        player.is_winner &&
        (
          !Number.isFinite(winnerPrize) ||
          winnerPrize < 0
        )
      ) {
        throw new Error(
          `Invalid winner prize entered for ${playerName}.`
        );
      }
    }
  };

  // ==========================================================
  // SAVE RESULT DRAFTS
  // ==========================================================

  const saveResults = async () => {
    try {
      if (!tournamentId) {
        throw new Error(
          "Please select a tournament first."
        );
      }

      if (editingLocked) {
        throw new Error(
          "Results cannot be edited after payout or tournament completion."
        );
      }

      validatePlayers();

      setActionLoading(true);
      setError("");
      setSuccess("");

      const payload = {
        players: players.map((player) => ({
          join_id: player.join_id,

          kills: Number(player.kills || 0),

          rank_position:
            player.rank_position === "" ||
            player.rank_position === null ||
            player.rank_position === undefined
              ? null
              : Number(player.rank_position),

          points: Number(player.points || 0),

          is_winner: Boolean(player.is_winner),

          winner_prize: player.is_winner
            ? Number(player.winner_prize || 0)
            : 0,
        })),
      };

      const data = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(
          tournamentId
        )}/results`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      setSuccess(
        data.message || "Results saved successfully."
      );

      await reloadCurrentPlayers();
    } catch (err) {
      console.error("Save results error:", err);

      setError(
        err.message || "Unable to save results."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // PUBLISH RESULTS AND CREDIT WALLET
  // ==========================================================

  const publishResults = async () => {
    try {
      if (!tournamentId) {
        throw new Error(
          "Please select a tournament first."
        );
      }

      if (!players.length) {
        throw new Error(
          "No registered players found."
        );
      }

      if (editingLocked) {
        throw new Error(
          "Results have already been paid or tournament is locked."
        );
      }

      const notSaved = players.filter((player) => {
        const status = normalizeStatus(player.status);

        return (
          status === "" ||
          status === "not_saved"
        );
      });

      if (notSaved.length > 0) {
        throw new Error(
          "Save all player results before publishing."
        );
      }

      const confirmPublish = window.confirm(
        "Are you sure you want to publish the results and credit winning amounts to player wallets? This action cannot be reversed."
      );

      if (!confirmPublish) return;

      setActionLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(
          tournamentId
        )}/publish-results`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const paidCount =
        data.paidCount ??
        data.paid_count ??
        0;

      const totalAmount = toNumber(
        data.totalAmount ??
          data.total_amount
      );

      setSuccess(
        `${data.message || "Results published successfully."} Paid players: ${paidCount}, Total credited: ₹${totalAmount.toFixed(2)}`
      );

      await reloadCurrentPlayers();
    } catch (err) {
      console.error("Publish results error:", err);

      setError(
        err.message || "Unable to publish results."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // COMPLETE TOURNAMENT
  // ==========================================================

  const completeTournament = async () => {
    try {
      if (!tournamentId) {
        throw new Error(
          "Please select a tournament first."
        );
      }

      if (!players.length) {
        throw new Error(
          "No registered players found."
        );
      }

      if (isCompleted) {
        throw new Error(
          "This tournament is already completed."
        );
      }

      if (isCancelled) {
        throw new Error(
          "Cancelled tournaments cannot be completed."
        );
      }

      const unpaidPlayers = players.filter(
        (player) =>
          normalizeStatus(player.status) !== "paid"
      );

      if (unpaidPlayers.length > 0) {
        throw new Error(
          "All player payouts must be completed before completing the tournament."
        );
      }

      const confirmComplete = window.confirm(
        "Confirm that all player results and wallet payouts are correct. Complete this tournament?"
      );

      if (!confirmComplete) return;

      setActionLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(
          tournamentId
        )}/complete`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      if (data.tournament) {
        setSelectedTournament((previous) => ({
          ...previous,
          ...data.tournament,
        }));
      }

      setSuccess(
        data.message ||
          "Tournament completion request successful."
      );

      await fetchTournaments();
    } catch (err) {
      console.error("Complete tournament error:", err);

      setError(
        err.message || "Unable to complete tournament."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // REFRESH PAGE
  // ==========================================================

  const refreshPage = async () => {
    setError("");
    setSuccess("");

    const currentId = tournamentId;

    const tournamentList = await fetchTournaments();

    if (!currentId) return;

    const stillExists = tournamentList.some(
      (item) =>
        String(getTournamentId(item)) ===
        String(currentId)
    );

    if (stillExists) {
      try {
        const data = await loadPlayersAgain(currentId);

        setPlayers(
          Array.isArray(data.players)
            ? data.players
            : []
        );

        if (data.tournament) {
          setSelectedTournament((previous) => {
            if (
              String(getTournamentId(previous)) !==
              String(currentId)
            ) {
              return previous;
            }

            return {
              ...previous,
              ...data.tournament,
            };
          });
        }
      } catch (err) {
        console.error("Refresh players error:", err);

        setError(
          err.message || "Unable to refresh player results."
        );
      }
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="tr-page">

      {/* PAGE HEADER */}

      <div className="tr-header">
        <div>
          <div className="tr-heading-label">
            E-SPORTS ADMIN PANEL
          </div>

          <h1>
            TOURNAMENT <span>RESULTS</span>
          </h1>

          <p>
            Manage match results, player rankings and winning distribution.
          </p>
        </div>

        <button
          className="tr-refresh-btn"
          type="button"
          onClick={refreshPage}
          disabled={loading || actionLoading}
        >
          ↻ {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="tr-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="tr-success" role="status">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close success message"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOURNAMENT LIST */}

      <div className="tr-section">
        <div className="tr-section-heading">
          <div>
            <h2>Available Tournaments</h2>

            <p>
              Select a tournament to manage its results.
            </p>
          </div>

          <span className="tr-count">
            {tournaments.length} Tournaments
          </span>
        </div>

        {loading ? (
          <div className="tr-empty">
            Loading tournaments...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="tr-empty">
            <div className="tr-empty-icon">🏆</div>

            <h3>No Tournaments Found</h3>

            <p>
              Create a tournament from Tournament Management first.
            </p>
          </div>
        ) : (
          <div className="tr-tournament-grid">
            {tournaments.map((tournament) => {
              const currentId =
                getTournamentId(tournament);

              const isSelected =
                String(tournamentId) ===
                String(currentId);

              const joinedCount =
                tournament.joinedPlayers ??
                tournament.registered ??
                0;

              return (
                <div
                  key={currentId}
                  className={`tr-tournament-card ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => {
                    if (!actionLoading) {
                      setSelectedTournament(tournament);
                    }
                  }}
                >
                  <div className="tr-card-top">
                    <span className="tr-card-icon">
                      🏆
                    </span>

                    <span className="tr-status">
                      {formatStatus(
                        getTournamentStatus(tournament)
                      )}
                    </span>
                  </div>

                  <h3>
                    {getTournamentName(tournament)}
                  </h3>

                  <p className="tr-tournament-id">
                    ID: {currentId}
                  </p>

                  <div className="tr-card-details">
                    <span>
                      🎮{" "}
                      {tournament.game_mode ||
                        tournament.mode ||
                        "N/A"}
                    </span>

                    <span>
                      🗺️ {tournament.map || "N/A"}
                    </span>

                    <span>
                      👥 {joinedCount} Players
                    </span>

                    <span>
                      💰 ₹{toNumber(tournament.prize_pool)}
                    </span>
                  </div>

                  <button
                    className="tr-manage-btn"
                    type="button"
                    disabled={actionLoading}
                  >
                    {isSelected
                      ? "SELECTED ✓"
                      : "MANAGE RESULTS →"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SELECTED TOURNAMENT DETAILS */}

      {selectedTournament && (
        <>
          <div className="tr-section">
            <div className="tr-section-heading">
              <div>
                <h2>Selected Tournament</h2>

                <p>
                  Complete tournament result management.
                </p>
              </div>

              <span className="tr-selected-tag">
                ACTIVE SELECTION
              </span>
            </div>

            <div className="tr-overview">
              <div className="tr-overview-main">
                <span className="tr-overview-label">
                  TOURNAMENT NAME
                </span>

                <h2>{tournamentName}</h2>

                <span className="tr-overview-id">
                  Tournament ID: {tournamentId}
                </span>
              </div>

              <div className="tr-overview-grid">
                <div>
                  <span>GAME MODE</span>

                  <strong>
                    {selectedTournament.game_mode ||
                      selectedTournament.mode ||
                      "N/A"}
                  </strong>
                </div>

                <div>
                  <span>MATCH TYPE</span>

                  <strong>
                    {selectedTournament.match_type ||
                      selectedTournament.type ||
                      "N/A"}
                  </strong>
                </div>

                <div>
                  <span>MAP</span>

                  <strong>
                    {selectedTournament.map || "N/A"}
                  </strong>
                </div>

                <div>
                  <span>ENTRY FEE</span>

                  <strong>
                    ₹{toNumber(selectedTournament.entry_fee)}
                  </strong>
                </div>

                <div>
                  <span>PRIZE POOL</span>

                  <strong>
                    ₹{toNumber(selectedTournament.prize_pool)}
                  </strong>
                </div>

                <div>
                  <span>DATE & TIME</span>

                  <strong>
                    {selectedTournament.date || "N/A"}{" "}
                    {selectedTournament.time || ""}
                  </strong>
                </div>
              </div>
            </div>

            {/* SUMMARY CARDS */}

            <div className="tr-stats-grid">
              <div className="tr-stat-card">
                <span>REGISTERED PLAYERS</span>

                <strong>{totalPlayers}</strong>
              </div>

              <div className="tr-stat-card">
                <span>RESULTS SAVED</span>

                <strong>
                  {savedPlayers}/{totalPlayers}
                </strong>
              </div>

              <div className="tr-stat-card">
                <span>WINNING CREDITED</span>

                <strong>
                  ₹{creditedAmount.toFixed(2)}
                </strong>
              </div>

              <div className="tr-stat-card">
                <span>TOURNAMENT STATUS</span>

                <strong className="tr-stat-status">
                  {formatStatus(tournamentStatus)}
                </strong>
              </div>
            </div>
          </div>

          {/* PLAYER RESULTS */}

          <div className="tr-section">
            <div className="tr-section-heading">
              <div>
                <h2>Player Results</h2>

                <p>
                  Enter player kills, rank, points and winning amount.
                </p>
              </div>

              <span className="tr-count">
                {totalPlayers} Players
              </span>
            </div>

            {playersLoading ? (
              <div className="tr-empty">
                Loading registered players...
              </div>
            ) : players.length === 0 ? (
              <div className="tr-empty">
                <div className="tr-empty-icon">👥</div>

                <h3>No Registered Players</h3>

                <p>
                  This tournament does not have any registered players yet.
                </p>
              </div>
            ) : (
              <>
                <div className="tr-table-wrapper">
                  <table className="tr-results-table">
                    <thead>
                      <tr>
                        <th>PLAYER</th>
                        <th>BGMI ID</th>
                        <th>KILLS</th>
                        <th>RANK</th>
                        <th>POINTS</th>
                        <th>WINNER</th>
                        <th>WINNER PRIZE</th>
                        <th>KILL AMOUNT</th>
                        <th>TOTAL WINNING</th>
                        <th>PAYMENT</th>
                      </tr>
                    </thead>

                    <tbody>
                      {players.map((player) => {
                        const killAmount =
                          toNumber(player.kills) * perKill;

                        const winnerPrize =
                          player.is_winner
                            ? toNumber(player.winner_prize)
                            : 0;

                        const totalWinning =
                          killAmount + winnerPrize;

                        const isPaid =
                          normalizeStatus(player.status) ===
                          "paid";

                        const isLocked =
                          editingLocked || isPaid;

                        return (
                          <tr key={player.join_id}>
                            <td>
                              <strong>
                                {player.player_name ||
                                  "Unknown Player"}
                              </strong>

                              <small>
                                {player.profile_name || ""}
                              </small>
                            </td>

                            <td>
                              {player.bgmi_id || "N/A"}
                            </td>

                            <td>
                              <input
                                className="tr-result-input"
                                type="number"
                                min="0"
                                step="1"
                                value={player.kills ?? 0}
                                disabled={isLocked}
                                onChange={(event) =>
                                  updatePlayer(
                                    player.join_id,
                                    "kills",
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                className="tr-result-input"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="-"
                                value={
                                  player.rank_position ?? ""
                                }
                                disabled={isLocked}
                                onChange={(event) =>
                                  updatePlayer(
                                    player.join_id,
                                    "rank_position",
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                className="tr-result-input"
                                type="number"
                                min="0"
                                step="0.5"
                                value={player.points ?? 0}
                                disabled={isLocked}
                                onChange={(event) =>
                                  updatePlayer(
                                    player.join_id,
                                    "points",
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  player.is_winner
                                )}
                                disabled={isLocked}
                                onChange={(event) =>
                                  toggleWinner(
                                    player.join_id,
                                    event.target.checked
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                className="tr-result-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  player.is_winner
                                    ? player.winner_prize ?? 0
                                    : 0
                                }
                                disabled={
                                  isLocked ||
                                  !player.is_winner
                                }
                                onChange={(event) =>
                                  updatePlayer(
                                    player.join_id,
                                    "winner_prize",
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              ₹{killAmount.toFixed(2)}
                            </td>

                            <td>
                              <strong>
                                ₹{totalWinning.toFixed(2)}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`tr-payment-status ${
                                  isPaid ? "paid" : "pending"
                                }`}
                              >
                                {isPaid ? "PAID" : "PENDING"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* WINNING CALCULATION */}

                <div className="tr-winning-placeholder">
                  <div className="tr-winning-icon">
                    💰
                  </div>

                  <div>
                    <h3>Winning Calculation</h3>

                    <p>
                      Per kill: ₹{perKill.toFixed(2)}
                      {" | "}
                      Total estimated winning: ₹
                      {totalDraftWinning.toFixed(2)}
                      {" | "}
                      Already credited: ₹
                      {creditedAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* FINAL ACTIONS */}

          <div className="tr-section">
            <div className="tr-section-heading">
              <div>
                <h2>Final Actions</h2>

                <p>
                  Save, publish and complete this tournament.
                </p>
              </div>
            </div>

            <div className="tr-actions">
              <button
                className="tr-action-btn save"
                type="button"
                onClick={saveResults}
                disabled={
                  actionLoading ||
                  playersLoading ||
                  !players.length ||
                  editingLocked
                }
              >
                {actionLoading
                  ? "Please wait..."
                  : "💾 Save Results"}
              </button>

              <button
                className="tr-action-btn publish"
                type="button"
                onClick={publishResults}
                disabled={
                  actionLoading ||
                  playersLoading ||
                  !players.length ||
                  editingLocked ||
                  savedPlayers !== totalPlayers
                }
              >
                🚀 Publish & Credit Winning
              </button>

              <button
                className="tr-action-btn complete"
                type="button"
                onClick={completeTournament}
                disabled={
                  actionLoading ||
                  playersLoading ||
                  !players.length ||
                  isCompleted ||
                  isCancelled ||
                  paidPlayers !== totalPlayers
                }
              >
                ✓ Complete Tournament
              </button>
            </div>

            <p className="tr-action-note">
              {isCompleted
                ? "This tournament has been completed."
                : isCancelled
                  ? "Cancelled tournaments cannot publish results."
                  : hasPaidResults
                    ? "Wallet payouts have started. Editing is locked."
                    : "Save all player results before publishing. Complete the tournament only after every payout is verified."}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default TournamentResults;
