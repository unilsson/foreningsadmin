import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { googleFetch } from "./google-client.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const settingsPath = path.join(projectRoot, "data/google-calendar.json");
const calendarBase = "https://www.googleapis.com/calendar/v3";
const writableRoles = new Set(["writer", "owner", "writerWithoutPrivateAccess"]);

async function readSettings() {
  try {
    return JSON.parse(await readFile(settingsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeSettings(settings) {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function getSelectedCalendarId() {
  return (await readSettings()).calendarId ?? null;
}

export async function listWritableCalendars() {
  const response = await googleFetch(`${calendarBase}/users/me/calendarList?maxResults=250&showHidden=false`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Kunde inte läsa Google-kalendrar.");

  return (payload.items ?? [])
    .filter((calendar) => writableRoles.has(calendar.accessRole))
    .map((calendar) => ({
      id: calendar.id,
      summary: calendar.summary,
      primary: Boolean(calendar.primary),
      accessRole: calendar.accessRole,
      timeZone: calendar.timeZone ?? null
    }))
    .sort((a, b) => a.summary.localeCompare(b.summary, "sv"));
}

export async function saveSelectedCalendarId(calendarId) {
  const calendar = (await listWritableCalendars()).find((item) => item.id === calendarId);
  if (!calendar) throw new Error("Den valda kalendern finns inte eller saknar skrivrättighet.");
  await writeSettings({ calendarId });
  return calendar;
}

export async function createCalendarEvent({ meeting, attendees }) {
  const calendarId = await getSelectedCalendarId();
  if (!calendarId) throw new Error("Ingen Google-kalender är vald.");

  const selectedCalendar = (await listWritableCalendars()).find((item) => item.id === calendarId);
  if (!selectedCalendar) throw new Error("Den valda kalendern finns inte längre eller saknar skrivrättighet.");

  const timeZone = selectedCalendar.timeZone || "Europe/Stockholm";
  const event = {
    summary: meeting.title,
    description: meeting.calendarDescription,
    location: meeting.location,
    start: { dateTime: `${meeting.date}T${meeting.startTime}:00`, timeZone },
    end: { dateTime: `${meeting.date}T${meeting.endTime}:00`, timeZone },
    attendees: attendees.map((member) => ({ email: member.email }))
  };

  const response = await googleFetch(`${calendarBase}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Kunde inte skapa kalenderhändelsen.");

  return {
    id: payload.id,
    htmlLink: payload.htmlLink,
    status: payload.status,
    calendar: selectedCalendar
  };
}
