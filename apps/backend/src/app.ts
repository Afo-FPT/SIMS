import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import warehouseRoutes from "./routes/warehouse.routes";
import storageRequestRoutes from "./routes/storage-request.routes";
import contractRoutes from "./routes/contract.routes";
import contractPackageRoutes from "./routes/contract-package.routes";
import inboundRequestRoutes from "./routes/inbound-requests.routes";
import outboundRequestRoutes from "./routes/outbound-requests.routes";
import staffStorageRequestRoutes from "./routes/staff-storage-requests.routes";
import storedItemsRoutes from "./routes/stored-items.routes";
import shelfRoutes from "./routes/shelf.routes";
import stockHistoryRoutes from "./routes/stock-history.routes";
import paymentRoutes from "./routes/payment.routes";
import zoneShelvesRoutes from "./routes/zone-shelves.routes";
import rentRequestRoutes from "./routes/rent-request.routes";
import cycleCountRoutes from "./routes/cycle-count.routes";
import warehouseIssueReportRoutes from "./routes/warehouse-issue-report.routes";
import reportsRoutes from "./routes/reports.routes";
import notificationRoutes from "./routes/notification.routes";
import aiChatRoutes from "./routes/ai-chat.routes";
import systemSettingRoutes from "./routes/system-setting.routes";
import staffWarehouseRoutes from "./routes/staff-warehouse.routes";


const app = express();

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "https://sims-63i8.onrender.com"
];

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_ORIGINS || "").split(",")
]
  .map((v) => v?.trim())
  .filter((v): v is string => !!v);

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser/server-to-server requests (no Origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/storage-requests", storageRequestRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/contract-packages", contractPackageRoutes);
app.use("/api/inbound-requests", inboundRequestRoutes);
app.use("/api/outbound-requests", outboundRequestRoutes);
app.use("/api/staff", staffStorageRequestRoutes);
app.use("/api/stored-items", storedItemsRoutes);
app.use("/api/shelves", shelfRoutes);
app.use("/api/stock-history", stockHistoryRoutes);
app.use("/api/rent-requests", rentRequestRoutes);
app.use("/api/cycle-counts", cycleCountRoutes);
app.use("/api/warehouse-issue-reports", warehouseIssueReportRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/zones", zoneShelvesRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiChatRoutes);
app.use("/api/system-settings", systemSettingRoutes);
app.use("/api/staff-warehouses", staffWarehouseRoutes);



app.get("/", (req, res) => {
  res.json({ message: "SIMS-AI backend running" });
});

export default app;

