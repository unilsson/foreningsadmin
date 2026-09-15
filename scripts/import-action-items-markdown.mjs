import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = process.argv[2];
const force = process.argv.includes("--force");

if (!sourcePath) {
  console.error("Användning: node scripts/import-action-items-markdown.mjs <fil.md> [--force]");
  process.exit(1);
}

const targetPath = path.resolve("data/action-items.json");

try {
  await access(targetPath);
  if (!force) {
    console.error(`${targetPath} finns redan. Använd --force endast om filen ska ersättas.`);
    process.exit(1);
  }
} catch {
  // Filen finns inte ännu.
}

const markdown = await readFile(path.resolve(sourcePath), "utf8");
const lines = markdown.split(/\r?\n/);

const statusMap = new Map([
  ["Ej påbörjad", "not_started"],
  ["Pågår", "in_progress"],
  ["Väntar", "waiting"],
  ["Klart", "completed"]
]);

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((value) => value.trim().replace(/\\\|/g, "|"));
}

function isDivider(values) {
  return values.every((value) => /^:?-{3,}:?$/.test(value));
}

function splitResponsible(value) {
  return value.split(",").map((name) => name.trim()).filter(Boolean);
}

function completedTimestamp(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T12:00:00.000Z`;
}

function tableAfterHeading(heading) {
  const start = lines.findIndex((line) => line.trim().toLowerCase() === heading.toLowerCase());
  if (start < 0) return [];
  const rows = [];
  let inTable = false;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith("## ") && inTable) break;
    if (!line.trim().startsWith("|")) {
      if (inTable && line.trim()) break;
      continue;
    }
    inTable = true;
    const values = cells(line);
    if (values[0] === "Nr" || isDivider(values)) continue;
    if (!values[0] || !values[1]) continue;
    rows.push(values);
  }
  return rows;
}

const now = new Date().toISOString();
const items = [];

for (const row of tableAfterHeading("## **Pågående åtgärder**")) {
  const [number, title, responsible, decided, dueDate, status, comment] = row;
  items.push({
    id: randomUUID(),
    number,
    title,
    responsible: splitResponsible(responsible),
    decided,
    meetingId: null,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : "",
    status: statusMap.get(status) ?? "not_started",
    comment,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  });
}

for (const row of tableAfterHeading("## **Avslutade åtgärder**")) {
  const [number, title, responsible, decided, completed, comment] = row;
  items.push({
    id: randomUUID(),
    number,
    title,
    responsible: splitResponsible(responsible),
    decided,
    meetingId: null,
    dueDate: "",
    status: "completed",
    comment,
    createdAt: now,
    updatedAt: now,
    completedAt: completedTimestamp(completed) ?? now
  });
}

await mkdir(path.dirname(targetPath), { recursive: true });
await writeFile(targetPath, `${JSON.stringify({ updatedAt: now, items }, null, 2)}\n`, "utf8");
console.log(`Importerade ${items.length} åtgärdspunkter till ${targetPath}.`);
