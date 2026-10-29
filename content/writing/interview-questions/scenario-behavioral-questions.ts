import type { Lesson } from "../types";

export const scenarioBehavioralQuestions: Lesson = {
  slug: "scenario-behavioral-interview-questions",
  date: "2026-10-29",
  title: "Scenario, Behavioral and Managerial Interview Questions",
  description:
    "How I approach the \"what would you do if...\" rounds: production incidents, design and code scenarios, STAR behavioral answers as reusable templates, and the questions a hiring manager actually asks.",
  tags: ["Interview", "Scenarios", "Behavioral", "Managerial", "Production"],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These rounds don't test whether I've memorised an API. They test how I think when something is on fire, how I explain a decision, and whether I can be trusted with production. So for each question, I try answering out loud first, in under two minutes, and only then open my notes. A ⭐ marks the questions that come up most often.",
        },
        {
          type: "paragraph",
          text: "For every scenario question I use the same six steps, and I say them out loud so the interviewer can follow my thinking. It's the same order a good doctor uses in an emergency room: stop the bleeding first, then find out why, then make sure it doesn't happen again.",
        },
        {
          type: "diagram",
          text: `1. CLARIFY     Everyone or some users? Since when? What changed (deploy, traffic, data)?
2. CONTAIN     Roll back, switch the feature off, scale up, tell people.
3. OBSERVE     Dashboards (errors, p99, saturation), logs by request ID, traces.
4. HYPOTHESISE One likely cause at a time, test it, move on.
5. FIX         Short-term fix now, root-cause fix after.
6. PREVENT     A test, an alert or a runbook, plus a short blameless postmortem.`,
          caption: "The six-step answer for any \"what would you do if...\" question",
        },
        {
          type: "callout",
          tone: "tip",
          title: "One sentence that frames everything",
          text: "\"First I'd limit the impact, then find the cause, then make sure it can't happen again.\" Saying this up front tells the interviewer I have a process, not just a guess.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Stories must be real",
          text: "The behavioral answers on this page are **templates**: a structure plus what a strong answer contains. Before an interview I fill each one with a real memory. Interviewers dig into stories, and invented details fall apart by the second follow-up. Where I mention RideX, my public ride-hailing project, it's because that thing really happened in its code or git history.",
        },
      ],
    },
    {
      title: "Production and Debugging Scenarios",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ It's 9 PM and bookings start failing. You're on call. What do you do in the first 15 minutes?",
              answer:
                "Think of a tea stall where suddenly nobody is getting their tea. Before working out why, I'd want to know: is it every customer or just one counter, and since when?\n\nSo first I scope it: all bookings or one city or app version, and when did it start? I check the error-rate dashboard and the list of recent deploys. If something shipped in the last hour, I **roll back first** and investigate afterwards, because rolling back is the fastest way to stop the damage.\n\nIf nothing was deployed, I look at the errors themselves. Are they 500s or timeouts? Logs filtered on the booking endpoint show the exception. The usual causes are a database that's down or out of connections, a dependency that's down (payments, maps), or something that quietly expired, like a disk filling up or a certificate.\n\nAll the while I post short updates in the incident channel so support can tell customers what's going on. Afterwards comes the root-cause fix, a test, an alert, and a short blameless postmortem.",
            },
            {
              question: "p99 latency jumped from 200 ms to 4 s right after a deploy, but the change looks unrelated. What now?",
              answer:
                "\"Unrelated\" changes often aren't. It's like a lift that got slow after someone \"only\" repainted the buttons: maybe they also changed a setting while they were in there.\n\nI compare before and after. Did a new query or a missing index ship? Did a library version change? Did a config default change, like a pool size or a timeout? Did a mapper start touching a lazy relation, so an N+1 appeared?\n\nThen I look at traces to see **which span** got slow: database, an external call, or plain CPU in the app. If it's the database, I run `EXPLAIN ANALYZE` on the slow query. If it's GC, I check the GC logs. And if users are hurting while I dig, I roll back first and reproduce the problem in staging.",
            },
            {
              question: "⭐ A customer was charged but has no booking. How do you handle it?",
              answer:
                "Picture paying at a food counter, the card machine beeps \"approved\", but the kitchen never got the order. Two jobs: sort out this customer, then fix the system so it can't happen again.\n\nFor the customer, I find the payment by the gateway's ID, check our payment records and logs, and either complete the booking or refund it. Then I tell them what happened.\n\nFor the system, this is the classic \"an external call and a database write aren't atomic\" problem. Usually the gateway succeeded and our commit failed, or the webhook that should have confirmed it got lost. The permanent fix has four parts: idempotency keys when creating the payment, webhooks recorded under a unique event ID, the payment row written **before** calling the gateway (outbox style), and a reconciliation job or an on-demand \"check with provider\" action that compares the gateway's state with ours.\n\nIn RideX I hit a close cousin of this. I was calling the payment gateway inside the trip-completion transaction, so a gateway blip rolled back the whole trip. I moved the call to after the commit: the payment row is written in the trip's transaction, and a background worker opens the gateway order afterwards.",
            },
            {
              question: "CPU is at 100% on one instance but normal on the others. What's going on?",
              answer:
                "If one cashier in a bank is overwhelmed while the others are idle, it's not the queue, it's something at that one counter.\n\nThe load balancer spreads traffic evenly, so it's probably something specific to that node: a request stuck in an infinite loop, a hot key, a scheduled job that happens to run there, or GC thrashing. I find the busy threads with `top -H -p <pid>`, take two or three **thread dumps** a few seconds apart with `jstack`, and see which stack stays busy across all of them. I also check the GC logs.\n\nShort term, I take that node out of the load balancer and restart it. Then I fix the code path the thread dumps pointed at.",
            },
            {
              question: "⭐ Memory grows steadily and the app hits `OutOfMemoryError` after two days. How do you find the leak?",
              answer:
                "A slow, steady climb is like a cupboard that only ever gets things added and never cleared. Eventually the door won't close. Something is staying reachable when it shouldn't.\n\nThe usual suspects are a static map or cache with no size limit, `ThreadLocal` values that are never removed in pooled threads, unclosed resources, listeners that are never unregistered, and a huge result set loaded into memory at once.\n\nI'd run with `-XX:+HeapDumpOnOutOfMemoryError`, open the heap dump in Eclipse MAT, and look at the **dominator tree** to see which object is holding most of the memory. Short term, a scheduled restart and an alert on heap usage buy time. The real fix is the cause, for example giving that cache a maximum size or a TTL.",
            },
            {
              question: "A database migration locked a big table and the app froze. What do you do?",
              answer:
                "It's like closing the only door of a busy shop to repaint it during rush hour. Everyone queues outside.\n\nSome DDL takes heavy locks, like creating an index without `CONCURRENTLY`, or adding a column with a default on older databases. Every query on that table queues behind it. Right away, I'd cancel the migration if that's safe, or wait it out if it's nearly finished.\n\nTo prevent it, I use `CREATE INDEX CONCURRENTLY`, add columns as nullable first and backfill in batches before adding constraints (expand and contract), set a `lock_timeout` so a migration fails fast instead of freezing the app, and test migrations against production-sized data. It also helps if a failed migration fails the deploy, instead of leaving a half-migrated app running.",
            },
            {
              question: "The logs say \"Connection is not available, request timed out after 30000 ms\". What's wrong?",
              answer:
                "The database connection pool is like a fixed number of cabs at a stand. If every cab is out on a long trip, new passengers wait, and after 30 seconds they give up.\n\nThat message is HikariCP saying every connection is checked out. The causes are slow queries, long transactions, **external API calls made inside a transaction** (holding a connection for seconds while waiting on someone else), a connection leak, or simply more traffic than the pool and database can handle.\n\nI check the Hikari metrics (active and pending connections), turn on leak detection, and find which endpoints hold connections the longest. The fix is almost always in the code, shorter transactions and no network calls inside them, rather than a bigger pool. That's exactly why, in RideX, the payment gateway is called after the commit and not inside the transaction.",
            },
            {
              question: "A third-party API, like maps or payments, is down. How do you keep your app up?",
              answer:
                "If the bakery that supplies a café shuts for the day, the café shouldn't close too. It sells something else, or tells customers \"no croissants today\".\n\nFirst I make sure the outage can't take us down: **timeouts** on every call, a **circuit breaker** so we fail fast instead of piling up waiting threads, and a **fallback** where one exists. For payments, I keep the order pending and retry with the same idempotency key, and the user sees \"payment processing\" rather than \"failed\". Then I check the provider's status page and keep stakeholders informed.\n\nIn RideX, the maps provider falls back from Google to a free routing provider when Google fails or the daily call budget runs out, so a fare estimate still works.",
            },
            {
              question: "Webhooks from the payment gateway stopped arriving. Where do you look?",
              answer:
                "It's like a courier who stopped delivering. Either they stopped sending, or my door stopped opening.\n\nFirst I check whether **they're** sending: the provider's dashboard shows delivery attempts and what we responded. Then whether **we're** rejecting them: a signature failure after a secret rotation, a changed URL, a firewall rule, or our endpoint returning 500.\n\nThe bigger lesson is that payments must not depend on webhooks alone. There should always be a reconciliation path, like polling the provider on demand or a \"check with provider\" action, so a missed webhook delays a status instead of losing it. A counter of failed webhooks tagged by reason (bad signature vs unreadable payload) makes the cause obvious the moment it spikes.",
            },
            {
              question: "Users are getting duplicate emails or notifications. Why, and how do you stop it?",
              answer:
                "Think of two waiters both picking up the same order slip and both bringing the food. The fix is that a slip, once picked up, belongs to one waiter.\n\nDuplicates come from at-least-once delivery: a retry after a timeout, two workers picking the same job, or a consumer processing a message twice after a crash. I fix it in three ways. Claim jobs with `SELECT ... FOR UPDATE SKIP LOCKED`, so two workers never take the same row. Give each notification a unique message ID and make sending idempotent. And make \"mark as sent\" part of the same unit of work as the claim.",
            },
            {
              question: "⭐ Two users booked the same last seat. How did that happen and how do you fix it?",
              answer:
                "Two people at two counters both look at the seat chart, both see seat 12A free, and both sell it. Neither did anything wrong on their own; the problem is that they checked and then acted separately.\n\nThat's a check-then-act race. The fix belongs in the **database**, because that's the one place both requests meet. Either a unique constraint on (trip, seat), so the second insert fails and becomes a clear \"seat just taken\" message, or a conditional update or row lock. A `synchronized` block wouldn't help once there's more than one app instance.\n\nRideX solves the same race for ride acceptance: one conditional update decides which driver wins, and a test releases two threads at the same moment to prove exactly one gets the ride.",
            },
            {
              question: "A user can see someone else's booking by changing the ID in the URL. What do you do?",
              answer:
                "That's like a hotel key card that opens every room if you just change the room number. It's IDOR, broken access control, and it's at the top of the OWASP list.\n\nI fix that endpoint immediately with an ownership check, then fix it **systematically**: every query that takes an ID from the client is scoped to the caller, like `findByIdAndRiderId(id, riderId)`, or goes through an ownership check in `@PreAuthorize`. I add security tests that request other users' IDs and expect 404 or 403, and I check the access logs to see whether it was exploited.",
            },
            {
              question: "A user intermittently sees another user's data, and it's not an ID problem. What do you suspect?",
              answer:
                "This smells like one shared notepad that every waiter writes the current order on. Two orders at once, and one overwrites the other.\n\nIn Java that's **shared mutable state**: a field in a singleton `@Service` holding request data, a `ThreadLocal` that's never cleared in a pooled thread, or a cache key that's missing the user ID. In PHP each request lives in its own process, so this bug barely exists there. In Spring, one service instance serves every request, so it's one of the first things I check. The fix is stateless services, clearing `ThreadLocal` in a `finally` block, and including the user in every per-user cache key.",
            },
            {
              question: "The cache is serving stale prices after an admin updated them. How do you fix it?",
              answer:
                "A restaurant changed its menu prices but the board outside still shows the old ones. Someone has to wipe the board when the menu changes, and the board should be redrawn every morning anyway.\n\nOn update, the cache entry must be **deleted** right after the database write, and every entry needs a TTL as a safety net. With several instances each holding a local cache, I need cross-node invalidation through pub/sub, or a shared Redis cache instead. For prices specifically, I'd keep the TTL short or not cache them at all. A useful habit is saving the quoted price with the order, so a stale cache can never change a price the customer already agreed to.",
            },
            {
              question: "A scheduled job ran three times, once on each instance. Why, and what's the fix?",
              answer:
                "If three shop managers each set an alarm to \"send the daily report\", the owner gets three reports.\n\n`@Scheduled` runs on **every** instance. The fixes are ShedLock (a lock per job in the database or Redis), running jobs on one dedicated instance, or making the job safe to run concurrently by claiming rows with `SKIP LOCKED` so instances split the work instead of repeating it.\n\nThere's a second trap worth mentioning: Spring Boot's default scheduler has **one thread**, so jobs can also delay each other. I found exactly that in RideX, where seven jobs shared one thread and a slow notification run could hold up the dispatch sweep. I set `spring.task.scheduling.pool.size: 4`.",
            },
            {
              question: "A message queue is backing up. How do you clear it?",
              answer:
                "A queue at the post office grows when the clerks are slower than the people arriving. Either a clerk is stuck on one difficult parcel, or there aren't enough clerks.\n\nI find out why consumers are slow: a poison message blocking a partition, a slow downstream dependency, too few consumers or partitions, or errors causing endless retries. Short term, I scale consumers and move the poison message to a dead-letter queue. Long term, I add retries with backoff, a DLQ for every consumer, and an alert on consumer lag.",
            },
            {
              question: "Disk is full on a server, or an SSL certificate just expired. What do you do?",
              answer:
                "Both are the \"forgot to take out the rubbish\" kind of outage: boring, predictable, and preventable.\n\nFor a full disk, it's usually logs or temp files. I free space by rotating or compressing logs, then fix it properly: log rotation, shipping logs to a central store, quieter log levels, an alert at 80% disk, and a cleanup of old Docker images and volumes.\n\nFor an expired certificate, I renew it immediately, then automate renewal (Let's Encrypt, a cloud certificate manager, or a proxy like Caddy that renews on its own) with an expiry alert 30 days ahead.",
            },
            {
              question: "A secret, like an API key, was committed to Git. What's the first step?",
              answer:
                "If I lose my house key, I change the lock. I don't just go looking for the key.\n\nI **rotate the secret first** and assume it was compromised the moment it was pushed. Then I check the provider's usage logs for abuse, remove it from history if needed, and add secret scanning to CI. A good habit to mention: the app should refuse to start without required secrets and never ship a default value, because a default sits in git history forever.",
            },
            {
              question: "Traffic will be 10× higher next week because of a sale. How do you prepare?",
              answer:
                "A tea stall that knows a cricket match is ending nearby boils extra water and lines up cups before the crowd arrives.\n\nI find the bottleneck **before** the event. I load-test the critical paths with realistic data, make sure the app is stateless so it can scale horizontally, add caching for hot reads, and check indexes and pool sizes. I add rate limits to protect the core, decide what can be switched off under pressure (load shedding), get dashboards and alerts ready, and freeze risky deploys that week.\n\nIn RideX I wrote a k6 load test simulating 2,500 drivers sending their location every 5 seconds, about 500 requests a second, with real JWTs and a warm-up phase, so I know where that path breaks.",
            },
            {
              question: "A new API version broke old mobile apps. What went wrong?",
              answer:
                "Old apps on people's phones are like old remote controls: you can't recall them all, so the TV has to keep understanding the old buttons.\n\nFirst I restore the old behaviour for those clients. The mistake was making a **breaking change in place**. Breaking changes belong in a new version, `/v2`, while v1 stays until its traffic drops. v1 responses get `Deprecation` and `Sunset` headers, and contract tests for v1 make sure it can't silently break again.",
            },
            {
              question: "A timezone bug: some users see bookings on the wrong date. How do you fix it?",
              answer:
                "A cab booked for 11:30 PM in India is already the next day in UTC. If the code mixes the two, the booking lands on the wrong date.\n\nThe rule is: store every moment in UTC (`Instant` in Java, `TIMESTAMPTZ` in PostgreSQL), and convert to local time only at the edge, using the user's or the city's zone. Any \"group by day\" report has to use an explicit zone too, otherwise the chart and the SQL disagree about where a day starts.",
            },
            {
              question: "Redis goes down. What happens to the app?",
              answer:
                "It depends on what lives in Redis. If it's a notepad for things I can work out again, losing it is annoying, not fatal.\n\nIf Redis only holds a cache or short-lived data, the app should **degrade, not die**: a cache miss means going to the database, and rate limits fail open. The dangerous case is anything that **only** lives in Redis, like sessions. Then everyone gets logged out, so that data needs replication with Sentinel or Cluster.\n\nRideX was designed so Redis holds only data that's worthless within minutes: driver presence, rate-limit counters and a route cache. Nothing about money lives only in Redis. I also once raised its connect timeout from 500 ms to a few seconds, because a hosted Redis adds a TLS handshake and AUTH on connect, and 500 ms was cutting those off.",
            },
            {
              question: "\"It works on my machine\" but fails in production. How do you find the difference?",
              answer:
                "A recipe that works at home can fail in a restaurant kitchen: different oven, different altitude, bigger batches.\n\nI compare what's different: config and environment variables, data volume, the database version or dialect (H2 in tests vs PostgreSQL in production is a classic), timezone, memory limits, network and DNS, and dependency versions. To shrink the gap for good, I use the same Docker image in every environment, real databases in tests through Testcontainers, and fail-fast config so the app refuses to boot when something required is missing.",
            },
          ],
        },
      ],
    },
    {
      title: "Design Scenarios",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Monolith or microservices for a new five-person team?",
              answer:
                "A family restaurant doesn't need five separate kitchens with a delivery van running between them. One well-organised kitchen with clear stations works better.\n\nI'd pick a **modular monolith**. Microservices solve team-scaling and independent-scaling problems a five-person team doesn't have yet, and they add network failures, distributed transactions and operational cost from day one. I'd keep strict module boundaries so splitting later is easy. RideX is built this way, with ArchUnit tests failing the build if one module reaches into another's internals.",
            },
            {
              question: "How would you add surge pricing to a cab app?",
              answer:
                "When it rains and everyone wants a cab at once, the price goes up a little so more drivers come online.\n\nI'd make pricing a strategy: the fare calculation gets a `surgeMultiplier` computed per area from demand vs supply (open requests vs online drivers). I'd cap the multiplier, show it to the rider **before** they book, and save it on the quote, so the final charge matches what they agreed to and old rides never change.",
            },
            {
              question: "100,000 drivers send their location every 5 seconds. How do you store and query it?",
              answer:
                "That's 20,000 writes a second of data that's useless a minute later, like writing every step of every walker in a park into a permanent ledger.\n\nSo it shouldn't go into the main database. I'd use Redis GEO, sharded by city or geohash if one node isn't enough, and query with `GEOSEARCH` within a radius. Only trip breadcrumbs get persisted, in batches. RideX uses the same design at a smaller scale.",
            },
            {
              question: "⭐ How do you make an API idempotent?",
              answer:
                "If I press the lift button five times, I still get one lift. A payment button should work the same way.\n\nThe client sends an `Idempotency-Key` header. The server stores that key with the result under a **unique constraint**. A repeat with the same key returns the stored result instead of acting again. If the same key arrives with a different body, I return 409 or 422. The unique constraint matters because two identical requests can both pass a \"have I seen this?\" check at the same moment, but only one insert can win.",
            },
            {
              question: "How would you design a notification system?",
              answer:
                "A good post office takes the letter, gives a receipt, and delivers later. It doesn't make me stand at the counter until the letter arrives.\n\nThe business transaction writes an **outbox** row together with the business change. A worker picks rows up, chooses a channel (email, push, SMS) through a strategy, respects user preferences and templates, retries with backoff, moves hopeless messages to a dead-letter state, stays idempotent per message, and rate-limits per user so nobody gets spammed.",
            },
            {
              question: "How do you change a big table's column without downtime?",
              answer:
                "It's like moving a shop to a new address while it stays open: open the new shop, redirect customers gradually, then close the old one.\n\nExpand and contract: add the new column as nullable, write to both columns, backfill old rows in batches, switch reads to the new column, and drop the old column only once nothing uses it. No step breaks the running app.",
            },
            {
              question: "How do you handle a long-running report export?",
              answer:
                "A tailor doesn't make me wait in the shop while he stitches. He gives me a slip and tells me when to come back.\n\nThe API returns **202 Accepted** with a job ID. A background worker builds the file, a status endpoint reports progress, and when it's done the file sits in object storage with a short-lived signed download link.",
            },
            {
              question: "How would you guarantee exactly-once payment processing?",
              answer:
                "Honestly, you can't get true exactly-once across separate systems, because the network can always lose the reply. What you can get is \"at least once, but harmless if repeated\".\n\nSo I combine at-least-once delivery with idempotency keys on every gateway call, unique event IDs on webhooks, and a reconciliation job that compares the gateway's records with ours. Saying \"exactly-once is a property you build from idempotency, not something a library gives you\" usually lands well.",
            },
            {
              question: "One slow dependency is making everything slow. How do you isolate it?",
              answer:
                "If one slow customer at a bank counter holds up the whole queue, you give them their own counter.\n\nTimeouts on every call, a **bulkhead** (a separate, limited pool per dependency so it can't use up every thread), a circuit breaker, async processing where the user doesn't need to wait, caching, and a fallback. The goal is that one sick dependency hurts only the features that need it.",
            },
            {
              question: "How do you design for multi-tenancy?",
              answer:
                "Think of an apartment building: everyone can share one big hall with name tags, have their own floor, or have their own house.\n\nThere are three options. Shared tables with a `tenant_id` column are cheapest, but one missing filter leaks data. Schema per tenant is a middle ground. Database per tenant gives the strongest isolation but costs more, and migrations run once per tenant.\n\nAnd sometimes the right answer is no tenancy at all. I first designed RideX as multi-tenant, then realised it's a single consumer marketplace, so tenancy would add a filter to every query for no benefit. I dropped it and recorded why in an ADR.",
            },
          ],
        },
      ],
    },
    {
      title: "Code Scenarios",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ \"This `@Transactional` method isn't rolling back. Why?\"",
              answer:
                "`@Transactional` works through a proxy, a receptionist standing in front of the bean. If the call doesn't go through the receptionist, nobody starts or rolls back the transaction.\n\nThe common causes are self-invocation (`this.save()` inside the same class skips the proxy), a private method, a **checked** exception (by default only unchecked exceptions roll back, unless `rollbackFor` says otherwise), an exception caught and swallowed inside the method, or a different transaction manager than the one in use.\n\nA related trap from RideX: code running in an `afterCommit` hook that joined the already-finished transaction had all its writes silently discarded, with no exception. The fix was `REQUIRES_NEW`, so it gets a real new transaction.",
            },
            {
              question: "\"This counter is wrong under load.\"",
              answer:
                "Two people updating the same scoreboard at once: both read 10, both write 11, and one point is lost.\n\n`count++` is read, add, write, three steps, so it isn't atomic. In memory I use `AtomicLong` or `LongAdder`. In the database I use `UPDATE counters SET n = n + 1 WHERE id = ?`, which is a single atomic statement.",
            },
            {
              question: "\"We get `ConcurrentModificationException`.\"",
              answer:
                "It's like removing chairs from a row while someone is still counting them.\n\nThe list was modified while being iterated with a for-each loop. Use `list.removeIf(...)` or `Iterator.remove()` instead, and if several threads share the collection, switch to a concurrent collection.",
            },
            {
              question: "\"Exceptions from our `@Async` method just disappear.\"",
              answer:
                "Sending a letter with no return address: if it fails, nobody hears about it.\n\nExceptions from a `void` `@Async` method go to an uncaught-exception handler, which just logs them by default. Return a `CompletableFuture` and handle failures on it, or configure an `AsyncUncaughtExceptionHandler`. Also remember the async thread doesn't share the caller's transaction or security context.",
            },
            {
              question: "\"Our `newFixedThreadPool` service runs out of memory during spikes.\"",
              answer:
                "A restaurant that accepts unlimited orders with a fixed number of cooks ends up with a mountain of order slips and cold food.\n\n`Executors.newFixedThreadPool` uses an **unbounded** queue, so under a burst it accepts tasks forever until memory runs out. I build a `ThreadPoolExecutor` directly with a bounded queue and a rejection policy like `CallerRunsPolicy`, so overload becomes visible and slows the caller down.",
            },
            {
              question: "⭐ \"We get `LazyInitializationException` in the controller.\"",
              answer:
                "It's like asking the librarian for a book after the library has closed.\n\nThe Hibernate session closed before a lazy relation was touched, usually during JSON serialization. The right fix is to fetch what the response needs inside the service, with a fetch join or an entity graph, and return DTOs. The wrong fixes are making everything eager or leaning on open-in-view, which keeps the session open for the whole request and hides N+1 problems.",
            },
            {
              question: "⭐ \"This endpoint makes 101 queries.\"",
              answer:
                "Going to the shop once for the list, then once more for every single item on it.\n\nThat's N+1: one query loads 100 orders, then touching a lazy relation fires one more query per order. The fixes are a `JOIN FETCH`, an `@EntityGraph`, a batch fetch size, or a DTO projection that selects only the needed columns.",
            },
            {
              question: "\"Two threads deadlock in our code.\" How do you find and fix it?",
              answer:
                "Two cars at a narrow bridge, each waiting for the other to reverse.\n\nA thread dump shows the cycle: thread A holds lock 1 and wants lock 2, thread B holds lock 2 and wants lock 1. The fix is a **consistent lock order** everywhere, or `tryLock` with a timeout. The same rule applies to database rows: in RideX, both the accept path and the background sweep always lock the ride row first, so they queue instead of deadlocking.",
            },
            {
              question: "\"A `HashMap` key can't be found after we updated the object.\"",
              answer:
                "Filing a document under \"Sharma\" and then changing the name on it to \"Singh\". It's still in the S drawer, under the wrong name, and nobody will find it.\n\nThe key was mutable, so its `hashCode` changed after it went into the map, and the lookup now searches the wrong bucket. Use immutable keys: records, `String`, or fields that never change.",
            },
            {
              question: "\"Our scheduled jobs are delayed by each other.\"",
              answer:
                "One cashier serving seven queues: whoever has a slow customer holds everyone else up.\n\nSpring Boot's default scheduler has a pool size of **1**, so every `@Scheduled` method shares one thread. I set `spring.task.scheduling.pool.size`, or give slow jobs their own executor. I found exactly this in RideX: a slow notification run could delay the 5-second dispatch sweep, so riders waited longer for offers. I set the pool to 4, below the database connection pool size, and re-ran the dispatch concurrency tests.",
            },
          ],
        },
      ],
    },
    {
      title: "Behavioral Questions (STAR)",
      blocks: [
        {
          type: "paragraph",
          text: "Behavioral questions are answered with **STAR**: Situation, Task, Action, Result. I keep each story to about 90 seconds, say \"I\" for what I did rather than \"we\", and end with the result and what I learned. The answers below are how I'd structure each one, with RideX examples only where the story really happened.",
        },
        {
          type: "diagram",
          text: `S  Situation   One or two sentences of context. Where, what system.
T  Task        What I had to achieve, and why it was hard.
A  Action      What I did, step by step. "I", not "we". The longest part.
R  Result      What changed, with a number if possible.
+  Lesson      One sentence on what I do differently now.`,
          caption: "STAR, about 90 seconds per story",
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ Tell me about the most challenging technical problem you solved.",
              answer:
                "A strong answer picks a problem where correctness was hard, not just effort. My example is from RideX: a ride is offered to several drivers at once, and only one may ever get it.\n\n**Situation and task:** two drivers can tap Accept in the same millisecond, and a background job can expire an offer while an accept is in progress. **Action:** I made the ride row the referee with one conditional update, `UPDATE ... WHERE id = ? AND status = 'SEARCHING'`, so the first update wins and the second gets 0 rows and a 409. I made every path lock the ride row first to avoid deadlocks, and wrote a test that releases two threads together. That test exposed a second race, an offer expiring while the accept waited, so I added a re-check after the claim that rolls the assignment back.\n\n**Result:** exactly one winner every time, proven by tests. **Lesson:** prove concurrency with tests, not reasoning, because the second bug only showed up in the test.",
            },
            {
              question: "⭐ Tell me about a mistake you made.",
              answer:
                "The interviewer wants ownership, not a humblebrag. Pick a real mistake with real impact, then show what you changed.\n\nMy example: in RideX I called the payment gateway inside the same database transaction that completed a trip. When the gateway had a blip, the exception rolled back the trip, so a driver who had finished the ride was shown as not finished. I changed the design: the payment row is written in the trip's transaction, and a background worker opens the gateway order after the commit, retrying with the same idempotency key.\n\n**Result:** trip completion no longer depends on the gateway being up. **Lesson:** never let an external service decide whether my own data commits.",
            },
            {
              question: "Tell me about a bug that was hard to find.",
              answer:
                "Good picks are bugs with no error message, because they show method, not luck.\n\nMy example: in RideX, dispatch offers silently weren't being saved. No exception, no offers. The code ran from an after-commit hook and joined a transaction that had already finished, so every write was quietly discarded. I found it by tracing the transaction state step by step, fixed it with `REQUIRES_NEW`, and left a comment explaining why, so the next person wouldn't \"simplify\" it back.",
            },
            {
              question: "Tell me about a time you found a problem before users did.",
              answer:
                "This question rewards curiosity: reading how something works and then checking my own setup against it.\n\nMy example: while studying how `@Scheduled` works internally, I checked RideX's config. Spring Boot's default scheduler has one thread, and seven jobs were sharing it, so a slow notification run could delay the 5-second dispatch sweep. I set the scheduler pool to 4, kept it below the database pool size, and re-ran the concurrency tests before committing.\n\n**Lesson:** defaults are decisions too; check them for anything on the critical path.",
            },
            {
              question: "Tell me about a time you reduced cost or improved performance.",
              answer:
                "A strong answer has a before, an after, and a ceiling you put in place.\n\nMy example: Google Maps no longer lets you set a hard daily cap, so a bug or abuse could create an unlimited bill. In RideX I added a daily call budget counted in Redis that falls back to a free routing provider when it runs out, a 5-minute route cache (riders often check the same fare twice within seconds), and rate limits on the estimate endpoint. The app keeps working and the bill has a ceiling.",
            },
            {
              question: "Tell me about a time you had to learn something quickly.",
              answer:
                "The best version shows learning by building, plus one moment where you dug deeper than a tutorial would.\n\nMy example is moving to Java and Spring Boot by building RideX end to end. When a `SELECT ... FOR UPDATE` lock started blocking inserts of child rows, I read PostgreSQL's lock-mode documentation, learned that `FOR UPDATE` conflicts with the `KEY SHARE` lock a foreign-key insert takes, and switched to `FOR NO KEY UPDATE`.",
            },
            {
              question: "Tell me about a decision you reversed.",
              answer:
                "Changing your mind with evidence is a strength; this question checks that you can say so calmly.\n\nMy example: I first designed RideX as multi-tenant, because that's the shape I was used to. Then I realised it's a single consumer marketplace, so tenancy would add a filter to every query for no benefit. I dropped it and wrote the reasoning down in an ADR, so the decision and the why are both on record.",
            },
            {
              question: "⭐ Tell me about a disagreement with a teammate or a senior.",
              answer:
                "**How I'd answer:** choose a disagreement about a technical approach, never about a person. Situation: the decision and what was at stake. Task: the two positions, stated fairly, including theirs. Action: how I moved it from opinion to evidence, for example by writing both options down with their costs and risks, or building a quick spike. Result: what was decided, even if it wasn't my idea, and how I committed to it.\n\nThe lesson that lands well is something like: \"Writing the trade-offs down turned two opinions into one decision.\" Avoid stories where you were simply right and the other person was wrong.",
            },
            {
              question: "⭐ Tell me about a time you worked to a tight deadline.",
              answer:
                "**How I'd answer:** a real deadline, then the plan. Strong answers show I split the work into small daily pieces, built the **riskiest** part first, committed in small steps, and raised questions that needed a decision as soon as I found them instead of at the end.\n\nThe result should be honest about scope: what shipped on time, what was deliberately deferred, and who agreed to that. Saying \"I cut X and told my lead on day 3\" is stronger than \"we all worked late and made it\".",
            },
            {
              question: "Tell me about feedback you received and acted on.",
              answer:
                "**How I'd answer:** quote a real piece of feedback, like a review comment saying \"too many concerns in one commit\" or \"this needs a test for the empty case\". Then show the change in my habits, not just the fix to that one pull request, for example smaller single-purpose commits, or writing edge-case tests first.\n\nInterviewers are listening for no defensiveness and a lasting change.",
            },
            {
              question: "Tell me about working with non-technical people.",
              answer:
                "**How I'd answer:** pick a moment where I translated something technical into plain words and agreed on a shared vocabulary. A simple example: explaining the difference between \"processing\" and \"failed\" for a payment to support staff, and agreeing on status labels customers would understand.\n\nThe strong part is the outcome: fewer confused tickets, or a decision made faster because everyone understood the trade-off.",
            },
            {
              question: "What do you do when you don't know the answer?",
              answer:
                "Say so, then find out. Guessing about production behaviour is how incidents start.\n\nI'd add a quick real example: when I didn't understand why my lock was blocking inserts, I read the PostgreSQL docs on lock modes, reproduced it in a test, and fixed it. \"I'll check and come back to you\" is a perfectly good answer in an interview too.",
            },
            {
              question: "How do you prioritise multiple tasks?",
              answer:
                "Like a kitchen during a rush: the dish that's burning comes first, then the orders already promised, then prep for later.\n\nI order by impact and risk: production issues and anything blocking teammates first, then committed deadlines, then improvements. When two things are equally urgent, I ask my lead rather than silently choosing, and I tell people early if something will slip.",
            },
            {
              question: "Tell me about a failure or a project that didn't go well.",
              answer:
                "**How I'd answer:** use a real one, not a disguised success. Situation and task briefly, then honestly what went wrong and my part in it, then what I'd do differently and what I've already changed since.\n\nA fake failure (\"I worked too hard\") is easy to spot. A real one with a clear lesson builds trust.",
            },
            {
              question: "Why should we trust you with production?",
              answer:
                "Because I think about failure first: what happens on a retry, on a timeout, on a double click, when a dependency is down.\n\nThe proof should be concrete. In RideX that's idempotency keys on money paths, explicit timeouts on every outgoing call, tests that race two threads against each other, and deploys gated on a health check so a bad release fails safely.",
            },
          ],
        },
      ],
    },
    {
      title: "Managerial Round",
      blocks: [
        {
          type: "paragraph",
          text: "A hiring manager is checking six things: ownership, judgement, communication, reliability, growth, and team fit. The best answers are specific, calm and honest, and they say what I'd actually do on a normal Tuesday, not what sounds impressive.",
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ Walk me through a project you owned end to end.",
              answer:
                "**How I'd answer:** the problem in one line, my role, two or three key decisions with their trade-offs, how I tested it, the result, and what I'd improve now. RideX works well here: a modular monolith with a dispatch race solved in the database, payments moved out of the transaction, and Redis kept for disposable data only.\n\nThe \"what I'd improve\" part matters. Naming my own weak spots (like an in-memory WebSocket broker that won't work across several instances) shows judgement.",
            },
            {
              question: "How do you estimate a task?",
              answer:
                "Like planning a road trip: I don't estimate \"Delhi to Goa\", I estimate each leg and add time for fuel stops and traffic.\n\nI break the work into pieces I can estimate in hours, add time for testing, review and unknowns, and tackle the riskiest unknown first. If the estimate is shaky, I do a short spike and re-estimate. When something slips, I tell people early, with a new date and the reason.",
            },
            {
              question: "What do you do when requirements are unclear?",
              answer:
                "A tailor asks for measurements before cutting the cloth.\n\nI ask early, write down my assumptions, confirm them with product, and build the smallest version that tests those assumptions. I'd rather ask one question than build the wrong thing for a week.",
            },
            {
              question: "How do you balance speed and quality?",
              answer:
                "It depends on what breaks if I'm wrong. A typo on an admin screen is cheap; a double charge is not.\n\nFor payments, authentication and data integrity I don't cut corners: tests, idempotency, review. For an internal tool I can ship something simpler and improve it later. Any shortcut gets written down, so it's paid back instead of forgotten.",
            },
            {
              question: "How do you handle technical debt?",
              answer:
                "Debt is like a leaking tap: fine for a day, expensive over a year.\n\nI make it visible with tickets or a short code comment that states the limit, fix it when I'm already working in that area, and argue for dedicated time when it starts slowing features or causing incidents, backed with evidence like incident counts or hours lost.",
            },
            {
              question: "What would you do in your first 30, 60 and 90 days?",
              answer:
                "In the first 30 days: learn the domain and the codebase, get it running locally, fix small bugs, understand deploys and on-call, and ask a lot of questions.\n\nBy 60 days: own small features end to end and take part in code reviews.\n\nBy 90 days: own a meaningful feature or area, and suggest one improvement based on what I've actually seen, not on day one.",
            },
            {
              question: "How do you learn a new codebase?",
              answer:
                "Like learning a new city: walk one real route from start to end before studying the whole map.\n\nI run it, then trace one real request end to end, route to controller to service to database and back. Then I read the tests, make a small change, and check the docs or ADRs for **why** things are the way they are.",
            },
            {
              question: "How do you handle a disagreement with your manager?",
              answer:
                "I share my view with data, privately and respectfully. If they still decide differently, I commit fully. If it's a real risk, I make sure the decision and the risk are written down. Disagree and commit is healthy; silently resisting isn't.",
            },
            {
              question: "How do you review code? What do you look for?",
              answer:
                "Correctness first: edge cases, error handling, concurrency, and security like authorization and injection. Then data integrity (transactions, idempotency), then tests, then readability.\n\nI comment on the code, not the person, and explain **why** a change matters. When I receive harsh review, I assume good intent, separate my ego from the code, ask questions where I disagree, and fix what's right.",
            },
            {
              question: "You realise you'll miss a deadline. What do you do?",
              answer:
                "A good cab driver calls to say \"I'm stuck in traffic, 10 minutes late\" before the rider starts wondering.\n\nI tell my lead as soon as I know, not on the deadline day, and come with options: cut scope, move the date, or get help, plus my recommendation. No surprises.",
            },
            {
              question: "A teammate keeps pushing low-quality code. What do you do?",
              answer:
                "I talk to them privately and kindly first, point to specific issues, and offer to pair. I suggest checks that help everyone, like tests or linters in CI. If it continues and affects the team, I raise it with the lead, focused on the impact, not the person.",
            },
            {
              question: "You're asked to ship something you think is unsafe, like skipping a payment check. What do you do?",
              answer:
                "I explain the concrete risk in plain words, like \"customers could be charged twice\", and offer a safe alternative that's still fast. If I'm overruled on something that hurts users or breaks rules, I escalate politely and make sure the decision is documented.",
            },
            {
              question: "How do you keep stakeholders informed?",
              answer:
                "Short, regular updates: what's done, what's next, and any risk. Bad news early. Plain words for non-technical people. A two-line update every day beats a long report once a week.",
            },
            {
              question: "Where do you need to grow?",
              answer:
                "**How I'd answer:** something true and relevant, with a plan. For a backend engineer that's often large-scale distributed systems in production: Kafka, Kubernetes, tuning under heavy traffic. I'd say I know the concepts and have built smaller versions, and I want hands-on experience with them at real scale.",
            },
            {
              question: "⭐ Do you have any questions for me?",
              answer:
                "Always yes. Not asking sounds like not caring.\n\nGood ones: \"What does success look like in this role after six months?\", \"What's the team's biggest technical challenge right now?\", \"How are architecture decisions made?\", and \"How do you support engineers' growth?\"",
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
          text: `SCENARIO FRAME   clarify -> contain -> observe -> hypothesise -> fix -> prevent
                 "Limit the impact, find the cause, stop it happening again."

INCIDENT REFLEXES
  Recent deploy?          roll back first, debug after
  Slow after deploy?      traces -> which span; EXPLAIN ANALYZE; N+1?
  Pool exhausted?         long txns, network calls inside txns, leaks
  One node hot?           top -H + 2-3 jstack dumps a few seconds apart
  Slow memory climb?      heap dump -> MAT dominator tree
  Charged, no booking?    idempotency key + payment row first + reconcile
  Duplicates?             SKIP LOCKED claim + unique message ID
  Last seat twice?        unique constraint / conditional update (not synchronized)
  Job ran 3 times?        ShedLock / one node / SKIP LOCKED; scheduler pool = 1 by default
  Secret leaked?          rotate first
  Redis down?             degrade, don't die; nothing critical only in Redis

CODE TRAPS
  @Transactional ignored  self-call, private, checked exception, swallowed
  count++                 AtomicLong / LongAdder / UPDATE n = n + 1
  newFixedThreadPool      unbounded queue -> bounded ThreadPoolExecutor
  LazyInitialization      fetch in service, return DTOs, open-in-view off

STAR             Situation -> Task -> Action ("I") -> Result -> Lesson   (~90 s)
MANAGER CHECKS   ownership, judgement, communication, reliability, growth, fit
ALWAYS           bad news early, options + a recommendation, real stories only`,
          caption: "Scenario, behavioral and managerial cheat sheet",
        },
      ],
    },
  ],
};
