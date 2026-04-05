import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "staff" | "customer";
  isActive: boolean;
  phone?: string;
  companyName?: string;
  avatarUrl?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "staff", "customer"],
      default: "customer"
    },
    isActive: { type: Boolean, default: false },
    phone: { type: String, default: null },
    companyName: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);


export default User;
