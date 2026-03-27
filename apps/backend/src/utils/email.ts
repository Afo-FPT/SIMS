import nodemailer from "nodemailer";

/**
 * Tạo transporter cho nodemailer
 * Hỗ trợ nhiều email provider: Gmail, Outlook, SendGrid, etc.
 */
const createTransporter = () => {
  // Nếu có SMTP config trong .env, sử dụng nó
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpSecure =
      process.env.SMTP_SECURE === "true" || (!process.env.SMTP_SECURE && smtpPort === 465);
    const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    if (!process.env.SMTP_USER || !smtpPassword) {
      console.warn("⚠️  SMTP_USER/SMTP_PASSWORD (or SMTP_PASS) missing. Email disabled.");
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPassword,
      },
      // Avoid very long startup hangs if outbound network is restricted
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  // Nếu có Gmail config, sử dụng Gmail
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      // Use explicit SMTP settings to reduce provider-specific defaults issues
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS on 587
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // App Password, không phải password thường
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  // Development mode: sử dụng Ethereal Email (fake SMTP server)
  // Hoặc có thể dùng console.log để test
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️  Email service not configured. Using console output for development.");
    return null; // Sẽ fallback sang console.log
  }

  // Production mode: do not crash the whole server if email is not configured.
  // Some deployments may not need email features enabled.
  console.warn("⚠️  Email service not configured. Email features will be disabled.");
  return null;
};

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const getDefaultFromForResend = (): string =>
  process.env.RESEND_FROM ||
  process.env.EMAIL_FROM ||
  process.env.SMTP_USER ||
  process.env.GMAIL_USER ||
  "noreply@sims.ai";

const getDefaultFromForSMTP = (): string =>
  process.env.EMAIL_FROM ||
  process.env.SMTP_USER ||
  process.env.GMAIL_USER ||
  "noreply@sims.ai";

const sendViaResend = async (payload: EmailPayload): Promise<boolean> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getDefaultFromForResend(),
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorText}`);
  }

  return true;
};

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      return;
    } catch (error) {
      console.error("Resend send failed, fallback to SMTP/Gmail:", error);
    }
  }

  const transporter = createTransporter();
  const mailOptions = {
    from: getDefaultFromForSMTP(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text
  };

  if (!transporter) {
    console.log("\n=== EMAIL (Development Mode) ===");
    console.log("To:", params.to);
    console.log("Subject:", params.subject);
    console.log("Text:", params.text || "");
    console.log("===============================\n");
    return;
  }

  await transporter.sendMail(mailOptions);
}

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
    from: getDefaultFromForSMTP(),
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

  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend({
        to: email,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      });
      console.log(`Password reset email sent via Resend to ${email}`);
      return;
    } catch (error) {
      console.error("Resend send failed, fallback to SMTP/Gmail:", error);
    }
  }

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
  if (process.env.RESEND_API_KEY) {
    console.log("✅ Email service configured with Resend API");
    return true;
  }

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
