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
import rentRequestRoutes from "./routes/rent-request.routes";
import cycleCountRoutes from "./routes/cycle-count.routes";
import warehouseIssueReportRoutes from "./routes/warehouse-issue-report.routes";
import reportsRoutes from "./routes/reports.routes";


const app = express();

app.use(cors());
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



app.get("/", (req, res) => {
  res.json({ message: "SIMS-AI backend running" });
});

export default app;

