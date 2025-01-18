import amqp from "amqplib"
import axios from "axios"
import { QueueService } from "../../services/queue.service"
import { Config } from "../../models/config.model"
import { User } from "../../models/user.model"
import { sleep } from "../../utils/helper"

// Mocks
jest.mock("amqplib")
jest.mock("axios")
jest.mock("../../models/config.model")
jest.mock("../../models/user.model")
jest.mock("../../utils/helper")

describe("QueueService", () => {
  let queueService: QueueService
  let mockChannel: jest.Mocked<amqp.Channel>
  let mockConnection: jest.Mocked<amqp.Connection>

  const mockConfig = {
    sleepTime: 1000,
    requestsPerSecond: 5,
    resultsPerRequest: 100,
    requestsPerBatch: 10,
    apiUrl: "https://randomuser.me/api/",
  }

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mocks
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      prefetch: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn(),
      sendToQueue: jest.fn().mockResolvedValue(true),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<amqp.Channel>

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<amqp.Connection>
    ;(amqp.connect as jest.Mock).mockResolvedValue(mockConnection)
    ;(Config.findOne as jest.Mock).mockResolvedValue(mockConfig)
    ;(User.insertMany as jest.Mock).mockResolvedValue([])
    ;(sleep as jest.Mock).mockResolvedValue(undefined)

    // Reset singleton instance
    ;(QueueService as any).instance = null

    // Get instance and initialize
    queueService = await QueueService.getInstance()
    await queueService.init()
  })

  describe("getInstance", () => {
    it("should create only one instance (Singleton)", async () => {
      const instance1 = await QueueService.getInstance()
      const instance2 = await QueueService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe("init", () => {
    it("should initialize with database config", async () => {
      expect(Config.findOne).toHaveBeenCalled()
      expect(amqp.connect).toHaveBeenCalled()
      expect(mockConnection.createChannel).toHaveBeenCalled()
      expect(mockChannel.assertQueue).toHaveBeenCalled()
      expect(mockChannel.prefetch).toHaveBeenCalled()
    })

    it("should throw error if config not found", async () => {
      // Reset singleton instance
      ;(QueueService as any).instance = null
      queueService = await QueueService.getInstance()
      ;(Config.findOne as jest.Mock).mockResolvedValueOnce(null)
      await expect(queueService.init()).rejects.toThrow(
        "Configuration not found"
      )
    })

    it("should handle connection errors", async () => {
      // Reset singleton instance
      ;(QueueService as any).instance = null
      queueService = await QueueService.getInstance()
      ;(amqp.connect as jest.Mock).mockRejectedValueOnce(
        new Error("Connection failed")
      )
      await expect(queueService.init()).rejects.toThrow("Connection failed")
    })
  })

  describe("addToQueue", () => {
    it("should correctly queue batches for processing", async () => {
      await queueService.addToQueue(250)

      // With 250 users and resultsPerRequest = 100
      // We need 3 requests total (100 + 100 + 50 users)
      // With requestsPerBatch = 10, we need 1 batch
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1)

      const sentMessage = JSON.parse(
        (mockChannel.sendToQueue as jest.Mock).mock.calls[0][1].toString()
      )
      expect(sentMessage).toEqual({
        batchNumber: 1,
        requestsInBatch: 3,
        totalRequests: 3,
        isLastBatch: true,
        lastBatchUserCount: 50,
      })
    })

    it("should handle large numbers of users", async () => {
      await queueService.addToQueue(1000)

      // With 1000 users and resultsPerRequest = 100
      // We need 10 requests total
      // With requestsPerBatch = 10, we need 1 batch
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1)
    })

    it("should initialize if not already initialized", async () => {
      // Reset initialization flag
      ;(queueService as any).isInitialized = false

      await queueService.addToQueue(100)

      expect(Config.findOne).toHaveBeenCalled()
      expect(mockChannel.sendToQueue).toHaveBeenCalled()
    })
  })

  describe("startProcessing", () => {
    it("should process messages from queue", async () => {
      const mockMsg = {
        content: Buffer.from(
          JSON.stringify({
            batchNumber: 1,
            requestsInBatch: 2,
            totalRequests: 2,
            isLastBatch: true,
            lastBatchUserCount: 50,
          })
        ),
      }

      ;(axios.get as jest.Mock).mockResolvedValue({
        data: {
          results: [
            {
              gender: "male",
              name: { title: "Mr", first: "John", last: "Doe" },
              location: {
                city: "City",
                state: "State",
                country: "Country",
                street: { name: "Street" },
              },
              email: "john@example.com",
              dob: { age: 30 },
              picture: { large: "url" },
            },
          ],
        },
      })

      let consumeCallback: any
      mockChannel.consume.mockImplementation((queue, callback) => {
        consumeCallback = callback
        return Promise.resolve({ consumerTag: "123" })
      })

      await queueService.startProcessing()
      await consumeCallback(mockMsg)

      expect(axios.get).toHaveBeenCalled()
      expect(User.insertMany).toHaveBeenCalled()
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg)
    })

    it("should handle processing errors", async () => {
      const mockMsg = {
        content: Buffer.from(
          JSON.stringify({
            batchNumber: 1,
            requestsInBatch: 1,
            totalRequests: 1,
          })
        ),
      }

      let consumeCallback: any
      mockChannel.consume.mockImplementation((queue, callback) => {
        consumeCallback = callback
        return Promise.resolve({ consumerTag: "123" })
      })
      ;(axios.get as jest.Mock).mockRejectedValue(new Error("API Error"))

      await queueService.startProcessing()
      await consumeCallback(mockMsg)

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, true)
    })

    it("should initialize if not already initialized", async () => {
      // Reset initialization flag
      ;(queueService as any).isInitialized = false

      await queueService.startProcessing()

      expect(Config.findOne).toHaveBeenCalled()
      expect(mockChannel.consume).toHaveBeenCalled()
    })
  })

  describe("closeConnection", () => {
    it("should close channel and connection", async () => {
      await queueService.closeConnection()
      expect(mockChannel.close).toHaveBeenCalled()
      expect(mockConnection.close).toHaveBeenCalled()
    })

    it("should handle closing errors", async () => {
      mockChannel.close.mockRejectedValueOnce(new Error("Close failed"))
      await expect(queueService.closeConnection()).rejects.toThrow(
        "Close failed"
      )
    })
  })

  describe("rate limiting", () => {
    it("should respect rate limits", async () => {
      const mockMsg = {
        content: Buffer.from(
          JSON.stringify({
            batchNumber: 1,
            requestsInBatch: 6, // More than SLEEP_AFTER_REQUESTS
            totalRequests: 6,
          })
        ),
      }

      ;(axios.get as jest.Mock).mockResolvedValue({
        data: { results: [] },
      })

      let consumeCallback: any
      mockChannel.consume.mockImplementation((queue, callback) => {
        consumeCallback = callback
        return Promise.resolve({ consumerTag: "123" })
      })

      await queueService.startProcessing()
      await consumeCallback(mockMsg)

      // Should have called sleep after SLEEP_AFTER_REQUESTS requests
      expect(sleep).toHaveBeenCalled()
    })

    it("should reset counters after sleep", async () => {
      const mockMsg = {
        content: Buffer.from(
          JSON.stringify({
            batchNumber: 1,
            requestsInBatch: 6,
            totalRequests: 6,
          })
        ),
      }

      ;(axios.get as jest.Mock).mockResolvedValue({
        data: { results: [] },
      })

      let consumeCallback: any
      mockChannel.consume.mockImplementation((queue, callback) => {
        consumeCallback = callback
        return Promise.resolve({ consumerTag: "123" })
      })

      await queueService.startProcessing()
      await consumeCallback(mockMsg)

      // Check if counters were reset after sleep
      expect((queueService as any).config.requestsInCurrentWindow).toBe(0)
      expect((queueService as any).config.requestCounter).toBe(0)
    })
  })
})
