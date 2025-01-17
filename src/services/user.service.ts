import { User } from "../models/user.model"
import { IPagination } from "../interfaces/pagination.interface"
import { IQueryOptions, IUser } from "../interfaces/user.interface"
import { QueryHelper } from "../utils/query.helper"

export class UserService {
  private readonly DEFAULT_PAGE = 1
  private readonly DEFAULT_LIMIT = 10
  private readonly DEFAULT_SORT = "createdAt:-1"
  private readonly MAX_LIMIT = 100

  async getUsers(options: IQueryOptions = {}): Promise<IPagination<IUser>> {
    try {
      const {
        page = this.DEFAULT_PAGE,
        limit = this.DEFAULT_LIMIT,
        sort = this.DEFAULT_SORT,
        search,
      } = options

      const sanitizedPage = Math.max(1, parseInt(String(page)))
      const sanitizedLimit = Math.min(
        this.MAX_LIMIT,
        Math.max(1, parseInt(String(limit)))
      )
      const skip = (sanitizedPage - 1) * sanitizedLimit

      const searchQuery = QueryHelper.buildSearchQuery(search)
      const sortConfig = QueryHelper.parseSortString(sort)

      const [total, items] = await Promise.all([
        User.countDocuments(searchQuery),
        User.find(searchQuery)
          .sort(sortConfig)
          .skip(skip)
          .limit(sanitizedLimit)
          .lean()
          .exec(),
      ]).catch((error) => {
        throw new Error(`Database query failed: ${error.message}`)
      })

      return {
        total,
        limit: sanitizedLimit,
        page: sanitizedPage,
        sortBy: sort,
        items,
        totalPages: Math.ceil(total / sanitizedLimit),
        hasNext: skip + items.length < total,
        hasPrevious: sanitizedPage > 1,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred"
      throw new Error(`Failed to fetch users: ${errorMessage}`)
    }
  }
}
