import type { Phase } from "./types";

// Phases for tracks that have no lessons yet. Each phase shows as "Coming soon" until it gets one.
// When a track gets its first lesson, move its phases into the track's own folder index.ts
// (like java/index.ts) and add the lesson to its phase.

const soon = (title: string, description: string): Phase => ({ title, description, lessons: [] });

export const concurrencyPhases: Phase[] = [
  soon("Threads Basics", "Process vs thread, creating threads, Runnable vs Callable, thread states, start vs run, join and daemon threads."),
  soon("synchronized, volatile and the Java Memory Model", "Monitors, visibility vs atomicity, happens-before, and why count++ is not thread-safe."),
  soon("Locks and Atomics", "ReentrantLock, ReadWriteLock, StampedLock, AQS underneath, CAS, AtomicInteger and LongAdder."),
  soon("Executors and Thread Pools", "ExecutorService, ThreadPoolExecutor parameters, bounded queues, rejection policies and sizing pools."),
  soon("ConcurrentHashMap", "CAS on empty bins, per-bin locking, why null keys are banned, and atomic methods like computeIfAbsent and merge."),
  soon("BlockingQueue and Producer-Consumer", "ArrayBlockingQueue, LinkedBlockingQueue, SynchronousQueue, DelayQueue, backpressure and clean shutdown."),
  soon("Other Concurrent Collections", "CopyOnWriteArrayList, ConcurrentLinkedQueue, ConcurrentSkipListMap and when each fits."),
  soon("Coordination Utilities", "CountDownLatch, CyclicBarrier, Semaphore, Phaser and Exchanger with everyday examples."),
  soon("Asynchronous Programming", "Future and CompletableFuture patterns, timeouts and fallbacks, and choosing executors."),
  soon("ThreadLocal and Virtual Threads", "Per-thread data and its leak in pools, Java 21 virtual threads, pinning and structured concurrency."),
  soon("Deadlocks, Race Conditions and Testing", "Spotting and preventing deadlock, livelock and starvation, thread dumps, and testing concurrent code."),
  soon("Concurrency Across Servers", "Why synchronized fails with many instances, database locks, conditional updates, SKIP LOCKED and idempotency."),
];

export const java8NextPhase: Phase = soon(
  "Java 9 to 21 Features",
  "What came after Java 8: modules, var, records, text blocks, switch expressions, sealed classes, pattern matching and virtual threads.",
);

export const dsaPhases: Phase[] = [
  soon("Complexity and Problem-Solving Method", "Big-O, reading constraints, brute force first, then improving."),
  soon("Arrays and Hashing", "Prefix sums, frequency maps and the classic HashMap tricks."),
  soon("Two Pointers and Sliding Window", "Pair sums, partitioning and longest or shortest windows."),
  soon("Stack and Queue", "Bracket matching, monotonic stacks and BFS queues."),
  soon("Binary Search", "Search on sorted data and binary search on the answer."),
  soon("Linked List", "Reversal, fast and slow pointers, merging."),
  soon("Trees and BST", "Traversals, depth, level order, validation and LCA."),
  soon("Heaps", "Top K, Kth largest and merging sorted lists."),
  soon("Intervals and Greedy", "Merging intervals, meeting rooms and greedy choices."),
  soon("Dynamic Programming", "From recursion to memoisation to tables."),
  soon("Graphs", "BFS, DFS, topological sort and shortest paths."),
];

export const mysqlPhases: Phase[] = [
  soon("SQL Basics", "SELECT, WHERE, ORDER BY, INSERT, UPDATE, DELETE and data types."),
  soon("Joins and Aggregation", "Inner and outer joins, GROUP BY, HAVING and common mistakes."),
  soon("Subqueries, CTEs and Window Functions", "Correlated subqueries, WITH, ROW_NUMBER, RANK, LAG and running totals."),
  soon("Indexes", "B-tree indexes, the clustered primary key in InnoDB, composite indexes and the leftmost prefix rule."),
  soon("Transactions and Isolation Levels", "ACID, REPEATABLE READ by default, anomalies and MVCC with undo logs."),
  soon("Locking in InnoDB", "Row locks, gap and next-key locks, deadlocks and how to read them."),
  soon("Query Optimisation", "EXPLAIN, the slow query log and rewriting slow queries."),
  soon("Replication, Backups and Scaling", "Binlog replication, read replicas, backups and partitioning."),
];

