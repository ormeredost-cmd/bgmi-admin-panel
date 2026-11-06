import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import "./../styles/tournamentDetail.css";

// ============================================================
// 5004 ADMIN SERVER
// ============================================================
const ADMIN_API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5004"
    : "https://dashboard-server-tera.onrender.com";

// ============================================================
// HELPERS
// ============================================================
const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getPerKill = (tournament) =>
  Math.max(
    0,
    safeNumber(
      tournament?.per_kill ??
        tournament?.perKill ??
        0
    )
  );

const getWinnerPrize = (tournament) =>
  Math.max(
    0,
    safeNumber(
      tournament?.winner_prize ??
        tournament?.winnerPrize ??
        tournament?.prize_pool ??
        tournament?.prizePool ??
        0
    )
  );

const getMaxSlots = (tournament) => {
  const slots = safeNumber(
    tournament?.max_slots ??
      tournament?.maxSlots ??
      tournament?.slots ??
      50
  );

  return slots > 0 ? Math.floor(slots) : 50;
};

const normalizeResult = (result) => ({
  kills: Math.max(
    0,
    Math.floor(
      safeNumber(result?.kills, 0)
    )
  ),

  isWinner: Boolean(
    result?.is_winner
  ),

  killAmount: safeNumber(
    result?.kill_amount,
    0
  ),

  winnerPrize: safeNumber(
    result?.winner_prize,
    0
  ),

  totalWinning: safeNumber(
    result?.total_winning,
    0
  ),

  status:
    result?.status || "",
});

