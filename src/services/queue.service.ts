import amqp from "amqplib"
import { Config } from "../models/config.model"
import axios from "axios"
import { sleep } from "../utils/helper"
import { User } from "../models/user.model"
import {
  IQueueServiceConfig,
  IBatchMessage,
} from "../interfaces/queue.interface"
import { appConfig } from "../config/app.config"

export class QueueService {
  private connection!: amqp.Connection
  private channel!: amqp.Channel
  private readonly QUEUE_NAME: string = "user-fetch"
  private static instance: QueueService
  private config!: IQueueServiceConfig
  private isInitialized: boolean = false
  private readonly SLEEP_AFTER_REQUESTS = 5

  private constructor() {}

  async init(): Promise<void> {
    try {
      // Load configuration from database
      const dbConfig = await Config.findOne()
      if (!dbConfig) {
        throw new Error("Configuration not found in database")
      }

      this.config = {
        sleepTime: dbConfig.sleepTime || appConfig.SLEEP_TIME,
        batchSize: dbConfig.requestsPerBatch || appConfig.BATCH_SIZE,
        requestsPerSecond:
          dbConfig.requestsPerSecond || appConfig.REQUESTS_PER_SECOND,
        resultsPerRequest:
          dbConfig.resultsPerRequest || appConfig.RESULTS_PER_REQUEST,
        apiUrl: dbConfig.apiUrl,
        requestCounter: 0,
        processedRequests: 0,
        lastRequestTime: Date.now(),
        requestsInCurrentWindow: 0,
      }

      // Initialize AMQP connection
      this.connection = await amqp.connect(
        process.env.AMQP_URL || "amqp://localhost"
      )
      this.channel = await this.connection.createChannel()
      await this.channel.assertQueue(this.QUEUE_NAME, { durable: true })
      await this.channel.prefetch(1)

      console.log("Queue service initialized with configuration:", this.config)
      this.isInitialized = true
    } catch (error) {
      console.error("Failed to initialize QueueService:", error)
      throw error
    }
  }

  private calculateBatchDetails(totalUsers: number): {
    totalRequests: number
    numberOfBatches: number
    lastBatchSize: number
    lastBatchUserCount: number
  } {
    // Calculate total API requests needed
    const totalRequests = Math.ceil(totalUsers / this.config.resultsPerRequest)

    // Calculate number of full batches needed
    const numberOfBatches = Math.ceil(totalRequests / this.config.batchSize)

    // Calculate size of the last batch
    const lastBatchSize =
      totalRequests % this.config.batchSize || this.config.batchSize

    // Calculate number of users in the last batch
    const totalUsersInFullRequests =
      (totalRequests - 1) * this.config.resultsPerRequest
    const lastBatchUserCount = totalUsers - totalUsersInFullRequests

    return {
      totalRequests,
      numberOfBatches,
      lastBatchSize,
      lastBatchUserCount,
    }
  }

