import { Router, raw } from "express";
import { createMeetingPreview } from "./preview.mjs";
import {
  createMeetingRecord,
  deleteMeetingRecord,
  getMeeting,
  listMeetings,
  updateMeetingRecord
} from "./meeting-store.mjs";
import {
  deleteProtocolDocument,
  loadProtocolDocument,
  saveProtocolDocument
} from "./document-store.mjs";

function decodeFilename(value) {
  try {
    return decodeURIComponent(String(value ?? ""));
  } catch {
    throw new Error("Ogiltigt filnamn.");
  }
}

export function createMeetingArchiveRouter(config) {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      res.json({ ok: true, meetings: await listMeetings() });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.put(
    "/:id/documents/protocol",
    raw({ type: "application/octet-stream", limit: "20mb" }),
    async (req, res) => {
      try {
        const result = await saveProtocolDocument(req.params.id, {
          buffer: req.body,
          originalFilename: decodeFilename(req.get("x-file-name"))
        });
        if (!result) {
          return res.status(404).json({ ok: false, error: "Mötet hittades inte." });
        }
        res.json({ ok: true, meeting: result.meeting, document: result.document });
      } catch (error) {
        res.status(400).json({ ok: false, error: error.message });
      }
    }
  );

  router.get("/:id/documents/protocol", async (req, res) => {
    try {
      const result = await loadProtocolDocument(req.params.id);
      if (!result) {
        return res.status(404).json({ ok: false, error: "Mötet hittades inte." });
      }
      if (!result.document || !result.buffer) {
        return res.status(404).json({ ok: false, error: "Mötet har inget protokoll." });
      }

      const disposition =
        req.query.download === "1" || result.document.mimeType !== "application/pdf"
          ? "attachment"
          : "inline";
      const encodedFilename = encodeURIComponent(result.document.originalFilename);

      res.setHeader("Content-Type", result.document.mimeType);
      res.setHeader("Content-Length", String(result.buffer.length));
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename*=UTF-8''${encodedFilename}`
      );
      res.send(result.buffer);
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.delete("/:id/documents/protocol", async (req, res) => {
    try {
      const result = await deleteProtocolDocument(req.params.id);
      if (!result) {
        return res.status(404).json({ ok: false, error: "Mötet hittades inte." });
      }
      if (!result.deleted) {
        return res.status(404).json({ ok: false, error: "Mötet har inget protokoll." });
      }
      res.json({ ok: true, meeting: result.meeting });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
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
