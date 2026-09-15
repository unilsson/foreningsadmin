import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const dataDir = path.join(projectRoot, "data");
const dataFile = path.join(dataDir, "action-items.json");

export const ACTION_STATUSES = ["not_started", "in_progress", "waiting", "completed"];
const VALID_STATUSES = new Set(ACTION_STATUSES);
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanResponsible(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function cleanDate(value) {
  const date = cleanText(value);
  if (!date) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Datum måste anges som ÅÅÅÅ-MM-DD.");
  return date;
}

function cleanMeetingId(value) {
  const meetingId = cleanText(value);
  if (!meetingId) return null;
  if (!ID_PATTERN.test(meetingId)) throw new Error("Ogiltigt mötes-ID.");
  return meetingId;
}

function cleanStatus(value) {
  const status = cleanText(value) || "not_started";
  if (!VALID_STATUSES.has(status)) throw new Error("Ogiltig status för åtgärdspunkten.");
  return status;
}

function normalizeStoredItem(item) {
  return {
    id: ID_PATTERN.test(String(item?.id ?? "")) ? item.id : randomUUID(),
    number: cleanText(item?.number),
    title: cleanText(item?.title),
    responsible: cleanResponsible(item?.responsible),
    decided: cleanText(item?.decided),
    meetingId: item?.meetingId ? cleanMeetingId(item.meetingId) : null,
    dueDate: item?.dueDate ? cleanDate(item.dueDate) : "",
    status: cleanStatus(item?.status),
    comment: cleanText(item?.comment),
    createdAt: cleanText(item?.createdAt) || new Date().toISOString(),
    updatedAt: cleanText(item?.updatedAt) || new Date().toISOString(),
    completedAt: item?.completedAt ? cleanText(item.completedAt) : null
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

function nextNumber(items) {
  const year = String(new Date().getFullYear()).slice(-2);
  let highest = 0;
  for (const item of items) {
    const match = String(item.number ?? "").match(new RegExp(`^${year}-(\\d{3})$`));
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${year}-${String(highest + 1).padStart(3, "0")}`;
}

function assertUniqueNumber(items, number, excludedId = null) {
  if (!number) return;
  const duplicate = items.find((item) => item.id !== excludedId && item.number === number);
  if (duplicate) throw new Error(`Åtgärdsnummer ${number} används redan.`);
}

function valueOrPrevious(input, key, previous) {
  return Object.prototype.hasOwnProperty.call(input ?? {}, key) ? input[key] : previous?.[key];
}

function normalizeInput(input, previous = null) {
  const title = cleanText(valueOrPrevious(input, "title", previous));
  if (!title) throw new Error("Åtgärden måste ha en beskrivning.");

  const status = cleanStatus(valueOrPrevious(input, "status", previous));
  const now = new Date().toISOString();
  let completedAt = previous?.completedAt ?? null;
  if (status === "completed" && !completedAt) completedAt = now;
  if (status !== "completed") completedAt = null;

  return {
    number: cleanText(valueOrPrevious(input, "number", previous)),
    title,
    responsible: cleanResponsible(valueOrPrevious(input, "responsible", previous)),
    decided: cleanText(valueOrPrevious(input, "decided", previous)),
    meetingId: cleanMeetingId(valueOrPrevious(input, "meetingId", previous)),
    dueDate: cleanDate(valueOrPrevious(input, "dueDate", previous)),
    status,
    comment: cleanText(valueOrPrevious(input, "comment", previous)),
    completedAt
  };
}

export async function listActionItems() {
  return readState();
}

export async function createActionItem(input) {
  const state = await readState();
  const normalized = normalizeInput(input);
  const now = new Date().toISOString();
  const number = normalized.number || nextNumber(state.items);
  assertUniqueNumber(state.items, number);

  const item = {
    id: randomUUID(),
    ...normalized,
    number,
    createdAt: now,
    updatedAt: now
  };

  const next = { updatedAt: now, items: [...state.items, item] };
  await writeState(next);
  return { item, updatedAt: next.updatedAt };
}

export async function updateActionItem(id, input) {
  if (!ID_PATTERN.test(String(id ?? ""))) throw new Error("Ogiltigt åtgärds-ID.");
  const state = await readState();
  const index = state.items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const previous = state.items[index];
  const normalized = normalizeInput(input, previous);
  const number = normalized.number || previous.number || nextNumber(state.items);
  assertUniqueNumber(state.items, number, id);
  const now = new Date().toISOString();

  const item = {
    ...previous,
    ...normalized,
    number,
    updatedAt: now
  };
  const items = [...state.items];
  items[index] = item;
  await writeState({ updatedAt: now, items });
  return { item, updatedAt: now };
}

export async function deleteActionItem(id) {
  if (!ID_PATTERN.test(String(id ?? ""))) throw new Error("Ogiltigt åtgärds-ID.");
  const state = await readState();
  const items = state.items.filter((item) => item.id !== id);
  if (items.length === state.items.length) return false;
  await writeState({ updatedAt: new Date().toISOString(), items });
  return true;
}
