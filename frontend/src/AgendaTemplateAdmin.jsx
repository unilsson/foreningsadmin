import { useEffect, useState } from "react";

function cloneTemplate(template) {
  return {
    title: template?.title ?? "Dagordning",
    beforeMeetingItems: [...(template?.beforeMeetingItems ?? [])],
    afterMeetingItems: [...(template?.afterMeetingItems ?? [])]
  };
}

export default function AgendaTemplateAdmin() {
  const [template, setTemplate] = useState(null);
  const [source, setSource] = useState("default");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTemplate() {
      try {
        const response = await fetch("/api/admin/agenda-template");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Kunde inte läsa dagordningsmallen.");
        }

        setTemplate(cloneTemplate(data.template));
        setSource(data.template?.source ?? "default");
        setHistory(data.history ?? []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, []);

  function updateTitle(event) {
    setTemplate((current) => ({ ...current, title: event.target.value }));
    setMessage("");
  }

  function updateItem(section, index, value) {
    setTemplate((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    }));
    setMessage("");
  }

  function addItem(section) {
    setTemplate((current) => ({
      ...current,
      [section]: [...current[section], ""]
    }));
    setMessage("");
  }

  function removeItem(section, index) {
    setTemplate((current) => ({
      ...current,
      [section]: current[section].filter((_, itemIndex) => itemIndex !== index)
    }));
    setMessage("");
  }

  function moveItem(section, index, direction) {
    setTemplate((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current[section].length) return current;

      const items = [...current[section]];
      [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
      return { ...current, [section]: items };
    });
    setMessage("");
  }

  async function saveTemplate() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/agenda-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Kunde inte spara dagordningsmallen.");
      }

      setTemplate(cloneTemplate(data.template));
      setSource(data.template?.source ?? "local");
      setHistory(data.history ?? []);
      setMessage("Dagordningsmallen är sparad. Ladda om sidan för att använda den i mötesredigeraren.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetTemplate() {
    const confirmed = window.confirm(
      "Återställa dagordningsmallen till programmets standard? Den lokala mallen tas bort."
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/agenda-template/reset", {
        method: "POST"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Kunde inte återställa dagordningsmallen.");
      }

      setTemplate(cloneTemplate(data.template));
      setSource(data.template?.source ?? "default");
      setHistory(data.history ?? []);
      setMessage("Programmets standardmall är återställd. Ladda om sidan för att använda den i mötesredigeraren.");
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="card admin-card">
        <p>Hämtar administrationsinställningar…</p>
      </section>
    );
  }

  if (!template) {
    return (
      <section className="card admin-card">
        <h2>Administration</h2>
        <p className="errors">{error || "Dagordningsmallen kunde inte laddas."}</p>
      </section>
    );
  }

  const beforeCount = template.beforeMeetingItems.length;

  return (
    <section className="card admin-card">
      <p className="eyebrow">Sprint 4</p>
      <h2>Administration – dagordningsmall</h2>
      <p className="muted admin-intro">
        Här ändrar du föreningens standardmall. Mötesspecifika ärenden hör fortfarande till det enskilda mötet och sparas inte i mallen.
      </p>

      <p className="template-source">
        Aktiv källa: <strong>{source === "local" ? "lokalt sparad mall" : "programmets standardmall"}</strong>
      </p>

      <label>
        Rubrik
        <input value={template.title} onChange={updateTitle} />
      </label>

      <div className="agenda-section">
        <h3>Standardpunkter före mötesspecifika ärenden</h3>
        <div className="agenda-list">
          {template.beforeMeetingItems.map((item, index) => (
            <div className="agenda-item-row admin-agenda-row" key={`admin-before-${index}`}>
              <span className="agenda-number">{index + 1}.</span>
              <input
                value={item}
                onChange={(event) =>
                  updateItem("beforeMeetingItems", index, event.target.value)
                }
              />
              <div className="agenda-item-actions">
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => moveItem("beforeMeetingItems", index, -1)}
                  disabled={index === 0}
                  aria-label="Flytta upp"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => moveItem("beforeMeetingItems", index, 1)}
                  disabled={index === template.beforeMeetingItems.length - 1}
                  aria-label="Flytta ned"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="secondary small remove-button"
                  onClick={() => removeItem("beforeMeetingItems", index)}
                >
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => addItem("beforeMeetingItems")}
        >
          + Lägg till standardpunkt
        </button>
      </div>

      <div className="agenda-section">
        <h3>Standardpunkter efter mötesspecifika ärenden</h3>
        <div className="agenda-list">
          {template.afterMeetingItems.map((item, index) => (
            <div className="agenda-item-row admin-agenda-row" key={`admin-after-${index}`}>
              <span className="agenda-number">{beforeCount + index + 1}.</span>
              <input
                value={item}
                onChange={(event) =>
                  updateItem("afterMeetingItems", index, event.target.value)
                }
              />
              <div className="agenda-item-actions">
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => moveItem("afterMeetingItems", index, -1)}
                  disabled={index === 0}
                  aria-label="Flytta upp"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => moveItem("afterMeetingItems", index, 1)}
                  disabled={index === template.afterMeetingItems.length - 1}
                  aria-label="Flytta ned"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="secondary small remove-button"
                  onClick={() => removeItem("afterMeetingItems", index)}
                >
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => addItem("afterMeetingItems")}
        >
          + Lägg till standardpunkt
        </button>
      </div>

      <div className="agenda-actions admin-actions">
        <button type="button" onClick={saveTemplate} disabled={saving}>
          {saving ? "Sparar…" : "Spara standardmall"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={resetTemplate}
          disabled={saving || source === "default"}
        >
          Återställ programmets standardmall
        </button>
        {message && (
          <button type="button" className="secondary" onClick={() => window.location.reload()}>
            Ladda om och använd mallen
          </button>
        )}
      </div>

      {message && <p className="admin-message">{message}</p>}
      {error && <p className="errors">{error}</p>}

      <details className="history-panel">
        <summary>Ändringshistorik ({history.length})</summary>
        {history.length === 0 ? (
          <p className="muted">Inga lokala ändringar har sparats ännu.</p>
        ) : (
          <div className="history-list">
            {history.map((entry, index) => (
              <article className="history-entry" key={`${entry.timestamp}-${index}`}>
                <strong>
                  {entry.action === "reset" ? "Mallen återställdes" : "Mallen sparades"}
                </strong>
                <time dateTime={entry.timestamp}>
                  {new Date(entry.timestamp).toLocaleString("sv-SE")}
                </time>
                <ul>
                  {(entry.changes ?? []).map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}
