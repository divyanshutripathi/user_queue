export interface IQueryOptions {
  page?: number | string
  limit?: number | string
  sort?: string
  search?: Record<string, any>
}

export interface IUserName {
  title: string
  first: string
  last: string
}

export interface IUserAddress {
  city: string
  state: string
  country: string
  street: string
}

export interface IUser {
  gender: string
  name: IUserName
  address: IUserAddress
  email: string
  age: number
  picture: string
  createdAt: Date
}
