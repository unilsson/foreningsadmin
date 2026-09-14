import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../../..");
const boardPath = path.join(projectRoot, "config/board.json");

export async function loadBoard() {
  const content = await readFile(boardPath, "utf8");
  const data = JSON.parse(content);

  if (!Array.isArray(data.members)) {
    throw new Error("config/board.json måste innehålla en array med namnet members.");
  }

  return {
    members: data.members.filter((member) => member.active === true)
  };
}
