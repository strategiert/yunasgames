// Aufruf: node scripts/smoke-paint.mjs <pfad-zu-test-png> [style]
// Liest FAL_API_KEY aus C:\Users\karent\.env und ruft den Handler direkt auf.
import { readFileSync, writeFileSync } from "node:fs";

const envText = readFileSync("C:/Users/karent/.env", "utf8");
const key = envText.match(/^FAL_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("FAL_API_KEY nicht in .env gefunden");

const [, , pngPath, style = "pixar"] = process.argv;
const b64 = readFileSync(pngPath).toString("base64");
const dataUri = `data:image/png;base64,${b64}`;

process.env.FAL_API_KEY = key;
const { default: handler } = await import("../api/paint.js");

const req = { method: "POST", body: { image: dataUri, style } };
const res = {
  code: 200,
  status(c) {
    this.code = c;
    return this;
  },
  json(obj) {
    console.log("HTTP", this.code, JSON.stringify(obj, null, 2));
    if (obj.url) writeFileSync("scripts/smoke-result-url.txt", obj.url);
    return this;
  },
};
await handler(req, res);
