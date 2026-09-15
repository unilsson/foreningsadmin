import { Router } from "express";
import {
  createActionItem,
  deleteActionItem,
  listActionItems,
  updateActionItem
} from "./action-store.mjs";
import { renderActionItemsMarkdown, streamActionItemsPdf } from "./action-export.mjs";

export function createActionItemsRouter() {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      res.json({ ok: true, ...(await listActionItems()) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/export.md", async (_req, res) => {
    try {
      const state = await listActionItems();
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=atgardslista.md");
      res.send(renderActionItemsMarkdown(state));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/export.pdf", async (_req, res) => {
    try {
      const state = await listActionItems();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=atgardslista.pdf");
      streamActionItemsPdf(res, state);
    } catch (error) {
      if (!res.headersSent) res.status(500).json({ ok: false, error: error.message });
      else res.end();
    }
  });

  router.post("/", async (req, res) => {
    try {
      const result = await createActionItem(req.body);
      res.status(201).json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const result = await updateActionItem(req.params.id, req.body);
      if (!result) return res.status(404).json({ ok: false, error: "Åtgärdspunkten hittades inte." });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const deleted = await deleteActionItem(req.params.id);
      if (!deleted) return res.status(404).json({ ok: false, error: "Åtgärdspunkten hittades inte." });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  return router;
}
