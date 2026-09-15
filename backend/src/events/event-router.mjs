import { Router } from "express";
import { createEvent, deleteEvent, listEvents, updateEvent } from "./event-store.mjs";
import { renderEventsMarkdown, streamEventsPdf } from "./event-export.mjs";

function parseYear(value) {
  const year = String(value ?? "").trim();
  if (!year) return null;
  if (!/^\d{4}$/.test(year)) throw new Error("Ogiltigt år.");
  return year;
}

export function createEventsRouter() {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const state = await listEvents();
      res.json({ ok: true, ...state });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const result = await createEvent(req.body);
      res.status(201).json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const result = await updateEvent(req.params.id, req.body);
      if (!result) return res.status(404).json({ ok: false, error: "Evenemanget hittades inte." });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const deleted = await deleteEvent(req.params.id);
      if (!deleted) return res.status(404).json({ ok: false, error: "Evenemanget hittades inte." });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get("/export.md", async (req, res) => {
    try {
      const year = parseYear(req.query.year);
      const state = await listEvents();
      const markdown = renderEventsMarkdown({ ...state, year });
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="evenemangslista${year ? `-${year}` : ""}.md"`);
      res.send(markdown);
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get("/export.pdf", async (req, res) => {
    try {
      const year = parseYear(req.query.year);
      const state = await listEvents();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="evenemangslista${year ? `-${year}` : ""}.pdf"`);
      streamEventsPdf(res, { ...state, year });
    } catch (error) {
      if (!res.headersSent) res.status(400).json({ ok: false, error: error.message });
      else res.end();
    }
  });

  return router;
}
