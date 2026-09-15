import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import AgendaTemplateAdmin from "./AgendaTemplateAdmin.jsx";
import AppShell from "./AppShell.jsx";

const WORKSPACE_KEY = "foreningsadmin.meetingWorkspace";

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
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  const [meetingStatus, setMeetingStatus] = useState("planned");
  const [meetingSaveMessage, setMeetingSaveMessage] = useState("");
  const [savingMeeting, setSavingMeeting] = useState(false);

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
      const params = new URLSearchParams(window.location.search);
      const startNew = params.get("new") === "1";
      if (startNew) window.sessionStorage.removeItem(WORKSPACE_KEY);

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

        const defaultForm = {
          date: "",
          startTime: config.meeting?.startTime ?? "",
          endTime: config.meeting?.endTime ?? "",
          location: config.meeting?.location ?? ""
        };
        const defaultAgenda = {
          title: agenda.title ?? "Dagordning",
          beforeMeetingItems: agenda.beforeMeetingItems ?? [],
          meetingItems: [],
          afterMeetingItems: agenda.afterMeetingItems ?? []
        };

        setForm(defaultForm);
        setAgendaTemplate(agenda);
        setAgendaDraft(defaultAgenda);

        if (!startNew) {
          const workspace = loadWorkspace();
          if (workspace?.id && workspace?.meeting) {
            setCurrentMeetingId(workspace.id);
            setMeetingStatus(workspace.status ?? "planned");
            setForm({
              date: workspace.meeting.date ?? "",
              startTime: workspace.meeting.startTime ?? defaultForm.startTime,
              endTime: workspace.meeting.endTime ?? defaultForm.endTime,
              location: workspace.meeting.location ?? defaultForm.location
            });
            setAgendaDraft({
              title: workspace.agenda?.title ?? defaultAgenda.title,
              beforeMeetingItems: workspace.agenda?.beforeMeetingItems ?? defaultAgenda.beforeMeetingItems,
              meetingItems: workspace.agenda?.meetingItems ?? [],
              afterMeetingItems: workspace.agenda?.afterMeetingItems ?? defaultAgenda.afterMeetingItems
            });
          }
        }
      } catch {
        setBackendOk(false);
      }

      await refreshGoogleStatus();

      const googleResult = params.get("google");
      const message = params.get("message");

      if (googleResult === "connected") {
        setGoogleMessage("Google Calendar är ansluten.");
      } else if (message) {
        setGoogleMessage(message);
      }

      if (googleResult || startNew) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    loadInitialData();
  }, []);

  function markMeetingChanged() {
    setMeetingSaveMessage("");
    setPreview(null);
    setAgendaPreview(null);
    setCreatedEvent(null);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    markMeetingChanged();
  }

  function updateMeetingStatus(event) {
    setMeetingStatus(event.target.value);
    setMeetingSaveMessage("");
  }

  function startNewMeeting() {
    window.sessionStorage.removeItem(WORKSPACE_KEY);
    window.location.assign("/meetings/new?new=1");
  }

  async function saveCurrentMeeting() {
    setSavingMeeting(true);
    setMeetingSaveMessage("");
    setErrors([]);

    try {
      const isUpdate = Boolean(currentMeetingId);
      const response = await fetch(
        isUpdate ? `/api/saved-meetings/${currentMeetingId}` : "/api/saved-meetings",
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meeting: form,
            agenda: agendaDraft,
            status: meetingStatus
          })
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? [data.error ?? "Kunde inte spara mötet."]);
        return;
      }

      const record = data.meeting;
      setCurrentMeetingId(record.id);
      setMeetingStatus(record.status);
      window.sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(record));
      setMeetingSaveMessage(isUpdate ? "Mötet är uppdaterat i mötesarkivet." : "Mötet är sparat i mötesarkivet.");
    } catch {
      setErrors(["Kunde inte kontakta backend när mötet skulle sparas."]);
    } finally {
      setSavingMeeting(false);
    }
  }

  async function handleMeetingPreview(event) {
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

    try {
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
    } catch {
      setGoogleMessage("Kunde inte kontakta backend.");
    }
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
    setMeetingSaveMessage("");
  }

  function updateAgendaItem(section, index, value) {
    setAgendaDraft((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    }));
    setAgendaPreview(null);
    setMeetingSaveMessage("");
  }

  function addMeetingItem() {
    setAgendaDraft((current) => ({
      ...current,
      meetingItems: [...current.meetingItems, ""]
    }));
    setAgendaPreview(null);
    setMeetingSaveMessage("");
  }

  function removeMeetingItem(index) {
    setAgendaDraft((current) => ({
      ...current,
      meetingItems: current.meetingItems.filter((_, itemIndex) => itemIndex !== index)
    }));
    setAgendaPreview(null);
    setMeetingSaveMessage("");
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
    setMeetingSaveMessage("");
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
    setMeetingSaveMessage("");
  }

  async function createAgenda() {
    setErrors([]);
    setAgendaPreview(null);

    try {
      const response = await fetch("/api/agenda/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting: form, agenda: agendaDraft })
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
    downloadBlob(blob, `dagordning-${form.date || "styrelsemote"}.md`);
  }

  async function downloadAgendaPdf() {
    setErrors([]);

    try {
      const response = await fetch("/api/agenda/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting: form, agenda: agendaDraft })
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors(data.errors ?? ["Kunde inte skapa PDF-filen."]);
        return;
      }

      downloadBlob(await response.blob(), `dagordning-${form.date || "styrelsemote"}.pdf`);
    } catch {
      setErrors(["Kunde inte skapa PDF-filen."]);
    }
  }

  return (
    <AppShell organisationName={organisationName} backendOk={backendOk}>
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              organisationName={organisationName}
              googleStatus={googleStatus}
              selectedCalendarId={selectedCalendarId}
            />
          }
        />
        <Route
          path="/meetings/new"
          element={
            <MeetingPage
              form={form}
              updateField={updateField}
              handleMeetingPreview={handleMeetingPreview}
              errors={errors}
              preview={preview}
              createCalendarInvite={createCalendarInvite}
              googleStatus={googleStatus}
              selectedCalendarId={selectedCalendarId}
              sending={sending}
              createdEvent={createdEvent}
              currentMeetingId={currentMeetingId}
              meetingStatus={meetingStatus}
              updateMeetingStatus={updateMeetingStatus}
              saveCurrentMeeting={saveCurrentMeeting}
              savingMeeting={savingMeeting}
              meetingSaveMessage={meetingSaveMessage}
              startNewMeeting={startNewMeeting}
            />
          }
        />
        <Route
          path="/agenda"
          element={
            <AgendaPage
              form={form}
              agendaDraft={agendaDraft}
              updateAgendaTitle={updateAgendaTitle}
              updateAgendaItem={updateAgendaItem}
              addMeetingItem={addMeetingItem}
              removeMeetingItem={removeMeetingItem}
              moveMeetingItem={moveMeetingItem}
              resetStandardAgenda={resetStandardAgenda}
              createAgenda={createAgenda}
              agendaPreview={agendaPreview}
              downloadAgenda={downloadAgenda}
              downloadAgendaPdf={downloadAgendaPdf}
              errors={errors}
              currentMeetingId={currentMeetingId}
              saveCurrentMeeting={saveCurrentMeeting}
              savingMeeting={savingMeeting}
              meetingSaveMessage={meetingSaveMessage}
            />
          }
        />
        <Route
          path="/admin/agenda"
          element={
            <>
              <PageHeading
                eyebrow="Administration"
                title="Dagordningsmall"
                text="Ändra föreningens återkommande standardpunkter. Ändringarna sparas lokalt och påverkar kommande dagordningar."
              />
              <AgendaTemplateAdmin />
            </>
          }
        />
        <Route
          path="/admin/google"
          element={
            <GooglePage
              googleStatus={googleStatus}
              calendars={calendars}
              selectedCalendarId={selectedCalendarId}
              saveCalendarSelection={saveCalendarSelection}
              googleMessage={googleMessage}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function loadWorkspace() {
  try {
    const value = window.sessionStorage.getItem(WORKSPACE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function PageHeading({ eyebrow, title, text }) {
  return (
    <header className="page-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </header>
  );
}

function ErrorList({ errors }) {
  if (!errors?.length) return null;
  return (
    <div className="errors" role="alert">
      <strong>Kontrollera uppgifterna:</strong>
      <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
    </div>
  );
}

function Dashboard({ organisationName, googleStatus, selectedCalendarId }) {
  return (
    <>
      <PageHeading
        eyebrow={organisationName}
        title="Föreningsadmin"
        text="Administration för styrelsemöten, dagordningar och föreningens gemensamma inställningar."
      />

      <div className="dashboard-grid">
        <Link className="dashboard-card" to="/meetings">
          <span className="card-kicker">Möten</span>
          <h2>Mötesarkiv</h2>
          <p>Öppna tidigare och kommande sparade möten och fortsätt arbetet där du slutade.</p>
        </Link>
        <Link className="dashboard-card" to="/meetings/new">
          <span className="card-kicker">Möten</span>
          <h2>Styrelsemöte</h2>
          <p>Ange datum, tid och plats, spara mötet, kontrollera deltagare och skapa kalenderinbjudan.</p>
        </Link>
        <Link className="dashboard-card" to="/agenda">
          <span className="card-kicker">Möten</span>
          <h2>Dagordning</h2>
          <p>Lägg till mötesspecifika punkter, spara dem med mötet och exportera till Markdown eller PDF.</p>
        </Link>
        <Link className="dashboard-card" to="/admin/agenda">
          <span className="card-kicker">Administration</span>
          <h2>Dagordningsmall</h2>
          <p>Ändra de standardpunkter som används när nya dagordningar skapas.</p>
        </Link>
        <Link className="dashboard-card" to="/admin/google">
          <span className="card-kicker">Administration</span>
          <h2>Google Calendar</h2>
          <p>
            {googleStatus?.connected
              ? `Ansluten${selectedCalendarId ? " och kalender vald" : ", men ingen kalender är vald"}.`
              : "Kontrollera Google-anslutning och välj kalender."}
          </p>
        </Link>
      </div>
    </>
  );
}

function GooglePage({
  googleStatus,
  calendars,
  selectedCalendarId,
  saveCalendarSelection,
  googleMessage
}) {
  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="Google Calendar"
        text="Hantera vilket Google-konto och vilken skrivbar kalender Föreningsadmin använder för styrelsemöten."
      />
      <section className="card google-card">
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
            <a className="button-link" href="/api/google/auth">Anslut Google Calendar</a>
          </>
        ) : (
          <>
            <p>Ansluten som <strong>{googleStatus.account?.email}</strong></p>
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
    </>
  );
}

function MeetingPage({
  form,
  updateField,
  handleMeetingPreview,
  errors,
  preview,
  createCalendarInvite,
  googleStatus,
  selectedCalendarId,
  sending,
  createdEvent,
  currentMeetingId,
  meetingStatus,
  updateMeetingStatus,
  saveCurrentMeeting,
  savingMeeting,
  meetingSaveMessage,
  startNewMeeting
}) {
  return (
    <>
      <PageHeading
        eyebrow="Möten"
        title="Styrelsemöte"
        text="Ange mötesuppgifterna, spara mötet i arkivet och förhandsgranska innan kalenderinbjudan skapas. Uppgifterna används också av dagordningen."
      />

      {currentMeetingId && (
        <div className="saved-meeting-context">
          Du arbetar med ett sparat möte. <Link to={`/meetings/${currentMeetingId}`}>Öppna mötet i arkivet</Link>.
        </div>
      )}

      <section className="card">
        <form onSubmit={handleMeetingPreview} className="form">
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

        <div className="meeting-save-bar">
          <label>
            Status
            <select value={meetingStatus} onChange={updateMeetingStatus}>
              <option value="planned">Planerat</option>
              <option value="completed">Genomfört</option>
              <option value="cancelled">Inställt</option>
            </select>
          </label>
          <button type="button" onClick={saveCurrentMeeting} disabled={savingMeeting}>
            {savingMeeting ? "Sparar…" : currentMeetingId ? "Spara ändringar" : "Spara mötet"}
          </button>
          <button type="button" className="secondary" onClick={startNewMeeting}>Nytt tomt möte</button>
          {meetingSaveMessage && <p className="meeting-save-message">{meetingSaveMessage}</p>}
        </div>
        <ErrorList errors={errors} />
      </section>

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
            <h3>Kalenderdeltagare <span className="count">{preview.attendees?.length ?? 0}</span></h3>
            {preview.attendees?.length > 0 ? (
              <div className="attendee-list">
                {preview.attendees.map((member) => (
                  <article className="attendee" key={member.email}>
                    <div><strong>{member.name}</strong><span>{member.role}</span></div>
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
              <p className="muted">
                Välj först kalender under <Link to="/admin/google">Google Calendar</Link>.
              </p>
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
    </>
  );
}

function AgendaPage({
  form,
  agendaDraft,
  updateAgendaTitle,
  updateAgendaItem,
  addMeetingItem,
  removeMeetingItem,
  moveMeetingItem,
  resetStandardAgenda,
  createAgenda,
  agendaPreview,
  downloadAgenda,
  downloadAgendaPdf,
  errors,
  currentMeetingId,
  saveCurrentMeeting,
  savingMeeting,
  meetingSaveMessage
}) {
  const beforeCount = agendaDraft.beforeMeetingItems.length;
  const meetingCount = agendaDraft.meetingItems.length;

  return (
    <>
      <PageHeading
        eyebrow="Möten"
        title="Dagordning"
        text="Standardpunkterna kan ändras för det aktuella mötet. Mötesspecifika ärenden placeras mellan standardblocken och numreras automatiskt."
      />

      {currentMeetingId && (
        <div className="saved-meeting-context">
          Dagordningen hör till det sparade mötet. <Link to={`/meetings/${currentMeetingId}`}>Öppna mötet i arkivet</Link>.
        </div>
      )}

      {!form.date && (
        <div className="notice card">
          Ange först mötesdatum under <Link to="/meetings/new">Styrelsemöte</Link>. Tid och plats är redan förifyllda från standardinställningarna.
        </div>
      )}

      <section className="card agenda-card">
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
                <input value={item} onChange={(event) => updateAgendaItem("beforeMeetingItems", index, event.target.value)} />
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
                    onChange={(event) => updateAgendaItem("meetingItems", index, event.target.value)}
                  />
                  <div className="agenda-item-actions">
                    <button type="button" className="secondary small" onClick={() => moveMeetingItem(index, -1)} disabled={index === 0} aria-label="Flytta upp">↑</button>
                    <button type="button" className="secondary small" onClick={() => moveMeetingItem(index, 1)} disabled={index === agendaDraft.meetingItems.length - 1} aria-label="Flytta ned">↓</button>
                    <button type="button" className="secondary small remove-button" onClick={() => removeMeetingItem(index)}>Ta bort</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="secondary" onClick={addMeetingItem}>+ Lägg till punkt</button>
        </div>

        <div className="agenda-section">
          <h3>Standardpunkter efter mötesspecifika ärenden</h3>
          <div className="agenda-list">
            {agendaDraft.afterMeetingItems.map((item, index) => (
              <div className="agenda-item-row" key={`after-${index}`}>
                <span className="agenda-number">{beforeCount + meetingCount + index + 1}.</span>
                <input value={item} onChange={(event) => updateAgendaItem("afterMeetingItems", index, event.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div className="agenda-actions">
          <button type="button" onClick={createAgenda}>Förhandsgranska dagordning</button>
          <button type="button" className="secondary" onClick={resetStandardAgenda}>Återställ standardpunkter</button>
          <button type="button" className="secondary" onClick={saveCurrentMeeting} disabled={savingMeeting || !form.date}>
            {savingMeeting ? "Sparar…" : currentMeetingId ? "Spara möte och dagordning" : "Spara som nytt möte"}
          </button>
        </div>
        {meetingSaveMessage && <p className="meeting-save-message">{meetingSaveMessage}</p>}
        <ErrorList errors={errors} />
      </section>

      {agendaPreview && (
        <section className="card agenda-preview">
          <p className="eyebrow">Dagordningsförhandsgranskning</p>
          <h2>{agendaPreview.title}</h2>
          <p className="agenda-heading">{agendaPreview.heading}</p>
          <ol>{agendaPreview.items.map((item) => <li key={item.number}>{item.text}</li>)}</ol>
          <div className="agenda-actions">
            <button type="button" onClick={downloadAgenda}>Hämta som Markdown</button>
            <button type="button" className="secondary" onClick={downloadAgendaPdf}>Hämta som PDF</button>
          </div>
        </section>
      )}
    </>
  );
}
