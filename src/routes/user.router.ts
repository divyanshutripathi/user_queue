import { Router } from "express"
import { UserController } from "../controllers/user.controller"
import { UserService } from "../services/user.service"
import { QueueService } from "../services/queue.service"
import { rateLimiter } from "../middlewares/rate-limiter"
import { validateRequest } from "../middlewares/validate.middleware"
import { getUsersQuerySchema } from "../utils/validation"

const router = Router()
const userService = new UserService()

let userController: UserController

const initializeRouter = async () => {
  const queueService = await QueueService.getInstance()
  userController = new UserController(userService, queueService)

  router.get(
    "/users",
    rateLimiter,
    validateRequest(getUsersQuerySchema),
    userController.getUsers.bind(userController)
  )

  router.post(
    "/users/add",
    rateLimiter,
    userController.initiateFetch.bind(userController)
  )
}

initializeRouter().catch((error) => {
  console.error("Failed to initialize router:", error)
  process.exit(1)
})

export default router
