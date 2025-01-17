import { Request, Response, NextFunction, RequestHandler } from "express"
import { Schema } from "joi"

export const validateRequest = (schema: Schema): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.validateAsync(req.query)
      next()
    } catch (error) {
      res.status(400).json({ error: (error as Error).message })
    }
  }
}
