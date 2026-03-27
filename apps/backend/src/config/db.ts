import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log("✅ MongoDB connected successfully");
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    } else {
      console.error("   Unknown error:", error);
    }
    console.error("\n💡 Please check:");
    console.error("   1. MongoDB is running (mongod service)");
    console.error("   2. MONGO_URI in .env file is correct");
    console.error("   3. Connection string format: mongodb://localhost:27017/database_name");
    process.exit(1);
  }
};

export default connectDB;

