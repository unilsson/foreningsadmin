import { Router } from "express";
import { createMeetingPreview } from "./preview.mjs";
import {
  createMeetingRecord,
  deleteMeetingRecord,
  getMeeting,
  listMeetings,
  updateMeetingRecord
} from "./meeting-store.mjs";

export function createMeetingArchiveRouter(config) {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      res.json({ ok: true, meetings: await listMeetings() });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const meeting = await getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ ok: false, error: "Mötet hittades inte." });
      }
      res.json({ ok: true, meeting });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/", async (req, res) => {
    const result = createMeetingPreview(req.body?.meeting, config);
    if (!result.ok) {
      return res.status(400).json(result);
    }

    try {
      const meeting = await createMeetingRecord({
        meeting: result.meeting,
        agenda: req.body?.agenda,
        status: req.body?.status
      });
      res.status(201).json({ ok: true, meeting });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.put("/:id", async (req, res) => {
    const result = createMeetingPreview(req.body?.meeting, config);
    if (!result.ok) {
      return res.status(400).json(result);
    }

    try {
      const meeting = await updateMeetingRecord(req.params.id, {
        meeting: result.meeting,
        agenda: req.body?.agenda,
        status: req.body?.status
      });
      if (!meeting) {
        return res.status(404).json({ ok: false, error: "Mötet hittades inte." });
      }
      res.json({ ok: true, meeting });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const deleted = await deleteMeetingRecord(req.params.id);
      if (!deleted) {
        return res.status(404).json({ ok: false, error: "Mötet hittades inte." });
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  return router;
}
