import mongoose, { Document, Schema } from "mongoose";

export interface IAiSetting extends Document {
  key: string;
  enabled: boolean;
  chatModel: string;
  insightModel: string;
  temperature: number;
  maxOutputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const AiSettingSchema = new Schema<IAiSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true, default: "default" },
    enabled: { type: Boolean, required: true, default: true },
    chatModel: { type: String, required: true, trim: true, default: "gemini-2.5-flash" },
    insightModel: { type: String, required: true, trim: true, default: "gemini-2.5-flash" },
    temperature: { type: Number, required: true, min: 0, max: 1, default: 0.3 },
    maxOutputTokens: { type: Number, required: true, min: 128, max: 8192, default: 1024 },
  },
  { timestamps: true }
);

// key already has `unique: true` above.

const AiSetting = mongoose.model<IAiSetting>("AiSetting", AiSettingSchema);

export default AiSetting;
