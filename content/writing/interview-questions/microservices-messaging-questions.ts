import type { Lesson } from "../types";

export const microservicesMessagingQuestions: Lesson = {
  slug: "microservices-messaging-interview-questions",
  date: "2026-10-29",
  title: "Microservices, Redis and Kafka Interview Questions",
  description:
    "The distributed-systems questions backend interviews keep coming back to: monolith vs microservices, timeouts and circuit breakers, sagas and the outbox, Redis caching and locks, Kafka internals, consistent hashing and when an in-memory queue is enough.",
  tags: ["Interview", "Microservices", "Redis", "Kafka", "System Design"],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the microservices, Redis and Kafka questions I prepared for backend interviews, written the way I'd actually say them. Most answers start with an everyday picture, like a tea stall, a bank queue or a cab ride, because if I can explain an idea with a tea stall, I really understand it. The technical detail comes right after.",
        },
        {
          type: "paragraph",
          text: "The best way to use it: read the question, close your eyes, and answer out loud before opening my answer. Then compare. Questions marked with ⭐ are the ones that come up most often, so if time is short, do those first.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Being honest about what I've used",
          text: "My project RideX is a modular monolith, and it deliberately doesn't use Kafka or a circuit-breaker library. Where I mention RideX, it's something the code really does. Where I haven't used something, I say so and explain how I'd use it. In an interview, \"No, and here's why\" beats a fake \"yes\" every time.",
        },
      ],
    },
    {
      title: "Monolith vs Microservices",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Monolith vs microservices: what's the difference?",
              answer:
                "Think of a small restaurant with one kitchen. Everyone cooks in the same room, passes plates by hand and shares one fridge. That's a **monolith**: one deployable app, one database, and calls between parts are just method calls. It's simple to build, test and deploy, and a database transaction can cover everything at once.\n\nNow think of a food court with separate stalls. Each stall has its own kitchen, its own staff and its own fridge, and they talk by passing order slips. That's **microservices**: small apps that deploy on their own and own their own data. Each team can ship and scale its stall independently, but now every \"pass the plate\" is a network call that can be slow or fail, and there's no single transaction across stalls.\n\nSo microservices trade simplicity for independence. They pay off when many teams step on each other in one codebase, or when one part needs to scale very differently from the rest.",
            },
            {
              question: "What is a modular monolith, and why start there?",
              answer:
                "It's one deployable app with strict walls inside it. Back to the restaurant: one kitchen, but separate stations for grill, salads and desserts, and nobody grabs ingredients from another station's shelf. They ask through the counter.\n\nIn code, that means packaging by feature (`dispatch`, `trip`, `payment`) and only letting modules talk through their public API, never their internals. RideX is built this way. I was one developer with one database, so microservices would have given me network calls and distributed transactions with none of the benefits. Instead, **ArchUnit tests fail the build** if one module reaches into another's internals, and I wrote an ADR explaining the choice.\n\nThe nice part is that the seams are already drawn. If one module ever needs to become its own service, I cut along a line that already exists instead of untangling spaghetti.",
            },
            {
              question: "When would you actually split a monolith into services?",
              answer:
                "When a real pain shows up, not because microservices sound modern. The usual signals: several teams keep blocking each other's releases, one part needs very different scaling (location pings vs the admin panel), one part needs a different technology, or a failure in one area keeps taking down everything else.\n\nEven then, I'd split one piece at a time, starting with the module that has the clearest boundary and the fewest shared tables. Splitting everything at once is how teams end up with a **distributed monolith**: all the network pain of microservices, and services that still have to be deployed together.",
            },
            {
              question: "Why should each service have its own database?",
              answer:
                "If two stalls in the food court share one fridge, neither can reorganise its shelves without asking the other. A shared database is the same: one team renames a column and another team's service breaks in production.\n\nWith **database per service**, a service's tables are private. Others get the data through its API or its events. That keeps deployments and schema changes independent. The cost is that joins across services disappear, so you either call the other service, keep a local copy built from its events, or accept eventual consistency.",
            },
            {
              question: "⭐ How do services talk to each other: sync or async?",
              answer:
                "A phone call vs a text message. A **phone call** (REST or gRPC) gets an answer right now, but both people have to be available at the same moment. If the other side is slow, you wait on the line. A **text** (an event on Kafka, RabbitMQ or SQS) is sent and forgotten; the other side reads it when it can.\n\nI use sync when the caller truly needs the answer to continue, like \"what's the fare for this route?\". I use async for things that can happen a moment later, like \"ride completed, send the receipt and update the driver's earnings\". Async decouples the services and absorbs spikes, but the data becomes **eventually consistent**: for a short time, one service knows something the other doesn't yet.",
            },
            {
              question: "⭐ What does an API gateway do?",
              answer:
                "It's the reception desk of an office building. Visitors don't wander the floors looking for the right room; they go to reception, show ID, and get pointed to the right place.\n\nThe gateway is the single entry point for clients. It routes `/rides/**` to the ride service and `/payments/**` to the payment service, and handles the shared edge work: authentication, rate limiting, TLS termination, CORS, sometimes combining two calls into one response. Spring Cloud Gateway, Kong and AWS API Gateway are common choices.\n\nThe rule I follow is no business logic in the gateway. Reception checks your badge; it doesn't do your job for you.",
            },
            {
              question: "What is service discovery?",
              answer:
                "In a cloud setup, instances come and go all day, so their IP addresses keep changing. Service discovery is the phone directory that stays up to date: a service asks \"where is `payment-service` right now?\" and gets the live addresses.\n\nEureka and Consul are the classic registries, where each instance registers itself and sends heartbeats. On Kubernetes you mostly don't need them: a Kubernetes Service gives a stable DNS name, and the platform routes to whichever pods are healthy.",
            },
            {
              question: "What is a config server, and why use one?",
              answer:
                "With twenty services, editing twenty config files for one timeout change is error-prone. A config server keeps configuration in one central, versioned place, and services read their settings from it at startup (or on refresh). Spring Cloud Config, Consul and AWS Parameter Store are typical options.\n\nSecrets are a slightly different story: they belong in a secrets manager like Vault or AWS Secrets Manager, not in plain config.",
            },
            {
              question: "What is distributed tracing?",
              answer:
                "Imagine a parcel tracking number. The parcel goes through the warehouse, a sorting hub and a delivery van, and the tracking number lets you see every stop and how long it sat there.\n\nA **trace ID** is that tracking number for a request. It's created at the edge and passed along in HTTP headers (the W3C `traceparent` header) and in message headers. Each service records **spans** (\"I spent 40 ms in the database\", \"120 ms calling payments\") tagged with the same trace ID. Tools like Jaeger, Zipkin or Tempo, fed through OpenTelemetry, then draw the whole journey, so I can see exactly which hop made a request slow.\n\nI also put the trace ID into every log line, so one search pulls up the logs of that request across all services.",
            },
          ],
        },
      ],
    },
    {
      title: "Resilience: Timeouts, Retries, Circuit Breakers",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Why are timeouts so important?",
              answer:
                "Picture a bank with five tellers. One customer's cheque needs a call to another branch, and that branch never picks up. The teller just stands there holding the phone. Then the next teller gets the same kind of customer, and the next. Soon all five tellers are frozen, and even simple deposits can't be served.\n\nThat's what one slow dependency does to a service without timeouts. Each waiting request holds a thread and often a database connection. Requests pile up, the pools run dry, and endpoints that have nothing to do with that dependency start failing too.\n\nA timeout turns \"wait forever\" into \"fail fast\", and a fast failure is something I can handle: show a message, use a fallback, or retry later. Many Java HTTP clients default to no timeout at all, so I always set them explicitly. In RideX the payment gateway gets 5 seconds to connect and 10 to read, and the maps lookups get 5 and 5.",
            },
            {
              question: "What kinds of timeouts are there?",
              answer:
                "**Connect timeout:** how long to wait to open the connection. **Read timeout:** how long to wait for data once connected. **Overall request timeout:** a cap on the whole call. **Pool acquisition timeout:** how long to wait for a free connection from a pool, like Hikari's `connectionTimeout`. And on the database side, a **query or transaction timeout**.\n\nEach value should come from what the caller can tolerate and what the dependency normally takes, not from a magic number. A fare estimate that takes 8 seconds is useless anyway, while a payment call deserves a bit longer, because giving up too early on a payment creates uncertainty.",
            },
            {
              question: "How should timeouts relate across layers?",
              answer:
                "They should get shorter the deeper you go. If the mobile app gives up after 15 seconds, the API should give up on its own dependencies well before that, say around 10, so it can still send back a clean error.\n\nIf it's the other way round, the client times out and walks away while the server keeps working on an answer nobody will read. gRPC solves this neatly by passing a **deadline** down with each call, so every layer knows how much time is left.",
            },
            {
              question: "When is it safe to retry after a timeout?",
              answer:
                "It depends on whether repeating the operation is harmless. Reading a route or a profile? Retry once, or fall back to something else. Creating a payment? A timeout doesn't mean it failed; it means **I don't know**. The gateway might have charged the card and only the reply got lost.\n\nSo for anything that changes money or state, I only retry with the **same idempotency key**, so the other side recognises the repeat and returns the first result instead of acting twice.\n\nAnd retries need **exponential backoff with jitter** plus a maximum number of attempts. Without backoff, every client hammers a struggling service at the same moment, which is a **retry storm** that turns a blip into an outage.",
            },
            {
              question: "⭐ What is a circuit breaker?",
              answer:
                "It works like the circuit breaker (MCB) in a house. When there's a fault, it trips and cuts the power, so the wiring doesn't catch fire. After a while you flip it back and see if things are fine.\n\nIn code (Resilience4j is the usual Java library), the breaker watches calls to one dependency. **Closed:** calls pass through normally. When failures or slow calls cross a threshold, it goes **open**: calls fail immediately, or go to a fallback, without even trying the dependency. That protects my threads and gives the dependency room to recover. After a wait, it goes **half-open** and lets a few test calls through. If they succeed, it closes again; if not, it opens again.\n\nRideX doesn't use a circuit-breaker library yet. It has timeouts, and the maps lookup falls back from Google to a free provider, which acts like a simple version of one. Payments and maps are where I'd add Resilience4j first.",
            },
            {
              question: "What is a bulkhead?",
              answer:
                "Ships are divided into sealed compartments called bulkheads. If one compartment floods, the water stays there and the ship stays afloat.\n\nIn a service, a bulkhead gives each dependency its own limited pool of threads, or its own semaphore. If the SMS provider becomes slow, only the 10 threads reserved for SMS get stuck. The other 190 threads keep serving bookings and payments. Without it, one slow dependency can quietly eat every thread in the app.",
            },
            {
              question: "How do timeout, retry and circuit breaker fit together?",
              answer:
                "Each one answers a different question. The **timeout** decides how long to wait for one attempt. The **retry** decides whether a transient failure is worth another attempt. The **circuit breaker** decides whether this dependency is so broken that I should stop calling it for a while.\n\nThe usual layering: every attempt has its own timeout, retries happen inside the breaker, and the breaker wraps everything. That way, once the breaker is open, retries stop immediately instead of piling more load on a dependency that's already down.",
            },
            {
              question: "What is a fallback, and when is it a bad idea?",
              answer:
                "A fallback is the plan B when a call fails: show cached data, a default value, or use another provider. If the live traffic API is down, showing a slightly older ETA is better than an error page.\n\nIt's a bad idea when the fallback lies about something important. Showing a stale account balance as if it were current, or treating \"payment status unknown\" as \"paid\", causes worse problems than an honest error. For money, the right fallback is usually \"pending, we'll confirm shortly\", not a guess.",
            },
            {
              question: "What is backpressure?",
              answer:
                "It's how a system says \"slow down, I can't keep up\" instead of quietly drowning. Think of a restaurant kitchen that stops taking new orders when the ticket rail is full, rather than accepting 200 orders and serving all of them cold.\n\nWhen producers are faster than consumers, something has to give. You can **buffer** (but buffers fill up), **drop** (and lose data), **reject** (return 429 or 503), or **slow the producer down**. Backpressure means choosing one of those on purpose instead of running out of memory.\n\nIn a normal Spring Boot app it shows up in many places: Tomcat's fixed worker pool and accept queue, a thread pool with a bounded queue, Hikari making callers wait for a connection, and rate limits sending 429s. In RideX, the outbox worker sends at most 50 messages per poll, so a backlog of thousands of emails drains in steady batches instead of flooding the mail provider.",
            },
            {
              question: "Load shedding vs backpressure?",
              answer:
                "Backpressure slows the producer down. **Load shedding** deliberately drops the less important work so the important work survives.\n\nOn a festival night, a cab app might stop serving \"ride history\" and analytics calls so that booking and payment still go through. Both techniques answer the same question, \"what do we do when demand is bigger than capacity?\", but shedding decides in advance what's allowed to fail.",
            },
            {
              question: "How do you handle partial failures between services?",
              answer:
                "Assume every network call can be slow, fail, or succeed without me hearing back. Then layer the defences: timeouts on every call, retries with backoff only for safe operations, idempotency keys so repeats are harmless, circuit breakers to stop hammering a broken dependency, fallbacks where a degraded answer is acceptable, and compensating actions (a saga) when a multi-step process fails halfway.\n\nThe goal is **degrading gracefully**: a broken recommendation widget should never stop someone from booking a ride.",
            },
          ],
        },
      ],
    },
    {
      title: "Distributed Data: Sagas, Outbox, CQRS",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ 2PC vs Saga: how do you do a transaction across services?",
              answer:
                "Booking a holiday is a good picture: flight, hotel and cab, each from a different company.\n\n**Two-phase commit (2PC)** is like asking all three to put a hold on everything, waiting until all three say \"ready\", then telling them all to confirm. It gives strong consistency, but everyone keeps their seats locked while waiting, and if the coordinator crashes in the middle, they can be stuck holding locks. That's why it's avoided between microservices.\n\nA **saga** books one step at a time, each as its own local transaction, and every step has an **undo** (a compensating action). Flight booked, hotel booked, cab fails? Cancel the hotel, cancel the flight. In a ride app it might be: reserve the ride, charge the payment, assign the driver, and if the payment fails, release the ride.\n\nThe catch is that a saga is eventually consistent. For a short moment the hotel is booked but the trip isn't confirmed, so the design has to tolerate that in-between state.",
            },
            {
              question: "Choreography vs orchestration in a saga?",
              answer:
                "**Choreography** is like a relay race with no coach: each service listens for an event and reacts. Payment hears `RideReserved`, charges, and publishes `PaymentCaptured`; dispatch hears that and assigns a driver. It's loosely coupled and simple for two or three steps, but with many steps nobody can see the whole flow in one place.\n\n**Orchestration** has a coach: one orchestrator tells each service what to do next and handles the compensations when something fails. The flow is readable in one place, which I prefer for anything with more than a few steps or tricky rollback rules.",
            },
            {
              question: "What is the dual-write problem?",
              answer:
                "Say my code saves an order to the database and then publishes `OrderPlaced` to Kafka. Those are two separate systems, so they can't commit together.\n\nIf the database commit succeeds and the app crashes before publishing, the order exists but nobody hears about it: no confirmation SMS, no kitchen ticket. If I publish first and the database then rolls back, I've announced an order that doesn't exist. Either way the two systems disagree, and no amount of try/catch fully fixes it, because the process can die between any two lines.",
            },
            {
              question: "⭐ What is the transactional outbox pattern?",
              answer:
                "It fixes dual writes by making the database the only thing I write to. Think of a shop that writes \"send the customer a thank-you letter\" into the same sales register entry as the sale itself. Later, a clerk goes through the register and posts every letter that hasn't been sent yet. The sale and the to-do note can never disagree, because they were written together.\n\nIn code, the business change and an `outbox` row describing the event are saved in **one local transaction**. A separate relay reads unsent outbox rows and publishes them (to a broker, or straight to email or push), then marks them sent. The relay can be a polling worker or CDC with Debezium reading the database log.\n\nRideX uses this for notifications. A worker polls the outbox every 5 seconds, sends up to 50 messages at a time, retries failures with exponential backoff, and after 6 failed attempts marks the message `DEAD` and keeps it, so a person can find it. The guarantee is **at-least-once**: a message might be sent twice after a crash, but it's never silently lost.",
            },
            {
              question: "If the outbox runs on several instances, how do they avoid sending the same message twice?",
              answer:
                "Each worker claims rows with `SELECT ... FOR UPDATE SKIP LOCKED`. A row that another worker has already locked is simply skipped, so instances split the work instead of doubling it. It's like several cashiers taking the next token from a queue: once a token is picked up, the others move past it.\n\nRideX's background workers all claim their rows this way. The outbox gets it through JPA, with `@Lock(PESSIMISTIC_WRITE)` and the lock-timeout hint set to `-2`, which Hibernate turns into `SKIP LOCKED`. Even so, delivery is at-least-once (a worker can crash after sending but before marking sent), so consumers should still be idempotent.",
            },
            {
              question: "⭐ What is an idempotent consumer, and why do you need one?",
              answer:
                "With at-least-once delivery, duplicates **will** happen: a retry after a timeout, a consumer that crashed after processing but before committing its offset. An idempotent consumer is one where processing the same message twice has the same effect as processing it once.\n\nTwo ways to get there. Store each processed message ID under a **unique constraint**, and skip the message if the insert fails, so the database is the referee. Or make the operation naturally idempotent: \"set the order status to PAID\" is safe to repeat, while \"add 100 to the balance\" is not.\n\nA simple real case: a \"send OTP\" consumer that records the message ID first, so a redelivered message doesn't text the user a second code.",
            },
            {
              question: "Is exactly-once delivery possible?",
              answer:
                "Not end to end across different systems. Kafka can do exactly-once for read, process and write **within Kafka**, using idempotent producers and transactions. But the moment the work touches the outside world, like a database in another system, an email or a payment gateway, a crash at the wrong instant can repeat or lose that side effect.\n\nThe practical answer is **at-least-once delivery plus idempotency**: retries guarantee nothing is lost, and idempotency keys, unique event IDs and reconciliation make the duplicates harmless. That combination gives the *effect* of exactly-once, which is what the business actually cares about.",
            },
            {
              question: "What are CQRS and event sourcing?",
              answer:
                "**CQRS** (Command Query Responsibility Segregation) means using different models for writing and for reading. A library is a good picture: the librarian's ledger records every book issued and returned (the write side), while the catalogue on the wall is a separate, easy-to-search view (the read side). The read model is often denormalised and shaped exactly for one screen, and it's updated from the write side's events.\n\n**Event sourcing** goes further: instead of storing the current state, you store every event (`RideRequested`, `DriverAssigned`, `RideCompleted`) and rebuild the state by replaying them. A bank statement is the classic example: the balance is just the sum of all the entries.\n\nBoth are powerful when you need a full audit trail, replay or very different read and write loads. They also add real complexity: eventual consistency between models, event versioning and rebuild tooling. I'd use them for specific areas, like a ledger, not as the default for a whole system.",
            },
            {
              question: "How do you version events or messages?",
              answer:
                "The same way as a public API: only add, never remove or rename in place. Consumers ignore fields they don't know, new fields are optional, and every event carries a version number.\n\nFor a change that can't be additive, I publish a new event type or a new topic, and keep the old one running until all consumers have moved. With Avro or Protobuf, a schema registry can enforce compatibility rules so a breaking schema is rejected before it ships.",
            },
          ],
        },
      ],
    },
    {
      title: "Redis Basics and Data Types",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is Redis, and why is it so fast?",
              answer:
                "Redis is an in-memory data-structure store. If a database is a big warehouse at the edge of town, Redis is the counter right next to the cashier: small, but everything is within arm's reach.\n\nIt's fast for a few reasons. Everything lives in RAM. Commands are executed **one at a time on a single thread**, so there's no locking overhead, and every single command is atomic. Its data structures are tuned for the operations it offers. And it uses I/O multiplexing to handle thousands of connections from that one thread. Since Redis 6, network reading and writing can use extra threads, but commands themselves still run one at a time.",
            },
            {
              question: "What data types does Redis have, and what is each good for?",
              answer:
                "**String:** cached values, counters with `INCR`, rate limits, simple locks. **Hash:** the fields of one object, like a user's profile. **List:** a simple queue or a recent-items list. **Set:** unique members, like users online right now. **Sorted set:** members with a score, perfect for leaderboards, sliding-window rate limits or \"jobs due by time\". **Geo:** locations with radius search, which is a sorted set underneath. **Stream:** a persistent log with consumer groups. **HyperLogLog:** approximate unique counts using tiny memory. **Bitmap:** yes/no flags per ID, like daily active users.\n\nA simple way to pick: what question will I ask? \"Top 10 drivers by rating\" means a sorted set. \"Is this user online?\" means a set. \"How many requests this minute?\" means a string counter.",
            },
            {
              question: "How does Redis GEO help find nearby drivers?",
              answer:
                "`GEOADD` stores a member with a longitude and latitude, and `GEOSEARCH` returns members within a radius, sorted nearest first. That's exactly \"which cabs are within 3 km of this pickup?\".\n\nUnder the hood a geo set is a **sorted set**: each member's score is a geohash of its position, so nearby points tend to have nearby scores, and a radius search becomes a few score-range reads plus an exact distance filter.\n\nThe gotcha is that a sorted set has **no TTL per member**, so a driver who switched off their phone would stay \"online\" forever. In RideX, every location ping writes to the geo set (`drivers:online`) and records the ping time in a second sorted set (`drivers:seen`). The freshness of all candidates is read in one `ZMSCORE` call, and a Lua script evicts stale drivers atomically, so a driver is either fully kept or fully removed, never half.",
            },
            {
              question: "How do you build a rate limiter with Redis?",
              answer:
                "The simplest is a **fixed window**: build a key per client and minute, `INCR` it, and set an expiry when the count is 1. If the count goes over the limit, return **429** with a `Retry-After` header. Because Redis is shared, every app instance sees the same counter, which an in-memory map can't give you.\n\nA **sliding window** keeps request timestamps in a sorted set and counts the last 60 seconds, which is accurate but stores every request. A **token bucket** in a Lua script allows short bursts while enforcing an average rate.\n\nRideX uses a fixed window and fails open if Redis is down. One honest detail: `INCR` followed by `EXPIRE` is two commands, so a crash between them could leave a key with no expiry. A small Lua script that does both atomically closes that gap.",
            },
            {
              question: "Redis Pub/Sub vs Redis Streams?",
              answer:
                "**Pub/Sub** is like a radio broadcast. Whoever is tuned in right now hears the message; anyone who was offline missed it forever. It's fine for \"refresh your local cache\" signals.\n\n**Streams** are more like a WhatsApp group with history. Messages are stored, consumer groups split the work, each message is acknowledged, and a consumer that was offline can catch up. That makes Streams much closer to a lightweight Kafka.",
            },
            {
              question: "Redis vs Memcached?",
              answer:
                "Memcached is a simple, multithreaded key-value cache with no persistence and only strings. Redis has rich data types, optional persistence, replication, Lua scripting, pub/sub and streams.\n\nFor a plain cache of HTML fragments, Memcached is perfectly fine. For anything that needs counters, sorted sets, geo search or locks, Redis is the usual choice, and these days most teams just pick Redis for everything.",
            },
            {
              question: "What's the problem with Spring's default RedisTemplate serialization?",
              answer:
                "The default `RedisTemplate` uses JDK serialization, so values in Redis are unreadable bytes, and they break when the Java class changes shape between deployments.\n\nI use `StringRedisTemplate` and store JSON, or configure Jackson serializers. Then I can read keys in `redis-cli` while debugging, and other languages can read them too. RideX stores JSON this way.",
            },
          ],
        },
      ],
    },
    {
      title: "Caching Patterns and Cache Problems",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What caching strategies do you know?",
              answer:
                "**Cache-aside** (lazy loading) is the most common. It's like a shopkeeper who keeps popular items on the front shelf: when a customer asks, check the shelf first; if it's not there, fetch it from the storeroom and put one on the shelf for next time. In code: read the cache, and on a miss read the database and fill the cache. On a write, update the database and **delete** the cache entry.\n\n**Read-through and write-through:** the cache layer itself loads from and writes to the database, so the app only talks to the cache.\n\n**Write-behind:** write to the cache now and flush to the database later. It's very fast, but if the cache dies before flushing, the data is gone, so I'd never use it for money.",
            },
            {
              question: "⭐ How do you keep the cache consistent with the database?",
              answer:
                "Prefer **deleting** the cache entry after a database write over updating it. If two writers update the cache, they can race and leave the older value behind. A delete just forces the next reader to load the fresh value.\n\nAlways set a TTL, so even if an invalidation is missed, the wrong value heals itself after a while. For data that must be fresh, use short TTLs or event-driven invalidation (\"fare rules changed, drop these keys\"). For data where a minute of staleness is harmless, accept eventual consistency.\n\nRideX's route cache uses a 5-minute TTL, because traffic conditions are only valid for a short time anyway. And the fare is saved on the quote, so a cached route can never change a price the rider has already seen.",
            },
            {
              question: "Cache stampede, penetration and avalanche: what are they and how do you fix them?",
              answer:
                "**Stampede:** a very popular key expires, and a thousand requests miss at the same moment and all hit the database. It's like the shop's front shelf going empty during a sale, and every customer running to the storeroom at once. Fix it with a lock so only one request rebuilds the value while the others wait or get the slightly old one, or refresh hot keys a little before they expire.\n\n**Penetration:** requests for keys that don't exist at all, like random IDs from a bot. They miss the cache every time and always reach the database. Fix it by caching the \"not found\" result for a short time, or putting a Bloom filter in front.\n\n**Avalanche:** many keys expire at the same moment, often because they were all loaded at startup with the same TTL, or the whole cache goes down. Fix it by adding random jitter to TTLs, and running Redis with replicas so one failure doesn't empty the cache.",
            },
            {
              question: "How does Redis expire keys, and what happens when memory is full?",
              answer:
                "Expiry happens two ways. **Lazily:** when you access a key, Redis checks whether it's expired and deletes it. **Actively:** a background task regularly samples keys with a TTL and deletes the expired ones. Together they keep memory clean without scanning everything.\n\nWhen memory hits `maxmemory`, the `maxmemory-policy` decides. `allkeys-lru` evicts the least recently used key and is the best fit for a pure cache. `volatile-lru` only evicts keys that have a TTL. `allkeys-lfu` evicts the least frequently used. `noeviction` makes writes fail instead, which is right when Redis holds data you can't afford to lose.",
            },
            {
              question: "Local cache vs distributed cache?",
              answer:
                "A **local** cache like Caffeine lives inside each app's memory. It's the fastest possible, with no network hop, but every instance has its own copy, so after an update one instance may show the new price while another shows the old one.\n\nA **distributed** cache like Redis is shared by all instances, so everyone sees the same value, at the cost of a network round trip.\n\nA two-level setup uses both: a small local cache in front of Redis, and Redis pub/sub to tell every instance to drop a key when it changes.",
            },
            {
              question: "What should and shouldn't go in a cache?",
              answer:
                "Good candidates are things that are read often, change rarely, and are expensive to compute or fetch: a route estimate, a city's fare settings, a product page. Bad candidates are things that must always be exact and current, like a wallet balance or a seat count during booking.\n\nThe question I ask is: \"If this value is a minute old, does anybody get hurt?\" If yes, don't cache it, or cache it with a very short TTL and solid invalidation.",
            },
          ],
        },
      ],
    },
    {
      title: "Redis Locks, Persistence and Scaling",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How do you build a distributed lock with Redis?",
              answer:
                "Picture one key for a shared office meeting room. Whoever holds the key uses the room, and there's a rule that the key returns itself to the reception after 30 minutes, in case someone forgets.\n\nIn Redis: `SET lock:order:42 <random-token> NX PX 30000`. `NX` means \"only if nobody holds it\", and `PX` is the auto-expiry so a crashed holder doesn't keep it forever. The random token is my name on the key.\n\nTo release, I must only delete the lock **if it's still mine**. Otherwise I could finish late, after my lock expired and someone else took it, and delete their lock. A plain `GET` then `DEL` is two steps and can race, so the check and delete run together in a small Lua script.",
            },
          ],
        },
        {
          type: "code",
          language: "lua",
          title: "release-lock.lua",
          code: `-- KEYS[1] = lock key, ARGV[1] = my token
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
return 0`,
        },
        {
          type: "qa",
          items: [
            {
              question: "What can go wrong with a Redis lock?",
              answer:
                "Two classic problems. First, the lock can **expire while I'm still working**: a long GC pause or a slow call, and now two processes both think they hold it. Redisson handles this with a watchdog that keeps extending the lock while the holder is alive, and fencing tokens (an increasing number checked by the resource) protect against the late writer.\n\nSecond, a **failover can lose the lock**: Redis replication is asynchronous, so a primary can grant the lock and die before the replica hears about it. Redlock tries to fix this with several independent nodes, but it's still debated.\n\nSo for anything involving money or bookings, I'd rather let the database be the referee. In RideX, when two drivers accept the same ride, there's no Redis lock: one conditional `UPDATE ... WHERE status = 'SEARCHING'` decides, and it rolls back together with everything else in the transaction.",
            },
            {
              question: "RDB vs AOF: how does Redis persist data?",
              answer:
                "**RDB** is a periodic snapshot, like taking a photo of a whiteboard every few minutes. It's compact and restarts fast, but anything written since the last photo is lost in a crash.\n\n**AOF** (append-only file) logs every write command, like a diary of every change. With `appendfsync everysec`, you lose at most about one second of writes, but the file is bigger and gets rewritten (compacted) periodically. Many production setups turn on both.\n\nThe opposite choice is valid too. RideX runs Redis with persistence switched off, because everything in it is either disposable or rebuilds itself within minutes: driver presence comes back with the next ping, rate-limit counters reset anyway, and the route cache just misses once.",
            },
            {
              question: "Replication vs Sentinel vs Cluster?",
              answer:
                "**Replication:** replicas keep an asynchronous copy of the primary. Good for read scaling and as a warm spare.\n\n**Sentinel:** watches the primary and automatically promotes a replica if it dies, and tells clients the new address. That's high availability, but all data still fits on one primary.\n\n**Cluster:** splits the data across several primaries using **16,384 hash slots** (`CRC16(key) mod 16384`), each primary with its own replicas. That scales both memory and writes. The catch is that a multi-key command only works if all keys are in the same slot, which you force with a hash tag: `{order:42}:items` and `{order:42}:total` land together because only the part in braces is hashed.",
            },
            {
              question: "What happens to your app if Redis goes down?",
              answer:
                "It depends entirely on what I put in Redis, so I decide that up front. If Redis only holds cache and short-lived data, the app should **degrade, not die**: a cache miss goes to the database, rate limiting fails open, and features recover when Redis comes back. If Redis holds sessions or anything that lives nowhere else, then an outage logs everybody out or loses data, and Redis needs replication with Sentinel or Cluster.\n\nRideX was designed for the first case: Redis holds only data that's worthless within minutes or safe to lose, and nothing about money or bookings lives only in Redis.",
            },
          ],
        },
      ],
    },
    {
      title: "Why Message Queues",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Why use a message queue at all?",
              answer:
                "Think of the order slips at a busy restaurant. The waiter doesn't stand in the kitchen waiting for each dish to be cooked; they pin the slip on the rail and go take the next order. The kitchen works through the slips at its own pace.\n\nA queue gives a system the same benefits. **Decoupling:** the producer doesn't need the consumer to be up right now. **Buffering:** a sudden spike waits on the rail instead of overwhelming the kitchen. **Faster responses:** the user gets \"order placed\" without waiting for the receipt email. **Fan-out:** one event can feed billing, notifications and analytics. **Retries:** a failed job can be retried later without the user waiting.\n\nThe price is eventual consistency and one more piece of infrastructure to run and monitor.",
            },
            {
              question: "⭐ Kafka vs RabbitMQ vs SQS?",
              answer:
                "**Kafka** is a durable, replayable log. Messages stay for days whether or not anyone read them, many independent consumer groups can read the same stream, and throughput is huge. It's the fit for event streaming, analytics pipelines and \"several services need the same events\".\n\n**RabbitMQ** is a smart broker. It routes messages through exchanges, tracks acknowledgements per message, supports priorities, and deletes messages once they're consumed. It's the fit for task queues: \"resize this image\", \"send this email\".\n\n**SQS** is fully managed on AWS, with almost no operations work. Standard queues are at-least-once with loose ordering; FIFO queues give ordering and deduplication at lower throughput.\n\nA short way to say it: Kafka is a newspaper archive anyone can reread; RabbitMQ and SQS are a to-do list where an item is gone once someone handles it.",
            },
            {
              question: "⭐ What are the delivery guarantees: at-most-once, at-least-once, exactly-once?",
              answer:
                "Picture a courier delivering a parcel. **At-most-once:** the courier marks it delivered before reaching the door. If the van breaks down, the parcel is lost, but it's never delivered twice. In Kafka terms, commit the offset before processing.\n\n**At-least-once:** the courier marks it delivered only after handing it over. If they crash right after handing it over but before marking it, the next courier delivers it again. That's processing first, then committing. Duplicates are possible, losses aren't, and this is the usual choice.\n\n**Exactly-once:** Kafka supports it for read-process-write that stays inside Kafka. Once the side effect leaves Kafka, like a database write or an email, the practical answer is at-least-once plus idempotent consumers.",
            },
            {
              question: "Have you used Kafka?",
              answer:
                "Not in production, and I say that plainly. RideX deliberately uses a database outbox instead, and there's an ADR recording why: it's a single modular monolith, so one app produces and consumes the events, and the outbox gives me atomicity with the business data with no extra infrastructure.\n\nWhat I can do is explain how Kafka works and when I'd bring it in: when several independent services need the same events, when I need replay, or when throughput outgrows a polling worker. At that point I wouldn't throw the outbox away. The standard production pattern is to keep the outbox table and have a relay (polling, or Debezium CDC) publish its rows to Kafka.",
            },
          ],
        },
      ],
    },
    {
      title: "Kafka Architecture",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Explain Kafka's architecture.",
              answer:
                "Imagine a big post office with many sorting counters. The post office is the **cluster**, and each building in it is a **broker**. Mail is sorted by subject into **topics**, like `ride-events`. Because one counter can't handle all the mail for a busy topic, each topic is split into **partitions**, and each partition is like its own counter with its own numbered register.\n\nTechnically, a partition is an **append-only, ordered log** on disk, stored as segment files with an index. Every message gets an **offset**, its position in that log. Each partition has one **leader** broker that takes writes, and **follower** replicas on other brokers that copy from it, so losing one broker doesn't lose data.\n\nCluster metadata, like which broker leads which partition, is managed by the **controller**. Since Kafka 3.x that's **KRaft**, built into Kafka itself; older clusters needed ZooKeeper.",
            },
          ],
        },
        {
          type: "diagram",
          caption: "One topic, three partitions, and a consumer group splitting them",
          text: `Producers (key = rideId)
    |        |        |
    v        v        v
+-------------------------------------------+
| topic: ride-events                        |
|  partition 0: [0][1][2][3][4] ->          |  leader on broker 1
|  partition 1: [0][1][2] ->                |  leader on broker 2
|  partition 2: [0][1][2][3] ->             |  leader on broker 3
+-------------------------------------------+
    |        |        |
    v        v        v
 consumer A  consumer B  consumer C     (group "billing")
 reads p0    reads p1    reads p2

 A second group ("notifications") reads ALL partitions again,
 with its own offsets.`,
        },
        {
          type: "qa",
          items: [
            {
              question: "How does a producer choose a partition?",
              answer:
                "If the message has a **key**, Kafka hashes the key and takes it modulo the number of partitions, so the same key always lands on the same partition. That's how all events for ride 42 stay together.\n\nWithout a key, modern clients use the **sticky partitioner**: they fill a batch for one partition, then switch to another. That spreads load while still sending nice big batches, which is better for throughput than switching on every message.",
            },
            {
              question: "⭐ How does ordering work in Kafka?",
              answer:
                "Ordering is guaranteed **only within a partition**. Think of supermarket billing counters: customers at one counter are served in order, but there's no order between counter 1 and counter 3.\n\nSo if events for one entity must stay in order (`RideRequested`, then `DriverAssigned`, then `RideCompleted`), I use the entity ID as the key, so they all go to the same partition. Across different rides, order doesn't matter, and that's what allows parallelism.\n\nOne more detail: with retries, a failed batch could be retried after a later one succeeds and land out of order. The **idempotent producer** (on by default in recent clients) prevents that, keeping order even with up to 5 in-flight requests per connection.",
            },
            {
              question: "What are acks, ISR and min.insync.replicas?",
              answer:
                "`acks` is how sure the producer wants to be before calling a write done. `acks=0`: fire and forget. `acks=1`: the leader has written it. `acks=all`: every **in-sync replica** has it.\n\nThe **ISR** (in-sync replicas) are the followers that are caught up with the leader. A follower that falls too far behind is dropped from the ISR until it catches up.\n\n`min.insync.replicas=2` combined with `acks=all` means a write only succeeds if at least two replicas have it. If the ISR shrinks below that, the producer gets an error instead of silently writing to a single copy. The common durable setup is replication factor 3, `min.insync.replicas=2` and `acks=all`, which survives one broker dying without losing acknowledged data.",
            },
            {
              question: "What is the idempotent producer? What are Kafka transactions?",
              answer:
                "Retries can create duplicates: the broker writes the message, the acknowledgement gets lost, and the producer sends it again. With the **idempotent producer** (`enable.idempotence=true`, the default in recent clients), each producer gets an ID and every message carries a sequence number per partition. The broker sees \"I already have sequence 17 from this producer\" and drops the repeat. That gives exactly-once writes per partition per producer session.\n\n**Transactions** go one step further: a producer can write to several partitions and commit the consumer's offsets atomically, all or nothing. That's how a read-process-write pipeline inside Kafka becomes exactly-once. Consumers set `isolation.level=read_committed` so they never see writes from an aborted transaction.\n\nThe limit is the same as always: once a side effect leaves Kafka, like a database insert or an email, it's at-least-once again, plus idempotent consumers.",
            },
            {
              question: "Why is Kafka so fast?",
              answer:
                "Mostly because it does the simplest possible thing with the disk. It only **appends** to the end of a log, and sequential disk writes are dramatically faster than random ones, close to memory speed on modern hardware.\n\nIt leans on the operating system's **page cache** instead of keeping its own cache, so recently written data is usually read straight from memory. It uses **zero-copy** (`sendfile`): data moves from the page cache to the network socket without being copied through the application. It **batches and compresses** messages, so one network call carries many of them. And partitions spread the load across many brokers and disks.",
            },
            {
              question: "How many partitions should a topic have?",
              answer:
                "Partitions cap a consumer group's parallelism, because each partition is read by only one consumer in the group. So I size for peak load: roughly target throughput divided by what one consumer can handle, plus some headroom.\n\nToo many partitions has a cost: more open files, more memory, slower leader elections and more end-to-end latency. And while you can add partitions later, doing so **changes which partition each key maps to**, which breaks ordering for existing keys. So it's worth planning ahead rather than starting with one and growing.",
            },
            {
              question: "Retention vs log compaction?",
              answer:
                "**Retention** deletes old data by time or size, for example keep 7 days. It's like a CCTV recorder that overwrites footage older than a week. That suits event streams where old events stop mattering.\n\n**Compaction** keeps only the **latest value for each key**, forever. It's like a contacts list: you don't need every old phone number a friend had, just the current one. A message with a null value (a tombstone) deletes the key. That suits changelog or state topics, like the latest status of each driver. Kafka's own `__consumer_offsets` topic is compacted.",
            },
          ],
        },
      ],
    },
    {
      title: "Kafka Consumers",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How do consumer groups work?",
              answer:
                "Picture a tea stall with a pile of orders and three helpers. The owner splits the order slips so each slip goes to exactly one helper, and nobody makes the same tea twice. That's a **consumer group**: the topic's partitions are divided among the group's members, and each partition is read by exactly one consumer in the group.\n\nA different group, say a stall next door that also wants every order for its records, gets its own full copy of the stream with its own offsets. So \"billing\" and \"notifications\" can both read every ride event independently.\n\nIf a group has more consumers than partitions, the extra consumers sit idle. That's why the partition count is the real ceiling on parallelism.",
            },
            {
              question: "What is a rebalance, and what triggers it?",
              answer:
                "A rebalance is the group reshuffling which consumer owns which partition. A **group coordinator** broker tracks members through heartbeats. When a consumer joins, leaves, crashes, or takes longer than `max.poll.interval.ms` between polls (because its processing is too slow), the coordinator triggers a rebalance and partitions are reassigned.\n\nWith the old **eager** protocol, everyone stops and gives up all partitions during the shuffle. **Cooperative** (incremental) rebalancing only moves the partitions that need to move, so the rest keep working. **Static membership** (`group.instance.id`) lets a consumer restart during a rolling deploy without triggering a rebalance at all.\n\nAfter a rebalance, the new owner resumes from the last **committed** offset, so some messages may be processed again. One more reason consumers must be idempotent.",
            },
            {
              question: "⭐ Where are offsets stored, and how should you commit them?",
              answer:
                "Committed offsets live in an internal compacted topic called `__consumer_offsets`. An offset is basically a bookmark: \"this group has finished everything up to message 1,204 in partition 2\".\n\nWith **auto-commit**, the client commits periodically in the background, which can commit an offset before my processing actually finished, so a crash loses that message. With **manual commit after processing**, a crash means reprocessing instead of losing, which is at-least-once.\n\nWhen a group has no committed offset yet, `auto.offset.reset` decides where to start: `earliest` reads from the beginning, `latest` only reads new messages.",
            },
            {
              question: "How do you handle a poison message?",
              answer:
                "A poison message is one that fails every single time, like an order slip with an unreadable address. If the consumer keeps retrying it, everything behind it in that partition waits forever.\n\nSo: retry a few times with backoff for transient errors, then move it aside to a **dead-letter topic** (DLT) where someone can inspect it, and let the partition keep flowing. In Spring Kafka, that's a `DefaultErrorHandler` with a `DeadLetterPublishingRecoverer`, which by default publishes to the original topic name plus `.DLT`.\n\nFor retries that shouldn't block the partition at all, `@RetryableTopic` sends failures through separate retry topics with increasing delays. The same idea exists without Kafka: RideX's outbox marks a message `DEAD` after 6 failed attempts and keeps it for a person to look at.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Retry three times, then send to the dead-letter topic",
          code: `@KafkaListener(topics = "ride-events", groupId = "billing")
public void onRideEvent(RideEvent event) {
    billingService.handle(event);   // must be idempotent
}

@Bean
DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template) {
    var toDeadLetter = new DeadLetterPublishingRecoverer(template); // -> ride-events.DLT
    return new DefaultErrorHandler(toDeadLetter, new FixedBackOff(1000L, 3)); // 1s apart, 3 retries
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "What is consumer lag, and why do you alert on it?",
              answer:
                "Lag is the gap between the newest offset in a partition and the group's committed offset: how far behind the consumers are. It's the queue length outside a bank: a short queue is fine, a queue that keeps growing means the tellers can't keep up.\n\nSteadily rising lag means I need more consumers (up to the partition count), faster processing, or a look at a stuck partition, often a poison message. Lag is one of the most useful Kafka alerts because it shows trouble before users notice delayed notifications or stale dashboards.",
            },
            {
              question: "Kafka Connect vs Kafka Streams?",
              answer:
                "**Kafka Connect** moves data in and out of Kafka using ready-made connectors, with no custom code: Debezium streaming every database change from Postgres into Kafka, or a sink writing a topic into S3 or Elasticsearch.\n\n**Kafka Streams** is a Java library for processing streams inside your own app: filtering, joining two topics, windowed counts like \"rides per city per minute\", with state stored and recovered through Kafka.",
            },
          ],
        },
      ],
    },
    {
      title: "Consistent Hashing",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is consistent hashing, and why do we need it?",
              answer:
                "Say I have 4 cache servers and pick one with `hash(key) % 4`. It works until I add a fifth server. Now it's `% 5`, and almost every key maps to a different server. The cache is effectively wiped in one go, and the database gets hammered.\n\nConsistent hashing places both servers and keys on a **ring**. Each key belongs to the **first server clockwise** from its position. It's like houses along a circular road, each served by the next post office ahead of it. When a new post office opens, only the houses between it and the previous office switch over; everyone else keeps the same office.\n\nSo adding a server moves roughly **1/N of the keys** instead of nearly all of them, and removing one only moves that server's keys to its neighbour.",
            },
            {
              question: "What are virtual nodes?",
              answer:
                "With only a few servers on the ring, the gaps between them are uneven, so one server can end up with far more keys than another. The fix is to place each server on the ring many times, say 100 to 200 **virtual nodes** each.\n\nThat evens out the load, and when a server dies, its keys spread across many servers instead of all landing on one unlucky neighbour. A bigger server can also be given more virtual nodes so it takes a bigger share.",
            },
            {
              question: "Can you code a simple consistent-hash ring?",
              answer:
                "Yes, and a `TreeMap` makes it short: the map **is** the ring. `ceilingEntry(hash)` finds the first node clockwise in O(log n), and if there's nothing after the key, I wrap around to the first entry.\n\nBelow I compare it with plain modulo on 10,000 keys when going from 4 servers to 5. With modulo about 80% of keys move; with the ring it's about 15%, close to the ideal 1/5. The hash here mixes `String.hashCode` with a multiplier to spread the bits, which is fine for a demo; real code would use a proper hash like MurmurHash.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "HashRingDemo.java",
          code: `import java.util.*;

public class HashRingDemo {
    static final TreeMap<Integer, String> ring = new TreeMap<>();

    static int hash(String s) {
        int h = s.hashCode() * 0x9E3779B1;   // spread the bits; use Murmur in real code
        return h ^ (h >>> 16);
    }

    static void addServer(String server) {
        for (int i = 0; i < 100; i++) ring.put(hash(server + "#" + i), server);
    }

    static String serverFor(String key) {
        Map.Entry<Integer, String> e = ring.ceilingEntry(hash(key));
        return (e != null ? e : ring.firstEntry()).getValue();
    }

    public static void main(String[] args) {
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < 10_000; i++) keys.add("order:" + i);

        // Plain modulo: 4 servers, then 5
        int movedModulo = 0;
        for (String k : keys) {
            int before = Math.floorMod(k.hashCode(), 4);
            int after = Math.floorMod(k.hashCode(), 5);
            if (before != after) movedModulo++;
        }

        // Ring: 4 servers, then add a 5th
        for (String s : List.of("cache-A", "cache-B", "cache-C", "cache-D")) addServer(s);
        Map<String, String> before = new HashMap<>();
        for (String k : keys) before.put(k, serverFor(k));
        addServer("cache-E");
        int movedRing = 0;
        for (String k : keys) if (!before.get(k).equals(serverFor(k))) movedRing++;

        System.out.println("Keys moved with hash % N: " + movedModulo + " of 10000");
        System.out.println("Keys moved with the ring:  " + movedRing + " of 10000");
    }
}`,
        },
        {
          type: "output",
          text: `Keys moved with hash % N: 7998 of 10000
