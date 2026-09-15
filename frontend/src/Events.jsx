import { useEffect, useMemo, useState } from "react";

const statusLabels = {
  not_started: "Ej påbörjad",
  planning: "Planering pågår",
  ready: "Klart för genomförande",
  completed: "Genomfört"
};

const emptyAfterEvent = {
  visitors: "",
  workedWell: "",
  improvements: "",
  financialResult: "",
  otherExperience: ""
};

const emptyDraft = {
  id: null,
  date: "",
  startTime: "",
  endTime: "",
  title: "",
  location: "",
  mainResponsible: "",
  staffing: "",
  practicalPreparations: "",
  standardMarketing: false,
  marketingNotes: "",
  status: "not_started",
  notes: "",
  afterEvent: { ...emptyAfterEvent }
};

function formatDate(value) {
  if (!value) return "Datum saknas";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function timeText(item) {
  if (!item.startTime) return "";
  return item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime;
}

export default function Events() {
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [view, setView] = useState("all");

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/events");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte läsa evenemangslistan.");
      setItems(data.items ?? []);
      setUpdatedAt(data.updatedAt ?? null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const years = useMemo(() => {
    const values = new Set(items.map((item) => item.date?.slice(0, 4)).filter(Boolean));
    values.add(String(new Date().getFullYear()));
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [items]);

  useEffect(() => {
    if (items.length && !items.some((item) => item.date?.startsWith(`${selectedYear}-`))) {
      const firstYear = items[0]?.date?.slice(0, 4);
      if (firstYear) setSelectedYear(firstYear);
    }
  }, [items, selectedYear]);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (selectedYear && !item.date?.startsWith(`${selectedYear}-`)) return false;
    if (view === "upcoming" && item.status === "completed") return false;
    if (view === "completed" && item.status !== "completed") return false;
    return true;
  }), [items, selectedYear, view]);

  function newEvent() {
    setDraft({ ...emptyDraft, afterEvent: { ...emptyAfterEvent }, date: `${selectedYear || new Date().getFullYear()}-01-01` });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editEvent(item) {
    setDraft({
      ...item,
      afterEvent: { ...emptyAfterEvent, ...(item.afterEvent ?? {}) }
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateAfterEvent(field, value) {
    setDraft((current) => ({
      ...current,
      afterEvent: { ...current.afterEvent, [field]: value }
    }));
  }

  async function saveEvent(event) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      title: draft.title,
      location: draft.location,
      mainResponsible: draft.mainResponsible,
      staffing: draft.staffing,
      practicalPreparations: draft.practicalPreparations,
      standardMarketing: draft.standardMarketing,
      marketingNotes: draft.marketingNotes,
      status: draft.status,
      notes: draft.notes,
      afterEvent: draft.afterEvent
    };

    try {
      const response = await fetch(draft.id ? `/api/events/${draft.id}` : "/api/events", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte spara evenemanget.");
      const wasEdit = Boolean(draft.id);
      setSelectedYear(draft.date.slice(0, 4));
      await loadEvents();
      setDraft(null);
      setMessage(wasEdit ? "Evenemanget är uppdaterat." : "Evenemanget är skapat.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(item) {
    if (!window.confirm(`Ta bort ${item.title} den ${item.date}?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/events/${item.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte ta bort evenemanget.");
      await loadEvents();
      if (draft?.id === item.id) setDraft(null);
      setMessage("Evenemanget är borttaget.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const exportQuery = selectedYear ? `?year=${encodeURIComponent(selectedYear)}` : "";

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Kalendarium</p>
        <h1>Evenemang</h1>
        <p>Planera föreningens evenemang, ansvar, bemanning, praktiska förberedelser och information. Listan kan exporteras för spridning i föreningen.</p>
      </header>

      <section className="events-toolbar">
        <div className="events-filters">
          <label>
            År
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>
            Visa
            <select value={view} onChange={(event) => setView(event.target.value)}>
              <option value="all">Alla</option>
              <option value="upcoming">Ej genomförda</option>
              <option value="completed">Genomförda</option>
            </select>
          </label>
          {updatedAt && <span className="events-updated">Uppdaterad {new Date(updatedAt).toLocaleString("sv-SE")}</span>}
        </div>
        <div className="events-toolbar-buttons">
          <button type="button" onClick={newEvent}>+ Nytt evenemang</button>
          <a className="button-link secondary" href={`/api/events/export.md${exportQuery}`}>Exportera Markdown</a>
          <a className="button-link secondary" href={`/api/events/export.pdf${exportQuery}`}>Exportera PDF</a>
        </div>
      </section>

      {draft && (
        <section className="card event-editor">
          <div className="event-editor-heading">
            <div>
              <p className="eyebrow">{draft.id ? "Redigera" : "Nytt evenemang"}</p>
              <h2>{draft.id ? draft.title : "Skapa evenemang"}</h2>
            </div>
            <button type="button" className="secondary" onClick={() => setDraft(null)}>Avbryt</button>
          </div>

          <form onSubmit={saveEvent} className="event-form">
            <div className="event-form-grid">
              <label>
                Datum
                <input type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} required />
              </label>
              <label className="event-title-field">
                Evenemang
                <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required />
              </label>
              <label>
                Starttid
                <input type="time" value={draft.startTime} onChange={(event) => updateDraft("startTime", event.target.value)} />
              </label>
              <label>
                Sluttid
                <input type="time" value={draft.endTime} onChange={(event) => updateDraft("endTime", event.target.value)} />
              </label>
              <label>
                Plats
                <input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} />
              </label>
              <label>
                Huvudansvarig
                <input value={draft.mainResponsible} onChange={(event) => updateDraft("mainResponsible", event.target.value)} />
              </label>
              <label className="event-wide-field">
                Bemanning
                <textarea rows="2" value={draft.staffing} onChange={(event) => updateDraft("staffing", event.target.value)} />
              </label>
              <label className="event-wide-field">
                Praktiska förberedelser
                <textarea rows="3" value={draft.practicalPreparations} onChange={(event) => updateDraft("practicalPreparations", event.target.value)} />
              </label>
              <label>
                Status
                <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="event-checkbox-field">
                <input type="checkbox" checked={draft.standardMarketing} onChange={(event) => updateDraft("standardMarketing", event.target.checked)} />
                Vanliga rutiner för evenemang
              </label>
              <label className="event-wide-field">
                Information / marknadsföring
                <textarea rows="3" value={draft.marketingNotes} onChange={(event) => updateDraft("marketingNotes", event.target.value)} placeholder="Särskild annonsering, affischmall eller annan information" />
              </label>
              <label className="event-wide-field">
                Planeringsanteckningar
                <textarea rows="4" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} />
              </label>
            </div>

            <fieldset className="event-after-fieldset">
              <legend>Efter genomfört evenemang</legend>
              <div className="event-form-grid">
                <label>
                  Antal besökare
                  <input value={draft.afterEvent.visitors} onChange={(event) => updateAfterEvent("visitors", event.target.value)} />
                </label>
                <label>
                  Ekonomiskt resultat
                  <input value={draft.afterEvent.financialResult} onChange={(event) => updateAfterEvent("financialResult", event.target.value)} />
                </label>
                <label className="event-wide-field">
                  Vad fungerade bra
                  <textarea rows="2" value={draft.afterEvent.workedWell} onChange={(event) => updateAfterEvent("workedWell", event.target.value)} />
                </label>
                <label className="event-wide-field">
                  Vad bör ändras
                  <textarea rows="2" value={draft.afterEvent.improvements} onChange={(event) => updateAfterEvent("improvements", event.target.value)} />
                </label>
                <label className="event-wide-field">
                  Övriga erfarenheter
                  <textarea rows="2" value={draft.afterEvent.otherExperience} onChange={(event) => updateAfterEvent("otherExperience", event.target.value)} />
                </label>
              </div>
            </fieldset>

            <div className="event-editor-actions">
              <button type="submit" disabled={saving}>{saving ? "Sparar…" : "Spara evenemang"}</button>
            </div>
          </form>
        </section>
      )}

      {message && <p className="action-message">{message}</p>}
      {error && <div className="errors" role="alert">{error}</div>}
      {loading && <section className="card"><p>Hämtar evenemang…</p></section>}

      {!loading && !error && visibleItems.length === 0 && (
        <section className="card"><p className="muted">Inga evenemang matchar urvalet.</p></section>
      )}

      {!loading && visibleItems.length > 0 && (
        <div className="event-list">
          {visibleItems.map((item) => (
            <article className={`event-item event-status-${item.status}`} key={item.id}>
              <div className="event-date-block">
                <strong>{formatDate(item.date)}</strong>
                {timeText(item) && <span>{timeText(item)}</span>}
              </div>
              <div className="event-main">
                <h2>{item.title}</h2>
                <div className="event-meta">
                  {item.location && <span><strong>Plats:</strong> {item.location}</span>}
                  {item.mainResponsible && <span><strong>Huvudansvarig:</strong> {item.mainResponsible}</span>}
                  {item.staffing && <span><strong>Bemanning:</strong> {item.staffing}</span>}
                </div>
                {item.practicalPreparations && <p><strong>Praktiska förberedelser:</strong> {item.practicalPreparations}</p>}
                {(item.standardMarketing || item.marketingNotes) && (
                  <p><strong>Information / marknadsföring:</strong> {item.standardMarketing && "Vanliga rutiner för evenemang. "}{item.marketingNotes}</p>
                )}
                {item.notes && <p className="event-notes">{item.notes}</p>}
              </div>
              <div className="event-side">
                <span className={`event-status event-status-pill-${item.status}`}>{statusLabels[item.status] ?? item.status}</span>
                <div className="event-item-buttons">
                  <button type="button" className="secondary small" onClick={() => editEvent(item)}>Redigera</button>
                  <button type="button" className="secondary small remove-button" onClick={() => deleteEvent(item)}>Ta bort</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
