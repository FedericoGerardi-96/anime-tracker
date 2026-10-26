import "./generate-icon-subset.mjs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), true);
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
const web = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], { stdio: "inherit", windowsHide: true });
children.push(web);
web.on("exit", (code) => stop(code ?? 0));
web.on("error", () => stop(1));

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
