import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");

export async function renderTemplate(relativePath, values) {
  const templatePath = path.join(projectRoot, relativePath);
  let content = await readFile(templatePath, "utf8");

  for (const [key, value] of Object.entries(values)) {
    content = content.replaceAll(`{{${key}}}`, String(value ?? ""));
  }

  return content;
}
