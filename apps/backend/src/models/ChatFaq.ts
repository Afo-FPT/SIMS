import mongoose, { Schema, Document, Types } from "mongoose";

export type ChatFaqRole = "customer" | "manager" | "staff" | "admin";

export interface IChatFaqItem {
  label: string;
  prompt: string;
}

export interface IChatFaq extends Document {
  role: ChatFaqRole;
  /** Used to migrate default FAQ sets over time */
  version?: number;
  items: IChatFaqItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatFaqSchema = new Schema<IChatFaq>(
  {
    role: { type: String, required: true, enum: ["customer", "manager", "staff", "admin"], unique: true, index: true },
    version: { type: Number, default: 1 },
    items: [
      {
        label: { type: String, required: true, trim: true, maxlength: 120 },
        prompt: { type: String, required: true, trim: true, maxlength: 500 },
      },
    ],
  },
  { timestamps: true }
);

// Ensure stable ordering by label/prompt; no additional constraints needed.
ChatFaqSchema.index({ role: 1 });

export const ChatFaq = mongoose.model<IChatFaq>("ChatFaq", ChatFaqSchema);

