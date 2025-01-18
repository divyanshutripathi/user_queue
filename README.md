# User Management Service

A Node.js service that manages user data with MongoDB for storage and RabbitMQ for message queuing. The service provides REST APIs for user management and supports batch processing of user data.

## Features

- REST API endpoints for user management
- Batch processing with RabbitMQ queue
- MongoDB for data persistence
- Rate limiting
- Pagination and search functionality
- Docker support for easy deployment

## Prerequisites

- Docker and Docker Compose
- Node.js (v23)
- npm (Node Package Manager)

## Getting Started

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the TypeScript code:

   ```bash
   npm run build
   ```

4. Start the services using Docker Compose:

   ```bash
   docker-compose up -d
   ```

5. Start the apllication:
   ```bash
   npm run start
   ```

The application will be available at `http://localhost:3000`.

## API Endpoints

### GET /api/v1/users

Get paginated list of users with search and sort capabilities.

Query Parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sort`: Sort field and order (e.g., "createdAt:-1")
- `search`: Search term for filtering users

### POST /api/v1/users/add

Body:

- `totalUsers`: Number
  Initiate batch to add the total number of users mentioned. (default: 5000)

## Docker Services

The application runs with three Docker containers:

1. **MongoDB**

   - Database service
   - Port: 27017
   - Persistent volume for data storage

2. **RabbitMQ**
   - Message queue service
   - Ports: 5672 (AMQP), 15672 (Management UI)
   - Health check enabled

## Environment Variables

- `MONGODB_URI`: MongoDB connection string (default: mongodb://mongodb:27017/userdb)
- `RABBITMQ_URL`: RabbitMQ connection URL (default: amqp://rabbitmq)
- `PORT`: Application port (default: 3000)
- `REQUEST_PER_SECOND`: limit of Request to be made per second (default: 5)
- `RESULTS_PER_REQUEST`: Results per request per api call (default: 5000)
- `SLEEP_TIME`: sleep time after reaching the limit of request per second (default: 30000)
- `BATCH_SIZE`: number of requests per batch (default: 300)
- `API_URL`: Application port (default: `https://randomuser.me/api/`)

## Health Checks

Both MongoDB and RabbitMQ services include health checks to ensure they're properly initialized before the application starts.

## Monitoring

- RabbitMQ Management UI: http://localhost:15672
  - Default credentials: guest/guest
