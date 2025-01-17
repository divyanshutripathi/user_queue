export interface IPagination<T> {
  total: number
  limit: number
  page: number
  sortBy: string
  items: T[]
}
