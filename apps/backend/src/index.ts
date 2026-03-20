import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import app from "./app";
import connectDB from "./config/db";
import { initializeAdmin } from "./utils/initAdmin";
import { verifyEmailConfig } from "./utils/email";
import { runContractScheduler } from "./services/contract-scheduler.service";
import http from "http";
import { initSocket } from "./realtime/socket";
import { startEmailWorker } from "./queues/email.queue";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (one level up from src)
dotenv.config({ path: join(__dirname, "..", ".env") });

/**
 * Start the contract scheduler
 * Runs every hour to automatically activate/expire contracts based on dates
 */
function startContractScheduler() {
  // Run immediately on startup
  runContractScheduler()
    .then((result) => {
      if (result.activated > 0 || result.expired > 0) {
        console.log(
          `[Scheduler] Activated ${result.activated} contracts, Expired ${result.expired} contracts`
        );
      }
      if (result.errors.length > 0) {
        console.error("[Scheduler] Errors:", result.errors);
      }
    })
    .catch((error) => {
      console.error("[Scheduler] Error:", error);
    });

  // Run every hour (3600000 ms)
  const SCHEDULER_INTERVAL = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    runContractScheduler()
      .then((result) => {
        if (result.activated > 0 || result.expired > 0) {
          console.log(
            `[Scheduler] Activated ${result.activated} contracts, Expired ${result.expired} contracts`
          );
        }
        if (result.errors.length > 0) {
          console.error("[Scheduler] Errors:", result.errors);
        }
      })
      .catch((error) => {
        console.error("[Scheduler] Error:", error);
      });
  }, SCHEDULER_INTERVAL);

  console.log("[Scheduler] Contract scheduler started (runs every hour)");
}

const startServer = async () => {
  await connectDB();
  
  // Tự động tạo Admin account nếu chưa có
  await initializeAdmin();

  // Verify email configuration only when explicitly enabled.
  // Many cloud platforms restrict outbound SMTP and this can timeout on startup.
  if (process.env.EMAIL_VERIFY_ON_STARTUP === "true") {
    await verifyEmailConfig();
  } else {
    console.log("[Email] Skipping SMTP verify on startup (set EMAIL_VERIFY_ON_STARTUP=true to enable).");
  }

  // Start email worker (if Redis configured)
  startEmailWorker();

  // Start contract scheduler
  startContractScheduler();

  const PORT = process.env.PORT || 3001;

  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  console.log("INDEX JWT_SECRET =", process.env.JWT_SECRET);
};

startServer();
