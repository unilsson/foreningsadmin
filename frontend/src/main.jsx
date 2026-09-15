import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import RootApp from "./RootApp.jsx";
import "./styles.css";
import "./admin.css";
import "./shell.css";
import "./board-admin.css";
import "./meeting-archive.css";
import "./action-items.css";
import "./events.css";
import "./backup-admin.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <RootApp />
    </BrowserRouter>
  </React.StrictMode>
);
