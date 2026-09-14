import { useEffect, useState } from "react";

const emptyForm = {
  date: "",
  startTime: "",
  endTime: "",
  location: ""
};

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [backendOk, setBackendOk] = useState(null);
  const [organisationName, setOrganisationName] = useState("Förening");

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [healthResponse, configResponse] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/config")
        ]);

        const health = await healthResponse.json();
        const config = await configResponse.json();

        setBackendOk(Boolean(health.ok));
        setOrganisationName(config.organisation?.name ?? "Förening");

        setForm((current) => ({
          ...current,
          startTime: config.meeting?.startTime ?? "",
          endTime: config.meeting?.endTime ?? "",
          location: config.meeting?.location ?? ""
        }));
      } catch {
        setBackendOk(false);
      }
    }

    loadInitialData();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors([]);
    setPreview(null);

    try {
      const response = await fetch("/api/meetings/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

  return (
    <main className="page">
      <header className="header">
        <p className="eyebrow">{organisationName}</p>
        <h1>Föreningsadmin</h1>
        <p className="subtitle">
          Första modulen: skapa och förhandsgranska styrelsemöten.
        </p>
      </header>

      <section className="status">
        Backend:
        <strong>
          {backendOk === null ? " kontrollerar…" : backendOk ? " ansluten" : " ej nåbar"}
        </strong>
      </section>

      <section className="card">
        <h2>Nytt styrelsemöte</h2>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Datum
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={updateField}
              required
            />
          </label>

          <div className="row">
            <label>
              Starttid
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Sluttid
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={updateField}
                required
              />
            </label>
          </div>

          <label>
            Plats
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={updateField}
              required
            />
          </label>

          <button type="submit">Förhandsgranska</button>
        </form>

        {errors.length > 0 && (
          <div className="errors" role="alert">
            <strong>Kontrollera uppgifterna:</strong>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {preview && (
        <section className="card preview">
          <p className="eyebrow">Förhandsgranskning</p>
          <h2>{preview.title}</h2>

          <dl>
            <div>
              <dt>Datum</dt>
              <dd>{preview.date}</dd>
            </div>
            <div>
              <dt>Tid</dt>
              <dd>
                {preview.startTime}–{preview.endTime}
              </dd>
            </div>
            <div>
              <dt>Plats</dt>
              <dd>{preview.location}</dd>
            </div>
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

          <p className="notice">
            Sprint 1 skickar ingenting. Google Calendar och Gmail läggs till senare.
          </p>
        </section>
      )}
    </main>
  );
}
