import PDFDocument from "pdfkit";

const STATUS_LABELS = {
  not_started: "Ej påbörjad",
  in_progress: "Pågår",
  waiting: "Väntar",
  completed: "Klart"
};

function escapeTable(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function displayDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function updatedDate(updatedAt) {
  if (!updatedAt) return new Intl.DateTimeFormat("sv-SE").format(new Date());
  const date = new Date(updatedAt);
  return Number.isNaN(date.getTime())
    ? updatedAt
    : new Intl.DateTimeFormat("sv-SE").format(date);
}

function sorted(items, completed) {
  return items
    .filter((item) => (item.status === "completed") === completed)
    .sort((a, b) => {
      if (completed) return String(b.completedAt ?? "").localeCompare(String(a.completedAt ?? ""));
      const aDue = a.dueDate || "9999-12-31";
      const bDue = b.dueDate || "9999-12-31";
      return aDue.localeCompare(bDue) || String(a.number).localeCompare(String(b.number));
    });
}

export function renderActionItemsMarkdown({ items, updatedAt }) {
  const ongoing = sorted(items, false);
  const completed = sorted(items, true);
  const lines = [
    "# Åtgärdslista",
    "",
    `**Senast uppdaterad:** ${updatedDate(updatedAt)}`,
    "",
    "## Pågående åtgärder",
    "",
    "| Nr | Åtgärd | Ansvarig | Beslutad | Klart senast | Status | Kommentar |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const item of ongoing) {
    lines.push(
      `| ${escapeTable(item.number)} | ${escapeTable(item.title)} | ${escapeTable(item.responsible.join(", "))} | ${escapeTable(item.decided)} | ${escapeTable(item.dueDate)} | ${escapeTable(STATUS_LABELS[item.status] ?? item.status)} | ${escapeTable(item.comment)} |`
    );
  }
  if (!ongoing.length) lines.push("| | Inga pågående åtgärder | | | | | |");

  lines.push(
    "",
    "### Status",
    "",
    "- **Ej påbörjad** – ingen åtgärd ännu",
    "- **Pågår** – arbetet är påbörjat",
    "- **Väntar** – väntar på svar, beslut eller annan part",
    "- **Klart** – åtgärden är genomförd",
    "",
    "## Avslutade åtgärder",
    "",
    "| Nr | Åtgärd | Ansvarig | Beslutad | Klart | Kommentar |",
    "| --- | --- | --- | --- | --- | --- |"
  );

  for (const item of completed) {
    const completedDate = item.completedAt ? item.completedAt.slice(0, 10) : "";
    lines.push(
      `| ${escapeTable(item.number)} | ${escapeTable(item.title)} | ${escapeTable(item.responsible.join(", "))} | ${escapeTable(item.decided)} | ${escapeTable(completedDate)} | ${escapeTable(item.comment)} |`
    );
  }
  if (!completed.length) lines.push("| | Inga avslutade åtgärder | | | | |");

  return `${lines.join("\n")}\n`;
}

function renderItem(doc, item) {
  const status = STATUS_LABELS[item.status] ?? item.status;
  doc.font("Helvetica-Bold").fontSize(11).text(`${item.number}  ${item.title}`);
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(9.5);
  if (item.responsible.length) doc.text(`Ansvarig: ${item.responsible.join(", ")}`);
  if (item.decided) doc.text(`Beslutad: ${item.decided}`);
  if (item.dueDate) doc.text(`Klart senast: ${displayDate(item.dueDate)}`);
  doc.text(`Status: ${status}`);
  if (item.comment) doc.text(`Kommentar: ${item.comment}`);
  doc.moveDown(0.7);
}

export function streamActionItemsPdf(output, { items, updatedAt }) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 52, bottom: 52, left: 56, right: 56 } });
  doc.info.Title = "Åtgärdslista";
  doc.info.Author = "Haninge Hembygdsgille";
  doc.info.Subject = "Åtgärdslista";
  doc.pipe(output);

  doc.font("Helvetica-Bold").fontSize(19).text("Haninge Hembygdsgille");
  doc.fontSize(24).text("Åtgärdslista");
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(10).text(`Senast uppdaterad: ${updatedDate(updatedAt)}`);
  doc.moveDown(1.2);

  const ongoing = sorted(items, false);
  doc.font("Helvetica-Bold").fontSize(15).text("Pågående åtgärder");
  doc.moveDown(0.7);
  if (!ongoing.length) {
    doc.font("Helvetica").fontSize(10).text("Inga pågående åtgärder.");
    doc.moveDown();
  } else {
    for (const item of ongoing) renderItem(doc, item);
  }

  const completed = sorted(items, true);
  if (doc.y > 640) doc.addPage();
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(15).text("Avslutade åtgärder");
  doc.moveDown(0.7);
  if (!completed.length) {
    doc.font("Helvetica").fontSize(10).text("Inga avslutade åtgärder.");
  } else {
    for (const item of completed) {
      if (doc.y > 690) doc.addPage();
      renderItem(doc, item);
    }
  }

  doc.end();
}
