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

/** Pacific coast south, then Gulf, then Atlantic north. */
const REGION_ORDER = [
  "alaska",
  "pnw",
  "norcal",
  "socal",
  "baja",
  "gulf",
  "florida",
  "outerbanks",
  "midatlantic",
  "northeast",
] as const;

const PACIFIC = new Set(["pnw", "norcal", "socal"]);
const GULF = new Set(["gulf"]);
const ATLANTIC = new Set(["florida", "outerbanks", "midatlantic", "northeast"]);

/** Coast-following order; latitude alone misorders the panhandle and gulf ports. */
const PORT_ORDER: Partial<Record<string, string[]>> = {
  alaska: [
    "juneau-ak",
    "sitka-ak",
    "petersburg-ak",
    "ketchikan-ak",
    "kodiak-ak",
    "cordova-ak",
    "valdez-ak",
    "whittier-ak",
    "seward-ak",
    "homer-ak",
  ],
  baja: [
    "ensenada-mx",
    "san-quintin-mx",
    "bahia-de-los-angeles-mx",
    "mag-bay-mx",
    "bahia-tortugas-mx",
    "loreto-mx",
    "la-paz-mx",
    "los-barriles-mx",
    "eastcape-mx",
    "cabo-san-lucas-mx",
    "punta-de-mita-mx",
  ],
};

interface PortDoc {
  id: string;
  regionId: string;
  position: { lat: number; lon: number };
}

function sortPorts(regionId: string, ports: PortDoc[]): PortDoc[] {
  const explicit = PORT_ORDER[regionId];
  if (explicit) {
    const byId = new Map(ports.map((p) => [p.id, p]));
    const ordered = explicit.map((id) => byId.get(id)).filter((p): p is PortDoc => p != null);
    const remaining = ports.filter((p) => !explicit.includes(p.id)).sort((a, b) => a.id.localeCompare(b.id));
    return [...ordered, ...remaining];
  }

  return [...ports].sort((a, b) => {
    if (PACIFIC.has(regionId)) return b.position.lat - a.position.lat;
    if (GULF.has(regionId)) return a.position.lon - b.position.lon;
    if (ATLANTIC.has(regionId)) return a.position.lat - b.position.lat;
    return a.id.localeCompare(b.id);
  });
}

const MARKDOWN = new URL("../markdown", import.meta.url).pathname;
const regionFiles = globSync("regions/*/*.md", { cwd: MARKDOWN });

const regionUpdates = new Map<string, { order: number; displayOrder: number }>();
for (const rel of regionFiles) {
  const { data } = matter(readFileSync(resolve(MARKDOWN, rel), "utf-8"));
  const id = data.id as string;
  const index = REGION_ORDER.indexOf(id as (typeof REGION_ORDER)[number]);
  if (index === -1) throw new Error(`Unknown region: ${id}`);
  regionUpdates.set(id, {
    order: (data.order as number) ?? index + 1,
    displayOrder: index + 1,
  });
}

const portFiles = globSync("regions/*/ports/*/*.md", { cwd: MARKDOWN });
const portsByRegion = new Map<string, PortDoc[]>();

for (const rel of portFiles) {
  const { data } = matter(readFileSync(resolve(MARKDOWN, rel), "utf-8"));
  const regionId = data.regionId as string;
  const port: PortDoc = {
    id: data.id as string,
    regionId,
    position: data.position as { lat: number; lon: number },
  };
  const group = portsByRegion.get(regionId) ?? [];
  group.push(port);
  portsByRegion.set(regionId, group);
}

const portDisplayOrder = new Map<string, number>();
for (const regionId of REGION_ORDER) {
  const ports = portsByRegion.get(regionId);
  if (!ports) continue;
  sortPorts(regionId, ports).forEach((port, i) => {
    portDisplayOrder.set(port.id, i + 1);
  });
}

const BATCH_SIZE = 400;
let batch = db.batch();
let count = 0;

async function commitIfNeeded(force = false) {
  if (count === 0) return;
  if (!force && count < BATCH_SIZE) return;
  await batch.commit();
  batch = db.batch();
  count = 0;
}

for (const [id, fields] of regionUpdates) {
  batch.set(db.collection("regions").doc(id), fields, { merge: true });
  count++;
  await commitIfNeeded();
  console.log(`region ${id}: order=${fields.order} displayOrder=${fields.displayOrder}`);
}

for (const [id, displayOrder] of portDisplayOrder) {
  batch.set(db.collection("ports").doc(id), { displayOrder }, { merge: true });
  count++;
  await commitIfNeeded();
  console.log(`port ${id}: displayOrder=${displayOrder}`);
}

await commitIfNeeded(true);
console.log(`Done. Updated ${regionUpdates.size} regions and ${portDisplayOrder.size} ports.`);
