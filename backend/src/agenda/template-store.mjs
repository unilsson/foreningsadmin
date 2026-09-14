import { appendFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const dataDir = path.join(projectRoot, "data");
const activeAgendaPath = path.join(dataDir, "agenda.json");
const historyPath = path.join(dataDir, "agenda-history.jsonl");

function cleanItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizeTemplate(input) {
  const template = {
    title: String(input?.title ?? "").trim(),
    beforeMeetingItems: cleanItems(input?.beforeMeetingItems),
    afterMeetingItems: cleanItems(input?.afterMeetingItems)
  };

  if (!template.title) {
    throw new Error("Dagordningsmallen måste ha en rubrik.");
  }

  if (template.beforeMeetingItems.length + template.afterMeetingItems.length === 0) {
    throw new Error("Dagordningsmallen måste innehålla minst en standardpunkt.");
  }

  return template;
}

function withoutMetadata(template) {
  return {
    title: template.title,
    beforeMeetingItems: [...template.beforeMeetingItems],
    afterMeetingItems: [...template.afterMeetingItems]
  };
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function describeChanges(previous, next) {
  const changes = [];

  if (previous.title !== next.title) {
    changes.push(`Rubriken ändrades från ”${previous.title}” till ”${next.title}”.`);
  }

  if (JSON.stringify(previous.beforeMeetingItems) !== JSON.stringify(next.beforeMeetingItems)) {
    changes.push(
      `Standardpunkter före mötesspecifika ärenden ändrades (${previous.beforeMeetingItems.length} → ${next.beforeMeetingItems.length} punkter).`
    );
  }

  if (JSON.stringify(previous.afterMeetingItems) !== JSON.stringify(next.afterMeetingItems)) {
    changes.push(
      `Standardpunkter efter mötesspecifika ärenden ändrades (${previous.afterMeetingItems.length} → ${next.afterMeetingItems.length} punkter).`
    );
  }

  return changes.length > 0 ? changes : ["Mallen sparades utan innehållsförändringar."];
}

async function appendHistory(entry) {
  await mkdir(dataDir, { recursive: true });
  await appendFile(historyPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function loadActiveAgendaTemplate(factoryTemplate) {
  const fallback = normalizeTemplate(factoryTemplate);
  const localTemplate = await readJsonIfExists(activeAgendaPath);

  if (!localTemplate) {
    return { ...fallback, source: "default" };
  }

  return { ...normalizeTemplate(localTemplate), source: "local" };
}

export async function saveActiveAgendaTemplate(input, factoryTemplate) {
  const previous = await loadActiveAgendaTemplate(factoryTemplate);
  const next = normalizeTemplate(input);

  await mkdir(dataDir, { recursive: true });
  await writeFile(activeAgendaPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  await appendHistory({
    timestamp: new Date().toISOString(),
    action: "saved",
    changes: describeChanges(withoutMetadata(previous), next),
    previous: withoutMetadata(previous),
    next
  });

  return { ...next, source: "local" };
}

export async function resetActiveAgendaTemplate(factoryTemplate) {
  const previous = await loadActiveAgendaTemplate(factoryTemplate);
  const next = normalizeTemplate(factoryTemplate);

  try {
    await unlink(activeAgendaPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (previous.source === "local") {
    await appendHistory({
      timestamp: new Date().toISOString(),
      action: "reset",
      changes: describeChanges(withoutMetadata(previous), next),
      previous: withoutMetadata(previous),
      next
    });
  }

  return { ...next, source: "default" };
}

export async function loadAgendaHistory(limit = 20) {
  try {
    const content = await readFile(historyPath, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse()
      .slice(0, limit);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
