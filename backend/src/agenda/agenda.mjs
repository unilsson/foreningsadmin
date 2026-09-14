import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const agendaPath = path.join(projectRoot, "config/agenda.json");

function cleanItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function formatDateSwedish(date) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Stockholm"
  }).format(value);
}

function formatClock(time) {
  return String(time).replace(":", ".");
}

export async function loadAgendaTemplate() {
  const template = JSON.parse(await readFile(agendaPath, "utf8"));

  return {
    title: String(template.title ?? "Dagordning").trim(),
    beforeMeetingItems: cleanItems(template.beforeMeetingItems),
    afterMeetingItems: cleanItems(template.afterMeetingItems)
  };
}

export function createAgendaPreview({ meeting, agenda, template }) {
  const beforeMeetingItems = cleanItems(
    agenda?.beforeMeetingItems ?? template.beforeMeetingItems
  );
  const meetingItems = cleanItems(agenda?.meetingItems);
  const afterMeetingItems = cleanItems(
    agenda?.afterMeetingItems ?? template.afterMeetingItems
  );

  const items = [
    ...beforeMeetingItems,
    ...meetingItems,
    ...afterMeetingItems
  ];

  const numberedItems = items.map((text, index) => ({
    number: index + 1,
    text
  }));

  const title = String(agenda?.title ?? template.title ?? "Dagordning").trim();
  const heading = `${meeting.location} kl. ${formatClock(meeting.startTime)}–${formatClock(meeting.endTime)} den ${formatDateSwedish(meeting.date)}`;
  const markdown = [
    `# ${title}`,
    `### ${heading}`,
    "",
    ...numberedItems.map((item) => `${item.number}. ${item.text}`),
    ""
  ].join("\n");

  return {
    title,
    heading,
    beforeMeetingItems,
    meetingItems,
    afterMeetingItems,
    items: numberedItems,
    markdown
  };
}
