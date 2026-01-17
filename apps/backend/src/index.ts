import dotenv from "dotenv";
import app from "./app";
import connectDB from "./config/db";
import { initializeAdmin } from "./utils/initAdmin";

dotenv.config();

const startServer = async () => {
  await connectDB();
  
  // Tự động tạo Admin account nếu chưa có
  await initializeAdmin();

  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  console.log("INDEX JWT_SECRET =", process.env.JWT_SECRET);
};

startServer();
