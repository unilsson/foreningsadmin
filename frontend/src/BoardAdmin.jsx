import { useEffect, useMemo, useState } from "react";

function newMember() {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
    role: "Ledamot",
    active: true
  };
}

export default function BoardAdmin() {
  const [members, setMembers] = useState([]);
  const [source, setSource] = useState("empty");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(
    () => members.filter((member) => member.active).length,
    [members]
  );

  async function loadBoard() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/board");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte läsa styrelsen.");

      setMembers(data.board?.members ?? []);
      setSource(data.board?.source ?? "empty");
      setHistory(data.history ?? []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  function updateMember(id, field, value) {
    setMembers((current) =>
      current.map((member) =>
        member.id === id ? { ...member, [field]: value } : member
      )
    );
    setMessage("");
  }

  function addMember() {
    setMembers((current) => [...current, newMember()]);
    setMessage("");
  }

  function moveMember(index, direction) {
    setMembers((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setMessage("");
  }

  async function saveBoard() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte spara styrelsen.");

      setMembers(data.board?.members ?? []);
      setSource(data.board?.source ?? "local");
      setHistory(data.history ?? []);
      setMessage("Styrelsen är sparad. Ändringarna används direkt i mötesförhandsgranskning och kalenderinbjudningar.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="card"><p>Hämtar styrelsen…</p></section>;
  }

  return (
    <>
      <section className="card board-summary">
        <div>
          <span className="board-stat">{members.length}</span>
          <span>personer totalt</span>
        </div>
        <div>
          <span className="board-stat">{activeCount}</span>
          <span>aktiva kalenderdeltagare</span>
        </div>
        <div>
          <span className="board-source-label">Datakälla</span>
          <strong>
            {source === "local"
              ? "data/board.json"
              : source === "legacy"
                ? "config/board.json (äldre lokal fil)"
                : "ingen styrelse sparad"}
          </strong>
        </div>
      </section>

      {source === "legacy" && (
        <section className="notice-card">
          <strong>Äldre styrelsefil används.</strong>
          <p>
            När du sparar här skapas <code>data/board.json</code>. Därefter används den filen automatiskt och ingen omstart av backend behövs.
          </p>
        </section>
      )}

      <section className="card board-admin-card">
        <div className="board-toolbar">
          <div>
            <h2>Styrelsemedlemmar</h2>
            <p className="muted">
              Aktiva personer används som deltagare när kalenderinbjudningar skapas. Behåll tidigare ledamöter som inaktiva i stället för att radera dem.
            </p>
          </div>
          <button type="button" className="secondary" onClick={addMember}>
            + Lägg till person
          </button>
        </div>

        <div className="board-member-list">
          {members.map((member, index) => (
            <article className={`board-member${member.active ? "" : " inactive"}`} key={member.id}>
              <div className="board-member-header">
                <strong>{member.name || "Ny styrelsemedlem"}</strong>
                <label className="active-toggle">
                  <input
                    type="checkbox"
                    checked={member.active}
                    onChange={(event) => updateMember(member.id, "active", event.target.checked)}
                  />
                  Aktiv
                </label>
              </div>

              <div className="board-fields">
                <label>
                  Namn
                  <input
                    value={member.name}
                    onChange={(event) => updateMember(member.id, "name", event.target.value)}
                  />
                </label>
                <label>
                  Roll
                  <input
                    value={member.role}
                    onChange={(event) => updateMember(member.id, "role", event.target.value)}
                  />
                </label>
                <label className="board-email-field">
                  E-post
                  <input
                    type="email"
                    value={member.email}
                    onChange={(event) => updateMember(member.id, "email", event.target.value)}
                  />
                </label>
              </div>

              <div className="board-member-actions">
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => moveMember(index, -1)}
                  disabled={index === 0}
                >
                  ↑ Flytta upp
                </button>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => moveMember(index, 1)}
                  disabled={index === members.length - 1}
                >
                  ↓ Flytta ned
                </button>
                <span className="member-id">ID: {member.id}</span>
              </div>
            </article>
          ))}
        </div>

        {members.length === 0 && (
          <p className="muted">Ingen styrelse finns ännu. Lägg till den första personen ovan.</p>
        )}

        <div className="board-save-row">
          <button type="button" onClick={saveBoard} disabled={saving}>
            {saving ? "Sparar…" : "Spara styrelsen"}
          </button>
          {message && <p className="admin-message">{message}</p>}
        </div>
        {error && <div className="errors" role="alert">{error}</div>}
      </section>

      <section className="card">
        <details className="history-panel">
          <summary>Ändringshistorik ({history.length})</summary>
          {history.length === 0 ? (
            <p className="muted">Inga ändringar har sparats genom administrationssidan ännu.</p>
          ) : (
            <div className="history-list">
              {history.map((entry, index) => (
                <article className="history-entry" key={`${entry.timestamp}-${index}`}>
                  <strong>Styrelsen sparades</strong>
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString("sv-SE")}
                  </time>
                  <ul>
                    {(entry.changes ?? []).map((change) => <li key={change}>{change}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </details>
      </section>
    </>
  );
}
