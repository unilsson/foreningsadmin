import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const dataDir = path.join(projectRoot, "data");
const meetingsDir = path.join(dataDir, "meetings");
const meetingFilesDir = path.join(dataDir, "meeting-files");

const VALID_STATUSES = new Set(["planned", "completed", "cancelled"]);
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertMeetingId(id) {
  if (!ID_PATTERN.test(String(id ?? ""))) {
    throw new Error("Ogiltigt mötes-ID.");
  }
  return String(id);
}

function meetingPath(id) {
  return path.join(meetingsDir, `${assertMeetingId(id)}.json`);
}

function meetingDocumentsPath(id) {
  return path.join(meetingFilesDir, assertMeetingId(id));
}

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeAgenda(agenda) {
  return {
    title: String(agenda?.title ?? "Dagordning").trim() || "Dagordning",
    beforeMeetingItems: cleanItems(agenda?.beforeMeetingItems),
    meetingItems: cleanItems(agenda?.meetingItems),
    afterMeetingItems: cleanItems(agenda?.afterMeetingItems)
  };
}

function normalizeMeeting(meeting) {
  return {
    date: String(meeting?.date ?? "").trim(),
    startTime: String(meeting?.startTime ?? "").trim(),
    endTime: String(meeting?.endTime ?? "").trim(),
    location: String(meeting?.location ?? "").trim()
  };
}

function normalizeStatus(status) {
  const value = String(status ?? "planned").trim();
  if (!VALID_STATUSES.has(value)) {
    throw new Error("Ogiltig mötesstatus.");
  }
  return value;
}

function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((document) => document && typeof document === "object")
    .map((document) => ({
      id: String(document.id ?? "").trim(),
      type: String(document.type ?? "").trim(),
      originalFilename: String(document.originalFilename ?? "").trim(),
      storedFilename: String(document.storedFilename ?? "").trim(),
      mimeType: String(document.mimeType ?? "application/octet-stream").trim(),
      size: Number(document.size ?? 0),
      uploadedAt: String(document.uploadedAt ?? "").trim()
    }))
    .filter((document) => document.id && document.type && document.storedFilename);
}

async function writeAtomic(filename, value) {
  await mkdir(meetingsDir, { recursive: true });
  const temp = `${filename}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temp, filename);
}

async function readMeeting(id) {
  try {
    const record = JSON.parse(await readFile(meetingPath(id), "utf8"));
    return {
      ...record,
      documents: normalizeDocuments(record.documents)
    };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function toSummary(record) {
  return {
    id: record.id,
    status: record.status,
    meeting: record.meeting,
    documents: normalizeDocuments(record.documents),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function listMeetings() {
  await mkdir(meetingsDir, { recursive: true });
  const files = (await readdir(meetingsDir)).filter((name) => name.endsWith(".json"));
  const records = [];

  for (const filename of files) {
    try {
      const record = JSON.parse(await readFile(path.join(meetingsDir, filename), "utf8"));
      if (record?.id && record?.meeting?.date) records.push(toSummary(record));
    } catch (error) {
      console.error(`Kunde inte läsa mötesfilen ${filename}:`, error.message);
    }
  }

  return records.sort((a, b) => {
    const dateOrder = String(b.meeting.date).localeCompare(String(a.meeting.date));
    if (dateOrder !== 0) return dateOrder;
    return String(b.meeting.startTime).localeCompare(String(a.meeting.startTime));
  });
}

export async function getMeeting(id) {
  return readMeeting(id);
}

export async function createMeetingRecord({ meeting, agenda, status = "planned" }) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    status: normalizeStatus(status),
    meeting: normalizeMeeting(meeting),
    agenda: normalizeAgenda(agenda),
    documents: [],
    createdAt: now,
    updatedAt: now
  };

  await writeAtomic(meetingPath(record.id), record);
  return record;
}

export async function updateMeetingRecord(id, { meeting, agenda, status }) {
  const previous = await readMeeting(id);
  if (!previous) return null;

  const record = {
    ...previous,
    status: normalizeStatus(status ?? previous.status),
    meeting: normalizeMeeting(meeting ?? previous.meeting),
    agenda: normalizeAgenda(agenda ?? previous.agenda),
    documents: normalizeDocuments(previous.documents),
    updatedAt: new Date().toISOString()
  };

  await writeAtomic(meetingPath(id), record);
  return record;
}

export async function setMeetingDocumentMetadata(id, document) {
  const previous = await readMeeting(id);
  if (!previous) return null;

  const documents = normalizeDocuments(previous.documents).filter(
    (item) => item.type !== document.type
  );
  documents.push(document);

  const record = {
    ...previous,
    documents: normalizeDocuments(documents),
    updatedAt: new Date().toISOString()
  };
  await writeAtomic(meetingPath(id), record);
  return record;
}

export async function removeMeetingDocumentMetadata(id, type) {
  const previous = await readMeeting(id);
  if (!previous) return null;

  const record = {
    ...previous,
    documents: normalizeDocuments(previous.documents).filter(
      (document) => document.type !== type
    ),
    updatedAt: new Date().toISOString()
  };
  await writeAtomic(meetingPath(id), record);
  return record;
}

export async function deleteMeetingRecord(id) {
  const validatedId = assertMeetingId(id);
  try {
    await unlink(meetingPath(validatedId));
    await rm(meetingDocumentsPath(validatedId), { recursive: true, force: true });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