export const postgresqlPhases: Phase[] = [
  soon("Getting Started with PostgreSQL", "Installing with Docker, psql basics, databases, schemas and roles."),
  soon("Data Types That Matter", "TIMESTAMPTZ, NUMERIC for money, UUID, arrays, ENUM and JSONB."),
  soon("SQL the Postgres Way", "CTEs, window functions, RETURNING, upserts with ON CONFLICT and DISTINCT ON."),
  soon("Indexes", "B-tree, GIN, GiST and BRIN, partial and expression indexes, and CREATE INDEX CONCURRENTLY."),
  soon("MVCC and VACUUM", "Row versions, dead tuples, autovacuum, bloat and why Postgres needs vacuuming."),
  soon("Transactions and Locking", "READ COMMITTED by default, SELECT FOR UPDATE, FOR NO KEY UPDATE, SKIP LOCKED, advisory locks and deadlocks."),
  soon("Query Planning with EXPLAIN ANALYZE", "How the planner chooses plans, statistics and reading plans line by line."),
  soon("Partitioning", "Range and list partitioning for large tables and dropping old data cheaply."),
  soon("Replication, Backups and High Availability", "WAL, streaming replication, point-in-time recovery and failover."),
  soon("Useful Extensions", "pg_stat_statements, PostGIS for geo queries, pgvector for embeddings, pg_trgm for fuzzy search."),
  soon("PostgreSQL with Spring Boot", "JDBC, HikariCP pool sizing, Flyway migrations and Testcontainers."),
  soon("MySQL vs PostgreSQL", "Differences in defaults, features and when I'd choose each."),
];

export const designPatternPhases: Phase[] = [
  soon("Principles First", "SOLID, DRY, KISS, YAGNI and composition over inheritance, as the reason patterns exist."),
  soon("Creational Patterns", "Singleton, Factory Method, Abstract Factory, Builder and Prototype."),
  soon("Structural Patterns", "Adapter, Decorator, Proxy, Facade, Composite, Bridge and Flyweight."),
  soon("Behavioral Patterns", "Strategy, Observer, State, Template Method, Command, Chain of Responsibility, Iterator, Mediator, Memento and Visitor."),
  soon("Patterns Inside Spring", "Proxies, templates, factories, events and strategies the framework already uses."),
  soon("Backend and Enterprise Patterns", "Repository, DTO, Unit of Work, Outbox, Saga, Circuit Breaker, Specification and Ports and Adapters."),
  soon("Anti-Patterns", "God classes, service locators, anaemic models and premature abstraction."),
];

export const springPhases: Phase[] = [
  soon("IoC and Dependency Injection", "Why containers exist, constructor injection and how Spring resolves dependencies."),
  soon("Beans, Scopes and Lifecycle", "Singleton vs prototype, lifecycle callbacks, BeanPostProcessor and the prototype-in-singleton trap."),
  soon("Configuration", "@Configuration and @Bean, component scanning, @Value, @ConfigurationProperties and profiles."),
  soon("AOP and Proxies", "Aspects, advice, pointcuts, JDK vs CGLIB proxies and the self-invocation trap."),
  soon("Events", "ApplicationEventPublisher, @EventListener and @TransactionalEventListener."),
  soon("Transactions in Spring", "How @Transactional works, propagation, rollback rules and TransactionTemplate."),
  soon("Circular Dependencies and Startup Internals", "The three-level cache, refresh steps and why constructor cycles fail."),
];

export const springBootPhases: Phase[] = [
  soon("Starters and Auto-Configuration", "What @SpringBootApplication does, conditions and how to debug auto-configuration."),
  soon("Configuration and Profiles", "application.yml, property precedence, profiles and secrets."),
  soon("Building REST APIs", "Controllers, request mapping, DTOs, ResponseEntity and the MVC request flow."),
  soon("Validation and Error Handling", "Bean Validation, @RestControllerAdvice and ProblemDetail."),
  soon("Calling Other Services", "RestClient, WebClient, timeouts and retries."),
  soon("Scheduling and Async Work", "@Scheduled (and its single default thread), @Async and executors."),
  soon("Caching", "@Cacheable with Redis and cache invalidation."),
  soon("Actuator and Observability", "Health, metrics with Micrometer, tracing and structured logs."),
  soon("Packaging and Running", "Fat jars, embedded Tomcat, graceful shutdown and Docker images."),
];

export const springDataJpaPhases: Phase[] = [
  soon("JPA, Hibernate and Spring Data", "How the three fit together and how repositories are generated from interfaces."),
  soon("Entities and Mapping", "Entities, IDs, enums as strings, embeddables, converters and element collections."),
  soon("Relationships", "One-to-many, many-to-one, many-to-many, owning side, cascade and orphan removal."),
  soon("Persistence Context", "Entity states, dirty checking, flush modes and the first-level cache."),
  soon("Queries", "Derived queries, JPQL, native SQL, Specifications, projections and pagination."),
  soon("Fetching and the N+1 Problem", "Lazy vs eager, JOIN FETCH, entity graphs, batch fetching and open-in-view."),
  soon("Transactions and Locking", "@Transactional pitfalls, optimistic @Version and pessimistic locks."),
  soon("Inheritance and Advanced Mapping", "SINGLE_TABLE, JOINED, TABLE_PER_CLASS and composite keys."),
  soon("Performance", "Batch inserts, ID strategies, read-only transactions and HikariCP."),
  soon("Migrations and Testing", "Flyway, auditing, soft delete and testing with Testcontainers."),
];

