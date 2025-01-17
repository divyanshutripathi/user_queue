import { Request, Response, NextFunction } from "express"
import { UserService } from "../services/user.service"
import { QueueService } from "../services/queue.service"
import { IQueryOptions } from "../interfaces/user.interface"
import { queryParameteres } from "../config/app.config"
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
      const { page, limit, sort, search } = req.query

      const queryParams: IQueryOptions = {
        page: page ? Number(page) : queryParameteres.DEFAULT_PAGE,
        limit: limit ? Number(limit) : queryParameteres.DEFAULT_LIMIT,
        sort: sort as string,
        search: search ? JSON.parse(search as string) : {},
      }

      const users = await this.userService.getUsers(queryParams)
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
      const { totalUsers = 5000 } = req.body
      await this.queueService.addToQueue(totalUsers)
      res.json({ message: "User fetch initiated" })
    } catch (error) {
      next(error)
    }
  }
}
