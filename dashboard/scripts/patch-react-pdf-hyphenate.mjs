import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = path.join(
  root,
  "node_modules",
  "@react-pdf",
  "hyphenate",
  "package.json"
);

if (!existsSync(packageJsonPath)) {
  process.exit(0);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const star = packageJson.exports?.["./*"];
if (!star || typeof star !== "object" || star.require) {
  process.exit(0);
}

packageJson.exports["./*"] = {
  ...star,
  require: star.import ?? "./lib/*.js",
  default: star.import ?? "./lib/*.js",
};

writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log("Patched @react-pdf/hyphenate exports for CJS require");
