import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const dataDir = path.join(projectRoot, "data");
const dataFile = path.join(dataDir, "events.json");

export const EVENT_STATUSES = ["not_started", "planning", "ready", "completed"];
const VALID_STATUSES = new Set(EVENT_STATUSES);
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanDate(value) {
  const date = cleanText(value);
  if (!date) throw new Error("Evenemanget måste ha ett datum.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Datum måste anges som ÅÅÅÅ-MM-DD.");
  return date;
}

function cleanTime(value) {
  const time = cleanText(value);
  if (!time) return "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Tid måste anges som HH:MM.");
  return time;
}

function cleanStatus(value) {
  const status = cleanText(value) || "not_started";
  if (!VALID_STATUSES.has(status)) throw new Error("Ogiltig evenemangsstatus.");
  return status;
}

function normalizeAfterEvent(value = {}) {
  return {
    visitors: cleanText(value?.visitors),
    workedWell: cleanText(value?.workedWell),
    improvements: cleanText(value?.improvements),
    financialResult: cleanText(value?.financialResult),
    otherExperience: cleanText(value?.otherExperience)
  };
}

function normalizeInput(input, previous = null) {
  const title = cleanText(input?.title ?? previous?.title);
  if (!title) throw new Error("Evenemanget måste ha ett namn.");

  return {
    date: cleanDate(input?.date ?? previous?.date),
    startTime: cleanTime(input?.startTime ?? previous?.startTime),
    endTime: cleanTime(input?.endTime ?? previous?.endTime),
    title,
    location: cleanText(input?.location ?? previous?.location),
    mainResponsible: cleanText(input?.mainResponsible ?? previous?.mainResponsible),
    staffing: cleanText(input?.staffing ?? previous?.staffing),
    practicalPreparations: cleanText(input?.practicalPreparations ?? previous?.practicalPreparations),
    standardMarketing: Boolean(input?.standardMarketing ?? previous?.standardMarketing),
    marketingNotes: cleanText(input?.marketingNotes ?? previous?.marketingNotes),
    status: cleanStatus(input?.status ?? previous?.status),
    notes: cleanText(input?.notes ?? previous?.notes),
    afterEvent: normalizeAfterEvent(input?.afterEvent ?? previous?.afterEvent)
  };
}

function normalizeStoredItem(item) {
  const now = new Date().toISOString();
  return {
    id: ID_PATTERN.test(String(item?.id ?? "")) ? item.id : randomUUID(),
    ...normalizeInput(item),
    createdAt: cleanText(item?.createdAt) || now,
    updatedAt: cleanText(item?.updatedAt) || now
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await readFile(dataFile, "utf8"));
    return {
      updatedAt: parsed?.updatedAt ?? null,
      items: Array.isArray(parsed?.items) ? parsed.items.map(normalizeStoredItem) : []
    };
  } catch (error) {
    if (error.code === "ENOENT") return { updatedAt: null, items: [] };
    throw error;
  }
}

async function writeState(state) {
  await mkdir(dataDir, { recursive: true });
  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tempFile, dataFile);
}

function sorted(items) {
  return [...items].sort((a, b) => {
    const dateOrder = String(a.date).localeCompare(String(b.date));
    if (dateOrder !== 0) return dateOrder;
    return String(a.startTime || "00:00").localeCompare(String(b.startTime || "00:00"));
  });
}

export async function listEvents() {
  const state = await readState();
  return { ...state, items: sorted(state.items) };
}

export async function createEvent(input) {
  const state = await readState();
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    ...normalizeInput(input),
    createdAt: now,
    updatedAt: now
  };
  const next = { updatedAt: now, items: [...state.items, item] };
  await writeState(next);
  return { item, updatedAt: now };
}

export async function updateEvent(id, input) {
  if (!ID_PATTERN.test(String(id ?? ""))) throw new Error("Ogiltigt evenemangs-ID.");
  const state = await readState();
  const index = state.items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const now = new Date().toISOString();
  const item = {
    ...state.items[index],
    ...normalizeInput(input, state.items[index]),
    updatedAt: now
  };
  const items = [...state.items];
  items[index] = item;
  await writeState({ updatedAt: now, items });
  return { item, updatedAt: now };
}

export async function deleteEvent(id) {
  if (!ID_PATTERN.test(String(id ?? ""))) throw new Error("Ogiltigt evenemangs-ID.");
  const state = await readState();
  const items = state.items.filter((item) => item.id !== id);
  if (items.length === state.items.length) return false;
  await writeState({ updatedAt: new Date().toISOString(), items });
  return true;
}
