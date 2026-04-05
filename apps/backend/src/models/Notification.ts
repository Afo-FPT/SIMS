import mongoose, { Schema, Document, Types } from "mongoose";

export type NotificationChannel = "in_app" | "email";
export type NotificationEntityType = "storage_request" | "contract";
export type NotificationType =
  | "REQUEST_CREATED"
  | "REQUEST_UPDATED"
  | "REQUEST_STATUS_CHANGED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "REQUEST_ASSIGNED"
  | "REQUEST_DONE_BY_STAFF"
  | "REQUEST_COMPLETED"
  | "CONTRACT_EXPIRED"
  | "CONTRACT_TERMINATED";

export interface INotification extends Document {
  userId: Types.ObjectId;
  /** Used to prevent duplicates for same event/user/entity */
  dedupeKey?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: NotificationEntityType;
  relatedEntityId?: Types.ObjectId;
  read: boolean;
  readAt?: Date;
  /** Metadata payload for rendering + deep linking */
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dedupeKey: { type: String, trim: true, default: undefined, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "REQUEST_CREATED",
        "REQUEST_UPDATED",
        "REQUEST_STATUS_CHANGED",
        "REQUEST_APPROVED",
        "REQUEST_REJECTED",
        "REQUEST_ASSIGNED",
        "REQUEST_DONE_BY_STAFF",
        "REQUEST_COMPLETED",
        "CONTRACT_EXPIRED",
        "CONTRACT_TERMINATED"
      ]
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedEntityType: { type: String, enum: ["storage_request", "contract"], default: undefined },
    relatedEntityId: { type: Schema.Types.ObjectId, default: undefined, index: true },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    meta: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
// Prevent duplicates (only when dedupeKey is present)
NotificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $exists: true } } });

const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
export default Notification;

