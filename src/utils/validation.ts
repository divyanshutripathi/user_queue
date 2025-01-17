import Joi from "joi"

export const getUsersQuerySchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).optional(),
  sort: Joi.string().optional(),
  search: Joi.string()
    .custom((value, helpers) => {
      try {
        JSON.parse(value)
        return value
      } catch (error) {
        return helpers.error("string.invalid")
      }
    })
    .optional(),
})

export const searchSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  age: Joi.number().min(0).optional(),
  gender: Joi.string().valid("male", "female").optional(),
  country: Joi.string().optional(),
}).unknown(true)
