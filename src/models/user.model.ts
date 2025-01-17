import { Schema, model } from "mongoose"
// validations for user schema
const UserSchema = new Schema({
  gender: String,
  name: {
    title: String,
    first: String,
    last: String,
  },
  address: {
    city: String,
    state: String,
    country: String,
    street: String,
  },
  email: String,
  age: String,
  picture: String,
  createdAt: { type: Date, default: Date.now },
})

UserSchema.index({
  "name.first": "text",
  "name.last": "text",
  email: "text",
  "address.country": "text",
})

export const User = model("User", UserSchema)
