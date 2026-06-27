import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";
import { globSync } from "glob";
import matter from "gray-matter";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = new URL("../../..", import.meta.url).pathname;
config({ path: resolve(ROOT, "private/.env") });

const key = JSON.parse(readFileSync(resolve(ROOT, process.env.FIREBASE_ADMIN_KEY!), "utf-8"));
initializeApp({ credential: cert(key) });
const db = getFirestore();

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url).pathname, "utf-8"));

function collection(rel: string): string {
  if (/^fish\/[^/]+\/techniques\//.test(rel)) return "techniques";
  if (/^fish\/[^/]+\/[^/]+\.md$/.test(rel)) return "fish";
  if (/\/spots\/[^/]+\.md$/.test(rel)) return "spots";
  if (/\/ports\/[^/]+\/[^/]+\.md$/.test(rel)) return "ports";
  if (/^regions\/[^/]+\/[^/]+\.md$/.test(rel)) return "regions";
  throw new Error(`Unknown type: ${rel}`);
}

const MARKDOWN = new URL("../markdown", import.meta.url).pathname;
const files = globSync("**/*.md", { cwd: MARKDOWN });

console.log(`Found ${files.length} files`);

const BATCH_SIZE = 100;
for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const chunk = files.slice(i, i + BATCH_SIZE);
  const batch = db.batch();

  for (const rel of chunk) {
    const { data, content } = matter(readFileSync(resolve(MARKDOWN, rel), "utf-8"));
    const col = collection(rel);
    const id = data.id as string;
    batch.set(db.collection(col).doc(id), { ...data, version });
    batch.set(db.collection("pages").doc(`${col}__${id}`), { collection: col, id, body: content.trim(), version });
  }

  await batch.commit();
  console.log(`Committed ${Math.min(i + BATCH_SIZE, files.length)}/${files.length}`);
}

console.log("Done.");
