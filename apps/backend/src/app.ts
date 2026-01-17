import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import warehouseRoutes from "./routes/warehouse.routes";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/warehouses", warehouseRoutes);



app.get("/", (req, res) => {
  res.json({ message: "SIMS-AI backend running" });
});

export default app;

