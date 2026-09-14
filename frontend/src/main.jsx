import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AgendaTemplateAdmin from "./AgendaTemplateAdmin.jsx";
import "./styles.css";
import "./admin.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <div className="admin-page">
      <AgendaTemplateAdmin />
    </div>
  </React.StrictMode>
);
