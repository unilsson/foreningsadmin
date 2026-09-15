import PDFDocument from "pdfkit";

const STATUS_LABELS = {
  not_started: "Ej påbörjad",
  planning: "Planering pågår",
  ready: "Klart för genomförande",
  completed: "Genomfört"
};

const STANDARD_MARKETING_TEXT = "Affischering på de vanliga platserna, Facebook, Gillets hemsida och Haninge kommuns webbplats.";

function escapeTable(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function displayDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function updatedDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? String(value ?? "") : new Intl.DateTimeFormat("sv-SE").format(date);
}

function filtered(items, year) {
  const selected = year ? items.filter((item) => item.date?.startsWith(`${year}-`)) : items;
  return [...selected].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.startTime).localeCompare(String(b.startTime)));
}

function timeText(item) {
  if (!item.startTime) return "";
  return item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime;
}

function marketingText(item) {
  const parts = [];
  if (item.standardMarketing) parts.push("Vanliga rutiner för evenemang.");
  if (item.marketingNotes) parts.push(item.marketingNotes);
  return parts.join(" ");
}

export function renderEventsMarkdown({ items, updatedAt, year }) {
  const events = filtered(items, year);
  const lines = [
    "# Evenemangslista",
    "",
    year ? `**År:** ${year}` : "**Period:** Alla evenemang",
    `**Senast uppdaterad:** ${updatedDate(updatedAt)}`,
    "",
    "Evenemangslistan används för att hålla reda på ansvar och förberedelser inför kommande arrangemang.",
    "",
    "## Evenemang",
    "",
    "| Datum | Tid | Evenemang | Plats | Huvudansvarig | Bemanning | Praktiska förberedelser | Information / marknadsföring | Status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const item of events) {
    lines.push(`| ${escapeTable(item.date)} | ${escapeTable(timeText(item))} | ${escapeTable(item.title)} | ${escapeTable(item.location)} | ${escapeTable(item.mainResponsible)} | ${escapeTable(item.staffing)} | ${escapeTable(item.practicalPreparations)} | ${escapeTable(marketingText(item))} | ${escapeTable(STATUS_LABELS[item.status] ?? item.status)} |`);
  }
  if (!events.length) lines.push("| | | Inga evenemang | | | | | | |");

  lines.push(
    "",
    "### Status",
    "",
    "- **Ej påbörjad** – planeringen har inte börjat",
    "- **Planering pågår** – förberedelser pågår",
    "- **Klart för genomförande** – alla viktiga förberedelser är gjorda",
    "- **Genomfört** – evenemanget är avslutat",
    "",
    "### Vanliga rutiner för evenemang",
    "",
    STANDARD_MARKETING_TEXT,
    ""
  );

  const withNotes = events.filter((item) => item.notes);
  if (withNotes.length) {
    lines.push("## Planeringsanteckningar", "");
    for (const item of withNotes) {
      lines.push(`### ${item.date} – ${item.title}`, "", item.notes, "");
    }
  }

  const withAfterEvent = events.filter((item) => Object.values(item.afterEvent ?? {}).some(Boolean));
  if (withAfterEvent.length) {
    lines.push("## Efter genomfört evenemang", "");
    for (const item of withAfterEvent) {
      lines.push(`### ${item.date} – ${item.title}`, "");
      if (item.afterEvent.visitors) lines.push(`**Antal besökare:** ${item.afterEvent.visitors}`);
      if (item.afterEvent.workedWell) lines.push(`**Vad fungerade bra:** ${item.afterEvent.workedWell}`);
      if (item.afterEvent.improvements) lines.push(`**Vad bör ändras:** ${item.afterEvent.improvements}`);
      if (item.afterEvent.financialResult) lines.push(`**Ekonomiskt resultat:** ${item.afterEvent.financialResult}`);
      if (item.afterEvent.otherExperience) lines.push(`**Övriga erfarenheter:** ${item.afterEvent.otherExperience}`);
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

function ensureRoom(doc, needed = 120) {
  if (doc.y + needed > doc.page.height - 60) doc.addPage();
}

function renderEvent(doc, item) {
  ensureRoom(doc, 150);
  doc.font("Helvetica-Bold").fontSize(12).text(`${displayDate(item.date)}${timeText(item) ? ` · ${timeText(item)}` : ""}`);
  doc.fontSize(15).text(item.title);
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(9.5);
  if (item.location) doc.text(`Plats: ${item.location}`);
  if (item.mainResponsible) doc.text(`Huvudansvarig: ${item.mainResponsible}`);
  if (item.staffing) doc.text(`Bemanning: ${item.staffing}`);
  doc.text(`Status: ${STATUS_LABELS[item.status] ?? item.status}`);
  if (item.practicalPreparations) doc.text(`Praktiska förberedelser: ${item.practicalPreparations}`);
  const marketing = marketingText(item);
  if (marketing) doc.text(`Information / marknadsföring: ${marketing}`);
  if (item.notes) doc.text(`Planeringsanteckningar: ${item.notes}`);
  const after = item.afterEvent ?? {};
  if (Object.values(after).some(Boolean)) {
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("Efter genomfört evenemang");
    doc.font("Helvetica");
    if (after.visitors) doc.text(`Antal besökare: ${after.visitors}`);
    if (after.workedWell) doc.text(`Vad fungerade bra: ${after.workedWell}`);
    if (after.improvements) doc.text(`Vad bör ändras: ${after.improvements}`);
    if (after.financialResult) doc.text(`Ekonomiskt resultat: ${after.financialResult}`);
    if (after.otherExperience) doc.text(`Övriga erfarenheter: ${after.otherExperience}`);
  }
  doc.moveDown(1);
}

export function streamEventsPdf(output, { items, updatedAt, year }) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 52, bottom: 52, left: 56, right: 56 } });
  doc.info.Title = "Evenemangslista";
  doc.info.Author = "Haninge Hembygdsgille";
  doc.pipe(output);

  doc.font("Helvetica-Bold").fontSize(19).text("Haninge Hembygdsgille");
  doc.fontSize(24).text("Evenemangslista");
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(10).text(year ? `År: ${year}` : "Alla evenemang");
  doc.text(`Senast uppdaterad: ${updatedDate(updatedAt)}`);
  doc.moveDown(1.2);

  const events = filtered(items, year);
  if (!events.length) {
    doc.text("Inga evenemang för vald period.");
  } else {
    for (const item of events) renderEvent(doc, item);
  }

  doc.end();
}