export const springSecurityPhases: Phase[] = [
  soon("Security Basics", "Authentication vs authorisation, hashing vs encryption, BCrypt and the OWASP Top 10."),
  soon("The Filter Chain", "DelegatingFilterProxy, SecurityFilterChain and how a request is authenticated."),
  soon("Users and Passwords", "UserDetailsService, PasswordEncoder and login flows."),
  soon("JWT Authentication", "Access tokens, a custom filter, stateless sessions and key handling."),
  soon("Refresh Tokens and Logout", "Rotation, reuse detection, revocation and hashed storage."),
  soon("OAuth2 and OpenID Connect", "Social login, resource servers and client credentials between services."),
  soon("Authorisation", "Roles vs permissions, @PreAuthorize, method security and ownership checks."),
  soon("CORS, CSRF and Security Headers", "When each matters and how to configure them."),
  soon("Testing Security", "MockMvc with users and tokens, and asserting 401 and 403."),
];

export const restApiDesignPhases: Phase[] = [
  soon("REST Principles", "Resources, representations, statelessness and good URL design."),
  soon("HTTP Methods and Status Codes", "Safe and idempotent methods, and choosing the right status code."),
  soon("Requests, Responses and DTOs", "Consistent envelopes, field naming and never exposing entities."),
  soon("Errors", "ProblemDetail, validation errors per field and never leaking stack traces."),
  soon("Pagination, Filtering and Sorting", "Offset vs cursor pagination and safe filter design."),
  soon("Idempotency", "Idempotency keys, retries and safe POST requests."),
  soon("Versioning and Deprecation", "URI vs header versioning, breaking changes, Deprecation and Sunset headers, expand and contract."),
  soon("Caching and Concurrency", "ETag, If-None-Match, If-Match and 412 for lost updates."),
  soon("Rate Limiting", "Fixed window, sliding window and token bucket, and the 429 response."),
  soon("Webhooks", "Signing, retries, deduplication and reading status back."),
  soon("Documentation", "OpenAPI with springdoc and keeping docs in sync with code."),
];

export const testingPhases: Phase[] = [
  soon("JUnit 5", "Test structure, assertions, parameterised tests and naming."),
  soon("Mockito", "Mocks, spies, stubbing, verification and argument captors."),
  soon("Spring Boot Test Slices", "@SpringBootTest, @WebMvcTest, @DataJpaTest and MockMvc."),
  soon("Testcontainers", "Real PostgreSQL, Redis and Kafka in tests."),
  soon("Testing Concurrency and Time", "CountDownLatch races, Awaitility and an injected Clock."),
  soon("Contract and API Tests", "Keeping consumers and providers in agreement."),
  soon("Load Testing", "k6 and Gatling, warm-up, percentiles and honest numbers."),
];

export const redisPhases: Phase[] = [
  soon("Redis Basics and Data Types", "Strings, hashes, lists, sets, sorted sets, streams and when to use each."),
  soon("Caching Patterns", "Cache-aside, write-through, TTLs and invalidation."),
  soon("Cache Problems", "Stampede, penetration and avalanche, and their fixes."),
  soon("Redis with Spring", "Spring Data Redis, serialisation and @Cacheable."),
  soon("Distributed Locks and Rate Limiting", "SET NX PX, Lua scripts, Redisson and counters."),
  soon("Geo, Pub/Sub and Streams", "Nearby search with GEO, messaging with pub/sub and streams."),
  soon("Persistence, Replication and Cluster", "RDB vs AOF, Sentinel, Cluster and hash slots."),
];

export const messagingPhases: Phase[] = [
  soon("Messaging Basics", "Queues vs pub/sub, delivery guarantees and why idempotent consumers matter."),
  soon("RabbitMQ Fundamentals", "Exchanges, queues, bindings, routing keys and acknowledgements."),
  soon("RabbitMQ in Practice", "Spring AMQP, dead-letter exchanges, retries, delayed messages and prefetch."),
  soon("Kafka Fundamentals", "Topics, partitions, offsets, consumer groups and ordering by key."),
  soon("Kafka Internals", "Replication, ISR, acks, the idempotent producer, transactions, retention and compaction."),
  soon("Spring for Apache Kafka", "KafkaTemplate, @KafkaListener, retry topics and dead-letter topics."),
  soon("Kafka vs RabbitMQ", "Log vs queue, and which one I'd pick for which job."),
  soon("Outbox and Change Data Capture", "The transactional outbox, polling relays and Debezium."),
  soon("Operating Messaging Systems", "Consumer lag, monitoring, schema evolution and replays."),
];

