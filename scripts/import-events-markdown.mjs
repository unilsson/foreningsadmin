import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const outputFile = path.join(projectRoot, "data", "events.json");

const monthMap = {
  jan: "01", januari: "01",
  feb: "02", februari: "02",
  mar: "03", mars: "03",
  apr: "04", april: "04",
  maj: "05",
  jun: "06", juni: "06",
  jul: "07", juli: "07",
  aug: "08", augusti: "08",
  sep: "09", sept: "09", september: "09",
  okt: "10", oktober: "10",
  nov: "11", november: "11",
  dec: "12", december: "12"
};

const statusMap = new Map([
  ["ej påbörjad", "not_started"],
  ["planering pågår", "planning"],
  ["klart för genomförande", "ready"],
  ["genomfört", "completed"]
]);

function cleanCell(value) {
  return String(value ?? "").trim().replaceAll("\\|", "|");
}

function parseDate(value, year) {
  const match = cleanCell(value).toLowerCase().match(/^(\d{1,2})\s+([a-zåäö]+)$/i);
  if (!match) throw new Error(`Kunde inte tolka datumet "${value}".`);
  const month = monthMap[match[2]];
  if (!month) throw new Error(`Okänd månad i datumet "${value}".`);
  return `${year}-${month}-${String(Number(match[1])).padStart(2, "0")}`;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(cleanCell);
}

function isSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replaceAll(" ", "")));
}

function marketing(value) {
  const text = cleanCell(value);
  const standardPattern = /^Vanliga rutiner för evenemang\.?(?:\s+|$)/i;
  if (!standardPattern.test(text)) return { standardMarketing: false, marketingNotes: text };
  return {
    standardMarketing: true,
    marketingNotes: text.replace(standardPattern, "").trim()
  };
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const sourceArg = args.find((arg) => !arg.startsWith("--"));

if (!sourceArg) {
  console.error("Användning: node scripts/import-events-markdown.mjs <Evenemangslista.md> [--force]");
  process.exit(1);
}

try {
  if (!force) {
    await stat(outputFile);
    console.error(`Avbryter: ${outputFile} finns redan. Använd --force om testdata får skrivas över.`);
    process.exit(1);
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const markdown = await readFile(path.resolve(sourceArg), "utf8");
const yearMatch = markdown.match(/\*\*Period:\*\*[^\n]*(20\d{2})/i);
const year = yearMatch?.[1] ?? String(new Date().getFullYear());
const lines = markdown.split(/\r?\n/);
const headingIndex = lines.findIndex((line) => /^\|\s*\*\*Datum\*\*/i.test(line));
if (headingIndex < 0) throw new Error("Kunde inte hitta tabellen med kommande evenemang.");

const rows = [];
for (const line of lines.slice(headingIndex + 1)) {
  if (!line.trim().startsWith("|")) {
    if (rows.length) break;
    continue;
  }
  const cells = splitRow(line);
  if (isSeparatorRow(cells)) continue;
  if (cells.length < 7) continue;
  if (!cells[0] && !cells[1]) continue;
  rows.push(cells);
}

const now = new Date().toISOString();
const items = rows.map((cells) => {
  const [dateText, title, mainResponsible, staffing, practicalPreparations, marketingText, statusText] = cells;
  const marketingFields = marketing(marketingText);
  return {
    id: randomUUID(),
    date: parseDate(dateText, year),
    startTime: "",
    endTime: "",
    title,
    location: "",
    mainResponsible,
    staffing,
    practicalPreparations,
    ...marketingFields,
    status: statusMap.get(statusText.toLowerCase()) ?? "not_started",
    notes: "",
    afterEvent: {
      visitors: "",
      workedWell: "",
      improvements: "",
      financialResult: "",
      otherExperience: ""
    },
    createdAt: now,
    updatedAt: now
  };
});

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify({ updatedAt: now, items }, null, 2)}\n`, "utf8");
console.log(`Importerade ${items.length} evenemang för ${year} till data/events.json.`);
