# Database Diagrams

Backend persistence is split by responsibility:

- Postgres is the primary transactional store.
- Redis stores refresh-token sessions.
- MongoDB acts as an S3-like object storage.

## Whole System

```mermaid
flowchart LR
  client[HTTP Client]
  http[HTTP routes]
  usecases[Application use-cases]
  composition[buildRepositories]

  postgres[(Postgres<br/>primary data)]
  redis[(Redis<br/>refresh tokens)]
  mongo[(MongoDB<br/>object storage)]

  client --> http
  http --> usecases
  usecases --> composition

  composition --> productRepo[productRepository]
  composition --> userRepo[userRepository]
  composition --> orderRepo[orderRepository]
  composition --> refreshRepo[refreshTokenRepository]
  composition --> objectRepo[objectStorageRepository]

  productRepo --> postgres
  userRepo --> postgres
  orderRepo --> postgres
  refreshRepo --> redis
  objectRepo --> mongo
```

## Postgres

Postgres owns durable business data: products, users, carts, and orders.

```mermaid
erDiagram
  USERS ||--o{ ORDERS : places

  USERS {
    varchar_24 id PK
    text email UK
    text name
    text password_hash
    jsonb cart_items
    timestamptz created_at
    timestamptz updated_at
  }

  PRODUCTS {
    varchar_24 id PK
    text title
    jsonb pricing
    numeric rating
    text category
    jsonb images
    jsonb attributes
    jsonb variants
    timestamptz created_at
    timestamptz updated_at
  }

  ORDERS {
    varchar_24 id PK
    varchar_24 user_id FK
    text status
    jsonb items
    numeric total_price
    timestamptz created_at
    timestamptz updated_at
  }
```

```mermaid
flowchart TD
  productUseCases[Product use-cases] --> productRepo[Postgres productRepository]
  userUseCases[User and cart use-cases] --> userRepo[Postgres userRepository]
  orderUseCases[Order use-cases] --> orderRepo[Postgres orderRepository]

  productRepo --> products[(products)]
  userRepo --> users[(users)]
  orderRepo --> orders[(orders)]
  orderRepo --> products

  users -->|cart_items jsonb references product ids| products
  orders -->|user_id FK| users
  orders -->|items jsonb snapshots product + variant data| products
```

## Redis

Redis stores refresh-token sessions by `jti` and keeps a per-user set of active token ids.

```mermaid
flowchart TD
  refreshService[refreshTokenService]
  refreshRepo[Redis refreshTokenRepository]

  sessionKey["refresh:session:{jti}<br/>JSON RefreshSession<br/>TTL = expiresAt"]
  userSetKey["refresh:user:{userId}<br/>SET of jti<br/>TTL follows token lifetime"]

  refreshService --> refreshRepo
  refreshRepo -->|get/save/revoke| sessionKey
  refreshRepo -->|listActiveByUserId| userSetKey
  userSetKey -->|members point to| sessionKey
```

```mermaid
classDiagram
  class RefreshSession {
    string jti
    string userId
    string familyId
    string tokenHash
    string rotatedTo
    string revokedAt
    string keyVersion
    string ip
    string userAgent
    string reason
    string createdAt
    string expiresAt
  }
```

## MongoDB

MongoDB is no longer the primary business database. It is used as an object storage adapter.

```mermaid
flowchart TD
  objectRepo[Mongo objectStorageRepository]
  objects[(objects collection)]

  objectRepo -->|putObject| objects
  objectRepo -->|getObject| objects
  objectRepo -->|deleteObject| objects
  objectRepo -->|listObjects prefix| objects
```

```mermaid
classDiagram
  class StoredObject {
    ObjectId _id
    string key
    binary body
    string contentType
    object metadata
    number size
    date createdAt
    date updatedAt
  }
```

## Runtime Connections

```mermaid
flowchart LR
  env[Environment]
  builder[buildRepositories]

  env -->|POSTGRES_URL or DATABASE_URL| builder
  env -->|REDIS_URL| builder
  env -->|MONGODB_URI + MONGODB_DB| builder

  builder --> pgPool[pg Pool]
  builder --> redisClient[Redis client]
  builder --> mongoClient[MongoClient]

  pgPool --> pgSchema[ensurePostgresSchema]
  pgPool --> pgSeed[ensureSeedProducts]
```
