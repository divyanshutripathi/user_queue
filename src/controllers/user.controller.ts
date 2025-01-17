import { Request, Response, NextFunction } from "express"
import { UserService } from "../services/user.service"
import { QueueService } from "../services/queue.service"
import { searchSchema } from "../utils/validation"

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly queueService: QueueService
  ) {}

  getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = 1, limit = 10, sort = "createdAt:-1", search } = req.query
      console.log(
        `Fetching users with page: ${page}, limit: ${limit}, sort: ${sort}`
      )
      let searchQuery
      if (search) {
        const parsedSearch = JSON.parse(search as string)
        const { error } = searchSchema.validate(parsedSearch)
        if (error) {
          res.status(400).json({ error: error.details[0].message })
          return
        }
        searchQuery = parsedSearch
      }

      const users = await this.userService.getUsers(
        Number(page),
        Number(limit),
        sort as string,
        searchQuery
      )

      res.json(users)
    } catch (error) {
      next(error)
    }
  }

  initiateFetch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log("Initiating user fetch")
      const { totalUsers = 5000 } = req.body
      this.queueService.addToQueue(totalUsers)
      res.json({ message: "User fetch initiated" })
    } catch (error) {
      console.error("Error initiating user fetch:", error)
      next(error)
    }
  }
}
