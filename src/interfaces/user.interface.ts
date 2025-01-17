export interface IName {
  title: string
  first: string
  last: string
}

export interface IAddress {
  city: string
  state: string
  country: string
  street: string
}

export interface IItems {
  id: string
  gender: string
  name: IName
  address: IAddress
  email: string
  age: string
  picture: string
  createdAt: Date
}

export interface ISearchQuery {
  [key: string]: any
}
