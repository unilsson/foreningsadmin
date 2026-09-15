import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import App from "./App.jsx";
import AppShell from "./AppShell.jsx";
import BoardAdmin from "./BoardAdmin.jsx";

export default function RootApp() {
  const location = useLocation();

  if (location.pathname !== "/admin/board") {
    return <App />;
  }

  return <BoardAdminRoute />;
}

function BoardAdminRoute() {
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
      <header className="page-heading">
        <p className="eyebrow">Administration</p>
        <h1>Styrelse</h1>
        <p>
          Hantera vilka personer som sitter i styrelsen och vilka som ska få kalenderinbjudningar till styrelsemöten.
        </p>
      </header>
      <BoardAdmin />
    </AppShell>
  );
}
