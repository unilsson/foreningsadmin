import { useEffect, useMemo, useState } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toLocaleString("sv-SE", { maximumFractionDigits: index === 0 ? 0 : 1 })} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return "Okänt datum";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("sv-SE");
}

export default function BackupAdmin() {
  const [status, setStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [backupInfo, setBackupInfo] = useState(null);
  const [reading, setReading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const response = await fetch("/api/backup/status");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kunde inte läsa backupstatus.");
      setStatus(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const canRestore = useMemo(
    () => backupInfo?.format === "foreningsadmin-backup" && backupInfo?.version === 1,
    [backupInfo]
  );

  async function chooseFile(event) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setBackupInfo(null);
    setMessage("");
    setError("");
    if (!file) return;

    setReading(true);
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.format !== "foreningsadmin-backup") throw new Error("Filen är inte en Föreningsadmin-backup.");
      if (parsed.version !== 1) throw new Error(`Backupversion ${parsed.version ?? "okänd"} stöds inte.`);
      if (!Array.isArray(parsed.files)) throw new Error("Backupfilen saknar fillista.");
      setBackupInfo({
        format: parsed.format,
        version: parsed.version,
        createdAt: parsed.createdAt,
        fileCount: parsed.fileCount ?? parsed.files.length,
        totalBytes: parsed.totalBytes ?? null
      });
    } catch (readError) {
      setError(readError.message);
      setSelectedFile(null);
      event.target.value = "";
    } finally {
      setReading(false);
    }
  }

  async function restoreBackup() {
    if (!selectedFile || !canRestore) return;
    const confirmed = window.confirm(
      "Återställa denna backup? Nuvarande data ersätts. Föreningsadmin sparar automatiskt den nuvarande data-katalogen som en säkerhetskopia på servern innan återställningen."
    );
    if (!confirmed) return;

    setRestoring(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: selectedFile
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Återställningen misslyckades.");
      setMessage(
        `Backupen är återställd (${data.fileCount} filer, ${formatBytes(data.totalBytes)}).` +
        (data.safetyBackup ? ` Tidigare data sparades som ${data.safetyBackup}.` : "")
      );
      setSelectedFile(null);
      setBackupInfo(null);
      await loadStatus();
    } catch (restoreError) {
      setError(restoreError.message);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Administration</p>
        <h1>Backup och återställning</h1>
        <p>Hämta en komplett backup av Föreningsadmins lokala data och återställ den på samma eller en ny installation.</p>
      </header>

      {message && <p className="backup-message">{message}</p>}
      {error && <div className="errors" role="alert">{error}</div>}

      <div className="backup-grid">
        <section className="card backup-card">
          <div>
            <p className="eyebrow">Backup</p>
            <h2>Hämta all appdata</h2>
            <p>Backupen innehåller hela <code>data/</code>, inklusive möten, protokoll och andra mötesdokument, styrelse, dagordningsmall, åtgärdslista, kalendarium och lokala historikfiler.</p>
          </div>

          <dl className="backup-summary">
            <div><dt>Filer</dt><dd>{status ? status.fileCount : "…"}</dd></div>
            <div><dt>Datamängd</dt><dd>{status ? formatBytes(status.totalBytes) : "…"}</dd></div>
          </dl>

          <a className="button-link" href="/api/backup/download">Hämta backupfil</a>

          <p className="backup-note">OAuth-token och <code>.env</code> ingår inte eftersom de innehåller hemligheter. På en ny installation behöver Google Calendar därför anslutas igen.</p>
        </section>

        <section className="card backup-card">
          <div>
            <p className="eyebrow">Återställning</p>
            <h2>Läs in en backup</h2>
            <p>Välj en backupfil från Föreningsadmin. Filen kontrolleras innan något skrivs till installationen.</p>
          </div>

          <label className="backup-file-field">
            Backupfil
            <input type="file" accept=".json,application/json" onChange={chooseFile} disabled={reading || restoring} />
          </label>

          {reading && <p className="muted">Kontrollerar backupfilen…</p>}

          {backupInfo && (
            <div className="backup-selected">
              <strong>{selectedFile?.name}</strong>
              <span>Skapad {formatDate(backupInfo.createdAt)}</span>
              <span>{backupInfo.fileCount} filer{Number.isFinite(backupInfo.totalBytes) ? ` · ${formatBytes(backupInfo.totalBytes)}` : ""}</span>
            </div>
          )}

          <button type="button" onClick={restoreBackup} disabled={!canRestore || restoring}>
            {restoring ? "Återställer…" : "Återställ backup"}
          </button>

          <p className="backup-warning"><strong>Observera:</strong> återställning ersätter nuvarande <code>data/</code>. Innan dess flyttas nuvarande data automatiskt till <code>backups/pre-restore-…</code>.</p>
        </section>
      </div>
    </>
  );
}