Keys moved with the ring:  1504 of 10000`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Where is consistent hashing used in practice?",
              answer:
                "Distributed caches (Memcached clients pick a server this way), databases that partition data like Cassandra and DynamoDB, load balancers that keep a user \"sticky\" to one backend, and CDNs.\n\n**Redis Cluster** is a close cousin rather than the same thing: it uses 16,384 fixed hash slots and assigns ranges of slots to nodes. Adding a node means moving some slots, not rehashing everything, which gives the same benefit with simpler bookkeeping.\n\nI haven't needed it in RideX, which runs a single Redis. If driver presence ever outgrew one node, I'd shard it by city, or with consistent hashing on the geohash, so adding a node only moves a fraction of the drivers.",
            },
          ],
        },
      ],
    },
    {
      title: "BlockingQueue vs a Message Broker",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is a BlockingQueue?",
              answer:
                "A thread-safe queue where `put()` **waits** if the queue is full and `take()` **waits** if it's empty. Think of a tea stall counter with room for only two cups. If both spots are full, the person making tea has to wait before putting down another cup. If the counter is empty, the server waits for the next cup.\n\nThat makes it the standard tool for producer-consumer problems inside one JVM, and a **bounded** one gives backpressure for free: a fast producer is forced to slow down when consumers fall behind.",
            },
            {
              question: "put/take vs offer/poll vs add/remove?",
              answer:
                "They differ in what happens when the queue can't do the job right now. `add` and `remove` **throw** an exception. `offer` and `poll` **return a special value** right away: `false` or `null`. `put` and `take` **block** until they can. And the timed versions, `offer(e, timeout, unit)` and `poll(timeout, unit)`, wait up to a limit and then give up.\n\nIn production code I prefer the timed versions, so a thread never waits forever on a queue that's stuck.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "TeaCounter.java",
          code: `import java.util.concurrent.*;

