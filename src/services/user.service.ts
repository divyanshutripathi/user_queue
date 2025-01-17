import { User } from "../models/user.model"
import { IPagination } from "../interfaces/pagination.interface"

export class UserService {
  async getUsers(
    page: number = 1,
    limit: number = 10,
    sortBy: string = "createdAt:-1",
    search?: Record<string, any>
  ): Promise<IPagination<any>> {
    const skip = (page - 1) * limit
    const query = this.buildSearchQuery(search)
    console.log("sorrrtttttt : ", sortBy)

    const [total, items] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort(sortBy).skip(skip).limit(limit).lean(),
    ])

    return {
      total,
      limit,
      page,
      sortBy,
      items,
    }
  }

  private buildSearchQuery(search?: Record<string, any>): Record<string, any> {
    if (!search) return {}

    const query: Record<string, any> = {}

    Object.entries(search).forEach(([key, value]) => {
      if (value) {
        if (key === "name") {
          query.$or = [
            { "name.first": new RegExp(value, "i") },
            { "name.last": new RegExp(value, "i") },
          ]
        } else if (key === "age") {
          query[key] = value
        } else {
          query[key] = new RegExp(value, "i")
        }
      }
    })

    return query
  }
}
