import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const WORKSPACE_KEY = "foreningsadmin.meetingWorkspace";

const statusLabels = {
  planned: "Planerat",
  completed: "Genomfört",
  cancelled: "Inställt"
};

function formatDate(value) {
  if (!value) return "Datum saknas";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("sv-SE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(date);
}

export function MeetingArchive() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMeetings() {
      try {
        const response = await fetch("/api/saved-meetings");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Kunde inte läsa mötesarkivet.");
        setMeetings(data.meetings ?? []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, []);

  const counts = useMemo(() => ({
    planned: meetings.filter((item) => item.status === "planned").length,
    completed: meetings.filter((item) => item.status === "completed").length,
    cancelled: meetings.filter((item) => item.status === "cancelled").length
  }), [meetings]);

  function startNewMeeting() {
    window.sessionStorage.removeItem(WORKSPACE_KEY);
    window.location.assign("/meetings/new?new=1");
  }

  return (
    <>
      <header className="page-heading meeting-archive-heading">
        <p className="eyebrow">Möten</p>
        <h1>Mötesarkiv</h1>
        <p>Sparade styrelsemöten ligger kvar mellan arbetstillfällen och kan öppnas igen för redigering.</p>
      </header>

      <section className="meeting-archive-toolbar">
        <div className="meeting-stats" aria-label="Mötesstatus">
          <span><strong>{counts.planned}</strong> planerade</span>
          <span><strong>{counts.completed}</strong> genomförda</span>
          <span><strong>{counts.cancelled}</strong> inställda</span>
        </div>
        <button type="button" onClick={startNewMeeting}>+ Nytt styrelsemöte</button>
      </section>

      {loading && <section className="card"><p>Hämtar möten…</p></section>}
      {error && <section className="errors" role="alert">{error}</section>}

      {!loading && !error && meetings.length === 0 && (
        <section className="card empty-meeting-archive">
          <h2>Inga sparade möten ännu</h2>
          <p className="muted">Skapa ett nytt styrelsemöte och välj sedan “Spara mötet”.</p>
        </section>
      )}

      {!loading && meetings.length > 0 && (
        <div className="meeting-archive-list">
          {meetings.map((record) => (
            <Link className="meeting-archive-item" to={`/meetings/${record.id}`} key={record.id}>
              <div className="meeting-archive-date">
                <strong>{formatDate(record.meeting?.date)}</strong>
                <span>{record.meeting?.startTime}–{record.meeting?.endTime}</span>
              </div>
              <div className="meeting-archive-location">
                <span>{record.meeting?.location || "Plats saknas"}</span>
                <small>Senast ändrad {new Date(record.updatedAt).toLocaleString("sv-SE")}</small>
              </div>
              <span className={`meeting-status status-${record.status}`}>
                {statusLabels[record.status] ?? record.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function MeetingDetail() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadMeeting() {
      try {
        const response = await fetch(`/api/saved-meetings/${meetingId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Mötet kunde inte öppnas.");
        setRecord(data.meeting);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadMeeting();
  }, [meetingId]);

  function openWorkspace(target) {
    window.sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(record));
    window.location.assign(target);
  }

  async function deleteMeeting() {
    if (!window.confirm("Ta bort mötet permanent från mötesarkivet?")) return;
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/saved-meetings/${meetingId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Mötet kunde inte tas bort.");
      window.sessionStorage.removeItem(WORKSPACE_KEY);
      navigate("/meetings");
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
    }
  }

  if (loading) return <section className="card"><p>Öppnar mötet…</p></section>;
  if (error && !record) return <section className="errors" role="alert">{error}</section>;
  if (!record) return null;

  const agendaItems = [
    ...(record.agenda?.beforeMeetingItems ?? []),
    ...(record.agenda?.meetingItems ?? []),
    ...(record.agenda?.afterMeetingItems ?? [])
  ];

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Mötesarkiv</p>
        <h1>{formatDate(record.meeting?.date)}</h1>
        <p>{record.meeting?.startTime}–{record.meeting?.endTime} · {record.meeting?.location}</p>
      </header>

      <section className="card saved-meeting-overview">
        <div className="saved-meeting-title-row">
          <div>
            <span className={`meeting-status status-${record.status}`}>
              {statusLabels[record.status] ?? record.status}
            </span>
            <h2>Styrelsemöte</h2>
          </div>
          <div className="saved-meeting-actions">
            <button type="button" onClick={() => openWorkspace("/meetings/new")}>Redigera mötet</button>
            <button type="button" className="secondary" onClick={() => openWorkspace("/agenda")}>Redigera dagordning</button>
          </div>
        </div>

        <dl className="saved-meeting-meta">
          <div><dt>Datum</dt><dd>{record.meeting?.date}</dd></div>
          <div><dt>Tid</dt><dd>{record.meeting?.startTime}–{record.meeting?.endTime}</dd></div>
          <div><dt>Plats</dt><dd>{record.meeting?.location}</dd></div>
          <div><dt>Senast ändrad</dt><dd>{new Date(record.updatedAt).toLocaleString("sv-SE")}</dd></div>
        </dl>
      </section>

      <section className="card saved-agenda-summary">
        <div className="saved-meeting-title-row">
          <div>
            <p className="eyebrow">Dagordning</p>
            <h2>{record.agenda?.title || "Dagordning"}</h2>
          </div>
          <span className="count">{agendaItems.length}</span>
        </div>
        {agendaItems.length > 0 ? (
          <ol>{agendaItems.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol>
        ) : (
          <p className="muted">Mötet har ingen sparad dagordning ännu.</p>
        )}
      </section>

      <section className="meeting-danger-zone">
        <Link to="/meetings" className="button-link secondary">Tillbaka till mötesarkivet</Link>
        <button type="button" className="danger-button" onClick={deleteMeeting} disabled={deleting}>
          {deleting ? "Tar bort…" : "Ta bort mötet"}
        </button>
        {error && <div className="errors" role="alert">{error}</div>}
      </section>
    </>
  );
}
