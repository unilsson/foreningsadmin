import { useState } from "react";
import { NavLink } from "react-router-dom";

function MenuLink({ to, children, end = false, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
    >
      {children}
    </NavLink>
  );
}

export default function AppShell({ organisationName, backendOk, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          ☰ <span>Meny</span>
        </button>
        <strong>Föreningsadmin</strong>
      </header>

      {menuOpen && <button className="nav-backdrop" onClick={closeMenu} aria-label="Stäng meny" />}

      <aside id="main-navigation" className={`sidebar${menuOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">FA</span>
          <div>
            <strong>Föreningsadmin</strong>
            <span>{organisationName}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Huvudmeny">
          <MenuLink to="/" end onNavigate={closeMenu}>Start</MenuLink>

          <p className="nav-heading">Möten</p>
          <MenuLink to="/meetings" end onNavigate={closeMenu}>Mötesarkiv</MenuLink>
          <MenuLink to="/meetings/new" onNavigate={closeMenu}>Styrelsemöte</MenuLink>
          <MenuLink to="/agenda" onNavigate={closeMenu}>Dagordning</MenuLink>

          <p className="nav-heading">Kalendarium</p>
          <MenuLink to="/events" onNavigate={closeMenu}>Evenemang</MenuLink>

          <p className="nav-heading">Åtgärder</p>
          <MenuLink to="/actions" onNavigate={closeMenu}>Åtgärdslista</MenuLink>

          <p className="nav-heading">Administration</p>
          <MenuLink to="/admin/board" onNavigate={closeMenu}>Styrelse</MenuLink>
          <MenuLink to="/admin/agenda" onNavigate={closeMenu}>Dagordningsmall</MenuLink>
          <MenuLink to="/admin/google" onNavigate={closeMenu}>Google Calendar</MenuLink>
          <MenuLink to="/admin/backup" onNavigate={closeMenu}>Backup</MenuLink>
        </nav>

        <div className="sidebar-status">
          <span className={`status-dot ${backendOk ? "online" : backendOk === false ? "offline" : "pending"}`} />
          Backend {backendOk === null ? "kontrolleras" : backendOk ? "ansluten" : "ej nåbar"}
        </div>
      </aside>

      <main className="app-content">
        <div className="content-page">{children}</div>
      </main>
    </div>
  );
}
