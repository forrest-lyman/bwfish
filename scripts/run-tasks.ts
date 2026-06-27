import { readdirSync, renameSync, mkdirSync } from "fs";
import { join, extname } from "path";
import { spawnSync } from "child_process";

const TASKS_DIR = new URL("../tasks", import.meta.url).pathname;
const DONE_DIR = join(TASKS_DIR, "done");

mkdirSync(DONE_DIR, { recursive: true });

const tasks = readdirSync(TASKS_DIR, { withFileTypes: true }).filter(
  (e) => e.isFile() && [".ts", ".js"].includes(extname(e.name))
);

if (tasks.length === 0) {
  console.log("No tasks to run.");
  process.exit(0);
}

for (const task of tasks) {
  const taskPath = join(TASKS_DIR, task.name);
  console.log(`\nRunning task: ${task.name}`);

  const result = spawnSync("npx", ["tsx", taskPath], { stdio: "inherit" });

  if (result.status !== 0) {
    console.error(`Task failed: ${task.name} (exit code ${result.status})`);
    process.exit(result.status ?? 1);
  }

  const destPath = join(DONE_DIR, task.name);
  renameSync(taskPath, destPath);
  console.log(`Moved to done: ${task.name}`);
}
