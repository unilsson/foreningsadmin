import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import {
  backupsDir,
  dataDir,
  legacyBoardFile,
  stateRoot,
  tempDir
} from "../runtime/paths.mjs";

export const BACKUP_FORMAT = "foreningsadmin-backup";
export const BACKUP_VERSION = 1;

const MAX_FILE_COUNT = 10_000;
const MAX_RESTORE_BYTES = 400 * 1024 * 1024;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function posixRelative(parent, child) {
  return path.relative(parent, child).split(path.sep).join("/");
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function walkFiles(directory, root = directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath, root));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === ".gitkeep" || entry.name.endsWith(".tmp")) continue;
    files.push({ fullPath, relativePath: posixRelative(root, fullPath) });
  }
  return files;
}

async function sourceFiles() {
  const files = (await walkFiles(dataDir, stateRoot)).map((file) => ({
    fullPath: file.fullPath,
    relativePath: file.relativePath
  }));

  if (await exists(legacyBoardFile)) {
    files.push({ fullPath: legacyBoardFile, relativePath: "config/board.json" });
  }

  return files;
}

export async function getBackupStatus() {
  const files = await sourceFiles();
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += (await stat(file.fullPath)).size;
  }
  return {
    fileCount: files.length,
    totalBytes,
    includes: ["data/", ...(files.some((file) => file.relativePath === "config/board.json") ? ["config/board.json"] : [])],
    excludesSecrets: true
  };
}

export async function createBackupDocument() {
  const sources = await sourceFiles();
  const files = [];
  let totalBytes = 0;

  for (const file of sources) {
    const buffer = await readFile(file.fullPath);
    totalBytes += buffer.length;
    files.push({
      path: file.relativePath,
      encoding: "base64",
      size: buffer.length,
      sha256: sha256(buffer),
      data: buffer.toString("base64")
    });
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    application: "Föreningsadmin",
    createdAt: new Date().toISOString(),
    scope: "local-data",
    fileCount: files.length,
    totalBytes,
    files
  };
}

function safeBackupPath(value) {
  if (typeof value !== "string" || !value || value.length > 512) return false;
  if (value.includes("\\") || value.startsWith("/") || value.includes("\0")) return false;
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) return false;
  return normalized.startsWith("data/") || normalized === "config/board.json";
}

export function validateBackupDocument(document) {
  if (!document || typeof document !== "object") throw new Error("Backupfilen innehåller inte giltig JSON-data.");
  if (document.format !== BACKUP_FORMAT) throw new Error("Filen är inte en Föreningsadmin-backup.");
  if (document.version !== BACKUP_VERSION) throw new Error(`Backupversion ${document.version ?? "okänd"} stöds inte.`);
  if (document.scope !== "local-data") throw new Error("Backupfilen har ett okänt dataomfång.");
  if (!Array.isArray(document.files)) throw new Error("Backupfilen saknar fillista.");
  if (document.files.length > MAX_FILE_COUNT) throw new Error("Backupfilen innehåller för många filer.");

  const seen = new Set();
  const files = [];
  let totalBytes = 0;

  for (const file of document.files) {
    if (!safeBackupPath(file?.path)) throw new Error("Backupfilen innehåller en ogiltig filsökväg.");
    if (seen.has(file.path)) throw new Error(`Backupfilen innehåller filen ${file.path} flera gånger.`);
    seen.add(file.path);
    if (file.encoding !== "base64" || typeof file.data !== "string") {
      throw new Error(`Filen ${file.path} har ett format som inte stöds.`);
    }

    const buffer = Buffer.from(file.data, "base64");
    if (!Number.isSafeInteger(file.size) || file.size < 0 || buffer.length !== file.size) {
      throw new Error(`Storleken för ${file.path} stämmer inte.`);
    }
    if (typeof file.sha256 !== "string" || sha256(buffer) !== file.sha256) {
      throw new Error(`Kontrollsumman för ${file.path} stämmer inte.`);
    }

    totalBytes += buffer.length;
    if (totalBytes > MAX_RESTORE_BYTES) throw new Error("Backupfilen är för stor för återställning i webbappen.");
    files.push({ path: file.path, buffer });
  }

  if (Number.isSafeInteger(document.fileCount) && document.fileCount !== files.length) {
    throw new Error("Antalet filer i backupens metadata stämmer inte.");
  }
  if (Number.isSafeInteger(document.totalBytes) && document.totalBytes !== totalBytes) {
    throw new Error("Backupens angivna datamängd stämmer inte.");
  }

  return {
    createdAt: typeof document.createdAt === "string" ? document.createdAt : null,
    files,
    fileCount: files.length,
    totalBytes
  };
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function restoreBackupDocument(document) {
  const validated = validateBackupDocument(document);
  const stagingRoot = path.join(tempDir, `restore-${randomUUID()}`);
  const stagingData = path.join(stagingRoot, "data");
  const stagingLegacyBoard = path.join(stagingRoot, "config", "board.json");
  await mkdir(stagingData, { recursive: true });

  try {
    for (const file of validated.files) {
      const destination = path.join(stagingRoot, ...file.path.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.buffer);
    }

    // Keep an empty marker so the data directory also survives a restore that
    // contains no ordinary data files.
    await writeFile(path.join(stagingData, ".gitkeep"), "", "utf8");

    await mkdir(backupsDir, { recursive: true });
    const safetyName = `pre-restore-${timestampForPath()}`;
    const safetyRoot = path.join(backupsDir, safetyName);
    const safetyData = path.join(safetyRoot, "data");
    const safetyLegacyBoard = path.join(safetyRoot, "config", "board.json");
    const hadExistingData = await exists(dataDir);
    const hadLegacyBoard = await exists(legacyBoardFile);
    const hasRestoredLegacyBoard = await exists(stagingLegacyBoard);

    await mkdir(safetyRoot, { recursive: true });
    if (hadExistingData) await rename(dataDir, safetyData);
    if (hadLegacyBoard) {
      await mkdir(path.dirname(safetyLegacyBoard), { recursive: true });
      await rename(legacyBoardFile, safetyLegacyBoard);
    }

    try {
      await rename(stagingData, dataDir);
      if (hasRestoredLegacyBoard) {
        await mkdir(path.dirname(legacyBoardFile), { recursive: true });
        await rename(stagingLegacyBoard, legacyBoardFile);
      }
    } catch (error) {
      await rm(dataDir, { recursive: true, force: true });
      await rm(legacyBoardFile, { force: true });
      if (hadExistingData && await exists(safetyData)) await rename(safetyData, dataDir);
      if (hadLegacyBoard && await exists(safetyLegacyBoard)) {
        await mkdir(path.dirname(legacyBoardFile), { recursive: true });
        await rename(safetyLegacyBoard, legacyBoardFile);
      }
      throw error;
    }

    await rm(stagingRoot, { recursive: true, force: true });
    const hadPreviousLocalData = hadExistingData || hadLegacyBoard;
    if (!hadPreviousLocalData) await rm(safetyRoot, { recursive: true, force: true });

    return {
      restoredFrom: validated.createdAt,
      fileCount: validated.fileCount,
      totalBytes: validated.totalBytes,
      safetyBackup: hadPreviousLocalData ? safetyName : null
    };
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}
