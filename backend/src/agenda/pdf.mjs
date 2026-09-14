import PDFDocument from "pdfkit";

export function streamAgendaPdf(response, agenda) {
  const document = new PDFDocument({
    size: "A4",
    margins: {
      top: 56,
      right: 56,
      bottom: 56,
      left: 56
    },
    info: {
      Title: agenda.title,
      Author: "Haninge Hembygdsgille",
      Subject: "Dagordning för styrelsemöte"
    }
  });

  document.pipe(response);

  document
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(agenda.title, { align: "center" });

  document.moveDown(0.45);

  document
    .font("Helvetica")
    .fontSize(11)
    .text(agenda.heading, { align: "center" });

  document.moveDown(1.5);

  for (const item of agenda.items) {
    document
      .font("Helvetica")
      .fontSize(11)
      .text(`${item.number}. ${item.text}`, {
        lineGap: 2,
        paragraphGap: 8
      });
  }

  document.end();
}
