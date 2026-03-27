import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { sendEmail } from "../utils/email";

export type EmailJob = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let queue: Queue<EmailJob> | null = null;

function getRedisConnectionOptions(): ConnectionOptions | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const u = new URL(url);
  const port = u.port ? Number(u.port) : 6379;
  const username = u.username ? decodeURIComponent(u.username) : undefined;
  const password = u.password ? decodeURIComponent(u.password) : undefined;
  return {
    host: u.hostname,
    port,
    username,
    password
  };
}

export function getEmailQueue(): Queue<EmailJob> | null {
  if (queue) return queue;
  const conn = getRedisConnectionOptions();
  if (!conn) return null;
  queue = new Queue("email_notifications", { connection: conn });
  return queue;
}

export async function enqueueEmail(job: EmailJob): Promise<void> {
  const q = getEmailQueue();
  if (!q) {
    // Fallback: still async, but not persisted.
    setImmediate(() => {
      sendEmail(job).catch((err) => console.error("[Email] send failed", err));
    });
    return;
  }
  await q.add("send_email", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 1000
  });
}

export function startEmailWorker() {
  const conn = getRedisConnectionOptions();
  if (!conn) {
    console.warn("[EmailQueue] REDIS_URL not set; using async fallback (no queue).");
    return null;
  }

  const worker = new Worker(
    "email_notifications",
    async (job) => {
      await sendEmail(job.data);
    },
    { connection: conn }
  );

  worker.on("failed", (job, err) => {
    console.error("[EmailQueue] Job failed", job?.id, err);
  });

  return worker;
}

