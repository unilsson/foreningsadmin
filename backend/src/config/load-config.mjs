import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const defaultsPath = path.join(projectRoot, "config/defaults.json");

export async function loadConfig() {
  const content = await readFile(defaultsPath, "utf8");
  return JSON.parse(content);
}
