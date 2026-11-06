
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./TournamentManagement.css";

// ==================================================
// API CONFIGURATION
// ==================================================

const API_BASE = (
  process.env.REACT_APP_TOURNAMENT_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5005"
    : "")
).replace(/\/+$/, "");

const STATUSES = [
  "Draft",
  "Upcoming",
  "Live",
  "Cancelled",
];

const EMPTY_FORM = {
  name: "",
  mode: "Solo",
  type: "Classic",
  map: "Erangel",
  date: "",
  time: "",
  entryFee: "0",
  prizePool: "0",
  perKill: "0",
  totalSlots: "50",
  image: "",
  description: "",
  status: "Draft",
};

// ==================================================
// HELPERS
// ==================================================

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const makeId = () =>
  `BG${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const getTimeInput = (value) =>
  value ? String(value).slice(0, 5) : "";

const getVisibilityLabel = (tournament) => {
  if (tournament.is_hidden) return "Hidden";
  if (tournament.published) return "Published";
  return "Unpublished";
};

// ==================================================
// MAIN COMPONENT
// ==================================================

const TournamentManagement = () => {
  const [tournaments, setTournaments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");

  const [form, setForm] = useState({ ...EMPTY_FORM });

  // ==================================================
  // API REQUEST HELPER
  // ==================================================

  const apiRequest = useCallback(async (path, options = {}) => {
    if (!API_BASE) {
      throw new Error(
        "Tournament API URL missing. Set REACT_APP_TOURNAMENT_API_URL."
      );
    }

    const token = localStorage.getItem("adminToken");

    if (!token) {
      throw new Error(
        "Admin token nahi mila. Please logout karke login karo."
      );
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },

      cache: "no-store",
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        `Server ne invalid response diya. HTTP ${response.status}`
      );
    }

    if (response.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("bgmi_admin_logged_in");

      throw new Error(
        "Admin session expire ho gaya. Dobara login karo."
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
        result.message ||
        `Request failed: HTTP ${response.status}`
      );
    }

    return result;
  }, []);

  // ==================================================
  // LOAD TOURNAMENTS
  // ==================================================

  const loadTournaments = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      setError("");

      const result = await apiRequest(
        "/api/admin/tournaments"
      );

      setTournaments(
        Array.isArray(result.tournaments)
          ? result.tournaments
          : []
      );

    } catch (err) {
      console.error("Tournament load error:", err);

      setError(
        err.message || "Tournament data load nahi hua."
      );

    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadTournaments(true);
  }, [loadTournaments]);

  // ==================================================
  // FORM HELPERS
  // ==================================================

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingId("");
    setForm({ ...EMPTY_FORM });

    setError("");
    setSuccess("");

    setShowForm(true);
  };

  const openEditForm = (tournament) => {
    setEditingId(tournament.id);

    setForm({
      name: tournament.name || "",
      mode: tournament.mode || "Solo",
      type: tournament.type || "Classic",
      map: tournament.map || "Erangel",

      date: tournament.date || "",
      time: getTimeInput(tournament.time),

      entryFee: String(tournament.entryFee ?? 0),
      prizePool: String(tournament.prizePool ?? 0),
      perKill: String(tournament.perKill ?? 0),

      totalSlots: String(tournament.totalSlots ?? 50),

      image: tournament.image || "",
      description: tournament.description || "",

      status: tournament.status || "Draft",
    });

    setError("");
    setSuccess("");

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId("");

    setForm({ ...EMPTY_FORM });
  };

  // ==================================================
  // FORM VALIDATION
  // ==================================================

  const validateForm = (payload) => {
    if (!payload.name) {
      throw new Error("Tournament name required hai.");
    }

    if (
      !Number.isFinite(payload.entryFee) ||
      payload.entryFee < 0
    ) {
      throw new Error("Entry fee valid honi chahiye.");
    }

    if (
      !Number.isFinite(payload.prizePool) ||
      payload.prizePool < 0
    ) {
      throw new Error("Prize pool valid hona chahiye.");
    }

    if (
      !Number.isFinite(payload.perKill) ||
      payload.perKill < 0
    ) {
      throw new Error("Per kill amount valid hona chahiye.");
    }

    if (
      !Number.isInteger(payload.totalSlots) ||
      payload.totalSlots < 1
    ) {
      throw new Error(
        "Total slots minimum 1 aur whole number hona chahiye."
      );
    }

    if (
      payload.date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)
    ) {
      throw new Error("Invalid tournament date.");
    }

    if (
      payload.time &&
      !/^\d{2}:\d{2}$/.test(payload.time)
    ) {
      throw new Error("Invalid tournament time.");
    }
  };

  // ==================================================
  // CREATE / UPDATE TOURNAMENT
  // ==================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),

        mode: form.mode,
        type: form.type,
        map: form.map,

        date: form.date || null,
        time: form.time || null,

        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        perKill: Number(form.perKill),

        totalSlots: Number(form.totalSlots),

        image: form.image.trim(),
        description: form.description.trim(),

        status: form.status,
      };

      validateForm(payload);

      if (editingId) {
        const result = await apiRequest(
          `/api/admin/tournaments/${encodeURIComponent(editingId)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setSuccess(
          result.message || "Tournament successfully updated."
        );

      } else {
        const id = makeId();

        const result = await apiRequest(
          "/api/admin/tournaments",
          {
            method: "POST",

            body: JSON.stringify({
              id,
              ...payload,
              published: false,
            }),
          }
        );

        setSuccess(
          `Tournament created successfully. ID: ${id}`
        );
      }

      setShowForm(false);
      setEditingId("");
      setForm({ ...EMPTY_FORM });

      await loadTournaments();

    } catch (err) {
      console.error("Save tournament error:", err);

      setError(
        err.message || "Tournament save nahi hua."
      );

    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // PUBLISH / HIDE / UNHIDE
  // ==================================================

  const changeVisibility = async (tournament) => {
    const isCurrentlyPublished =
      Boolean(tournament.published) &&
      !Boolean(tournament.is_hidden);

    const shouldPublish = !isCurrentlyPublished;

    const actionMessage = shouldPublish
      ? "publish"
      : "hide";

    const confirmed = window.confirm(
      shouldPublish
        ? `Kya "${tournament.name}" ko publish/unhide karna hai?`
        : `Kya "${tournament.name}" ko hide karna hai?`
    );

    if (!confirmed) return;

    setActionId(tournament.id);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(tournament.id)}/visibility`,
        {
          method: "PATCH",

          body: JSON.stringify(
            shouldPublish
              ? { published: true }
              : { hidden: true }
          ),
        }
      );

      setSuccess(
        result.message ||
        `${tournament.name} ${actionMessage} successful.`
      );

      await loadTournaments();

    } catch (err) {
      console.error("Visibility update error:", err);

      setError(
        err.message || "Visibility update nahi hui."
      );

    } finally {
      setActionId("");
    }
  };

  // ==================================================
  // UPDATE STATUS
  // ==================================================

  const changeStatus = async (tournament, status) => {
    if (status === "Completed") {
      setError(
        "Completed status ke liye Complete Tournament action use karna hoga."
      );

      return;
    }

    if (
      tournament.status === "Cancelled" ||
      tournament.status === "Completed"
    ) {
      setError(
        "Cancelled/Completed tournament ka status change nahi ho sakta."
      );

      return;
    }

    const confirmed = window.confirm(
      `Kya "${tournament.name}" ka status ${status} karna hai?`
    );

    if (!confirmed) {
      await loadTournaments();
      return;
    }

    setActionId(tournament.id);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(tournament.id)}/status`,
        {
          method: "PATCH",

          body: JSON.stringify({
            status,
          }),
        }
      );

      setSuccess(
        result.message || "Tournament status updated."
      );

      await loadTournaments();

    } catch (err) {
      console.error("Status update error:", err);

      setError(
        err.message || "Status update nahi hua."
      );

      await loadTournaments();

    } finally {
      setActionId("");
    }
  };

  // ==================================================
  // DUPLICATE TOURNAMENT
  // ==================================================

  const duplicateTournament = async (tournament) => {
    const newId = makeId();

    const confirmed = window.confirm(
      `Kya "${tournament.name}" ki Draft copy create karni hai?\n\nNew ID: ${newId}`
    );

    if (!confirmed) return;

    setActionId(tournament.id);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(tournament.id)}/duplicate`,
        {
          method: "POST",

          body: JSON.stringify({
            newId,
          }),
        }
      );

      setSuccess(
        result.message ||
        `Tournament duplicated. New ID: ${newId}`
      );

      await loadTournaments();

    } catch (err) {
      console.error("Duplicate error:", err);

      setError(
        err.message || "Duplicate create nahi hua."
      );

    } finally {
      setActionId("");
    }
  };

  // ==================================================
  // DELETE TOURNAMENT
  // ==================================================

  const deleteTournament = async (tournament) => {
    const confirmed = window.confirm(
      `Kya tum "${tournament.name}" (${tournament.id}) delete karna chahte ho?\n\nServer RPC ke through player entry fees refund karke tournament delete karega.`
    );

    if (!confirmed) return;

    setActionId(tournament.id);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/api/admin/tournaments/${encodeURIComponent(tournament.id)}`,
        {
          method: "DELETE",
        }
      );

      const refundedPlayers =
        Number(result.result?.refunded_players || 0);

      const totalRefunded =
        Number(result.result?.total_refunded || 0);

      setSuccess(
        `Tournament deleted. ${refundedPlayers} players refunded. Total refund: ${money(totalRefunded)}`
      );

      await loadTournaments();

    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err.message || "Tournament delete nahi hua."
      );

    } finally {
      setActionId("");
    }
  };

  // ==================================================
  // FILTER TOURNAMENTS
  // ==================================================

  const filteredTournaments = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      const matchesSearch =
        !searchText ||
        String(tournament.name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(tournament.id || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        filterStatus === "All" ||
        tournament.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [tournaments, search, filterStatus]);

  // ==================================================
  // DASHBOARD STATISTICS
  // ==================================================

  const stats = useMemo(() => {
    const totalPlayers = tournaments.reduce(
      (sum, item) =>
        sum + Number(item.joinedPlayers || 0),
      0
    );

    return {
      total: tournaments.length,

      published: tournaments.filter(
        (item) =>
          item.published && !item.is_hidden
      ).length,

      live: tournaments.filter(
        (item) => item.status === "Live"
      ).length,

      upcoming: tournaments.filter(
        (item) => item.status === "Upcoming"
      ).length,

      completed: tournaments.filter(
        (item) => item.status === "Completed"
      ).length,

      players: totalPlayers,
    };
  }, [tournaments]);

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="tournament-management">

      {/* HEADER */}

      <div className="tm-header">
        <div>
          <div className="tm-eyebrow">
            ADMIN CONTROL CENTER
          </div>

          <h1>Tournament Management</h1>

          <p>
            Create, edit, publish and manage BGMI tournaments.
          </p>
        </div>

        <div className="tm-header-actions">

          <button
            type="button"
            className="tm-btn tm-btn-secondary"
            onClick={() => loadTournaments(true)}
            disabled={loading || Boolean(actionId)}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            className="tm-btn tm-btn-primary"
            onClick={openCreateForm}
          >
            + Create Tournament
          </button>

        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div
          className="tm-alert tm-alert-error"
          role="alert"
        >
          ⚠️ {error}
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div
          className="tm-alert tm-alert-success"
          role="status"
        >
          ✓ {success}
        </div>
      )}

      {/* STATISTICS */}

      <div className="tm-stats-grid">

        <div className="tm-stat-card">
          <span>Total Tournaments</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="tm-stat-card">
          <span>Published</span>
          <strong>{stats.published}</strong>
        </div>

        <div className="tm-stat-card">
          <span>Live</span>
          <strong>{stats.live}</strong>
        </div>

        <div className="tm-stat-card">
          <span>Upcoming</span>
          <strong>{stats.upcoming}</strong>
        </div>

        <div className="tm-stat-card">
          <span>Completed</span>
          <strong>{stats.completed}</strong>
        </div>

        <div className="tm-stat-card">
          <span>Total Registrations</span>
          <strong>{stats.players}</strong>
        </div>

      </div>

      {/* CREATE / EDIT FORM */}

      {showForm && (
        <div className="tm-form-overlay">

          <div className="tm-form-card">

            <div className="tm-form-heading">

              <div>
                <h2>
                  {editingId
                    ? "Edit Tournament"
                    : "Create Tournament"}
                </h2>

                <p>
                  {editingId
                    ? `Editing tournament ${editingId}`
                    : "New tournament database mein save hoga."}
                </p>
              </div>

              <button
                type="button"
                className="tm-close-btn"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="tm-form-grid">

                <label className="tm-field tm-field-full">
                  <span>Tournament Name *</span>

                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter tournament name"
                    required
                  />
                </label>

                <label className="tm-field">
                  <span>Game Mode</span>

                  <select
                    name="mode"
                    value={form.mode}
                    onChange={updateField}
                  >
                    <option>Solo</option>
                    <option>Duo</option>
                    <option>Squad</option>
                  </select>
                </label>

                <label className="tm-field">
                  <span>Match Type</span>

                  <select
                    name="type"
                    value={form.type}
                    onChange={updateField}
                  >
                    <option>Classic</option>
                    <option>TDM</option>
                    <option>Custom Room</option>
                  </select>
                </label>

                <label className="tm-field">
                  <span>Map</span>

                  <select
                    name="map"
                    value={form.map}
                    onChange={updateField}
                  >
                    <option>Erangel</option>
                    <option>Livik</option>
                    <option>Miramar</option>
                    <option>Sanhok</option>
                    <option>Vikendi</option>
                  </select>
                </label>

                <label className="tm-field">
                  <span>Date</span>

                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={updateField}
                  />
                </label>

                <label className="tm-field">
                  <span>Time</span>

                  <input
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={updateField}
                  />
                </label>

                <label className="tm-field">
                  <span>Entry Fee (₹)</span>

                  <input
                    type="number"
                    name="entryFee"
                    min="0"
                    step="0.01"
                    value={form.entryFee}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="tm-field">
                  <span>Prize Pool (₹)</span>

                  <input
                    type="number"
                    name="prizePool"
                    min="0"
                    step="0.01"
                    value={form.prizePool}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="tm-field">
                  <span>Per Kill (₹)</span>

                  <input
                    type="number"
                    name="perKill"
                    min="0"
                    step="0.01"
                    value={form.perKill}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="tm-field">
                  <span>Total Slots</span>

                  <input
                    type="number"
                    name="totalSlots"
                    min="1"
                    step="1"
                    value={form.totalSlots}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="tm-field">
                  <span>Tournament Status</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                  >
                    {STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="tm-field tm-field-full">
                  <span>Image URL</span>

                  <input
                    type="url"
                    name="image"
                    value={form.image}
                    onChange={updateField}
                    placeholder="https://example.com/tournament.webp"
                  />
                </label>

                <label className="tm-field tm-field-full">
                  <span>Description / Rules</span>

                  <textarea
                    name="description"
                    rows="4"
                    value={form.description}
                    onChange={updateField}
                    placeholder="Tournament rules and details..."
                  />
                </label>

              </div>

              <div className="tm-form-actions">

                <button
                  type="button"
                  className="tm-btn tm-btn-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tm-btn tm-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Tournament"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* TOURNAMENT TOOLBAR */}

      <div className="tm-toolbar">

        <div>
          <h2>All Tournaments</h2>
          <p>Live data loaded from Supabase.</p>
        </div>

        <div className="tm-filters">

          <input
            type="search"
            placeholder="Search name or tournament ID..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          <select
            value={filterStatus}
            onChange={(event) =>
              setFilterStatus(event.target.value)
            }
          >
            <option value="All">All Statuses</option>

            {[...STATUSES, "Completed"].map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}

          </select>

        </div>

      </div>

      {/* TOURNAMENT TABLE */}

      <div className="tm-table-wrap">

        <table className="tm-table">

          <thead>
            <tr>
              <th>Tournament</th>
              <th>Mode / Map</th>
              <th>Entry</th>
              <th>Prize</th>
              <th>Players</th>
              <th>Status</th>
              <th>Visibility</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td colSpan="8" className="tm-empty">
                  Loading tournaments...
                </td>
              </tr>

            ) : filteredTournaments.length === 0 ? (

              <tr>
                <td colSpan="8" className="tm-empty">
                  No tournaments found.
                </td>
              </tr>

            ) : (

              filteredTournaments.map((tournament) => {

                const busy =
                  actionId === tournament.id;

                const isLocked =
                  tournament.status === "Completed" ||
                  tournament.status === "Cancelled";

                const visibilityLabel =
                  getVisibilityLabel(tournament);

                // Joined player details from admin API
                const players = Array.isArray(
                  tournament.joinedPlayersList
                )
                  ? tournament.joinedPlayersList
                  : [];

                return (

                  <React.Fragment key={tournament.id}>

                    {/* ORIGINAL TOURNAMENT ROW */}

                    <tr>

                      {/* NAME */}

                      <td>
                        <strong>
                          {tournament.name}
                        </strong>

                        <small>
                          #{tournament.id}
                        </small>

                        {tournament.date && (
                          <small>
                            {tournament.date}

                            {tournament.time
                              ? ` • ${getTimeInput(tournament.time)}`
                              : ""}
                          </small>
                        )}
                      </td>

                      {/* MODE / MAP */}

                      <td>
                        <strong>
                          {tournament.mode || "—"}
                        </strong>

                        <small>
                          {tournament.map || "—"}
                        </small>
                      </td>

                      {/* ENTRY */}

                      <td>
                        {money(tournament.entryFee)}
                      </td>

                      {/* PRIZE */}

                      <td>
                        {money(tournament.prizePool)}
                      </td>

                      {/* PLAYERS */}

                      <td>
                        <strong>
                          {tournament.joinedPlayers || 0}
                          {" / "}
                          {tournament.totalSlots || 50}
                        </strong>
                      </td>

                      {/* STATUS */}

                      <td>
                        <select
                          className="tm-status-select"
                          value={tournament.status || "Draft"}
                          disabled={busy || isLocked}
                          onChange={(event) =>
                            changeStatus(
                              tournament,
                              event.target.value
                            )
                          }
                        >

                          {STATUSES.map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ))}

                          <option
                            value="Completed"
                            disabled
                          >
                            Completed (Locked)
                          </option>

                        </select>
                      </td>

                      {/* VISIBILITY */}

                      <td>
                        <span
                          className={`tm-visibility ${
                            tournament.is_hidden
                              ? "is-hidden"
                              : tournament.published
                                ? "is-visible"
                                : "is-unpublished"
                          }`}
                        >
                          {visibilityLabel}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="tm-row-actions">

                          <button
                            type="button"
                            className="tm-action-btn"
                            onClick={() =>
                              openEditForm(tournament)
                            }
                            disabled={busy || isLocked}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="tm-action-btn"
                            onClick={() =>
                              changeVisibility(tournament)
                            }
                            disabled={busy || isLocked}
                          >
                            {busy
                              ? "..."
                              : tournament.published &&
                                !tournament.is_hidden
                                ? "Hide"
                                : "Publish"}
                          </button>

                          <button
                            type="button"
                            className="tm-action-btn"
                            onClick={() =>
                              duplicateTournament(tournament)
                            }
                            disabled={busy}
                          >
                            Duplicate
                          </button>

                          <button
                            type="button"
                            className="tm-action-btn tm-action-danger"
                            onClick={() =>
                              deleteTournament(tournament)
                            }
                            disabled={busy}
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                    {/* JOINED PLAYER DETAILS ROW */}

                    <tr className="tm-player-details-row">

                      <td colSpan="8">

                        <div className="tm-player-details">

                          <div className="tm-player-details-heading">

                            <strong>
                              Joined Players
                            </strong>

                            <span>
                              {players.length} Registered
                            </span>

                          </div>

                          {players.length === 0 ? (

                            <p className="tm-no-players">
                              No players have joined this tournament yet.
                            </p>

                          ) : (

                            <div className="tm-player-table-wrap">

                              <table className="tm-player-table">

                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>BGMI Name</th>
                                    <th>BGMI ID</th>
                                    <th>Profile ID</th>
                                  </tr>
                                </thead>

                                <tbody>

                                  {players.map((player, index) => (

                                    <tr key={player.join_id || index}>

                                      <td>
                                        {index + 1}
                                      </td>

                                      <td>
                                        <strong>
                                          {player.bgmi_name || "Not Available"}
                                        </strong>
                                      </td>

                                      <td>
                                        {player.bgmi_id || "Not Available"}
                                      </td>

                                      <td>
                                        {player.profile_id || "Not Available"}
                                      </td>

                                    </tr>

                                  ))}

                                </tbody>

                              </table>

                            </div>

                          )}

                        </div>

                      </td>

                    </tr>

                  </React.Fragment>

                );

              })

            )}

          </tbody>

        </table>

      </div>

      {/* FOOTER */}

      <div className="tm-footer">

        <span>
          Database: <strong>Supabase</strong>
        </span>

        <span>
          API: <strong>Port 5005</strong>
        </span>

        <span>
          Total records: <strong>{tournaments.length}</strong>
        </span>

      </div>

    </div>
  );
};

export default TournamentManagement;
