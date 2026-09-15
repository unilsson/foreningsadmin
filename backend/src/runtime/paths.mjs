import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(currentDir, "../../..");

const configuredStateRoot = String(process.env.FORENINGSADMIN_STATE_DIR ?? "").trim();

export const stateRoot = configuredStateRoot
  ? path.resolve(configuredStateRoot)
  : projectRoot;

export const dataDir = path.join(stateRoot, "data");
export const tokensDir = path.join(stateRoot, "tokens");
export const backupsDir = path.join(stateRoot, "backups");
export const tempDir = path.join(stateRoot, ".tmp");
export const legacyBoardFile = path.join(stateRoot, "config", "board.json");
export const frontendDistDir = path.join(projectRoot, "frontend", "dist");
