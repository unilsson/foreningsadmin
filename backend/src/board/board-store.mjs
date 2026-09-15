import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const dataDir = path.join(projectRoot, "data");
const boardPath = path.join(dataDir, "board.json");
const historyPath = path.join(dataDir, "board-history.jsonl");
const legacyBoardPath = path.join(projectRoot, "config/board.json");

async function readJsonIfExists(filename) {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function fallbackId(member, index) {
  const seed = `${String(member?.email ?? "").trim().toLowerCase()}|${String(member?.name ?? "").trim()}|${index}`;
  return `legacy-${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
}

function normalizeMember(member, index) {
  const id = String(member?.id ?? "").trim() || fallbackId(member, index);

  return {
    id,
    name: String(member?.name ?? "").trim(),
    email: String(member?.email ?? "").trim(),
    role: String(member?.role ?? "").trim(),
    active: member?.active === true
  };
}

function validateMembers(input) {
  if (!Array.isArray(input)) {
    throw new Error("Styrelsen måste innehålla en lista med medlemmar.");
  }

  const members = input.map(normalizeMember);
  const ids = new Set();
  const emails = new Set();

  for (const member of members) {
    if (!member.name) throw new Error("Alla styrelsemedlemmar måste ha ett namn.");
    if (!member.role) throw new Error(`${member.name} måste ha en roll.`);
    if (!member.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
      throw new Error(`${member.name} måste ha en giltig e-postadress.`);
    }

    if (ids.has(member.id)) throw new Error("Varje styrelsemedlem måste ha ett unikt ID.");
    ids.add(member.id);

    const normalizedEmail = member.email.toLowerCase();
    if (emails.has(normalizedEmail)) {
      throw new Error(`E-postadressen ${member.email} används av flera personer.`);
    }
    emails.add(normalizedEmail);
  }

  return members;
}

function describeChanges(before, after) {
  const changes = [];
  const beforeById = new Map(before.map((member) => [member.id, member]));
  const afterById = new Map(after.map((member) => [member.id, member]));

  for (const member of after) {
    const previous = beforeById.get(member.id);
    if (!previous) {
      changes.push(`Lade till ${member.name}.`);
      continue;
    }

    if (previous.name !== member.name) changes.push(`Ändrade namn från ${previous.name} till ${member.name}.`);
    if (previous.email !== member.email) changes.push(`Ändrade e-post för ${member.name}.`);
    if (previous.role !== member.role) changes.push(`Ändrade roll för ${member.name} från ${previous.role} till ${member.role}.`);
    if (previous.active !== member.active) {
      changes.push(`${member.name} markerades som ${member.active ? "aktiv" : "inaktiv"}.`);
    }
  }

  for (const member of before) {
    if (!afterById.has(member.id)) changes.push(`Tog bort ${member.name}.`);
  }

  const beforeOrder = before.map((member) => member.id).join("|");
  const afterOrder = after.map((member) => member.id).join("|");
  if (beforeOrder !== afterOrder && before.length === after.length) {
    changes.push("Ändrade ordningen på styrelsemedlemmarna.");
  }

  return changes.length ? changes : ["Sparade styrelsen utan innehållsändringar."];
}

async function appendHistory(entry) {
  await mkdir(dataDir, { recursive: true });
  await appendFile(historyPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function loadBoardState() {
  const local = await readJsonIfExists(boardPath);
  if (local) {
    return {
      members: validateMembers(local.members),
      source: "local"
    };
  }

  const legacy = await readJsonIfExists(legacyBoardPath);
  if (legacy) {
    return {
      members: validateMembers(legacy.members),
      source: "legacy"
    };
  }

  return { members: [], source: "empty" };
}

export async function loadActiveBoard() {
  const board = await loadBoardState();
  return {
    members: board.members.filter((member) => member.active)
  };
}

export async function saveBoardState(input) {
  const previous = await loadBoardState();
  const members = validateMembers(input?.members).map((member) => ({
    ...member,
    id: member.id || randomUUID()
  }));

  await mkdir(dataDir, { recursive: true });
  await writeFile(boardPath, `${JSON.stringify({ members }, null, 2)}\n`, "utf8");
  await appendHistory({
    timestamp: new Date().toISOString(),
    action: "save",
    changes: describeChanges(previous.members, members)
  });

  return { members, source: "local" };
}

export async function loadBoardHistory(limit = 50) {
  try {
    const content = await readFile(historyPath, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .slice(-limit)
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
