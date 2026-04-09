const { spawn } = require("child_process");

const port = process.env.PORT || "3000";
const host = process.env.HOST || "0.0.0.0";
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(npxCmd, ["next", "start", "-H", host, "-p", port], {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

