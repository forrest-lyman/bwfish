import { readdirSync, renameSync } from "fs";
import { join } from "path";

const MARKDOWN_DIR = new URL("../markdown", import.meta.url).pathname;

function removeDraftSuffix(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      removeDraftSuffix(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".draft.md")) {
      const newName = entry.name.replace(".draft.md", ".md");
      const newPath = join(dir, newName);
      renameSync(fullPath, newPath);
      console.log(`Renamed: ${fullPath} → ${newPath}`);
    }
  }
}

removeDraftSuffix(MARKDOWN_DIR);
