import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "staff" | "customer";
  isActive: boolean;
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
    isActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);


export default User;
