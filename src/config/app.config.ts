interface IAppConfig {
  API_URL: string
  REQUESTS_PER_SECOND: number
  RESULTS_PER_REQUEST: number
  SLEEP_TIME: number
  BATCH_SLEEP: number
  REQUESTS_PER_BATCH: number
  BATCH_SIZE: number
}

export const appConfig: IAppConfig = {
  API_URL: "https://randomuser.me/api/",
  REQUESTS_PER_SECOND: Number(process.env.REQUEST_PER_SECOND) || 5,
  RESULTS_PER_REQUEST: Number(process.env.RESULTS_PER_REQUEST) || 20,
  SLEEP_TIME: Number(process.env.SLEEP_TIME) || 30000,
  BATCH_SLEEP: Number(process.env.BATCH_SLEEP) || 5000,
  REQUESTS_PER_BATCH: Number(process.env.REQUEST_PER_BATCH) || 5,
  BATCH_SIZE: Number(process.env.BATCH_SIZE) || 5,
}
