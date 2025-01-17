export interface IQueueServiceConfig {
  sleepTime: number
  batchSize: number
  requestCounter: number
  resultsPerRequest: number
  requestsPerSecond: number
  processedRequests: number
  lastRequestTime: number
  apiUrl: string
  requestsInCurrentWindow: number
}

export interface IBatchMessage {
  batchNumber: number
  requestsInBatch: number
  totalRequests: number
}
