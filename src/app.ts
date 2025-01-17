import express from "express"
import helmet from "helmet"
import cors from "cors"
import morgan from "morgan"
import { connectDB } from "./config/database.config"
import router from "./routes/user.router"
import { QueueService } from "./services/queue.service"
import { Config } from "./models/config.model"
import { handleError } from "./utils/error-handler"
import { appConfig } from "./config/app.config"

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan("dev"))
app.use(express.json())

// Routes
app.use("/api/v1", router)

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const error = handleError(err)
    res.status(error.status).json({ error: error.message })
  }
)

// Initialize application
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDB()

    await ensureConfig()
    // Initialize Queue Service
    const queueService = await QueueService.getInstance()
    await queueService.startProcessing()

    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error("Failed to initialize application:", error)
    process.exit(1)
  }
}

export const ensureConfig = async () => {
  try {
    const config = await Config.findOne()
    if (!config) {
      const query = {
        requestsPerSecond: appConfig.REQUESTS_PER_SECOND,
        resultsPerRequest: appConfig.RESULTS_PER_REQUEST,
        requestsPerBatch: appConfig.REQUESTS_PER_BATCH,
        sleepTime: appConfig.SLEEP_TIME,
        batchSleep: appConfig.BATCH_SLEEP,
        apiUrl: appConfig.API_URL,
      }
      const defaultConfig = new Config(query)
      await defaultConfig.save()
      console.log("Default configuration created successfully")
      return defaultConfig
    }
    return config
  } catch (error) {
    console.error("Error ensuring configuration:", error)
    throw new Error("Failed to ensure configuration exists")
  }
}

initializeApp()