public class TeaCounter {
    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<String> counter = new ArrayBlockingQueue<>(2);   // only 2 cups fit

        System.out.println(counter.offer("tea-1"));   // true
        System.out.println(counter.offer("tea-2"));   // true
        System.out.println(counter.offer("tea-3"));   // false: counter is full
        System.out.println(counter.offer("tea-3", 100, TimeUnit.MILLISECONDS)); // waits, still full

        System.out.println(counter.take());           // tea-1
        System.out.println(counter.offer("tea-3"));   // true: space freed
        System.out.println(counter);
    }
}`,
        },
        {
          type: "output",
          text: `true
true
false
false
tea-1
true
[tea-2, tea-3]`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Which BlockingQueue implementations do you know?",
              answer:
                "`ArrayBlockingQueue` is **bounded** and array-backed with one lock, a good default when I want backpressure. `LinkedBlockingQueue` can be bounded but is **unbounded by default**, which is dangerous; it uses separate locks for put and take, so it has higher throughput. `PriorityBlockingQueue` is unbounded and ordered by priority. `DelayQueue` only releases an item after its delay, which suits retries and expiries. `SynchronousQueue` has zero capacity: every `put` waits for a matching `take`, a direct hand-off, and `newCachedThreadPool` uses it.",
            },
            {
              question: "Why is Executors.newFixedThreadPool risky under load?",
              answer:
                "Every `ThreadPoolExecutor` has a `BlockingQueue` of waiting tasks inside it, and `newFixedThreadPool` uses an **unbounded** `LinkedBlockingQueue`. Under a burst it keeps accepting tasks forever. The queue grows until memory runs out, and every queued task waits longer and longer. There's no backpressure; the problem is just hidden until the crash.\n\nIn production I'd build a `ThreadPoolExecutor` directly with a bounded `ArrayBlockingQueue` and a rejection policy. `CallerRunsPolicy` is a nice one: when the pool is full, the caller runs the task itself, which naturally slows it down.",
            },
            {
              question: "BlockingQueue vs a message broker like Kafka or SQS?",
              answer:
                "A `BlockingQueue` lives in **one JVM's memory**. It's like notes on a whiteboard in one shop: fast and simple, but if the shop's lights go out (a restart or a crash), the notes are gone, and the shop next door can't see them.\n\nA broker is durable and shared across machines: messages survive restarts, and many servers can produce and consume. So I use a `BlockingQueue` for in-process hand-offs where losing in-flight work on a restart is acceptable, and a broker, or a database table used as a queue, for work that must survive.\n\nIn RideX, background work must survive restarts and run safely on several instances, so instead of an in-memory queue the outbox and payment rows **are** the queue, claimed with `SKIP LOCKED`. Fixed batch sizes per poll give the same backpressure a bounded `BlockingQueue` would.",
            },
            {
              question: "BlockingQueue vs ConcurrentLinkedQueue?",
              answer:
                "`ConcurrentLinkedQueue` is lock-free and **never blocks**: `poll()` on an empty queue just returns `null`. It's for when consumers have other things to do and shouldn't wait. A `BlockingQueue` is for when I **want** consumers to wait for work and producers to wait for space.",
            },
          ],
        },
      ],
    },
    {
      title: "Quick Revision",
      blocks: [
        {
          type: "diagram",
          caption: "Cheat sheet: one line per idea",
          text: `ARCHITECTURE
  Monolith            one app, one DB, local transactions
  Modular monolith    one app, strict module walls (start here)
  Microservices       independent deploys + own data, network pain
  API gateway         single entry: routing, auth, rate limits, TLS
  Tracing             one trace ID across all hops (traceparent)

