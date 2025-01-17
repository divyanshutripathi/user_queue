import { Schema, model, Document } from "mongoose"

const ConfigSchema = new Schema({
  requestsPerSecond: { type: Number, default: 5 },
  resultsPerRequest: { type: Number, default: 5000 },
  requestsPerBatch: { type: Number, default: 300 },
  sleepTime: { type: Number, default: 30000 },
  batchSleep: { type: Number, default: 5000 },
  apiUrl: { type: String, default: "https://randomuser.me/api/" },
})

export const Config = model("Config", ConfigSchema)
