import express, { Router } from "express";
import {
  createBackupDocument,
  getBackupStatus,
  restoreBackupDocument
} from "./backup-store.mjs";

const restoreBody = express.raw({
  type: ["application/json", "application/octet-stream", "application/x-foreningsadmin-backup"],
  limit: "600mb"
});

function filenameTimestamp() {
  return new Date().toISOString().replace(/[:]/g, "-").replace(/\.\d{3}Z$/, "Z");
}

export function createBackupRouter() {
  const router = Router();

  router.get("/status", async (_req, res) => {
    try {
      res.json({ ok: true, ...(await getBackupStatus()) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/download", async (_req, res) => {
    try {
      const backup = await createBackupDocument();
      const body = JSON.stringify(backup);
      const filename = `foreningsadmin-backup-${filenameTimestamp()}.json`;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", Buffer.byteLength(body));
      res.send(body);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/restore", restoreBody, async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ ok: false, error: "Ingen backupfil skickades." });
      }

      let document;
      try {
        document = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ ok: false, error: "Backupfilen innehåller inte giltig JSON." });
      }

      const result = await restoreBackupDocument(document);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  return router;
}