RESILIENCE
  Timeout             fail fast instead of waiting forever
  Retry               only idempotent ops, backoff + jitter, max tries
  Circuit breaker     closed -> open (fail fast) -> half-open (test)
  Bulkhead            separate pool per dependency
  Backpressure        buffer / drop / reject / slow the producer

DISTRIBUTED DATA
  2PC                 locks across services, avoid
  Saga                local steps + compensating undo
  Outbox              business row + event row in ONE transaction
  Idempotent consumer unique message ID, safe to process twice
  Exactly-once        = at-least-once + idempotency (in practice)

REDIS
  Fast because        RAM, single-threaded commands, good structures
  Cache-aside         miss -> DB -> fill; on write: update DB, DELETE key
  Stampede            hot key expires   -> lock / early refresh
  Penetration         missing keys      -> cache "not found" / Bloom
  Avalanche           mass expiry       -> TTL jitter, replicas
  Lock                SET key token NX PX ; release via Lua check+DEL
  RDB / AOF           snapshot / write log (or off for disposable data)
  Cluster             16,384 slots, {hash tags} for multi-key ops

KAFKA
  Topic -> partitions -> append-only log, offsets
  Key -> partition     ordering only WITHIN a partition
  acks=all + RF 3 + min.insync.replicas=2   durable writes
  Idempotent producer  sequence numbers drop retry duplicates
  Consumer group       one partition -> one consumer in the group
  Rebalance            join/leave/crash/slow poll -> reassign
  Commit after work    at-least-once
  Poison message       retry with backoff -> dead-letter topic
  Fast because         sequential I/O, page cache, zero-copy, batching
  Retention / compaction   by time-size / latest value per key

OTHER
  Consistent hashing   ring + virtual nodes, adding a node moves ~1/N
  BlockingQueue        in-JVM, bounded = backpressure, lost on restart
  Broker / DB queue    durable, shared, survives restarts`,
        },
      ],
    },
  ],
};
