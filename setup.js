const { spawn, execSync } = require("child_process");
const path = require("path");

console.log("Setting up Event Sync Service...\n");

console.log("[SETUP] Installing backend dependencies...");
execSync("pip install -r requirement.txt", {
  cwd: path.join(__dirname, "backend"),
  stdio: "inherit",
});

console.log("\n[SETUP] Installing frontend dependencies...");
execSync("npm install", {
  cwd: path.join(__dirname, "frontend"),
  stdio: "inherit",
});

console.log("\n[SETUP] Starting servers...\n");

const backend = spawn(
  "python",
  ["-m", "uvicorn", "main:app", "--port", "8000"],
  {
    cwd: path.join(__dirname, "backend"),
    stdio: "inherit",
    shell: true,
  },
);

const frontend = spawn("npm", ["run", "dev"], {
  cwd: path.join(__dirname, "frontend"),
  stdio: "inherit",
  shell: true,
});

backend.on("error", (err) => console.error("[BACKEND ERROR]", err));
frontend.on("error", (err) => console.error("[FRONTEND ERROR]", err));

process.on("SIGINT", () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
