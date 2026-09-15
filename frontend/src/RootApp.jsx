import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import App from "./App.jsx";
import AppShell from "./AppShell.jsx";
import BoardAdmin from "./BoardAdmin.jsx";
import { MeetingArchive, MeetingDetail } from "./MeetingArchive.jsx";

export default function RootApp() {
  const location = useLocation();

  if (location.pathname === "/admin/board") {
    return <ShellRoute eyebrow="Administration" title="Styrelse" text="Hantera vilka personer som sitter i styrelsen och vilka som ska få kalenderinbjudningar till styrelsemöten."><BoardAdmin /></ShellRoute>;
  }

  if (location.pathname === "/meetings") {
    return <ShellRoute><MeetingArchive /></ShellRoute>;
  }

  const meetingMatch = location.pathname.match(/^\/meetings\/([0-9a-f-]{36})$/i);
  if (meetingMatch) {
    return <ShellRoute><MeetingDetail meetingId={meetingMatch[1]} /></ShellRoute>;
  }

  return <App />;
}

function ShellRoute({ eyebrow, title, text, children }) {
  const [organisationName, setOrganisationName] = useState("Förening");
  const [backendOk, setBackendOk] = useState(null);

  useEffect(() => {
    async function loadShellData() {
      try {
        const [healthResponse, configResponse] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/config")
        ]);
        const health = await healthResponse.json();
        const config = await configResponse.json();
        setBackendOk(Boolean(health.ok));
        setOrganisationName(config.organisation?.name ?? "Förening");
      } catch {
        setBackendOk(false);
      }
    }

    loadShellData();
  }, []);

  return (
    <AppShell organisationName={organisationName} backendOk={backendOk}>
      {title && (
        <header className="page-heading">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {text && <p>{text}</p>}
        </header>
      )}
      {children}
    </AppShell>
  );
}
