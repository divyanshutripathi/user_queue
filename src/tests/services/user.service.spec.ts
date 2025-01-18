import { UserService } from "../../services/user.service"
import { User } from "../../models/user.model"
import { QueryHelper } from "../../utils/query.helper"
import { IUser, IQueryOptions } from "../../interfaces/user.interface"

// Mock the User model and QueryHelper
jest.mock("../../models/user.model")
jest.mock("../../utils/query.helper")

describe("UserService", () => {
  let userService: UserService
  let mockUsers: IUser[]
  let mockExec: jest.Mock
  let mockLean: jest.Mock
  let mockLimit: jest.Mock
  let mockSkip: jest.Mock
  let mockSort: jest.Mock
  let mockFind: jest.Mock

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Initialize UserService
    userService = new UserService()

    // Create mock users with correct interface structure
    mockUsers = [
      {
        gender: "male",
        name: {
          title: "Mr",
          first: "John",
          last: "Doe",
        },
        address: {
          city: "New York",
          state: "NY",
          country: "USA",
          street: "123 Main St",
        },
        email: "john.doe@example.com",
        age: 38,
        picture: "https://example.com/picture1.jpg",
        createdAt: new Date("2024-01-01"),
      },
      {
        gender: "female",
        name: {
          title: "Ms",
          first: "Jane",
          last: "Smith",
        },
        address: {
          city: "Los Angeles",
          state: "CA",
          country: "USA",
          street: "456 Oak St",
        },
        email: "jane.smith@example.com",
        age: 42,
        picture: "https://example.com/picture2.jpg",
        createdAt: new Date("2024-01-02"),
      },
    ]

    // Setup mock chain
    mockExec = jest.fn().mockResolvedValue(mockUsers)
    mockLean = jest.fn().mockReturnValue({ exec: mockExec })
    mockLimit = jest.fn().mockReturnValue({ lean: mockLean })
    mockSkip = jest.fn().mockReturnValue({ limit: mockLimit })
    mockSort = jest.fn().mockReturnValue({ skip: mockSkip })
    mockFind = jest.fn().mockReturnValue({ sort: mockSort })

    // Mock User model methods
    ;(User.find as jest.Mock) = mockFind
    ;(User.countDocuments as jest.Mock) = jest
      .fn()
      .mockResolvedValue(mockUsers.length)

    // Mock QueryHelper methods
    ;(QueryHelper.buildSearchQuery as jest.Mock) = jest.fn().mockReturnValue({})
    ;(QueryHelper.parseSortString as jest.Mock) = jest
      .fn()
      .mockReturnValue({ createdAt: -1 })
  })

  describe("getUsers", () => {
    it("should return users with default pagination parameters", async () => {
      const result = await userService.getUsers()

      expect(result).toEqual({
        total: 2,
        limit: 10,
        page: 1,
        sortBy: "createdAt:-1",
        items: mockUsers,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      })

      expect(User.countDocuments).toHaveBeenCalledWith({})
      expect(User.find).toHaveBeenCalledWith({})
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 })
      expect(mockSkip).toHaveBeenCalledWith(0)
      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it("should handle custom pagination parameters with complex search query", async () => {
      const options: IQueryOptions = {
        page: 2,
        limit: 5,
        sort: "age:asc",
        search: { age: { gte: 37 } },
      }

      const expectedSearchQuery = { age: { $gte: 37 } }
      ;(QueryHelper.buildSearchQuery as jest.Mock).mockReturnValue(
        expectedSearchQuery
      )
      ;(QueryHelper.parseSortString as jest.Mock).mockReturnValue({ age: 1 })

      const result = await userService.getUsers(options)

      expect(result).toEqual({
        total: 2,
        limit: 5,
        page: 2,
        sortBy: "age:asc",
        items: mockUsers,
        totalPages: 1,
        hasNext: false,
        hasPrevious: true,
      })

      expect(QueryHelper.buildSearchQuery).toHaveBeenCalledWith({
        age: { gte: 37 },
      })
      expect(mockSkip).toHaveBeenCalledWith(5)
      expect(mockLimit).toHaveBeenCalledWith(5)
    })

    it("should handle invalid pagination parameters", async () => {
      const options: IQueryOptions = {
        page: -1,
        limit: 200,
        sort: "invalid",
        search: {},
      }

      const result = await userService.getUsers(options)

      expect(result.page).toBe(1)
      expect(result.limit).toBe(100)
      expect(mockSkip).toHaveBeenCalledWith(0)
      expect(mockLimit).toHaveBeenCalledWith(100)
    })

    it("should handle string values for page and limit", async () => {
      const options: IQueryOptions = {
        page: "2",
        limit: "20",
        search: { gender: "male" },
      }

      const expectedSearchQuery = { gender: "male" }
      ;(QueryHelper.buildSearchQuery as jest.Mock).mockReturnValue(
        expectedSearchQuery
      )

      const result = await userService.getUsers(options)

      expect(result.page).toBe(2)
      expect(result.limit).toBe(20)
      expect(mockSkip).toHaveBeenCalledWith(20)
      expect(mockLimit).toHaveBeenCalledWith(20)
    })

    it("should handle database query errors", async () => {
      const dbError = new Error("Database connection failed")
      ;(User.countDocuments as jest.Mock).mockRejectedValue(dbError)

      await expect(userService.getUsers()).rejects.toThrow(
        "Failed to fetch users: Database query failed: Database connection failed"
      )
    })

    it("should handle empty search results", async () => {
      ;(User.countDocuments as jest.Mock).mockResolvedValue(0)
      mockExec.mockResolvedValue([])

      const options: IQueryOptions = {
        search: { age: { gt: 100 } },
      }

      const result = await userService.getUsers(options)

      expect(result.total).toBe(0)
      expect(result.items).toEqual([])
      expect(result.totalPages).toBe(0)
      expect(result.hasNext).toBe(false)
      expect(result.hasPrevious).toBe(false)
    })

    it("should handle complex search queries", async () => {
      const options: IQueryOptions = {
        search: {
          age: { gte: 37, lte: 50 },
          gender: "male",
        },
        sort: "age:asc",
      }

      const expectedSearchQuery = {
        age: { $gte: 37, $lte: 50 },
        gender: "male",
      }

      ;(QueryHelper.buildSearchQuery as jest.Mock).mockReturnValue(
        expectedSearchQuery
      )
      ;(QueryHelper.parseSortString as jest.Mock).mockReturnValue({ age: 1 })

      await userService.getUsers(options)

      expect(QueryHelper.buildSearchQuery).toHaveBeenCalledWith(options.search)
      expect(User.find).toHaveBeenCalledWith(expectedSearchQuery)
    })
  })
})
