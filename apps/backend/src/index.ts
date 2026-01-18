import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import app from "./app";
import connectDB from "./config/db";
import { initializeAdmin } from "./utils/initAdmin";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (one level up from src)
dotenv.config({ path: join(__dirname, "..", ".env") });

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
