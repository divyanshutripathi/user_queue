import { FilterQuery } from "mongoose"
import { IUser } from "../interfaces/user.interface"
import { queryParameteres } from "../config/app.config"

export class QueryHelper {
  public static buildSearchQuery(
    search?: Record<string, any>
  ): FilterQuery<IUser> {
    if (!search || Object.keys(search).length === 0) return {}

    const query: FilterQuery<IUser> = {}

    Object.entries(search).forEach(([key, value]) => {
      if (!value || !queryParameteres.VALID_SEARCH_FIELDS.includes(key)) return

      try {
        const fieldQuery = this.getFieldQuery(key, value)
        Object.assign(query, fieldQuery)
      } catch (error) {
        console.warn(`Error processing search field ${key}:`, error)
      }
    })

    return query
  }

  public static handleNumericComparison(
    value: Record<string, any>
  ): Record<string, number> {
    const numericQuery: Record<string, number> = {}
    const operators = {
      gt: "$gt",
      lt: "$lt",
      gte: "$gte",
      lte: "$lte",
      eq: "$eq",
    }

    Object.entries(operators).forEach(([key, mongoOperator]) => {
      if (value[key]) {
        const parsedValue = parseInt(String(value[key]))
        if (!isNaN(parsedValue)) {
          numericQuery[mongoOperator] = parsedValue
        }
      }
    })

    return numericQuery
  }

  private static readonly SORT_ORDER_MAP = {
    asc: 1,
    desc: -1,
    "1": 1,
    "-1": -1,
  } as const

  public static parseSortString(sortStr: string): Record<string, 1 | -1> {
    const sort: Record<string, 1 | -1> = {}

    if (!sortStr) return { createdAt: -1 }

    try {
      const sortPairs = sortStr.split(",").map((pair) => pair.trim())

      for (const pair of sortPairs) {
        const [field, order] = pair
          .split(":")
          .map((item) => item.trim().toLowerCase())

        if (!field || !order) continue
        if (!queryParameteres.VALID_SORT_FIELDS.includes(field)) continue

        const normalizedOrder = this.normalizeSortOrder(order)
        if (normalizedOrder !== undefined) {
          sort[field] = normalizedOrder
        }
      }
    } catch (error) {
      console.warn("Error parsing sort string:", error)
    }

    return Object.keys(sort).length ? sort : { createdAt: -1 }
  }

  private static normalizeSortOrder(order: string): 1 | -1 | undefined {
    const normalizedOrder = order.toLowerCase()
    return this.SORT_ORDER_MAP[
      normalizedOrder as keyof typeof this.SORT_ORDER_MAP
    ]
  }

  private static getFieldQuery(key: string, value: any): FilterQuery<IUser> {
    switch (key) {
      case "name":
        return this.buildNameQuery(value)
      case "age":
        return { age: this.buildAgeQuery(value) }
      case "address":
        return this.buildAddressQuery(value)
      case "email":
        return { email: new RegExp(String(value).trim(), "i") }
      case "gender":
        return { gender: new RegExp(`^${String(value).trim()}$`, "i") }
      default:
        return { [key]: new RegExp(String(value).trim(), "i") }
    }
  }

  private static buildNameQuery(value: any): FilterQuery<IUser> {
    if (typeof value === "string") {
      return {
        $or: [
          { "name.first": new RegExp(value.trim(), "i") },
          { "name.last": new RegExp(value.trim(), "i") },
        ],
      }
    }

    const nameQuery: Record<string, any> = {}
    if (value.first) {
      nameQuery["name.first"] = new RegExp(String(value.first).trim(), "i")
    }
    if (value.last) {
      nameQuery["name.last"] = new RegExp(String(value.last).trim(), "i")
    }
    return nameQuery
  }

  private static buildAgeQuery(value: any): any {
    if (typeof value === "object") {
      return this.handleNumericComparison(value)
    }
    const parsedAge = parseInt(String(value))
    return !isNaN(parsedAge) ? parsedAge : undefined
  }

  private static buildAddressQuery(
    value: Record<string, any>
  ): FilterQuery<IUser> {
    const addressQuery: Record<string, any> = {}
    Object.entries(value).forEach(([addressKey, addressValue]) => {
      if (addressValue) {
        addressQuery[`address.${addressKey}`] = new RegExp(
          String(addressValue).trim(),
          "i"
        )
      }
    })
    return addressQuery
  }
}
