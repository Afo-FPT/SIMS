import User from "../models/User";
import bcrypt from "bcryptjs";

/**
 * Tự động tạo Admin account nếu chưa tồn tại
 */
export async function initializeAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@sims.ai";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    // Kiểm tra xem đã có admin chưa
    const existingAdmin = await User.findOne({ role: "admin" });
    
    if (existingAdmin) {
      console.log("Admin account already exists");
      return;
    }

    // Tạo admin account
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true // Admin tự động được kích hoạt
    });

    console.log("Admin account created successfully:");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("Please change the password after first login!");
  } catch (error) {
    console.error("Error initializing admin:", error);
  }
}