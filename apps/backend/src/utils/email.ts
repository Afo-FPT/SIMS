import nodemailer from "nodemailer";

/**
 * Tạo transporter cho nodemailer
 * Hỗ trợ nhiều email provider: Gmail, Outlook, SendGrid, etc.
 */
const createTransporter = () => {
  // Nếu có SMTP config trong .env, sử dụng nó
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Nếu có Gmail config, sử dụng Gmail
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // App Password, không phải password thường
      },
    });
  }

  // Development mode: sử dụng Ethereal Email (fake SMTP server)
  // Hoặc có thể dùng console.log để test
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️  Email service not configured. Using console output for development.");
    return null; // Sẽ fallback sang console.log
  }

  throw new Error("Email service not configured. Please set SMTP or Gmail credentials in .env");
};

/**
 * Gửi email reset password
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "noreply@sims.ai",
    to: email,
    subject: "Reset Your Password - SIMS",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Reset Your Password</h2>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password for your SIMS account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Reset Your Password - SIMS
      
      Hello ${name},
      
      We received a request to reset your password for your SIMS account.
      
      Click the link below to reset your password:
      ${resetLink}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email or contact support if you have concerns.
      
      This is an automated message, please do not reply to this email.
    `,
  };

  const transporter = createTransporter();

  // Nếu không có transporter (development mode), log ra console
  if (!transporter) {
    console.log("\n=== EMAIL (Development Mode) ===");
    console.log("To:", email);
    console.log("Subject:", mailOptions.subject);
    console.log("Reset Link:", resetLink);
    console.log("===============================\n");
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send password reset email");
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log("⚠️  Email service not configured. Running in development mode.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("✅ Email service configured successfully");
    return true;
  } catch (error) {
    console.error("❌ Email service configuration error:", error);
    return false;
  }
}