export const microservicesPhases: Phase[] = [
  soon("Monolith, Modular Monolith or Microservices", "Trade-offs, team size and when splitting is worth it."),
  soon("Splitting a System", "Bounded contexts, database per service and data ownership."),
  soon("Communication", "REST, gRPC and events, and sync vs async."),
  soon("API Gateway and Service Discovery", "Spring Cloud Gateway, Eureka or Kubernetes DNS."),
  soon("Resilience", "Timeouts, retries, circuit breakers and bulkheads with Resilience4j."),
  soon("Distributed Data", "Sagas, outbox, CQRS and eventual consistency."),
  soon("Configuration and Secrets", "Centralised config and secrets management."),
  soon("Observability", "Correlation IDs, metrics, distributed tracing with OpenTelemetry."),
  soon("Testing and Deploying Microservices", "Contract tests, Docker Compose and Kubernetes basics."),
];

export const devopsPhases: Phase[] = [
  soon("Linux for Backend Developers", "The shell, processes, logs, networking commands and file permissions."),
  soon("Docker", "Images, layers, multi-stage builds, running the JVM in containers."),
  soon("Docker Compose", "Running the app with PostgreSQL, Redis and Kafka locally."),
  soon("CI/CD", "GitHub Actions: build, test, scan and deploy with health checks."),
  soon("AWS Core", "IAM, EC2, S3, RDS, VPC and security groups."),
  soon("Deploying Spring Boot on AWS", "EC2 or ECS, load balancers, RDS, ElastiCache and secrets."),
  soon("AWS Messaging and Monitoring", "SQS, SNS, CloudWatch logs, metrics and alarms."),
  soon("Kubernetes Basics", "Pods, deployments, services, probes and config."),
];

export const lldPhases: Phase[] = [
  soon("LLD: How to Approach an LLD Round", "Requirements, entities, relationships, patterns, code, concurrency and extensions."),
  soon("LLD: Object-Oriented Design in Practice", "Applying SOLID, choosing patterns for a reason and UML basics."),
  soon("LLD: Warm-up Designs", "Parking lot, vending machine, library management and tic-tac-toe."),
  soon("LLD: Concurrency-Heavy Designs", "LRU cache, rate limiter, seat booking with holds and a thread-safe logger."),
  soon("LLD: Domain Designs", "Splitwise, elevator, notification service and a ride-hailing dispatcher."),
];

export const hldPhases: Phase[] = [
  soon("HLD: The HLD Interview Method", "Requirements, back-of-envelope numbers, APIs, data model, diagram and deep dives."),
  soon("HLD: Building Blocks", "Load balancers, caches, CDNs, databases, queues and object storage."),
  soon("HLD: Scaling Data", "Replication, sharding, partitioning and consistent hashing."),
  soon("HLD: Distributed Systems Concepts", "CAP, consistency models, leader election and idempotency."),
  soon("HLD: Case Studies", "URL shortener, notification system, ride-hailing, payments, chat and a rate limiter."),
];

export const operatingSystemsPhases: Phase[] = [
  soon("Processes and Threads", "What a process owns, context switching and user vs kernel threads."),
  soon("CPU Scheduling", "FCFS, round robin, priorities and what the Linux scheduler does."),
  soon("Synchronisation", "Critical sections, mutexes, semaphores and monitors."),
  soon("Deadlocks", "The four conditions, prevention, avoidance and detection."),
  soon("Memory Management", "Paging, virtual memory, page faults and thrashing."),
  soon("File Systems and I/O", "Files, inodes, buffering and blocking vs non-blocking I/O."),
];

export const networkingPhases: Phase[] = [
  soon("Network Models", "The OSI and TCP/IP layers in plain words."),
  soon("TCP and UDP", "Handshakes, reliability, flow control and when UDP wins."),
  soon("IP and DNS", "Addressing, routing and how a name becomes an IP."),
  soon("HTTP", "HTTP/1.1, HTTP/2 and HTTP/3, headers, caching and keep-alive."),
  soon("TLS and HTTPS", "Certificates, the handshake and what HTTPS protects."),
  soon("WebSockets and Real-Time", "Upgrade, frames and server-sent events."),
  soon("Proxies and Load Balancers", "Reverse proxies, L4 vs L7 balancing and CDNs."),
  soon("What Happens When I Open a URL", "Every step from typing to rendering."),
];
