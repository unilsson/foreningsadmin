import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  getMeeting,
  removeMeetingDocumentMetadata,
  setMeetingDocumentMetadata
} from "./meeting-store.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const meetingFilesRoot = path.join(projectRoot, "data", "meeting-files");

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".odt", "application/vnd.oasis.opendocument.text"]
]);

function meetingFilesDir(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id ?? ""))) {
    throw new Error("Ogiltigt mötes-ID.");
  }
  return path.join(meetingFilesRoot, id);
}

function cleanFilename(value) {
  const filename = path.basename(String(value ?? "").trim()).replace(/[\u0000-\u001f\u007f]/g, "");
  if (!filename) throw new Error("Filnamn saknas.");
  if (filename.length > 200) throw new Error("Filnamnet är för långt.");
  return filename;
}

function fileTypeFromName(filename) {
  const extension = path.extname(filename).toLowerCase();
  const mimeType = ALLOWED_TYPES.get(extension);
  if (!mimeType) {
    throw new Error("Protokollet måste vara en PDF-, DOCX- eller ODT-fil.");
  }
  return { extension, mimeType };
}

function protocolFromMeeting(meeting) {
  return (meeting?.documents ?? []).find((document) => document.type === "protocol") ?? null;
}

async function safeUnlink(filename) {
  try {
    await unlink(filename);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function saveProtocolDocument(meetingId, { buffer, originalFilename }) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return null;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Den uppladdade filen är tom.");
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Protokollet får vara högst 20 MB.");
  }

  const filename = cleanFilename(originalFilename);
  const { extension, mimeType } = fileTypeFromName(filename);
  const previous = protocolFromMeeting(meeting);
  const id = randomUUID();
  const storedFilename = `${id}${extension}`;
  const directory = meetingFilesDir(meetingId);
  const destination = path.join(directory, storedFilename);
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, buffer);
  await rename(temporary, destination);

  const document = {
    id,
    type: "protocol",
    originalFilename: filename,
    storedFilename,
    mimeType,
    size: buffer.length,
    uploadedAt: new Date().toISOString()
  };

  try {
    const updatedMeeting = await setMeetingDocumentMetadata(meetingId, document);
    if (previous?.storedFilename && previous.storedFilename !== storedFilename) {
      await safeUnlink(path.join(directory, path.basename(previous.storedFilename)));
    }
    return { meeting: updatedMeeting, document };
  } catch (error) {
    await safeUnlink(destination);
    throw error;
  }
}

export async function loadProtocolDocument(meetingId) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return null;

  const document = protocolFromMeeting(meeting);
  if (!document) return { meeting, document: null, buffer: null };

  const filename = path.join(meetingFilesDir(meetingId), path.basename(document.storedFilename));
  try {
    return {
      meeting,
      document,
      buffer: await readFile(filename)
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Protokollfilen saknas på disken.");
    }
    throw error;
  }
}

export async function deleteProtocolDocument(meetingId) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return null;

  const document = protocolFromMeeting(meeting);
  if (!document) return { meeting, deleted: false };

  const updatedMeeting = await removeMeetingDocumentMetadata(meetingId, "protocol");
  await safeUnlink(
    path.join(meetingFilesDir(meetingId), path.basename(document.storedFilename))
  );

  return { meeting: updatedMeeting, deleted: true };
}