  static async getInstance(): Promise<QueueService> {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService()
    }
    return QueueService.instance
  }

  private async saveUsers(responseData: any): Promise<void> {
    const users = responseData.results.map((user: any) => ({
      gender: user.gender,
      name: {
        title: user.name.title,
        first: user.name.first,
        last: user.name.last,
      },
      address: {
        city: user.location.city,
        state: user.location.state,
        country: user.location.country,
        street: user.location.street.name,
      },
      email: user.email,
      age: user.dob.age,
      picture: user.picture.large,
    }))

    await User.insertMany(users)
    console.log(`Saved ${users.length} users to database`)
  }

  private async rateLimitRequest(): Promise<void> {
    const now = Date.now()

    if (this.config.requestsInCurrentWindow >= this.SLEEP_AFTER_REQUESTS) {
      console.log(
        `Sleeping for ${this.config.sleepTime}ms after ${this.SLEEP_AFTER_REQUESTS} requests...`
      )
      await sleep(this.config.sleepTime)
      this.config.requestsInCurrentWindow = 0
      this.config.requestCounter = 0
      this.config.lastRequestTime = now
      return
    }

    if (this.config.requestCounter >= this.config.requestsPerSecond) {
      const timeSinceLastRequest = now - this.config.lastRequestTime
      if (timeSinceLastRequest < 1000) {
        await sleep(1000 - timeSinceLastRequest)
      }
      this.config.requestCounter = 0
      this.config.lastRequestTime = now
    }

    this.config.requestCounter++
    this.config.requestsInCurrentWindow++
    this.config.lastRequestTime = now
  }

  private async processBatch(batchMessage: IBatchMessage): Promise<void> {
    console.log(
      `Processing batch ${batchMessage.batchNumber} with ${batchMessage.requestsInBatch} requests`
    )

    let processedInBatch = 0

    while (processedInBatch < batchMessage.requestsInBatch) {
      await this.rateLimitRequest()

      try {
        const isLastRequest =
          batchMessage.isLastBatch &&
          processedInBatch === batchMessage.requestsInBatch - 1

        const resultsToRequest =
          isLastRequest && batchMessage.lastBatchUserCount
            ? batchMessage.lastBatchUserCount
            : this.config.resultsPerRequest

        const response = await axios.get(
          `${this.config.apiUrl}?results=${resultsToRequest}`
        )
        await this.saveUsers(response.data)
        processedInBatch++
        this.config.processedRequests++

        console.log(
          `Batch ${batchMessage.batchNumber}: ` +
            `Processed ${processedInBatch}/${batchMessage.requestsInBatch} requests, ` +
            `Total: ${this.config.processedRequests}/${batchMessage.totalRequests} requests` +
            (isLastRequest
              ? `, Last request fetched ${resultsToRequest} users`
              : "")
        )
      } catch (error) {
        console.error("Error in batch processing:", error)
        throw error
      }
    }

    console.log(
      `Completed batch ${batchMessage.batchNumber}. ` +
        `Processed ${processedInBatch} requests`
    )
  }

  async startProcessing(): Promise<void> {
    if (!this.isInitialized) {
      await this.init()
    }

    console.log("Starting to process messages from queue...")

    this.channel.consume(this.QUEUE_NAME, async (msg) => {
      if (!msg) return

      try {
        const batchMessage: IBatchMessage = JSON.parse(msg.content.toString())
        await this.processBatch(batchMessage)
        this.channel.ack(msg)
      } catch (error) {
        console.error("Error processing message:", error)
        this.channel.nack(msg, false, true)
      }
    })
  }

  async addToQueue(totalUsers: number): Promise<void> {
    if (!this.isInitialized) {
      await this.init()
    }

    try {
      const {
        totalRequests,
        numberOfBatches,
        lastBatchSize,
        lastBatchUserCount,
      } = this.calculateBatchDetails(totalUsers)

      console.log(
        `Breaking down ${totalUsers} users into ${numberOfBatches} batches. ` +
          `Total API requests needed: ${totalRequests}. ` +
          `Last batch size: ${lastBatchSize}, ` +
          `Last request users: ${lastBatchUserCount}`
      )

      // Add each batch to the queue
      for (let i = 0; i < numberOfBatches; i++) {
        const isLastBatch = i === numberOfBatches - 1
        const requestsInBatch = isLastBatch
          ? lastBatchSize
          : this.config.batchSize
        console.log(
          `isLastBatch ${isLastBatch}, lastBatchSize ${lastBatchSize}`
        )
        const batchMessage: IBatchMessage = {
          batchNumber: i + 1,
          requestsInBatch,
          totalRequests,
          isLastBatch,
          lastBatchUserCount: isLastBatch ? lastBatchUserCount : undefined,
        }
        await this.channel.sendToQueue(
          this.QUEUE_NAME,
          Buffer.from(JSON.stringify(batchMessage))
        )

        console.log(
          `Added batch ${i + 1}/${numberOfBatches} to queue ` +
            `with ${requestsInBatch} requests` +
            (isLastBatch
              ? ` (last batch will fetch ${lastBatchUserCount} users in final request)`
              : "")
        )
      }

      console.log(
        `Successfully queued ${totalUsers} users requiring ${totalRequests} ` +
          `API requests in ${numberOfBatches} batches`
      )
    } catch (error) {
      console.error("Error adding to queue:", error)
      throw error
    }
  }

  async closeConnection() {
    try {
      await this.channel.close()
      await this.connection.close()
      this.isInitialized = false
    } catch (error) {
      console.error("Error closing queue connection:", error)
      throw error
    }
  }
}
