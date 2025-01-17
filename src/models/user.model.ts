import { Schema, model, Document } from "mongoose"
import { IUser } from "../interfaces/user.interface"
const UserSchema = new Schema({
  gender: {
    type: String,
    required: [true, "Gender is required"],
    enum: {
      values: ["male", "female", "other"],
      message: "Gender must be either male, female, or other",
    },
    trim: true,
    lowercase: true,
  },
  name: {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    first: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    last: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters long"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
  },
  address: {
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    street: {
      type: String,
      required: [true, "Street is required"],
      trim: true,
    },
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
  },
  age: {
    type: Number,
    required: [true, "Age is required"],
    min: [0, "Age cannot be negative"],
    max: [150, "Age cannot exceed 150"],
  },
  picture: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Indexes for efficient searching
UserSchema.index({
  "name.first": "text",
  "name.last": "text",
  email: "text",
  "address.country": "text",
})

export const User = model<IUser & Document>("User", UserSchema)
