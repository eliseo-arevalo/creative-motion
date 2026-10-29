#!/usr/bin/env node
// Point the templates at another brand folder: `npm run brand -- <id>` (folders: /brands/<id>/{tokens.ts,brand.json}).
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id || !existsSync(join(root, `../brands/${id}/tokens.ts`))) {
  console.error("usage: npm run brand -- <id>   (needs brands/<id>/tokens.ts and brand.json, see brands/_template)");
  process.exit(1);
}
writeFileSync(join(root, "src/tokens.ts"), `// Bridge only: the brand lives in /brands/<id>. Switch it with \`npm run brand -- <id>\` (never edit tokens here).\nexport * from "../../brands/${id}/tokens";\n`);
console.log(`templates now use brands/${id}`);
