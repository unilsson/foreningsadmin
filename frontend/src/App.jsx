import { useEffect, useState } from "react";

const emptyForm = {
  date: "",
  startTime: "",
  endTime: "",
  location: ""
};

const emptyAgenda = {
  title: "",
  beforeMeetingItems: [],
  meetingItems: [],
  afterMeetingItems: []
};

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [backendOk, setBackendOk] = useState(null);
  const [organisationName, setOrganisationName] = useState("Förening");
  const [googleStatus, setGoogleStatus] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [googleMessage, setGoogleMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [agendaTemplate, setAgendaTemplate] = useState(null);
  const [agendaDraft, setAgendaDraft] = useState(emptyAgenda);
  const [agendaPreview, setAgendaPreview] = useState(null);

  async function refreshGoogleStatus() {
    try {
      const response = await fetch("/api/google/status");
      const status = await response.json();
      setGoogleStatus(status);

      if (status.connected) {
        const calendarsResponse = await fetch("/api/google/calendars");
        const calendarsData = await calendarsResponse.json();
        if (calendarsResponse.ok) {
          setCalendars(calendarsData.calendars ?? []);
          setSelectedCalendarId(calendarsData.selectedCalendarId ?? "");
        }
      } else {
        setCalendars([]);
        setSelectedCalendarId("");
      }
    } catch {
      setGoogleStatus({ configured: false, connected: false });
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [healthResponse, configResponse, agendaResponse] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/config"),
          fetch("/api/agenda/template")
        ]);

        const health = await healthResponse.json();
        const config = await configResponse.json();
        const agenda = await agendaResponse.json();

        setBackendOk(Boolean(health.ok));
        setOrganisationName(config.organisation?.name ?? "Förening");

        setForm((current) => ({
          ...current,
          startTime: config.meeting?.startTime ?? "",
          endTime: config.meeting?.endTime ?? "",
          location: config.meeting?.location ?? ""
        }));

        setAgendaTemplate(agenda);
        setAgendaDraft({
          title: agenda.title ?? "Dagordning",
          beforeMeetingItems: agenda.beforeMeetingItems ?? [],
          meetingItems: [],
          afterMeetingItems: agenda.afterMeetingItems ?? []
        });
      } catch {
        setBackendOk(false);
      }

      await refreshGoogleStatus();

      const params = new URLSearchParams(window.location.search);
      const googleResult = params.get("google");
      const message = params.get("message");

      if (googleResult === "connected") {
        setGoogleMessage("Google Calendar är ansluten.");
      } else if (message) {
        setGoogleMessage(message);
      }

      if (googleResult) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    loadInitialData();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setPreview(null);
    setAgendaPreview(null);
    setCreatedEvent(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors([]);
    setPreview(null);
    setCreatedEvent(null);

    try {
      const response = await fetch("/api/meetings/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? ["Något gick fel."]);
        return;
      }

      setPreview(data.meeting);
    } catch {
      setErrors(["Kunde inte kontakta backend."]);
    }
  }

  async function saveCalendarSelection(event) {
    const calendarId = event.target.value;
    setSelectedCalendarId(calendarId);
    setGoogleMessage("");

    if (!calendarId) return;

    const response = await fetch("/api/google/calendar-selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarId })
    });

    const data = await response.json();
    if (!response.ok) {
      setGoogleMessage(data.error ?? "Kunde inte spara kalendern.");
      return;
    }

    setGoogleMessage(`Vald kalender: ${data.calendar.summary}`);
  }

  async function createCalendarInvite() {
    if (!preview || !selectedCalendarId) return;

    setSending(true);
    setErrors([]);
    setCreatedEvent(null);

    try {
      const response = await fetch("/api/google/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) {
        setErrors([data.error ?? "Kunde inte skapa kalenderinbjudan."]);
        return;
      }

      setCreatedEvent(data.event);
    } catch {
      setErrors(["Kunde inte kontakta backend."]);
    } finally {
      setSending(false);
    }
  }

  function updateAgendaTitle(event) {
    setAgendaDraft((current) => ({ ...current, title: event.target.value }));
    setAgendaPreview(null);
  }

  function updateAgendaItem(section, index, value) {
    setAgendaDraft((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    }));
    setAgendaPreview(null);
  }

  function addMeetingItem() {
    setAgendaDraft((current) => ({
      ...current,
      meetingItems: [...current.meetingItems, ""]
    }));
    setAgendaPreview(null);
  }

  function removeMeetingItem(index) {
    setAgendaDraft((current) => ({
      ...current,
      meetingItems: current.meetingItems.filter((_, itemIndex) => itemIndex !== index)
    }));
    setAgendaPreview(null);
  }

  function moveMeetingItem(index, direction) {
    setAgendaDraft((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.meetingItems.length) return current;

      const meetingItems = [...current.meetingItems];
      [meetingItems[index], meetingItems[targetIndex]] = [
        meetingItems[targetIndex],
        meetingItems[index]
      ];

      return { ...current, meetingItems };
    });
    setAgendaPreview(null);
  }

  function resetStandardAgenda() {
    if (!agendaTemplate) return;

    setAgendaDraft((current) => ({
      ...current,
      title: agendaTemplate.title,
      beforeMeetingItems: [...agendaTemplate.beforeMeetingItems],
      afterMeetingItems: [...agendaTemplate.afterMeetingItems]
    }));
    setAgendaPreview(null);
  }

  async function createAgenda() {
    setErrors([]);
    setAgendaPreview(null);

    try {
      const response = await fetch("/api/agenda/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting: form,
          agenda: agendaDraft
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? ["Kunde inte skapa dagordningen."]);
        return;
      }

      setAgendaPreview(data.agenda);
    } catch {
      setErrors(["Kunde inte kontakta backend."]);
    }
  }

  function downloadAgenda() {
    if (!agendaPreview?.markdown) return;

    const blob = new Blob([agendaPreview.markdown], {
      type: "text/markdown;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dagordning-${form.date || "styrelsemote"}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadAgendaPdf() {
    setErrors([]);

    try {
      const response = await fetch("/api/agenda/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting: form,
          agenda: agendaDraft
        })
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors(data.errors ?? ["Kunde inte skapa PDF-filen."]);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dagordning-${form.date || "styrelsemote"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrors(["Kunde inte skapa PDF-filen."]);
    }
  }

  const beforeCount = agendaDraft.beforeMeetingItems.length;
  const meetingCount = agendaDraft.meetingItems.length;

  return (
    <main className="page">
      <header className="header">
        <p className="eyebrow">{organisationName}</p>
        <h1>Föreningsadmin</h1>
        <p className="subtitle">
          Skapa kalenderinbjudan och dagordning för styrelsemöten.
        </p>
      </header>

      <section className="status">
        Backend:
        <strong>
          {backendOk === null ? " kontrollerar…" : backendOk ? " ansluten" : " ej nåbar"}
        </strong>
      </section>

      <section className="card google-card">
        <h2>Google Calendar</h2>

        {!googleStatus ? (
          <p>Kontrollerar anslutningen…</p>
        ) : !googleStatus.configured ? (
          <p className="muted">Google OAuth är inte konfigurerat i serverns .env-fil.</p>
        ) : !googleStatus.connected ? (
          <>
            <p>
              Inte ansluten
              {googleStatus.expectedEmail ? ` – använd ${googleStatus.expectedEmail}` : ""}.
            </p>
            <a className="button-link" href="/api/google/auth">
              Anslut Google Calendar
            </a>
          </>
        ) : (
          <>
            <p>
              Ansluten som <strong>{googleStatus.account?.email}</strong>
            </p>
            <label>
              Kalender
              <select value={selectedCalendarId} onChange={saveCalendarSelection}>
                <option value="">Välj kalender…</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}{calendar.primary ? " (primär)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {googleMessage && <p className="google-message">{googleMessage}</p>}
          </>
        )}
      </section>

      <section className="card">
        <h2>Nytt styrelsemöte</h2>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Datum
            <input type="date" name="date" value={form.date} onChange={updateField} required />
          </label>

          <div className="row">
            <label>
              Starttid
              <input type="time" name="startTime" value={form.startTime} onChange={updateField} required />
            </label>

            <label>
              Sluttid
              <input type="time" name="endTime" value={form.endTime} onChange={updateField} required />
            </label>
          </div>

          <label>
            Plats
            <input type="text" name="location" value={form.location} onChange={updateField} required />
          </label>

          <button type="submit">Förhandsgranska möte</button>
        </form>

        {errors.length > 0 && (
          <div className="errors" role="alert">
            <strong>Kontrollera uppgifterna:</strong>
            <ul>
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="card agenda-card">
        <p className="eyebrow">Sprint 3</p>
        <h2>Dagordning</h2>
        <p className="muted agenda-intro">
          Standardpunkterna kan ändras för just detta möte. Lägg mötesspecifika ärenden i mitten; numreringen skapas automatiskt.
        </p>

        <label>
          Rubrik
          <input value={agendaDraft.title} onChange={updateAgendaTitle} />
        </label>

        <div className="agenda-section">
          <h3>Standardpunkter före mötesspecifika ärenden</h3>
          <div className="agenda-list">
            {agendaDraft.beforeMeetingItems.map((item, index) => (
              <div className="agenda-item-row" key={`before-${index}`}>
                <span className="agenda-number">{index + 1}.</span>
                <input
                  value={item}
                  onChange={(event) =>
                    updateAgendaItem("beforeMeetingItems", index, event.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="agenda-section meeting-items-section">
          <h3>Mötesspecifika ärenden</h3>
          {agendaDraft.meetingItems.length === 0 ? (
            <p className="muted">Inga mötesspecifika punkter ännu.</p>
          ) : (
            <div className="agenda-list">
              {agendaDraft.meetingItems.map((item, index) => (
                <div className="agenda-item-row agenda-item-editable" key={`meeting-${index}`}>
                  <span className="agenda-number">{beforeCount + index + 1}.</span>
                  <input
                    value={item}
                    placeholder="Skriv ärendet här"
                    onChange={(event) =>
                      updateAgendaItem("meetingItems", index, event.target.value)
                    }
                  />
                  <div className="agenda-item-actions">
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => moveMeetingItem(index, -1)}
                      disabled={index === 0}
                      aria-label="Flytta upp"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => moveMeetingItem(index, 1)}
                      disabled={index === agendaDraft.meetingItems.length - 1}
                      aria-label="Flytta ned"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="secondary small remove-button"
                      onClick={() => removeMeetingItem(index)}
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="secondary" onClick={addMeetingItem}>
            + Lägg till punkt
          </button>
        </div>

        <div className="agenda-section">
          <h3>Standardpunkter efter mötesspecifika ärenden</h3>
          <div className="agenda-list">
            {agendaDraft.afterMeetingItems.map((item, index) => (
              <div className="agenda-item-row" key={`after-${index}`}>
                <span className="agenda-number">{beforeCount + meetingCount + index + 1}.</span>
                <input
                  value={item}
                  onChange={(event) =>
                    updateAgendaItem("afterMeetingItems", index, event.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="agenda-actions">
          <button type="button" onClick={createAgenda}>
            Förhandsgranska dagordning
          </button>
          <button type="button" className="secondary" onClick={resetStandardAgenda}>
            Återställ standardpunkter
          </button>
        </div>
      </section>

      {agendaPreview && (
        <section className="card agenda-preview">
          <p className="eyebrow">Dagordningsförhandsgranskning</p>
          <h2>{agendaPreview.title}</h2>
          <p className="agenda-heading">{agendaPreview.heading}</p>

          <ol>
            {agendaPreview.items.map((item) => (
              <li key={item.number}>{item.text}</li>
            ))}
          </ol>

          <div className="agenda-actions">
            <button type="button" onClick={downloadAgenda}>
              Hämta som Markdown
            </button>
            <button type="button" className="secondary" onClick={downloadAgendaPdf}>
              Hämta som PDF
            </button>
          </div>
        </section>
      )}

      {preview && (
        <section className="card preview">
          <p className="eyebrow">Mötesförhandsgranskning</p>
          <h2>{preview.title}</h2>

          <dl>
            <div><dt>Datum</dt><dd>{preview.date}</dd></div>
            <div><dt>Tid</dt><dd>{preview.startTime}–{preview.endTime}</dd></div>
            <div><dt>Plats</dt><dd>{preview.location}</dd></div>
          </dl>

          <div className="attendees">
            <h3>
              Kalenderdeltagare
              <span className="count">{preview.attendees?.length ?? 0}</span>
            </h3>

            {preview.attendees?.length > 0 ? (
              <div className="attendee-list">
                {preview.attendees.map((member) => (
                  <article className="attendee" key={member.email}>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.role}</span>
                    </div>
                    <a href={`mailto:${member.email}`}>{member.email}</a>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Inga aktiva styrelsemedlemmar hittades.</p>
            )}
          </div>

          <div className="calendar-text">
            <h3>Text i kalenderinbjudan</h3>
            <pre>{preview.calendarDescription}</pre>
          </div>

          <div className="send-area">
            <button
              type="button"
              onClick={createCalendarInvite}
              disabled={!googleStatus?.connected || !selectedCalendarId || sending}
            >
              {sending ? "Skapar kalenderinbjudan…" : "Skapa och skicka kalenderinbjudan"}
            </button>

            {!selectedCalendarId && (
              <p className="muted">Välj först vilken Google-kalender som ska användas.</p>
            )}

            {createdEvent && (
              <div className="success-box">
                <strong>Kalenderinbjudan skapad.</strong>
                <p>
                  Kalender: {createdEvent.calendar?.summary}
                  {createdEvent.htmlLink && (
                    <> · <a href={createdEvent.htmlLink} target="_blank" rel="noreferrer">Öppna i Google Calendar</a></>
                  )}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
