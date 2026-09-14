import express from "express";
import { loadConfig } from "./config/load-config.mjs";
import { loadBoard } from "./config/load-board.mjs";
import { createMeetingPreview } from "./meetings/preview.mjs";
import { renderTemplate } from "./templates/render.mjs";

const app = express();
const port = Number(process.env.PORT || 3001);

const config = await loadConfig();
const board = await loadBoard();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "foreningsadmin-backend"
  });
});

app.get("/api/config", (_req, res) => {
  res.json(config);
});

app.get("/api/board", (_req, res) => {
  res.json(board);
});

app.post("/api/meetings/preview", async (req, res) => {
  const result = createMeetingPreview(req.body, config);

  if (!result.ok) {
    return res.status(400).json(result);
  }

  try {
    const calendarDescription = await renderTemplate(
      "templates/calendar/styrelsemote.txt",
      result.meeting
    );

    res.json({
      ...result,
      meeting: {
        ...result.meeting,
        calendarDescription,
        attendees: board.members
      }
    });
  } catch (error) {
    console.error("Kunde inte skapa förhandsgranskning:", error);
    res.status(500).json({
      ok: false,
      errors: ["Kunde inte skapa mötesförhandsgranskningen."]
    });
  }
});

app.listen(port, () => {
  console.log(`Föreningsadmin backend lyssnar på http://localhost:${port}`);
});
