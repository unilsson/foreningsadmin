import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const statusLabels = {
  not_started: "Ej påbörjad",
  in_progress: "Pågår",
  waiting: "Väntar",
  completed: "Klart"
};

const emptyDraft = {
  id: null,
  number: "",
  title: "",
  responsibleText: "",
  decided: "",
  meetingId: "",
  dueDate: "",
  status: "not_started",
  comment: ""
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function ActionItems() {
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [itemsResponse, meetingsResponse] = await Promise.all([
        fetch("/api/action-items"),
        fetch("/api/saved-meetings")
      ]);
      const actionData = await itemsResponse.json();
      const meetingData = await meetingsResponse.json();
      if (!itemsResponse.ok) throw new Error(actionData.error ?? "Kunde inte läsa åtgärdslistan.");
      setItems(actionData.items ?? []);
      setUpdatedAt(actionData.updatedAt ?? null);
      setMeetings(meetingsResponse.ok ? meetingData.meetings ?? [] : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const ongoing = useMemo(
    () => items
      .filter((item) => item.status !== "completed")
      .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") || a.number.localeCompare(b.number)),
    [items]
  );
  const completed = useMemo(
    () => items
      .filter((item) => item.status === "completed")
      .sort((a, b) => String(b.completedAt ?? "").localeCompare(String(a.completedAt ?? ""))),
    [items]
  );

  const meetingById = useMemo(
    () => Object.fromEntries(meetings.map((meeting) => [meeting.id, meeting])),
    [meetings]
  );

  function newItem() {
    setDraft({ ...emptyDraft });
    setMessage("");
    setError("");
  }

  function editItem(item) {
    setDraft({
      id: item.id,
      number: item.number ?? "",
      title: item.title ?? "",
      responsibleText: (item.responsible ?? []).join(", "),
      decided: item.decided ?? "",
      meetingId: item.meetingId ?? "",
      dueDate: item.dueDate ?? "",
      status: item.status ?? "not_started",
      comment: item.comment ?? ""
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function selectMeeting(meetingId) {
    setDraft((current) => {
      const meeting = meetingById[meetingId];
      return {
        ...current,
        meetingId,
        decided: current.decided || (meeting?.meeting?.date ? `Styrelsemöte ${meeting.meeting.date}` : "")
      };
    });
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    setMessage("");

    const responsible = draft.responsibleText
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const payload = {
      number: draft.number,
      title: draft.title,
      responsible,
      decided: draft.decided,
      meetingId: draft.meetingId || null,
      dueDate: draft.dueDate,
      status: draft.status,
      comment: draft.comment
    };

    try {
      const response = await fetch(draft.id ? `/api/action-items/${draft.id}` : "/api/action-items", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte spara åtgärdspunkten.");
      await loadData();
      setDraft(null);
      setMessage(draft.id ? "Åtgärdspunkten är uppdaterad." : `Åtgärdspunkt ${data.item?.number ?? ""} är skapad.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Ta bort ${item.number} – ${item.title}?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/action-items/${item.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte ta bort åtgärdspunkten.");
      await loadData();
      if (draft?.id === item.id) setDraft(null);
      setMessage("Åtgärdspunkten är borttagen.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Åtgärder</p>
        <h1>Åtgärdslista</h1>
        <p>Följ upp beslutade åtgärder, ansvariga, deadlines och status. Listan kan exporteras för spridning i föreningen.</p>
      </header>

      <section className="action-toolbar">
        <div className="action-stats">
          <span><strong>{ongoing.length}</strong> pågående</span>
          <span><strong>{completed.length}</strong> avslutade</span>
          {updatedAt && <span>Uppdaterad {new Date(updatedAt).toLocaleString("sv-SE")}</span>}
        </div>
        <div className="action-toolbar-buttons">
          <button type="button" onClick={newItem}>+ Ny åtgärd</button>
          <a className="button-link secondary" href="/api/action-items/export.md">Exportera Markdown</a>
          <a className="button-link secondary" href="/api/action-items/export.pdf">Exportera PDF</a>
        </div>
      </section>

      {draft && (
        <section className="card action-editor">
          <div className="action-editor-heading">
            <div>
              <p className="eyebrow">{draft.id ? "Redigera" : "Ny åtgärd"}</p>
              <h2>{draft.id ? draft.number : "Skapa åtgärdspunkt"}</h2>
            </div>
            <button type="button" className="secondary" onClick={() => setDraft(null)}>Avbryt</button>
          </div>

          <form onSubmit={saveItem} className="action-form">
            <div className="action-form-grid">
              <label>
                Nummer
                <input value={draft.number} onChange={(event) => updateDraft("number", event.target.value)} placeholder="Skapas automatiskt om tomt" />
              </label>
              <label className="action-title-field">
                Åtgärd
                <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required />
              </label>
              <label>
                Ansvarig(a)
                <input value={draft.responsibleText} onChange={(event) => updateDraft("responsibleText", event.target.value)} placeholder="Namn, flera separeras med komma" />
              </label>
              <label>
                Beslutad
                <input value={draft.decided} onChange={(event) => updateDraft("decided", event.target.value)} placeholder="t.ex. Våren 2026" />
              </label>
              <label>
                Kopplat möte
                <select value={draft.meetingId} onChange={(event) => selectMeeting(event.target.value)}>
                  <option value="">Inget möte valt</option>
                  {meetings.map((meeting) => (
                    <option key={meeting.id} value={meeting.id}>
                      {meeting.meeting?.date} – {meeting.meeting?.location}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Klart senast
                <input type="date" value={draft.dueDate} onChange={(event) => updateDraft("dueDate", event.target.value)} />
              </label>
              <label>
                Status
                <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="action-comment-field">
                Kommentar
                <textarea rows="4" value={draft.comment} onChange={(event) => updateDraft("comment", event.target.value)} />
              </label>
            </div>
            <div className="action-editor-actions">
              <button type="submit" disabled={saving}>{saving ? "Sparar…" : "Spara åtgärd"}</button>
            </div>
          </form>
        </section>
      )}

      {message && <p className="action-message">{message}</p>}
      {error && <div className="errors" role="alert">{error}</div>}
      {loading && <section className="card"><p>Hämtar åtgärdslistan…</p></section>}

      {!loading && (
        <>
          <ActionSection
            title="Pågående åtgärder"
            items={ongoing}
            meetingById={meetingById}
            onEdit={editItem}
            onDelete={deleteItem}
          />
          <ActionSection
            title="Avslutade åtgärder"
            items={completed}
            meetingById={meetingById}
            onEdit={editItem}
            onDelete={deleteItem}
            completed
          />
        </>
      )}
    </>
  );
}

function ActionSection({ title, items, meetingById, onEdit, onDelete, completed = false }) {
  return (
    <section className="action-section">
      <div className="action-section-heading">
        <h2>{title}</h2>
        <span className="count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="card"><p className="muted">{completed ? "Inga avslutade åtgärder ännu." : "Inga pågående åtgärder."}</p></div>
      ) : (
        <div className="action-list">
          {items.map((item) => {
            const meeting = item.meetingId ? meetingById[item.meetingId] : null;
            return (
              <article className={`action-item status-card-${item.status}`} key={item.id}>
                <div className="action-item-main">
                  <div className="action-number">{item.number}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <div className="action-meta">
                      {item.responsible?.length > 0 && <span><strong>Ansvarig:</strong> {item.responsible.join(", ")}</span>}
                      {item.dueDate && <span><strong>Klart senast:</strong> {formatDate(item.dueDate)}</span>}
                      {completed && item.completedAt && <span><strong>Klart:</strong> {new Date(item.completedAt).toLocaleDateString("sv-SE")}</span>}
                    </div>
                    {item.decided && <p className="action-decided"><strong>Beslutad:</strong> {item.decided}</p>}
                    {meeting && <p className="action-meeting"><Link to={`/meetings/${meeting.id}`}>Öppna kopplat möte {meeting.meeting?.date}</Link></p>}
                    {item.comment && <p className="action-comment">{item.comment}</p>}
                  </div>
                </div>
                <div className="action-item-side">
                  <span className={`action-status action-status-${item.status}`}>{statusLabels[item.status] ?? item.status}</span>
                  <div className="action-item-buttons">
                    <button type="button" className="secondary small" onClick={() => onEdit(item)}>Redigera</button>
                    <button type="button" className="secondary small remove-button" onClick={() => onDelete(item)}>Ta bort</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
