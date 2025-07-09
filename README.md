# 💰 Wallet Service API

This is a simple wallet service built using NestJS, Prisma, MySQL, Redis, and RabbitMQ. It supports user management , user wallet creation, funding, withdrawal, and transfers with features like concurrency control, idempotency, and asynchronous processing.

---

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Emmaroeneyoh/pactic.git
cd pactis
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file based on the example and configure your database, Redis, RabbitMQ, etc.

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
RABBITMQ_URL=amqp://localhost
RABBITMQ_QUEUE=wallet_queue
DATABASE_URL="mysql://root:123456@localhost:3306/pactic"
RABBITMQ_URL=amqp://localhost
JWT_SECRET=your_super_secret_key
```

### 4. Prisma Setup
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run the Application
```bash
npm run start:dev
```

### 6. Run Tests
```bash
npm run test
```

---

## 🛠️ Technologies Used

- **NestJS** – API framework
- **Prisma** – ORM for MySQL
- **MySQL** – Database
- **Redis** – Caching and idempotency
- **RabbitMQ** – Asynchronous processing
- **Jest** – Unit and integration tests
- **Postman** – API documentation

---
## 🧠 Design Decisions

- **Optimistic Concurrency Control**  
  Leveraged a `version` field in the `Wallet` table to implement optimistic locking. This ensures that concurrent deposits and withdrawals and transfers are safe, and conflicting operations are detected without relying on heavy database locks.

- **Idempotency Handling**  
  Each transaction request includes a `txId`. This ID is cached in Redis and checked before processing to ensure that repeated requests  do not result in duplicate operations.

- **Deadlock Prevention**  
  - In fund transfers, wallets are always locked in a consistent order (e.g., by ascending wallet ID) to avoid circular waits.  
  - Combined with optimistic locking, this reduces the risk of deadlocks during concurrent operations.

- **Atomic Transfers**  
  Transfers are executed within database transactions to guarantee atomicity—either both the debit and credit occur, or none at all. The rollback mechanism ensures consistency in case of failure.

- **Message Queue Integration (RabbitMQ)**  
  - Withdrawals and transfers are processed asynchronously via RabbitMQ queues.  
  - Retry logic is implemented for transient failures, and transaction statuses are updated accordingly.

- **Caching with Redis**  
  - Frequently accessed data such as wallet balances and paginated transaction history are cached.  
  - Cache invalidation is performed immediately after changes to ensure consistency between the cache and database.

- **Soft Deletion Strategy**  
  Used a `deletedAt` timestamp to implement soft deletes for extensibility and auditability, especially for users and wallets.

- **Separation of Concerns**  
  - Modular architecture following NestJS best practices.  
  - Clear separation across domains (e.g., users, wallets, transactions, queues, cache), making the codebase maintainable and scalable.

- **Low Latency Optimization**  
  - Lightweight DTOs and minimal payloads for faster API response.  
  - Batched database reads for paginated endpoints to minimize I/O.

- **Scalability Considerations**  
  - Stateless endpoints with Redis-based shared cache.  
  - Async queue processing offloads heavy transaction logic from the HTTP layer.

- **Auditability**  
  All transactions are recorded with status tracking, timestamps, and failure metadata, allowing replay or inspection when needed.


---

## ✅ API Documentation

### Postman Collection
Download: https://documenter.getpostman.com/view/19729145/2sB34eJMzb
---

## 🧪 Testing

- Jest used for unit and integration tests.

---

## 📁 Database Schema

See the `prisma/schema.prisma` file. Includes models for:

- `User`
- `Wallet`
- `Transaction`
- `TransactionRequest`
- `WalletRequest`
- `Notification`
- `LoginLog`

Indexes & constraints:
- Unique constraint on `wallet(userId, currency)`
- Unique `txId` for idempotency
- Indexed foreign keys

---

## 👨‍💻 Author

- **Name**: Emmanuel Eneyoh
- **Role**: Backend Developer

---
