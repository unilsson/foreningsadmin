import express from "express";
import { loadConfig } from "./config/load-config.mjs";
import { loadBoard } from "./config/load-board.mjs";
import { createMeetingPreview } from "./meetings/preview.mjs";
import { renderTemplate } from "./templates/render.mjs";
import {
  clearGoogleToken,
  consumeOAuthState,
  createAuthorizationUrl,
  exchangeAuthorizationCode,
  getExpectedGoogleAccount,
  getGoogleAccount,
  isGoogleConfigured,
  loadToken
} from "./google/google-client.mjs";
import {
  createCalendarEvent,
  getSelectedCalendarId,
  listWritableCalendars,
  saveSelectedCalendarId
} from "./google/calendar.mjs";

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const config = await loadConfig();
const board = await loadBoard();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "foreningsadmin-backend" });
});

app.get("/api/config", (_req, res) => {
  res.json(config);
});

app.get("/api/board", (_req, res) => {
  res.json(board);
});

app.get("/api/google/status", async (_req, res) => {
  const configured = isGoogleConfigured();
  const token = configured ? await loadToken() : null;

  if (!configured || !token) {
    return res.json({
      configured,
      connected: false,
      expectedEmail: getExpectedGoogleAccount(),
      selectedCalendarId: null
    });
  }

  try {
    const account = await getGoogleAccount();
    res.json({
      configured: true,
      connected: true,
      account,
      expectedEmail: getExpectedGoogleAccount(),
      selectedCalendarId: await getSelectedCalendarId()
    });
  } catch (error) {
    res.json({
      configured: true,
      connected: false,
      expectedEmail: getExpectedGoogleAccount(),
      selectedCalendarId: null,
      error: error.message
    });
  }
});

app.get("/api/google/auth", (_req, res) => {
  try {
    res.redirect(createAuthorizationUrl());
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/api/google/oauth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${frontendUrl}/?google=error&message=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state || !consumeOAuthState(String(state))) {
    return res.status(400).send("Ogiltigt eller utgånget OAuth-svar.");
  }

  try {
    await exchangeAuthorizationCode(String(code));
    const account = await getGoogleAccount();
    const expectedEmail = getExpectedGoogleAccount();

    if (expectedEmail && account.email?.toLowerCase() !== expectedEmail.toLowerCase()) {
      await clearGoogleToken();
      return res.redirect(
        `${frontendUrl}/?google=wrong-account&message=${encodeURIComponent(
          `Fel Google-konto. Logga in med ${expectedEmail}.`
        )}`
      );
    }

    res.redirect(`${frontendUrl}/?google=connected`);
  } catch (oauthError) {
    res.redirect(
      `${frontendUrl}/?google=error&message=${encodeURIComponent(oauthError.message)}`
    );
  }
});

app.get("/api/google/calendars", async (_req, res) => {
  try {
    const calendars = await listWritableCalendars();
    res.json({
      calendars,
      selectedCalendarId: await getSelectedCalendarId()
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/google/calendar-selection", async (req, res) => {
  try {
    const calendarId = String(req.body?.calendarId ?? "");
    if (!calendarId) {
      return res.status(400).json({ ok: false, error: "Ingen kalender valdes." });
    }

    const calendar = await saveSelectedCalendarId(calendarId);
    res.json({ ok: true, calendar });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/google/calendar/events", async (req, res) => {
  const result = createMeetingPreview(req.body, config);
  if (!result.ok) {
    return res.status(400).json(result);
  }

  try {
    const calendarDescription = await renderTemplate(
      "templates/calendar/styrelsemote.txt",
      result.meeting
    );

    const meeting = {
      ...result.meeting,
      calendarDescription
    };

    const event = await createCalendarEvent({
      meeting,
      attendees: board.members
    });

    res.json({ ok: true, event });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
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
