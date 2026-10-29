import type { Lesson } from "../types";

export const rideHailingBackend: Lesson = {
  slug: "ride-hailing-backend",
  date: "2026-10-29",
  title: "Project 9: Ride-Hailing Backend",
  description:
    "A build-it-yourself PRD for a ride-hailing backend, with my RideX project (Java 21, Spring Boot, PostgreSQL, Redis) as the worked example: quotes, wave-based driver offers over Redis GEO, exactly-one-driver acceptance, a SKIP LOCKED dispatch sweep, a trip state machine, payments confirmed by signed webhooks, and an outbox.",
  difficulty: "Hard",
  tags: ["Backend Project", "PRD", "Java", "Spring Boot", "PostgreSQL", "Redis", "Concurrency", "Payments"],
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "A ride app looks like a map and a button. Underneath, it's three hard problems stacked on each other: finding nearby drivers fast while they keep moving, making sure exactly one driver gets the ride when several tap accept in the same second, and taking money only once even when networks and payment gateways misbehave. That's why this is a favourite system design interview question, and why I built it myself as **RideX** (public at github.com/kumarprince06/ridex-platform). This page is the PRD I'd hand to someone who wants to build their own, with RideX as the reference implementation.",
        },
        {
          type: "list",
          items: [
            "**What it proves to an interviewer:** I can design and test a real-time, concurrent, money-handling system end to end, and defend each choice with a test.",
            "**Job skills it covers:** Spring Boot 3 on Java 21, PostgreSQL row locking and `SKIP LOCKED`, Redis GEO, sorted sets and Lua, STOMP WebSockets, a state machine, a payment gateway with idempotency keys and HMAC webhooks, a transactional outbox, JWT with refresh-token rotation, rate limiting, Testcontainers, ArchUnit, k6, Docker and GitHub Actions.",
            "**Honest effort:** 8 to 10 weekends for the Must items. The race conditions and the payment flow are where the time goes, not the CRUD.",
          ],
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Picture an auto-rickshaw stand outside a railway station. A passenger says where they're going and hears a price. The stand manager calls out to the nearest few drivers who are free. The first one to raise a hand gets the ride, and everyone else puts their hand down. When the passenger gets in, they tell the driver a short code so the driver knows it's the right person. At the end, the fare is worked out from the actual distance, and the passenger pays. My backend is that stand manager for an app: riders get a quote and book, nearby on-duty drivers get the offer in waves, one driver wins, the trip moves through clear states, and the payment is collected and confirmed safely.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a **rider**, I want a fare estimate before I book, so that I know the price up front.",
            "As a **rider**, I want my request offered to drivers close to me, so that pickup is quick.",
            "As a **rider**, I want to see when a driver accepts and when they arrive, so that I'm not waiting blindly.",
            "As a **rider**, I want a pickup code, so that I only get into the car meant for me.",
            "As a **rider**, I want a receipt that compares the quote with the final charge, so that I can trust the price.",
            "As a **driver**, I want to go on duty and share my location, so that I receive offers.",
            "As a **driver**, I want offers pushed to my phone and to know immediately if someone else got it.",
            "As a **driver**, I want to start the trip only after entering the rider's code, and end it at the drop.",
            "As an **operator**, I want stuck rides re-offered automatically, and payments that can't be charged twice.",
          ],
        },
      ],
    },
    {
      title: "Functional Requirements",
      blocks: [
        {
          type: "table",
          headers: ["ID", "Requirement", "Priority"],
          rows: [
            ["FR-01", "Register and log in as rider or driver; short-lived JWT access token plus a rotating refresh token", "Must"],
            ["FR-02", "Fare estimate from one route lookup (distance and duration), saved as a quote with an expiry", "Must"],
            ["FR-03", "Book a ride from a valid, unexpired quote; the ride starts in `SEARCHING`", "Must"],
            ["FR-04", "Drivers go on and off duty and send location updates; only fresh, on-duty drivers can be offered rides", "Must"],
            ["FR-05", "Offer the ride to nearby drivers in waves, widening the search if nobody accepts", "Must"],
            ["FR-06", "Exactly one driver can accept a ride; every other accept gets a clear \"already taken\" response", "Must"],
            ["FR-07", "A background sweep re-offers rides that are still searching and ends ones that ran out of waves", "Must"],
            ["FR-08", "Trip state machine: accepted, driver arrived, started (with pickup code), completed, cancelled; illegal transitions rejected", "Must"],
            ["FR-09", "Final fare from the actual distance, with a sanity cap, and a receipt showing quote versus charge", "Must"],
            ["FR-10", "Open the payment with the gateway after the trip completes, using an idempotency key", "Must"],
            ["FR-11", "Confirm payment only from an HMAC-verified gateway webhook", "Must"],
            ["FR-12", "Notifications (offer, accepted, arrived, receipt) written through a transactional outbox with retries", "Must"],
            ["FR-13", "Offers and trip updates pushed over STOMP WebSocket", "Must"],
            ["FR-14", "Per-user rate limits on login, quote and booking", "Should"],
            ["FR-15", "Rider and driver can cancel with rules per state (free before acceptance, fee after arrival)", "Should"],
            ["FR-16", "Ratings after the trip", "Could"],
            ["FR-17", "Surge multiplier on quotes by zone demand", "Could"],
          ],
        },
      ],
    },
    {
      title: "Non-Functional Requirements",
      blocks: [
        {
          type: "paragraph",
          text: "All of these can be checked on a laptop with Docker. I'd rather quote one honest number from my machine than a big one I can't reproduce.",
        },
        {
          type: "table",
          headers: ["ID", "Requirement", "Target and how I check it"],
          rows: [
            ["NFR-01", "Exactly one winner", "Two (and then 20) threads accept the same ride at the same instant; exactly one succeeds, every run (Testcontainers test with `CountDownLatch`)"],
            ["NFR-02", "No ride swept twice", "Two app instances running the sweep against one database never offer the same wave twice (integration test)"],
            ["NFR-03", "Nearby search", "Finding the 10 nearest fresh drivers among 10,000 in Redis takes p95 under 10 ms (k6 or a JMH-style loop)"],
            ["NFR-04", "Booking latency", "Quote-to-book flow p95 under 200 ms at 50 virtual users, route lookup stubbed (k6)"],
            ["NFR-05", "Stale drivers", "A driver who stops sending location is never offered a ride after the freshness window (integration test)"],
            ["NFR-06", "Charged once", "Replaying the payment worker and the gateway webhook several times results in one payment and one capture (integration test)"],
            ["NFR-07", "Notifications survive failures", "With the notification sender failing, outbox rows retry with exponential backoff and all send after it recovers (integration test)"],
            ["NFR-08", "Architecture rules", "ArchUnit fails the build if a controller talks to a repository directly or a module reaches into another's internals"],
            ["NFR-09", "Rate limiter availability", "With Redis stopped, requests still succeed (limiter fails open) and a warning is logged (integration test)"],
          ],
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "diagram",
          text: `┌────────────┐        ┌──────────────────────┐        ┌───────────────────┐
│ users      │ 1    n │ refresh_tokens       │        │ quotes            │
│ id, role   ├────────┤ token_hash (SHA-256) │        │ id, rider_id      │
│ RIDER|     │        │ user_id, expires_at  │        │ pickup, drop      │
│ DRIVER     │        │ revoked_at           │        │ distance_m, sec   │
└─────┬──────┘        └──────────────────────┘        │ fare, expires_at  │
      │ 1                                             └─────────┬─────────┘
      │                                                         │ 1
      │ n                                                       │
┌─────┴──────────────────────────────────┐ 1                   │
│ rides                                  ├─────────────────────┘
│ id, rider_id, driver_id (nullable)     │
│ quote_id, status, pickup_code_hash     │ 1    n ┌──────────────────────┐
│ wave, next_wave_at                     ├────────┤ ride_offers          │
│ actual_distance_m, final_fare          │        │ ride_id, driver_id   │
│ version, created_at                    │        │ wave, sent_at        │
└───────┬───────────────────┬────────────┘        └──────────────────────┘
        │ 1                 │ 1
        │ 1                 │ n
┌───────┴────────────┐ ┌────┴───────────────────┐ ┌───────────────────────┐
│ payments           │ │ ride_events            │ │ outbox                │
│ ride_id UNIQUE     │ │ ride_id, from, to, at  │ │ id, type, payload     │
│ idempotency_key    │ └────────────────────────┘ │ attempts              │
│ gateway_order_id   │                            │ next_attempt_at       │
│ status, amount     │ ┌────────────────────────┐ │ sent_at               │
└────────────────────┘ │ processed_webhooks     │ └───────────────────────┘
                       │ gateway_event_id (PK)  │
                       └────────────────────────┘

Redis
  drivers:geo     GEO set of on-duty drivers (lon, lat)
  drivers:seen    sorted set, member = driverId, score = last ping (epoch ms)
  rl:{key}:{win}  fixed-window counters`,
        },
        {
          type: "paragraph",
          text: "PostgreSQL holds everything that must survive a restart. Redis holds only things that are fine to rebuild in a minute from the next location pings: who's on duty, where they are, and rate-limit counters.",
        },
      ],
    },
    {
      title: "API Design",
      blocks: [
        {
          type: "table",
          headers: ["Method", "Path", "Purpose", "Success / failure"],
          rows: [
            ["POST", "/api/v1/auth/login", "Access and refresh token", "200 / 401, 429"],
            ["POST", "/api/v1/auth/refresh", "Rotate the refresh token", "200 / 401 revoked or expired"],
            ["POST", "/api/v1/quotes", "Fare estimate for pickup and drop", "201 / 400, 422 no route, 429"],
            ["POST", "/api/v1/rides", "Book from a quote", "201 / 409 quote used, 410 quote expired, 422"],
            ["GET", "/api/v1/rides/{id}", "Ride status and driver", "200 / 403, 404"],
            ["POST", "/api/v1/rides/{id}/cancel", "Cancel by rider or driver", "200 / 409 not cancellable in this state"],
            ["PUT", "/api/v1/drivers/me/duty", "Go on or off duty", "200 / 409 on a trip"],
            ["POST", "/api/v1/drivers/me/location", "Location ping", "204 / 400, 409 off duty"],
            ["POST", "/api/v1/rides/{id}/accept", "Driver accepts an offer", "200 / 409 already taken, 403 not offered"],
            ["POST", "/api/v1/rides/{id}/arrive", "Driver at pickup", "200 / 409 illegal transition"],
            ["POST", "/api/v1/rides/{id}/start", "Start with pickup code", "200 / 422 wrong code, 409"],
            ["POST", "/api/v1/rides/{id}/complete", "End trip with actual distance", "200 / 409"],
            ["GET", "/api/v1/rides/{id}/receipt", "Quote versus final charge", "200 / 404 not completed"],
            ["POST", "/api/v1/webhooks/razorpay", "Payment events (HMAC)", "200 also on duplicate / 400 bad signature"],
            ["WS", "/ws, then `/user/queue/offers` and `/user/queue/rides`", "Offers to drivers, updates to riders", "STOMP frames"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/quotes",
          code: `{
  "pickup": { "lat": 22.5726, "lng": 88.3639 },
  "drop": { "lat": 22.6532, "lng": 88.4466 },
  "vehicleType": "AUTO"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "201 Created",
          code: `{
  "quoteId": "q_01JBA2X7KQ",
  "distanceMeters": 14820,
  "durationSeconds": 2460,
  "fare": "212.00",
  "currency": "INR",
  "expiresAt": "2026-10-29T09:05:00Z"
}`,
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "paragraph",
          text: "I'd build it as one Spring Boot app split into modules (identity, pricing, dispatch, trip, payment, notification), with ArchUnit tests guarding the rules between them, the way RideX uses ArchUnit for its architecture rules. One deployable keeps transactions simple, which matters a lot for the acceptance race and the payment flow.",
        },
        {
          type: "diagram",
          text: `Rider app ──REST──┐                       ┌──STOMP── Driver app
                  ▼                       ▼
┌───────────────────────────────────────────────────────────────┐
│ Spring Boot (modular monolith)                                │
│                                                               │
│  identity ── JWT, rotating hashed refresh tokens              │
│  pricing  ── one route lookup ─► quote                        │
│  dispatch ── waves of offers ─► STOMP /user/queue/offers      │
│             @Scheduled sweep every 5 s (SKIP LOCKED)          │
│  trip     ── state machine, pickup code, final fare, receipt  │
│  payment  ── worker after commit ─► Razorpay (idempotency key)│
│             webhook ◄─ HMAC verified                          │
│  notify   ── outbox poller, exponential backoff               │
│  rate limit filter (Redis fixed window, fails open)           │
└──────┬──────────────────────────┬─────────────────────────────┘
       │                          │
       ▼                          ▼
┌──────────────┐        ┌───────────────────────────┐   ┌──────────────┐
│ PostgreSQL   │        │ Redis                     │   │ Route API    │
│ rides, quotes│        │ GEO presence + freshness  │   │ Razorpay     │
│ payments,    │        │ Lua eviction, rate limits │   └──────────────┘
│ outbox       │        └───────────────────────────┘
└──────────────┘`,
        },
        {
          type: "heading",
          text: "1. Quote from one route lookup",
        },
        {
          type: "paragraph",
          text: "The pricing module calls the route API once for distance and duration, computes the fare, and saves it as a quote with an expiry. Booking references the quote ID, so the price the rider saw is the price that's stored, and the route API isn't called again at booking.",
        },
        {
          type: "heading",
          text: "2. Driver presence in Redis",
        },
        {
          type: "paragraph",
          text: "Each location ping does `GEOADD drivers:geo lng lat driverId` and `ZADD drivers:seen now driverId`. Finding drivers is `GEOSEARCH drivers:geo FROMLONLAT lng lat BYRADIUS 3 km ASC COUNT 10`, then dropping any whose last ping is too old. A Lua script evicts stale drivers from both sets in one atomic step, so there's never a moment where a driver is in one set and not the other.",
        },
        {
          type: "code",
          language: "lua",
          title: "evict_stale_drivers.lua (KEYS[1] = drivers:geo, KEYS[2] = drivers:seen, ARGV[1] = cutoff ms)",
          code: `local stale = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[1], 'LIMIT', 0, 500)
if #stale > 0 then
  redis.call('ZREM', KEYS[2], unpack(stale))
  redis.call('ZREM', KEYS[1], unpack(stale))
end
return #stale`,
        },
        {
          type: "paragraph",
          text: "A GEO set is a sorted set underneath, which is why `ZREM` works on it. The `LIMIT` keeps each call short so Redis isn't blocked; the caller loops until it returns 0.",
        },
        {
          type: "heading",
          text: "3. Offers in waves",
        },
        {
          type: "paragraph",
          text: "The first wave goes to the few nearest fresh drivers. If nobody accepts before the wave times out, the next wave widens the radius and skips drivers already offered. Each offer is a STOMP message to that driver's `/user/queue/offers`. A ride that runs out of waves ends as \"no driver found\".",
        },
        {
          type: "heading",
          text: "4. Exactly one driver wins",
        },
        {
          type: "paragraph",
          text: "Acceptance is a single conditional `UPDATE`. The database does the check and the write in one step, so there's no gap between \"is it still free?\" and \"it's mine\". Whoever's update changes one row wins; everyone else changes zero rows and gets 409.",
        },
        {
          type: "code",
          language: "sql",
          title: "Accept a ride",
          code: `UPDATE rides
SET status = 'ACCEPTED',
    driver_id = :driverId,
    accepted_at = now()
WHERE id = :rideId
  AND status = 'SEARCHING';`,
        },
        {
          type: "code",
          language: "java",
          title: "RideAcceptanceRaceTest.java",
          code: `@Test
void exactlyOneDriverWins() throws Exception {
    long rideId = givenSearchingRide();
    CountDownLatch startTogether = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(2);

    Future<Boolean> first = pool.submit(() -> {
        startTogether.await();
        return dispatch.accept(rideId, DRIVER_A);
    });
    Future<Boolean> second = pool.submit(() -> {
        startTogether.await();
        return dispatch.accept(rideId, DRIVER_B);
    });

    startTogether.countDown(); // release both threads at once
    assertThat(List.of(first.get(5, SECONDS), second.get(5, SECONDS)))
            .containsExactlyInAnyOrder(true, false);
    pool.shutdown();
}`,
        },
        {
          type: "paragraph",
          text: "That's the shape of the RideX test: two threads, one latch, a real PostgreSQL from Testcontainers. `accept` returns `true` when the update changed one row. Without the latch, one thread usually finishes before the other starts, and the test passes even on broken code.",
        },
        {
          type: "heading",
          text: "5. The dispatch sweep",
        },
        {
          type: "paragraph",
          text: "A scheduled job runs every 5 seconds, claims rides whose current wave has timed out, and sends the next wave or ends them. With two app instances, both sweeps run, so the claim uses `SKIP LOCKED`: each instance takes rows the other hasn't locked and nobody waits.",
        },
        {
          type: "code",
          language: "sql",
          title: "Claim due rides (inside a transaction)",
          code: `SELECT id
FROM rides
WHERE status = 'SEARCHING'
  AND next_wave_at <= now()
ORDER BY next_wave_at
LIMIT 20
FOR NO KEY UPDATE SKIP LOCKED;`,
        },
        {
          type: "paragraph",
          text: "Why `FOR NO KEY UPDATE` and not `FOR UPDATE`? Inserting a row that references a ride (an offer, an event) takes a `FOR KEY SHARE` lock on that ride for the foreign key check. `FOR UPDATE` conflicts with that and would block those inserts; `FOR NO KEY UPDATE` doesn't, because the sweep never changes the ride's primary key.",
        },
        {
          type: "heading",
          text: "6. Trip state machine and pickup code",
        },
        {
          type: "diagram",
          text: `SEARCHING ──accept──► ACCEPTED ──arrive──► DRIVER_ARRIVED ──start(code)──► IN_PROGRESS ──complete──► COMPLETED
    │                     │                       │
    │ no driver           │ cancel                │ cancel (fee)
    ▼                     ▼                       ▼
NO_DRIVER_FOUND       CANCELLED               CANCELLED`,
          caption: "State names are this PRD's; every transition is a conditional UPDATE on the expected current state.",
        },
        {
          type: "paragraph",
          text: "The rider sees a short pickup code; the driver must enter it to start. Only a hash is stored, and a wrong code leaves the ride in `DRIVER_ARRIVED`. Each transition is guarded the same way as acceptance, `WHERE status = :expected`, so a double tap on \"complete\" can't complete twice.",
        },
        {
          type: "heading",
          text: "7. Final fare and receipt",
        },
        {
          type: "paragraph",
          text: "The final fare is computed from the actual distance driven, then capped by a sanity limit relative to the quote, so a GPS glitch that reports 400 km can't bill the rider for it. The receipt shows the quoted fare, the actual distance and the charged amount side by side.",
        },
        {
          type: "heading",
          text: "8. Payments after commit, confirmed by webhook",
        },
        {
          type: "paragraph",
          text: "Completing a trip never calls Razorpay inside the database transaction. After commit, a worker opens the payment with an idempotency key tied to the ride, so a retried worker run can't open a second payment. The payment is marked paid only when Razorpay's webhook arrives and its `X-Razorpay-Signature` (HMAC-SHA256 of the raw body with the webhook secret) checks out. The client's \"payment succeeded\" screen is never trusted on its own.",
        },
        {
          type: "code",
          language: "java",
          title: "Verifying a webhook signature",
          code: `static boolean validSignature(byte[] rawBody, String signatureHex, String secret) {
    try {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] expected = mac.doFinal(rawBody);
        byte[] given = HexFormat.of().parseHex(signatureHex);
        return MessageDigest.isEqual(expected, given); // constant-time compare
    } catch (IllegalArgumentException | GeneralSecurityException e) {
        return false; // not hex, or no HmacSHA256 in this JVM
    }
}`,
        },
        {
          type: "heading",
          text: "9. Outbox for notifications",
        },
        {
          type: "paragraph",
          text: "State changes that should notify someone write an outbox row in the same transaction. A poller sends them and, on failure, sets `next_attempt_at` further out each time (exponential backoff). A down notification provider delays messages; it never rolls back a trip.",
        },
        {
          type: "heading",
          text: "10. Auth and rate limiting",
        },
        {
          type: "paragraph",
          text: "Access tokens are short-lived JWTs. Refresh tokens are random strings stored only as hashes, and every refresh replaces the old one with a new one (rotation), so a stolen refresh token stops working after the next legitimate refresh. The rate limiter is a fixed-window counter in Redis (`INCR`, with `EXPIRE` on the first hit). If Redis is unreachable, it **fails open**: the request goes through and a warning is logged, because blocking every rider when Redis hiccups is worse than letting a few extra requests in.",
        },
      ],
    },
    {
      title: "Tech Stack",
      blocks: [
        {
          type: "table",
          headers: ["Tech", "Why"],
          rows: [
            ["Java 21 + Spring Boot 3", "What RideX runs on; records, pattern matching, and the stack most Java backend jobs use"],
            ["PostgreSQL", "Conditional updates, `SKIP LOCKED`, `FOR NO KEY UPDATE`, and real transactions for money"],
            ["Redis", "GEO search for nearby drivers, a sorted set for freshness, Lua for atomic eviction, rate-limit counters"],
            ["Spring WebSocket + STOMP", "Push offers to drivers and updates to riders on per-user queues"],
            ["Razorpay (test mode)", "Real payment gateway with idempotent order creation and signed webhooks"],
            ["Spring Security + JWT", "Stateless access tokens; rotating hashed refresh tokens in the database"],
            ["Flyway", "Versioned schema"],
            ["Testcontainers", "Race and locking tests need a real PostgreSQL and Redis"],
            ["ArchUnit", "Module boundaries enforced by tests, not by good intentions"],
            ["k6", "Load tests with p95 numbers"],
            ["Docker + GitHub Actions", "Build, test and package on every push; the same image runs locally and when deployed"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: A conditional UPDATE for acceptance, not a lock or a Redis flag",
        },
        {
          type: "paragraph",
          text: "**Decision:** `UPDATE ... WHERE id = ? AND status = 'SEARCHING'`, winner is whoever updated one row. **Trade-off:** losers find out only after trying, which is fine, they get a clear 409. A Redis `SETNX` would be fast but lives outside the database transaction, so Redis and PostgreSQL could disagree. `SELECT ... FOR UPDATE` then update works too but is two statements and holds a lock longer.",
        },
        {
          type: "heading",
          text: "ADR-2: Redis for live locations, PostgreSQL for everything else",
        },
        {
          type: "paragraph",
          text: "**Decision:** driver positions and freshness live only in Redis. **Trade-off:** if Redis restarts, presence is empty until drivers' next pings, a few seconds. In exchange, thousands of pings a minute never touch the database, and nearby search is a single command.",
        },
        {
          type: "heading",
          text: "ADR-3: A polling sweep with SKIP LOCKED instead of a message broker for waves",
        },
        {
          type: "paragraph",
          text: "**Decision:** every 5 seconds, claim due rides from the database. **Trade-off:** up to 5 seconds of extra wait between waves, and a query every 5 seconds. No broker to run, the ride row is the single source of truth, and multiple instances share the work safely.",
        },
        {
          type: "heading",
          text: "ADR-4: Payment outside the trip transaction, confirmed only by webhook",
        },
        {
          type: "paragraph",
          text: "**Decision:** open the payment after commit with an idempotency key; mark paid only on a verified webhook. **Trade-off:** the payment state lags the trip by a few seconds and needs a pending state in the UI. A gateway call inside the transaction would hold row locks during a slow network call, and a rollback after a successful charge would lose track of real money.",
        },
        {
          type: "heading",
          text: "ADR-5: Rate limiter fails open",
        },
        {
          type: "paragraph",
          text: "**Decision:** if Redis is down, allow the request. **Trade-off:** no abuse protection during the outage. For a ride app, refusing every booking because a protective layer is down is the bigger failure. For a login endpoint under attack I'd consider failing closed, and I'd say so in an interview.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Two drivers accept at the same millisecond: one 200, one 409, tested with a latch.",
            "Driver accepts an offer that has already expired or was never sent to them: 403 or 409, check `ride_offers`.",
            "Rider cancels while a driver is accepting: both are conditional updates on `SEARCHING`; only one wins, and the loser gets a clear answer.",
            "Driver goes off duty or loses signal mid-wave: freshness check and Lua eviction stop new offers; existing offers time out.",
            "Driver already on a trip gets offered another: exclude busy drivers before sending an offer.",
            "Quote expired or already used: 410 or 409 on booking; a quote books at most one ride (unique `quote_id` on rides).",
            "Wrong pickup code entered many times: limit attempts and alert, don't let it be brute-forced.",
            "GPS reports an impossible distance: the sanity cap limits the fare; the receipt shows both numbers.",
            "Payment worker crashes after the gateway created the order: retry with the same idempotency key returns the same order.",
            "Webhook arrives twice or out of order: dedup by gateway event ID; payment status only moves forward.",
            "Webhook with a bad signature: 400 and logged, nothing changes.",
            "Two app instances: both sweeps run safely; STOMP messages need to reach a driver connected to the other instance (broker relay or pub/sub, see Project 7).",
            "Refresh token used after rotation: rejected; treat it as a possible theft signal.",
          ],
        },
      ],
    },
    {
      title: "Milestones",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "**Identity and skeleton.** Docker Compose, Flyway, register and login, JWT plus rotating hashed refresh tokens, ArchUnit rules from day one. Demo: log in, refresh, old refresh token rejected. Tests: auth integration tests, ArchUnit.",
            "**Quotes and booking.** One route lookup per quote (stubbed in tests), quote expiry, booking into `SEARCHING`. Demo: quote then book. Tests: expired and reused quotes.",
            "**Driver presence.** Duty toggle, location pings into Redis GEO and the freshness set, Lua eviction. Demo: drivers appear and disappear in a nearby search. Tests: stale driver never returned.",
            "**Offers and acceptance.** Waves over STOMP, conditional-update acceptance. Demo: three driver tabs get an offer, one wins, the others see it taken. Tests: the two-thread `CountDownLatch` race test, then a 20-thread version.",
            "**Dispatch sweep.** `@Scheduled` every 5 s with `FOR NO KEY UPDATE SKIP LOCKED`. Demo: nobody accepts, next wave goes wider, then no driver found. Tests: two instances never claim the same ride.",
            "**Trip lifecycle and receipt.** State machine, pickup code, final fare with cap, receipt. Demo: full ride from booking to receipt. Tests: every illegal transition rejected; cap applied.",
            "**Payments and outbox.** Payment worker after commit with idempotency keys, HMAC webhook, notification outbox with backoff. Demo: pay in Razorpay test mode and watch the webhook mark it paid. Tests: duplicate webhooks, bad signature, worker retried.",
            "**Rate limits, load test, deploy.** Fixed-window limiter that fails open, k6 scenarios, Dockerfile, GitHub Actions pipeline. Demo: CI green and the k6 summary in the README. Tests: limiter with Redis stopped.",
          ],
        },
      ],
    },
    {
      title: "Testing Plan",
      blocks: [
        {
          type: "list",
          items: [
            "**Unit tests:** fare calculation and cap, state transition table, pickup code check, wave radius rules.",
            "**Concurrency tests (Testcontainers PostgreSQL):** the acceptance race with a `CountDownLatch`; rider cancel versus driver accept; two sweeps on one database.",
            "**Redis tests (Testcontainers Redis):** GEO search ordering, Lua eviction keeps both sets in sync.",
            "**Payment tests:** gateway stubbed with WireMock; webhook signed with a test secret; replay the same event several times.",
            "**WebSocket tests:** a STOMP test client subscribes as a driver and receives the offer.",
            "**Architecture tests:** ArchUnit rules for layers and module boundaries.",
            "**Load tests:** k6 scenarios for quote and book, location pings, and accept bursts; publish p95 and error rate.",
            "**CI:** GitHub Actions runs everything on every push and builds the Docker image.",
          ],
        },
      ],
    },
    {
      title: "Stretch Goals",
      blocks: [
        {
          type: "list",
          items: [
            "Refresh-token reuse detection that revokes the whole token family.",
            "Surge pricing by zone demand, with the multiplier saved on the quote.",
            "H3 or geohash cells to shard driver presence by area.",
            "Live driver location to the rider during pickup, throttled.",
            "Split payment and notification into separate services once the module boundaries are proven (leads into Project 10).",
            "Refunds and cancellation fees through the same idempotent payment flow.",
            "Grafana dashboard for offer acceptance rate, time to accept and sweep backlog.",
          ],
        },
      ],
    },
    {
      title: "What Interviewers Will Ask About It",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How do you make sure only one driver gets a ride?",
              answer:
                "A single conditional update: set the driver and the accepted status `WHERE id = ? AND status = 'SEARCHING'`. The database checks and writes in one step, so only one update can change the row.\n\nThe winner sees one row updated, everyone else sees zero and gets 409. I proved it with a test where two threads wait on a `CountDownLatch` and fire at the same moment against a real PostgreSQL.",
            },
            {
              question: "Why did you need a CountDownLatch in that test?",
              answer:
                "Without it, the first thread often finishes before the second even starts, so the race never happens and broken code still passes.\n\nThe latch holds both threads at the starting line and releases them together, which makes the collision real.",
            },
            {
              question: "How do you find nearby drivers?",
              answer:
                "Redis GEO. Each location ping updates the driver's position with `GEOADD` and their last-seen time in a sorted set. A search is `GEOSEARCH` by radius, nearest first.\n\nStale drivers are filtered by last-seen time, and a Lua script evicts them from both sets atomically so the two never disagree.",
            },
            {
              question: "What does SKIP LOCKED do in your sweep, and why FOR NO KEY UPDATE?",
              answer:
                "`SKIP LOCKED` lets each instance's sweep claim only rows nobody else has locked, so two instances split the work instead of waiting or doing it twice.\n\n`FOR NO KEY UPDATE` is a slightly weaker lock than `FOR UPDATE`. It doesn't block the `FOR KEY SHARE` locks that foreign key checks take, so inserting offers or events for a ride isn't blocked while the sweep holds it.",
            },
            {
              question: "Why not call the payment gateway inside the transaction that completes the trip?",
              answer:
                "Two reasons. A slow gateway call would hold the ride's row lock for seconds. And if the transaction rolled back after the charge succeeded, I'd have taken money with no record of it.\n\nSo the trip commits first, then a worker opens the payment with an idempotency key, and the payment is confirmed only by the signed webhook.",
            },
            {
              question: "How do you stop a customer being charged twice?",
              answer:
                "The worker uses an idempotency key tied to the ride, so a retry returns the same gateway order instead of creating another. There's one payment row per ride, enforced by a unique constraint.\n\nWebhooks are deduplicated by the gateway's event ID and only move the status forward.",
            },
            {
              question: "Why an outbox for notifications?",
              answer:
                "So a notification can't be lost or sent for something that rolled back. The outbox row is written in the same transaction as the state change.\n\nA poller sends it and backs off exponentially on failure, so a provider outage only delays messages.",
            },
            {
              question: "How do your refresh tokens work?",
              answer:
                "The refresh token is a random value; I store only its hash, like a password. Every refresh issues a new one and revokes the old one.\n\nIf the database leaks, the hashes are useless, and a stolen token dies on the next legitimate refresh. Detecting reuse to revoke the whole family is my next step.",
            },
            {
              question: "Your rate limiter fails open. Isn't that unsafe?",
              answer:
                "It's a choice. If Redis is down and the limiter fails closed, nobody can book a ride, which is a full outage caused by a safety feature.\n\nFailing open means a short window without limits, logged and alerted. For login under a brute-force attack I might choose differently.",
            },
            {
              question: "Why build it as one app and not microservices?",
              answer:
                "Acceptance, trip transitions and the outbox all rely on local database transactions. Splitting them into services would turn each into a distributed problem without any real benefit at this size.\n\nArchUnit keeps the modules separate, so splitting payment or notification out later is a contained change.",
            },
            {
              question: "What would you change for a city with 50,000 drivers online?",
              answer:
                "Shard driver presence by area (H3 cells or one GEO key per zone), move WebSocket fan-out to a broker so any instance can reach any driver, and add metrics on time-to-accept.\n\nI'd load test with k6 first and change only what the numbers show is slow.",
            },
          ],
        },
      ],
    },
    {
      title: "How to Show It on Your Resume",
      blocks: [
        {
          type: "list",
          items: [
            "Built RideX, a ride-hailing backend (Java 21, Spring Boot, PostgreSQL, Redis): Redis GEO driver presence with Lua stale-driver eviction, wave-based offers over STOMP WebSockets, and a 5-second dispatch sweep using `FOR NO KEY UPDATE SKIP LOCKED`.",
            "Guaranteed a single winning driver per ride with a conditional `UPDATE ... WHERE status = 'SEARCHING'`, proven by a concurrent Testcontainers test; handled Razorpay payments after commit with idempotency keys and HMAC-verified webhooks, plus an outbox with exponential backoff.",
            "Secured with JWT and rotating hashed refresh tokens and a Redis rate limiter that fails open; checked architecture rules with ArchUnit, load tested with k6, shipped with Docker and GitHub Actions.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Only claim what you built",
          text: "These lines describe what RideX actually does. If you build your own version, write lines for what yours does, and add k6 numbers only from runs you can show, with the machine they ran on. A reviewer can open the repo, so every claim on the resume should be one they can find in the code or the tests.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "**Transactions and Locking** (System Design): conditional updates, `FOR UPDATE` versus `FOR NO KEY UPDATE`, `SKIP LOCKED`, side effects after commit.",
            "**State Machines for Business Workflows** (System Design): guarded transitions.",
            "**Idempotency and Webhooks** (System Design): idempotency keys, HMAC verification, duplicate and out-of-order events.",
            "**Reliable Outbound Calls** (System Design): timeouts and retries for the route API and the gateway.",
            "**Multithreading and Concurrency**: `ExecutorService`, `Future`, `CountDownLatch` for race tests.",
            "**Architecture Styles** (System Design): why a modular monolith first.",
            "**HLD**: how ride-hailing is usually drawn in interviews, so you can compare it with what you built.",
            "Projects 6 and 7 first: the locking from the wallet and the STOMP setup from chat both come back here.",
          ],
        },
      ],
    },
  ],
};