// ============================================================
// COMPONENT
// ============================================================
const AdminTournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================
  const [tournament, setTournament] =
    useState(null);

  const [users, setUsers] =
    useState([]);

  const [results, setResults] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [actionId, setActionId] =
    useState("");

  const [savingResults, setSavingResults] =
    useState(false);

  const [settling, setSettling] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMsg, setErrorMsg] =
    useState("");

  const [
    resultSystemAvailable,
    setResultSystemAvailable,
  ] = useState(false);

  // Server se pata chalne wala result lock
  const [serverResultsLocked, setServerResultsLocked] =
    useState(false);

  // Double click / duplicate save protection
  const saveResultsLock = useRef(false);

  // ==========================================================
  // LOAD TOURNAMENT
  // ==========================================================
  const loadData = useCallback(
    async () => {
      if (!id) {
        return;
      }

      setLoading(true);

      try {
        setErrorMsg("");

        const response = await axios.get(
          `${ADMIN_API_BASE}/admin/tournament-joins/${encodeURIComponent(
            id
          )}`,
          {
            timeout: 10000,
          }
        );

        const data = response.data || {};

        // ------------------------------------------------------
        // USERS
        // ------------------------------------------------------
        const incomingUsers =
          Array.isArray(data.users)
            ? data.users
            : [];

        // ------------------------------------------------------
        // RESULTS
        // ------------------------------------------------------
        const incomingResults =
          Array.isArray(data.results)
            ? data.results
            : [];

        setResultSystemAvailable(
          data.resultSystemAvailable !== false
        );

        // ------------------------------------------------------
        // RESULT LOCK
        // ------------------------------------------------------
        const hasPaidResult =
          incomingResults.some(
            (result) => {
              const status = String(
                result?.status ||
                  result?.result_status ||
                  ""
              ).toLowerCase();

              return (
                status === "paid" ||
                status === "settled"
              );
            }
          );

        const tournamentData =
          data.tournament || {};

        const tournamentStatus =
          String(
            tournamentData?.status || ""
          ).toLowerCase();

        const tournamentIsSettled =
          tournamentData?.settled === true ||
          tournamentData?.is_settled === true ||
          tournamentData?.results_settled === true ||
          tournamentData?.resultsSettled === true ||
          tournamentData?.settlement_completed === true ||
          tournamentStatus === "settled" ||
          tournamentStatus === "paid";

        setServerResultsLocked(
          hasPaidResult ||
            tournamentIsSettled
        );

        // ------------------------------------------------------
        // RESULT MAP
        // ------------------------------------------------------
        const resultMap = {};

        incomingResults.forEach(
          (result) => {
            resultMap[
              String(result.join_id)
            ] = normalizeResult(result);
          }
        );

        // ------------------------------------------------------
        // MERGE USER + RESULT
        // ------------------------------------------------------
        const mergedUsers =
          incomingUsers.map((user) => {
            const saved =
              resultMap[
                String(user.id)
              ];

            return {
              ...user,

              resultStatus:
                saved?.status || "",

              kills:
                saved?.kills ??
                Math.max(
                  0,
                  Math.floor(
                    safeNumber(
                      user.kills,
                      0
                    )
                  )
                ),

              isWinner:
                saved?.isWinner ??
                (
                  Boolean(
                    user.is_winner
                  ) ||
                  user.status ===
                    "winner"
                ),

              killAmount:
                saved?.killAmount ??
                0,

              winnerPrize:
                saved?.winnerPrize ??
                0,

              totalWinning:
                saved?.totalWinning ??
                0,
            };
          });

        setTournament(
          tournamentData
        );

        setUsers(
          mergedUsers
        );

        // ------------------------------------------------------
        // DRAFT RESULTS
        // ------------------------------------------------------
        const nextDraft = {};

        mergedUsers.forEach(
          (user) => {
            nextDraft[user.id] = {
              kills: Math.max(
                0,
                Math.floor(
                  safeNumber(
                    user.kills,
                    0
                  )
                )
              ),

              isWinner:
                Boolean(
                  user.isWinner
                ),
            };
          }
        );

        setResults(
          nextDraft
        );
      } catch (error) {
        console.error(
          "❌ Tournament detail load failed:",
          error
        );

        setErrorMsg(
          error?.response?.data?.error ||
            error?.response?.data?.message ||
            "Tournament data load nahi ho paaya."
        );
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================================
  // TOURNAMENT CONFIG
  // ==========================================================
  const perKill =
    getPerKill(tournament);

  const winnerPrize =
    getWinnerPrize(tournament);

  const maxSlots =
    getMaxSlots(tournament);

  const entryFee = safeNumber(
    tournament?.entry_fee ??
      tournament?.entryFee ??
      0
  );

  const prizePool = safeNumber(
    tournament?.prize_pool ??
      tournament?.prizePool ??
      0
  );

  // ==========================================================
  // ACTIVE PLAYERS
  // ==========================================================
  const activeUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          String(user.status)
            .toLowerCase() !==
          "rejected"
      ),
    [users]
  );

  // ==========================================================
  // APPROVED PLAYERS
  // ==========================================================
  const approvedUsers = useMemo(
    () =>
      activeUsers.filter(
        (user) =>
          [
            "approved",
            "winner",
            "loser",
          ].includes(
            String(
              user.status || ""
            ).toLowerCase()
          )
      ),
    [activeUsers]
  );

  // ==========================================================
  // CURRENT WINNER
  // ==========================================================
  const winnerId = useMemo(() => {
    const winner =
      activeUsers.find(
        (user) =>
          results[user.id]
            ?.isWinner
      );

    return winner?.id || "";
  }, [
    activeUsers,
    results,
  ]);

  const winnerName = useMemo(() => {
    if (!winnerId) {
      return "Not selected";
    }

    return (
      activeUsers.find(
        (user) =>
          user.id === winnerId
      )?.player_name ||
      "Unknown"
    );
  }, [
    activeUsers,
    winnerId,
  ]);

  // ==========================================================
  // PREVIEW TOTAL
  // ==========================================================
  const previewTotal = useMemo(() => {
    return activeUsers.reduce(
      (total, user) => {
        const draft =
          results[user.id] || {};

        const kills = Math.max(
          0,
          Math.floor(
            safeNumber(
              draft.kills,
              0
            )
          )
        );

        const killAmount =
          kills * perKill;

        const winnerAmount =
          draft.isWinner
            ? winnerPrize
            : 0;

        return (
          total +
          killAmount +
          winnerAmount
        );
      },
      0
    );
  }, [
    activeUsers,
    results,
    perKill,
    winnerPrize,
  ]);

  // ==========================================================
  // PAID RESULT CHECK
  // ==========================================================
  const paidAlready = useMemo(
    () =>
      users.some(
        (user) => {
          const status =
            String(
              user.resultStatus ||
                ""
            ).toLowerCase();

          return (
            status === "paid" ||
            status === "settled"
          );
        }
      ),
    [users]
  );

  // ==========================================================
  // FINAL LOCK
  // ==========================================================
  const resultsLocked =
    paidAlready ||
    serverResultsLocked;

  // ==========================================================
  // UPDATE DRAFT
  // ==========================================================
  const updatePlayerDraft = (
    userId,
    patch
  ) => {
    if (resultsLocked) {
      return;
    }

    setResults((prev) => ({
      ...prev,

      [userId]: {
        kills: Math.max(
          0,
          Math.floor(
            safeNumber(
              prev[userId]?.kills,
              0
            )
          )
        ),

        isWinner:
          Boolean(
            prev[userId]
              ?.isWinner
          ),

        ...patch,
      },
    }));
  };

  // ==========================================================
  // SELECT WINNER
  // ==========================================================
  const selectWinner = (
    userId
  ) => {
    if (resultsLocked) {
      return;
    }

    setResults((prev) => {
      const next = {
        ...prev,
      };

      Object.keys(next).forEach(
        (key) => {
          next[key] = {
            ...next[key],
            isWinner: false,
          };
        }
      );

      if (next[userId]) {
        next[userId] = {
          ...next[userId],
          isWinner: true,
        };
      }

      return next;
    });
  };

  // ==========================================================
  // APPROVE / REJECT
  // ==========================================================
  const updateJoinStatus = async (
    userId,
    status
  ) => {
    const actionKey =
      `${status}:${userId}`;

    setActionId(actionKey);
    setMessage("");
    setErrorMsg("");

    try {
      let endpoint = "";

      if (status === "approved") {
        endpoint = "approve";
      }

      if (status === "rejected") {
        endpoint = "reject";
      }

      if (!endpoint) {
        return;
      }

      const response =
        await axios.put(
          `${ADMIN_API_BASE}/admin/tournament-joins/${encodeURIComponent(
            id
          )}/${endpoint}`,
          {
            userId,
          },
          {
            timeout: 10000,
          }
        );

      const updatedJoin =
        response.data?.join;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                ...(updatedJoin || {}),
                status,
              }
            : user
        )
      );

      setMessage(
        status === "approved"
          ? "✅ Player approved."
          : "🚫 Player rejected."
      );
    } catch (error) {
      console.error(
        `❌ ${status} failed:`,
        error
      );

      setErrorMsg(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          `Player ${status} failed.`
      );
    } finally {
      setActionId("");
    }
  };

  // ==========================================================
  // DELETE PLAYER
  // ==========================================================
  const handleDelete = async (
    userId
  ) => {
    if (resultsLocked) {
      setErrorMsg(
        "❌ Paid result wale player ko delete nahi kar sakte."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Ye tournament join record delete karna hai?"
      );

    if (!confirmed) {
      return;
    }

    setActionId(
      `delete:${userId}`
    );

    setMessage("");
    setErrorMsg("");

    try {
      await axios.delete(
        `${ADMIN_API_BASE}/admin/tournament-joins/${encodeURIComponent(
          id
        )}`,
        {
          data: {
            userId,
          },
          timeout: 10000,
        }
      );

      setUsers((prev) =>
        prev.filter(
          (user) =>
            user.id !== userId
        )
      );

      setResults((prev) => {
        const next = {
          ...prev,
        };

        delete next[userId];

        return next;
      });

      setMessage(
        "🗑️ Player join deleted."
      );
    } catch (error) {
      console.error(
        "❌ Delete player failed:",
        error
      );

      setErrorMsg(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Player delete nahi ho paaya."
      );
    } finally {
      setActionId("");
    }
  };

  // ==========================================================
  // SAVE / CALCULATE RESULTS
  // ==========================================================
  const saveResults = async () => {
    // --------------------------------------------------------
    // DUPLICATE CLICK LOCK
    // --------------------------------------------------------
    if (saveResultsLock.current) {
      return;
    }

    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------
    if (!resultSystemAvailable) {
      setErrorMsg(
        "❌ Result system database mein available nahi hai."
      );
      return;
    }

    if (!activeUsers.length) {
      setErrorMsg(
        "❌ Koi active player nahi mila."
      );
      return;
    }

    // --------------------------------------------------------
    // CURRENT LOCK
    // --------------------------------------------------------
    if (resultsLocked) {
      setMessage(
        "✅ This tournament is already settled. Paid results cannot be edited."
      );
      setErrorMsg("");
      return;
    }

    // --------------------------------------------------------
    // LOCK BEFORE REQUEST
    // --------------------------------------------------------
    saveResultsLock.current = true;

    setSavingResults(true);
    setMessage("");
    setErrorMsg("");

    try {
      // ======================================================
      // FRESH SERVER CHECK
      //
      // Ye check stale frontend state ko avoid karega.
      // ======================================================
      const latestResponse =
        await axios.get(
          `${ADMIN_API_BASE}/admin/tournament-joins/${encodeURIComponent(
            id
          )}`,
          {
            timeout: 10000,
          }
        );

      const latestData =
        latestResponse.data || {};

      const latestResults =
        Array.isArray(
          latestData.results
        )
          ? latestData.results
          : [];

      const latestTournament =
        latestData.tournament || {};

      // ------------------------------------------------------
      // CHECK RESULT STATUS
      // ------------------------------------------------------
      const latestPaid =
        latestResults.some(
          (result) => {
            const status =
              String(
                result?.status ||
                  result?.result_status ||
                  ""
              ).toLowerCase();

            return (
              status === "paid" ||
              status === "settled"
            );
          }
        );

      // ------------------------------------------------------
      // CHECK TOURNAMENT SETTLEMENT FLAGS
      // ------------------------------------------------------
      const latestTournamentStatus =
        String(
          latestTournament?.status ||
            ""
        ).toLowerCase();

      const latestSettled =
        latestTournament?.settled === true ||
        latestTournament?.is_settled === true ||
        latestTournament?.results_settled === true ||
        latestTournament?.resultsSettled === true ||
        latestTournament?.settlement_completed === true ||
        latestTournamentStatus ===
          "settled" ||
        latestTournamentStatus ===
          "paid";

      // ------------------------------------------------------
      // STOP SAVE
      // ------------------------------------------------------
      if (
        latestPaid ||
        latestSettled
      ) {
        setServerResultsLocked(
          true
        );

        setMessage(
          "✅ This tournament is already settled. Paid results cannot be edited."
        );

        setErrorMsg("");

        // Latest users/results load
        await loadData();

        return;
      }

      // ======================================================
      // WINNER VALIDATION
      // ======================================================
      const selectedWinners =
        activeUsers.filter(
          (user) =>
            results[user.id]
              ?.isWinner
        );

      if (
        winnerPrize > 0 &&
        selectedWinners.length !== 1
      ) {
        setErrorMsg(
          "❌ Exactly 1 winner select karo."
        );
        return;
      }

      // ======================================================
      // BUILD PAYLOAD
      // ======================================================
      const payload =
        activeUsers.map(
          (user) => ({
            joinId:
              user.id,

            kills: Math.max(
              0,
              Math.floor(
                safeNumber(
                  results[
                    user.id
                  ]?.kills,
                  0
                )
              )
            ),

            isWinner:
              Boolean(
                results[
                  user.id
                ]?.isWinner
              ),
          })
        );

      // ======================================================
      // SAVE TO SERVER
      // ======================================================
      const response =
        await axios.post(
          `${ADMIN_API_BASE}/admin/tournament-results/${encodeURIComponent(
            id
          )}/save`,
          {
            results: payload,
          },
          {
            timeout: 15000,
          }
        );

      // ======================================================
      // UPDATE LOCAL USERS
      // ======================================================
      const savedResults =
        Array.isArray(
          response.data?.results
        )
          ? response.data.results
          : [];

      setUsers((prev) =>
        prev.map((user) => {
          const saved =
            savedResults.find(
              (item) =>
                String(
                  item.join_id
                ) ===
                String(
                  user.id
                )
            );

          if (!saved) {
            return user;
          }

          return {
            ...user,

            kills:
              safeNumber(
                saved.kills
              ),

            isWinner:
              Boolean(
                saved.is_winner
              ),

            killAmount:
              safeNumber(
                saved.kill_amount
              ),

            winnerPrize:
              safeNumber(
                saved.winner_prize
              ),

            totalWinning:
              safeNumber(
                saved.total_winning
              ),

            resultStatus:
              saved.status ||
              "pending",
          };
        })
      );

      setMessage(
        `✅ Results saved successfully. Total winning: ${currency(
          response.data
            ?.totalWinning ||
            0
        )}`
      );
    } catch (error) {
      const serverError =
        error?.response?.data
          ?.error ||
        error?.response?.data
          ?.message ||
        "";

      // ------------------------------------------------------
      // BACKEND SAFETY
      // ------------------------------------------------------
      if (
        error?.response?.status ===
          400 &&
        /already settled|paid results cannot be edited/i.test(
          serverError
        )
      ) {
        setServerResultsLocked(
          true
        );

        await loadData();

        setMessage(
          "✅ This tournament is already settled. Paid results cannot be edited."
        );

        setErrorMsg("");

        return;
      }

      console.error(
        "❌ Save results failed:",
        error
      );

      setErrorMsg(
        serverError ||
          "Results save nahi ho paaye."
      );
    } finally {
      saveResultsLock.current =
        false;

      setSavingResults(false);
    }
  };

  // ==========================================================
  // CREDIT WINNING
  // ==========================================================
  const settleWinning =
    async () => {
      if (!resultSystemAvailable) {
        setErrorMsg(
          "❌ Result system database mein available nahi hai."
        );
        return;
      }

      if (resultsLocked) {
        setErrorMsg(
          "❌ Is tournament ki winning already paid hai."
        );
        return;
      }

      // ------------------------------------------------------
      // RESULT MUST BE SAVED FIRST
      // ------------------------------------------------------
      const hasPendingResults =
        users.some(
          (user) =>
            String(
              user.resultStatus ||
                ""
            ).toLowerCase() ===
            "pending"
        );

      if (!hasPendingResults) {
        setErrorMsg(
          "❌ Pehle Save / Calculate Results karo."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Winning sab selected players ke wallet mein credit karni hai?"
        );

      if (!confirmed) {
        return;
      }

      setSettling(true);
      setMessage("");
      setErrorMsg("");

      try {
        const response =
          await axios.post(
            `${ADMIN_API_BASE}/admin/tournament-results/${encodeURIComponent(
              id
            )}/settle`,
            {},
            {
              timeout: 20000,
            }
          );

        setMessage(
          `💰 Winning settled successfully. ${
            response.data
              ?.paidCount ?? 0
          } player(s) paid, total ${currency(
            response.data
              ?.totalPaid ||
              0
          )}.`
        );

        await loadData();
      } catch (error) {
        console.error(
          "❌ Settlement failed:",
          error
        );

        setErrorMsg(
          error?.response?.data?.error ||
            error?.response?.data?.message ||
            "Winning credit nahi ho paayi."
        );
      } finally {
        setSettling(false);
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================
  if (loading) {
    return (
      <div className="admin-tournament-page loading-state">
        <div className="loading-card">

          <div className="loading-spinner" />

          <h2>
            Loading tournament...
          </h2>

          <p>
            Players aur tournament
            data load ho raha hai.
          </p>

        </div>
      </div>
    );
  }

  // ==========================================================
  // NOT FOUND
  // ==========================================================
  if (!tournament) {
    return (
      <div className="admin-tournament-page">

        <div className="empty-card">

          <h2>
            Tournament not found
          </h2>

          <p>
            {errorMsg ||
              "Tournament record available nahi hai."}
          </p>

          <button
            type="button"
            className="primary-btn"
            onClick={() =>
              navigate(
                "/dashboard"
              )
            }
          >
            ← Back to Dashboard
          </button>

        </div>

      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="admin-tournament-page">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}
      <div className="page-head">

        <div className="page-head-left">

          <button
            type="button"
            className="back-btn"
            onClick={() =>
              navigate(
                "/dashboard"
              )
            }
          >
            ← Dashboard
          </button>

          <span className="eyebrow">
            TOURNAMENT CONTROL
          </span>

          <h1>
            {tournament.name ||
              "BGMI Tournament"}
          </h1>

          <p>
            Tournament ID:{" "}
            <strong>
              {tournament.id ||
                id}
            </strong>
          </p>

        </div>

      </div>

      {/* ======================================================
          ALERTS
      ====================================================== */}
      {(message || errorMsg) && (
        <div
          className={`admin-alert ${
            errorMsg
              ? "error"
              : "success"
          }`}
        >
          {errorMsg || message}
        </div>
      )}

      {/* ======================================================
          SETTLED NOTICE
      ====================================================== */}
      {resultsLocked && (
        <div className="admin-alert">
          ✅ This tournament is already settled. Paid results
          cannot be edited.
        </div>
      )}

      {/* ======================================================
          TOURNAMENT INFO
      ====================================================== */}
      <section className="hero-grid">

        <div className="hero-card primary">

          <div className="hero-topline">

            <span>
              {tournament.status ||
                "Scheduled"}
            </span>

            <span>
              {tournament.is_visible === false
                ? "Hidden"
                : "Visible"}
            </span>

          </div>

          <div className="hero-title-row">

            <div>

              <h2>
                {tournament.name ||
                  "Tournament"}
              </h2>

              <p>
                {tournament.mode ||
                  "Classic"}
                {" · "}
                {tournament.map ||
                  "Erangel"}
              </p>

              <small>
                {tournament.teamType ||
                  tournament.team_type ||
                  ""}
              </small>

            </div>

            <div className="big-prize">
              {currency(prizePool)}
            </div>

          </div>

        </div>

        <div className="stat-card">

          <span>
            ENTRY
          </span>

          <strong>
            {currency(entryFee)}
          </strong>

          <small>
            Per player
          </small>

        </div>

        <div className="stat-card">

          <span>
            PER KILL
          </span>

          <strong>
            {currency(perKill)}
          </strong>

          <small>
            Kill earning
          </small>

        </div>

        <div className="stat-card">

          <span>
            WINNER PRIZE
          </span>

          <strong>
            {currency(winnerPrize)}
          </strong>

          <small>
            Winner bonus
          </small>

        </div>

        <div className="stat-card">

          <span>
            SLOTS
          </span>

          <strong>
            {users.length}/
            {maxSlots}
          </strong>

          <small>
            {maxSlots
              ? Math.min(
                  100,
                  Math.round(
                    (users.length /
                      maxSlots) *
                      100
                  )
                )
              : 0}
            % filled
          </small>

        </div>

      </section>

      {/* ======================================================
          RESULT TOOLBAR
      ====================================================== */}
      <section className="results-toolbar">

        <div>

          <h3>
            Match Results
          </h3>

          <p>
            Har active player ke
            kills enter karo aur
            ek winner select karo.
          </p>

        </div>

        <div className="toolbar-right">

          <div className="total-preview">

            <span>
              Preview payout
            </span>

            <strong>
              {currency(
                previewTotal
              )}
            </strong>

          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={saveResults}
            disabled={
              savingResults ||
              settling ||
              resultsLocked ||
              !resultSystemAvailable
            }
          >
            {savingResults
              ? "Saving..."
              : resultsLocked
              ? "✅ Results Locked"
              : "💾 Save / Calculate"}
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={settleWinning}
            disabled={
              settling ||
              savingResults ||
              resultsLocked ||
              !resultSystemAvailable
            }
          >
            {resultsLocked
              ? "✅ Winning Paid"
              : settling
              ? "Crediting..."
              : "💰 Credit Winning"}
          </button>

        </div>

      </section>

      {/* ======================================================
          RESULT SYSTEM WARNING
      ====================================================== */}
      {!resultSystemAvailable && (
        <div className="admin-alert error">
          ⚠️ Result system available nahi
          hai. `tournament_results`
          table setup karo.
        </div>
      )}

      {/* ======================================================
          PLAYER TABLE
      ====================================================== */}
      <section className="players-card">

        <div className="table-headline">

          <div>

            <h3>
              Players
            </h3>

            <p>
              {activeUsers.length}
              {" "}active players
              {" · "}
              {approvedUsers.length}
              {" "}approved
            </p>

          </div>

          <div className="winner-note">

            Winner:{" "}

            <strong>
              {winnerName}
            </strong>

          </div>

        </div>

        <div className="table-scroll">

          <table className="players-table">

            <thead>

              <tr>
                <th>#</th>
                <th>Player</th>
                <th>BGMI ID</th>
                <th>Profile</th>
                <th>Status</th>
                <th>Kills</th>
                <th>Kill ₹</th>
                <th>Winner</th>
                <th>Total Winning</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {users.map(
                (user, index) => {
                  const draft =
                    results[
                      user.id
                    ] || {
                      kills: 0,
                      isWinner: false,
                    };

                  const kills =
                    Math.max(
                      0,
                      Math.floor(
                        safeNumber(
                          draft.kills,
                          0
                        )
                      )
                    );

                  const killAmount =
                    kills * perKill;

                  const winnerAmount =
                    draft.isWinner
                      ? winnerPrize
                      : 0;

                  const totalWinning =
                    killAmount +
                    winnerAmount;

                  const busy =
                    actionId ===
                      `approved:${user.id}` ||
                    actionId ===
                      `rejected:${user.id}` ||
                    actionId ===
                      `delete:${user.id}`;

                  const status =
                    String(
                      user.status ||
                        "Registered"
                    ).toLowerCase();

                  return (
                    <tr
                      key={user.id}
                      className={
                        draft.isWinner
                          ? "winner-row"
                          : ""
                      }
                    >

                      <td className="index-cell">
                        {index + 1}
                      </td>

                      <td>

                        <div className="player-main">

                          <strong>
                            {user.player_name ||
                              "Unknown"}
                          </strong>

                          <span>
                            {user.profile_name ||
                              "N/A"}
                          </span>

                        </div>

                      </td>

                      <td className="mono">
                        {user.bgmi_id ||
                          "N/A"}
                      </td>

                      <td className="mono">
                        {user.profile_id ||
                          "N/A"}
                      </td>

                      <td>

                        <span
                          className={`status-pill status-${status.replace(
                            /\s+/g,
                            "-"
                          )}`}
                        >
                          {user.status ||
                            "Registered"}
                        </span>

                        {user.resultStatus ===
                          "paid" && (
                          <span className="paid-mini">
                            PAID
                          </span>
                        )}

                      </td>

                      <td>

                        <input
                          className="kills-input"
                          type="number"
                          min="0"
                          step="1"
                          value={
                            draft.kills
                          }
                          onChange={(
                            event
                          ) =>
                            updatePlayerDraft(
                              user.id,
                              {
                                kills:
                                  Math.max(
                                    0,
                                    Math.floor(
                                      safeNumber(
                                        event
                                          .target
                                          .value,
                                        0
                                      )
                                    )
                                  ),
                              }
                            )
                          }
                          disabled={
                            resultsLocked ||
                            status ===
                              "rejected" ||
                            savingResults ||
                            settling
                          }
                        />

                      </td>

                      <td>
                        {currency(
                          killAmount
                        )}
                      </td>

                      <td>

                        <button
                          type="button"
                          className={`winner-toggle ${
                            draft.isWinner
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            selectWinner(
                              user.id
                            )
                          }
                          disabled={
                            resultsLocked ||
                            status ===
                              "rejected" ||
                            savingResults ||
                            settling
                          }
                        >
                          {draft.isWinner
                            ? "🏆 Winner"
                            : "Select"}
                        </button>

                      </td>

                      <td>

                        <strong className="winning-amount">
                          {currency(
                            totalWinning
                          )}
                        </strong>

                      </td>

                      <td>

                        <div className="row-actions">

                          <button
                            type="button"
                            className="approve-small"
                            onClick={() =>
                              updateJoinStatus(
                                user.id,
                                "approved"
                              )
                            }
                            disabled={
                              busy ||
                              settling ||
                              resultsLocked ||
                              user.status ===
                                "approved" ||
                              user.status ===
                                "winner" ||
                              user.status ===
                                "loser" ||
                              user.status ===
                                "rejected"
                            }
                            title="Approve"
                          >
                            ✓
                          </button>

                          <button
                            type="button"
                            className="reject-small"
                            onClick={() =>
                              updateJoinStatus(
                                user.id,
                                "rejected"
                              )
                            }
                            disabled={
                              busy ||
                              settling ||
                              resultsLocked ||
                              user.status ===
                                "rejected"
                            }
                            title="Reject"
                          >
                            ✕
                          </button>

                          <button
                            type="button"
                            className="delete-small"
                            onClick={() =>
                              handleDelete(
                                user.id
                              )
                            }
                            disabled={
                              busy ||
                              settling ||
                              resultsLocked
                            }
                            title="Delete"
                          >
                            🗑
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

              {!users.length && (
                <tr>

                  <td
                    colSpan="10"
                    className="no-players"
                  >
                    📭 No players joined
                    this tournament yet.
                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* ======================================================
          CALCULATION CARD
      ====================================================== */}
      <section className="settlement-info">

        <div>

          <span className="info-icon">
            🧮
          </span>

          <div>

            <h4>
              Winning Calculation
            </h4>

            <p>
              Total winning =
              (Kills × Per Kill)
              + Winner Prize
            </p>

          </div>

        </div>

        <div className="formula-box">

          <span>
            Example
          </span>

          <strong>
            5 × {currency(perKill)}
            {" + "}
            {currency(winnerPrize)}
            {" = "}
            {currency(
              5 * perKill +
                winnerPrize
            )}
          </strong>

        </div>

      </section>

      {/* ======================================================
          SETTLEMENT CARD
      ====================================================== */}
      <section className="settlement-info">

        <div>

          <span className="info-icon">
            🔐
          </span>

          <div>

            <h4>
              Safe Settlement
            </h4>

            <p>
              Results pehle save hote
              hain. Uske baad winning
              server-side wallet mein
              credit hoti hai. Paid
              result ko dobara credit
              karne se system block
              karta hai.
            </p>

          </div>

        </div>

        <div className="formula-box">

          <span>
            Current winner
          </span>

          <strong>
            {winnerName}
          </strong>

        </div>

      </section>

    </div>
  );
};

export default AdminTournamentDetail;