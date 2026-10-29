import type { Lesson } from "../types";

export const eventSeatBooking: Lesson = {
  slug: "event-seat-booking",
  date: "2026-10-29",
  title: "Project 4: Event Seat Booking (No Double Booking)",
  description:
    "A seat booking API where two people can never get the same seat: time-limited holds, four ways to handle concurrency in PostgreSQL compared side by side, an idempotent booking endpoint with Idempotency-Key, a SKIP LOCKED sweeper for expired holds, and a real multi-threaded test that proves it.",
  tags: ["Project", "Spring Boot", "PostgreSQL", "Concurrency", "Idempotency"],
  difficulty: "Medium",
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "\"Two users click the last seat at the same time. What happens?\" is one of the most common backend interview questions, and most answers are hand-waving. This project lets me answer with code I wrote and a test that fires 50 threads at one seat and proves exactly one wins.",
        },
        {
          type: "paragraph",
          text: "Projects 1 to 3 were mostly single-user correctness. This is the first project where correctness depends on timing. The skills (database constraints, conditional updates, optimistic and pessimistic locking, idempotency, background cleanup) show up in every system that sells something limited: tickets, hotel rooms, doctor appointments, flash-sale stock.",
        },
        {
          type: "table",
          headers: ["Job skill", "Where it shows up here"],
          rows: [
            ["Transactions and isolation", "Every hold and booking is one transaction; I can explain what READ COMMITTED does and doesn't protect"],
            ["Concurrency control", "Unique constraints, conditional `UPDATE ... WHERE status = ...`, `@Version`, `SELECT ... FOR UPDATE`"],
            ["Idempotent APIs", "`Idempotency-Key` header with stored responses"],
            ["Background jobs", "Sweeper with `FOR UPDATE SKIP LOCKED`, safe on many instances"],
            ["Java concurrency", "`ExecutorService` + `CountDownLatch` test harness"],
            ["Measuring", "Throughput and conflict rate of each locking strategy under k6"],
          ],
        },
        {
          type: "paragraph",
          text: "**Effort:** 3 to 4 weekends. The CRUD is small; most of the time goes into tests that try to break it, and that's the valuable part.",
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Think of buying cinema tickets at the counter. I point at seats F7 and F8, and the cashier puts a \"reserved\" card on them while I find my wallet. If I walk away, after a few minutes she takes the cards back and the seats are free again. Nobody else can buy F7 while my card is on it, and if I pay twice by mistake I still get one pair of tickets. This API does the same thing online: organisers create events with a seat map, buyers hold up to 6 seats for 10 minutes, confirm the hold to book, and expired holds are released automatically. Payment is simulated here; real payments are Project 5.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As an organiser, I want to create an event with rows and seats and a price per section, so that people can pick exact seats.",
            "As a buyer, I want to see which seats are free right now, so that I don't pick one that's taken.",
            "As a buyer, I want my chosen seats held for 10 minutes while I pay, so that nobody takes them from me mid-checkout.",
            "As a buyer, I want either all my seats held or none, so that my group isn't split up.",
            "As a buyer on a bad network, I want pressing Book twice to give me one booking, not two.",
            "As a buyer, I want to cancel a booking before the event, so that the seats go back on sale.",
            "As an organiser, I want seats from abandoned checkouts released quickly, so that I don't lose sales.",
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
            ["FR-01", "Organiser creates an event (name, venue, start time) and generates seats from a layout (rows × seats, section prices).", "Must"],
            ["FR-02", "Seat map endpoint returns each seat as AVAILABLE, HELD or BOOKED. Expired holds show as AVAILABLE.", "Must"],
            ["FR-03", "Hold 1–6 seats of one event for 10 minutes. All-or-nothing: if any seat isn't available, nothing is held (409 with the conflicting seats).", "Must"],
            ["FR-04", "A buyer has at most one active hold per event; a new hold replaces the old one.", "Should"],
            ["FR-05", "Confirm a hold into a booking. Fails with 410 if the hold expired.", "Must"],
            ["FR-06", "Booking endpoint requires an `Idempotency-Key` header; repeated requests with the same key return the original response.", "Must"],
            ["FR-07", "Same key with a different request body → 422.", "Must"],
            ["FR-08", "Release a hold manually (buyer changed their mind).", "Must"],
            ["FR-09", "Sweeper job releases expired holds every 30 seconds, safe to run on several instances.", "Must"],
            ["FR-10", "Cancel a booking up to 24 hours before the event; seats return to AVAILABLE.", "Should"],
            ["FR-11", "Configurable locking strategy (conditional update, optimistic, pessimistic) behind one interface, for the comparison experiment.", "Should"],
            ["FR-12", "Waitlist: notify the next person when seats free up.", "Could"],
          ],
        },
      ],
    },
    {
      title: "Non-Functional Requirements",
      blocks: [
        {
          type: "table",
          headers: ["ID", "Target", "How I verify it"],
          rows: [
            ["NFR-01", "Zero double bookings: 50 threads racing for 1 seat → exactly 1 hold, 49 clean 409s, 0 errors", "`ExecutorService` + `CountDownLatch` integration test, run 20 times in a loop"],
            ["NFR-02", "Zero double bookings under load: 100 virtual users holding random seats of a 500-seat event for 60 s", "k6 run, then a SQL check that no seat has two active bookings"],
            ["NFR-03", "Hold endpoint p95 under 50 ms at 50 virtual users with the conditional-update strategy", "k6"],
            ["NFR-04", "Expired holds are released within 40 s of expiry (10-minute TTL + one 30-s sweep)", "Integration test with a short TTL"],
            ["NFR-05", "Sweeper on 2 instances never processes the same seat twice and never blocks", "Two app instances in Compose, log line counts"],
            ["NFR-06", "Idempotent replay returns a byte-identical body and status", "Integration test comparing both responses"],
          ],
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "table",
          headers: ["Table", "Key columns", "Notes"],
          rows: [
            ["events", "`id`, `name`, `venue`, `starts_at`, `status`", ""],
            ["seats", "`id`, `event_id FK`, `label` (F7), `section`, `price_cents`, `status`, `hold_id NULL`, `held_until NULL`, `version`", "Unique `(event_id, label)`; index on `(status, held_until)` for the sweeper"],
            ["holds", "`id UUID`, `event_id`, `buyer_id`, `expires_at`, `status` (ACTIVE, CONFIRMED, RELEASED, EXPIRED)", "Partial unique: one ACTIVE hold per buyer per event"],
            ["bookings", "`id`, `hold_id` unique, `buyer_id`, `event_id`, `total_cents`, `status` (CONFIRMED, CANCELLED), `created_at`", "`hold_id` unique: one hold can become only one booking"],
            ["booking_seats", "`booking_id FK`, `seat_id FK`, `active BOOLEAN`", "Partial unique on `seat_id WHERE active`: the last line of defence"],
            ["idempotency_keys", "`buyer_id`, `key`, `request_hash`, `status_code NULL`, `response_body JSONB NULL`, `created_at`", "PK `(buyer_id, key)`; rows older than 24 h are deleted"],
          ],
        },
        {
          type: "diagram",
          text: `+-----------+ 1       * +--------------------+
|  events   |-----------|       seats        |
+-----------+           |--------------------|
| id    PK  |           | id            PK   |
| starts_at |           | event_id, label UQ |
+-----+-----+           | status             |
      | 1               | hold_id     -------+------+
      |                 | held_until         |      |
      | *               | version            |      |
+-----+---------+       +---------+----------+      |
|    holds      |<------------------------------------+
|---------------| 1                | *
| id   UUID PK  |--------+   +-----+-----------+
| buyer_id      |        |   |  booking_seats  |
| expires_at    |        |   |-----------------|
| status        |        |   | booking_id  FK  |
+---------------+        |   | seat_id     FK  |
                         |   | active          |
                       1 v   +-----+-----------+
                  +----------+---+  |
                  |   bookings   |--+ 1 : *
                  |--------------|
                  | hold_id  UQ  |
                  | status       |
                  +--------------+

idempotency_keys (buyer_id, key) PK -> stored response`,
          caption: "Seat status is the fast path; the unique indexes on bookings.hold_id and booking_seats(seat_id) WHERE active are the safety net.",
        },
        {
          type: "code",
          language: "sql",
          title: "The safety-net constraints",
          code: `CREATE UNIQUE INDEX ux_booking_seats_active
    ON booking_seats (seat_id)
    WHERE active;

CREATE UNIQUE INDEX ux_holds_one_active_per_buyer
    ON holds (event_id, buyer_id)
    WHERE status = 'ACTIVE';`,
        },
      ],
    },
    {
      title: "API Design",
      blocks: [
        {
          type: "table",
          headers: ["Method", "Path", "Purpose", "Success", "Failure"],
          rows: [
            ["POST", "/api/v1/events", "Create event + seats", "201", "400, 403"],
            ["GET", "/api/v1/events/{id}/seats", "Seat map", "200", "404"],
            ["POST", "/api/v1/events/{id}/holds", "Hold seats for 10 min", "201", "400, 404, 409 (seats taken)"],
            ["DELETE", "/api/v1/holds/{holdId}", "Release a hold", "204", "404"],
            ["POST", "/api/v1/bookings", "Confirm a hold (needs `Idempotency-Key`)", "201 (replays: same status + body)", "400 (no key), 404, 409 (in progress), 410 (hold expired), 422 (key reused with different body)"],
            ["GET", "/api/v1/bookings/{id}", "Booking details", "200", "404"],
            ["POST", "/api/v1/bookings/{id}/cancel", "Cancel", "200", "404, 409 (already cancelled), 422 (too late)"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/events/7/holds → 409 Conflict",
          code: `{
  "type": "https://example.com/problems/seats-unavailable",
  "title": "Some seats are no longer available",
  "status": 409,
  "detail": "2 of 3 requested seats are held or booked by someone else.",
  "unavailableSeats": ["F7", "F8"]
}`,
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/bookings, Idempotency-Key: 9b1c2f0e-4a7d-4d55-9a3e-1f2b3c4d5e6f → 201",
          code: `{
  "bookingId": 1042,
  "holdId": "5f0c7f9a-2d3b-4c1e-8f6a-0b9d8e7c6a51",
  "eventId": 7,
  "seats": ["F7", "F8", "F9"],
  "totalCents": 135000,
  "status": "CONFIRMED"
}`,
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "diagram",
          text: `  Buyer app / k6
        |
        v
+---------------------------------------------------+
| Controllers                                       |
|  IdempotencyFilter (only on POST /bookings)       |
|   1. INSERT key ON CONFLICT DO NOTHING            |
|   2. existing? same hash -> replay / 409 / 422    |
+------------------------+--------------------------+
                         v
+---------------------------------------------------+
| HoldService --> SeatLockStrategy (interface)      |
|                  - ConditionalUpdateStrategy  *   |
|                  - OptimisticVersionStrategy      |
|                  - PessimisticForUpdateStrategy   |
| BookingService: hold -> booking in 1 transaction  |
+------------------------+--------------------------+
                         v
                  PostgreSQL 16
                         ^
                         |
       HoldSweeper (@Scheduled every 30 s)
       UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 500)`,
          caption: "* default strategy. The others exist so I can measure and explain the differences.",
        },
        {
          type: "heading",
          text: "Strategy 1 (default): one conditional UPDATE",
        },
        {
          type: "paragraph",
          text: "The database checks and changes the seat in one statement, so there's no gap between \"is it free?\" and \"take it\". In PostgreSQL's READ COMMITTED mode, if two transactions update the same row, the second waits, then re-checks the `WHERE` clause against the new row version, sees it no longer matches, and updates nothing. I compare the updated row count with the number of seats requested; if it's lower, I throw and the whole transaction rolls back, which gives all-or-nothing.",
        },
        {
          type: "code",
          language: "sql",
          title: "Hold seats (expired holds count as free)",
          code: `UPDATE seats
SET status = 'HELD',
    hold_id = :holdId,
    held_until = now() + interval '10 minutes',
    version = version + 1
WHERE event_id = :eventId
  AND id = ANY(:seatIds)
  AND (status = 'AVAILABLE'
       OR (status = 'HELD' AND held_until < now()));`,
        },
        {
          type: "code",
          language: "java",
          title: "ConditionalUpdateStrategy.java",
          code: `@Transactional
public UUID hold(long buyerId, long eventId, List<Long> seatIds) {
    Long[] ids = seatIds.stream().distinct().sorted().toArray(Long[]::new);

    releaseActiveHold(buyerId, eventId); // FR-04: a new hold replaces the old one
    UUID holdId = UUID.randomUUID();
    holdRepository.insertActive(holdId, eventId, buyerId); // expires_at = now() + 10 min

    int updated = seatRepository.holdIfAvailable(eventId, ids, holdId);
    if (updated != ids.length) {
        throw new SeatsUnavailableException(eventId, seatIds); // rolls back everything
    }
    return holdId;
}`,
        },
        {
          type: "heading",
          text: "Strategy 2: optimistic locking with @Version",
        },
        {
          type: "paragraph",
          text: "Read the seats, change them in Java, save. Hibernate adds `WHERE version = ?` to the update; if someone changed the row in between, zero rows match and it throws `ObjectOptimisticLockingFailureException`, which I map to 409. Good when conflicts are rare, wasteful when 50 people fight for one seat.",
        },
        {
          type: "code",
          language: "java",
          title: "Seat.java (excerpt)",
          code: `@Entity
@Table(name = "seats")
public class Seat {

    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    private SeatStatus status;

    private UUID holdId;
    private Instant heldUntil;

    @Version
    private long version;

    public void holdFor(UUID holdId, Instant until, Instant now) {
        if (!isFreeAt(now)) {
            throw new SeatsUnavailableException(id);
        }
        this.status = SeatStatus.HELD;
        this.holdId = holdId;
        this.heldUntil = until;
    }

    public boolean isFreeAt(Instant now) {
        return status == SeatStatus.AVAILABLE
                || (status == SeatStatus.HELD && heldUntil.isBefore(now));
    }
}`,
        },
        {
          type: "heading",
          text: "Strategy 3: pessimistic SELECT ... FOR UPDATE",
        },
        {
          type: "paragraph",
          text: "Lock the rows first, then check and change them. Other transactions wait in line. I lock in `id` order every time, so two buyers grabbing overlapping seats lock them in the same order and can't deadlock. Simple to reason about, but every waiting request holds a DB connection.",
        },
        {
          type: "code",
          language: "java",
          title: "SeatRepository.java (excerpt)",
          code: `@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select s from Seat s where s.eventId = :eventId and s.id in :ids order by s.id")
List<Seat> lockSeats(@Param("eventId") long eventId, @Param("ids") Collection<Long> ids);`,
        },
        {
          type: "heading",
          text: "Strategy 4: the unique constraint, always on",
        },
        {
          type: "paragraph",
          text: "Whatever strategy runs, `ux_booking_seats_active` means the database itself refuses a second active booking row for a seat. If a bug ever slips past the application logic, the insert fails with a unique violation instead of selling the seat twice. I map that `DataIntegrityViolationException` to 409.",
        },
        {
          type: "heading",
          text: "The sweeper",
        },
        {
          type: "code",
          language: "sql",
          title: "Release expired holds in batches",
          code: `WITH expired AS (
    SELECT id
    FROM seats
    WHERE status = 'HELD' AND held_until < now()
    ORDER BY id
    LIMIT 500
    FOR UPDATE SKIP LOCKED
)
UPDATE seats s
SET status = 'AVAILABLE', hold_id = NULL, held_until = NULL, version = s.version + 1
FROM expired
WHERE s.id = expired.id;`,
        },
        {
          type: "paragraph",
          text: "`SKIP LOCKED` is like several cashiers clearing the reserved cards: if one cashier already has her hand on a seat, the next one skips it instead of waiting. So two app instances can run the sweeper at the same time without blocking each other or a buyer who is confirming right now. The job loops until a batch updates fewer than 500 rows, then marks the matching holds EXPIRED. The sweeper is only tidying up: thanks to the `held_until < now()` check in the hold query, an expired seat is already treated as free even if the sweeper is late.",
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
            ["Java 21 + Spring Boot 3.x", "Same base; `@Transactional`, `@Scheduled`, `@Version` all built in"],
            ["PostgreSQL 16", "Row-level locks, `SKIP LOCKED`, partial unique indexes, re-check semantics in READ COMMITTED"],
            ["Spring Data JPA + `@Modifying` native queries", "Entities for normal work, raw SQL where the exact statement matters"],
            ["Flyway", "Constraints are part of the design, so they live in versioned SQL"],
            ["HikariCP (default pool)", "Pool size is a real knob here; I set it explicitly and note it in tests"],
            ["JUnit 5 + Testcontainers", "Concurrency tests only mean something against the real database"],
            ["k6", "Load test and the strategy comparison numbers"],
            ["Docker Compose (2 app instances)", "To show the sweeper and holds are safe across instances"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Conditional UPDATE as the default lock strategy",
        },
        {
          type: "paragraph",
          text: "One round trip, no read-then-write gap, and losers fail fast instead of queueing. Trade-off: the rule lives in SQL rather than in the entity, and I get a row count, not a nice exception with details, so I run a small follow-up query to tell the buyer which seats were taken.",
        },
        {
          type: "heading",
          text: "ADR-2: Holds with expiry instead of booking straight away",
        },
        {
          type: "paragraph",
          text: "Real checkout takes minutes (payment, OTP). Without a hold, two people could both reach the payment page for the same seat. Trade-off: abandoned holds block seats for up to 10 minutes, and I need the sweeper. A shorter TTL sells more seats but annoys slow buyers.",
        },
        {
          type: "heading",
          text: "ADR-3: Idempotency keys stored in PostgreSQL, scoped per buyer",
        },
        {
          type: "paragraph",
          text: "Same database as the booking means the key row and the booking can commit together. Scoping by buyer stops one user's key from colliding with another's. Trade-off: one extra insert per booking, and a cleanup job for old keys. Redis would be faster but can't share a transaction with the booking.",
        },
        {
          type: "heading",
          text: "ADR-4: Database constraints as the final guard",
        },
        {
          type: "paragraph",
          text: "Application logic can have bugs; a unique index can't be bypassed by a new code path. Trade-off: constraint errors need translating into friendly 409s, and partial unique indexes are PostgreSQL-specific.",
        },
        {
          type: "heading",
          text: "ADR-5: Lock rows in a consistent order",
        },
        {
          type: "paragraph",
          text: "Two buyers locking {F7, F8} and {F8, F7} in different orders can deadlock. Sorting ids before locking (and `ORDER BY id` in the sweeper) removes that. Trade-off: none worth mentioning, which is why it's a rule.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Duplicate seat ids in one request (`[5, 5]`) → de-duplicated before the update (see `distinct()` above), or the row count check would fail wrongly.",
            "Seat ids from another event → they don't match `event_id`, the count is short, request fails with 409 (or 400 after a check).",
            "Hold expires at the exact moment of confirming → the confirm query checks `held_until > now()` on the seats; if not all seats still belong to the hold, 410.",
            "Sweeper and confirm touch the same seat at once → one waits or skips; the confirm's conditional update decides.",
            "Same `Idempotency-Key`, first request still running → 409 \"request in progress\", client retries later.",
            "Same key, different body (other hold id) → 422; never silently replay a response for a different request.",
            "Request fails with 500 after storing the key → delete the key row in the same rollback so a retry can run again.",
            "Client never sends a key → 400 for `POST /bookings`.",
            "Cancelling a booking → set `booking_seats.active = false` and seats to AVAILABLE in one transaction, so the partial unique index allows a new booking.",
            "Connection pool smaller than concurrent threads in the test → tests time out instead of failing cleanly; size the pool and the thread count together.",
            "Clock skew between app and DB → all time comparisons use the database's `now()`, not the app's clock.",
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
            "**Events and seat map.** Schema, layout generator, seat map endpoint. Demo: create a 10×20 hall and print the map. Tests: seat generation, unique `(event_id, label)`.",
            "**Naive hold, proven broken.** Read seats, check in Java, save, no locking. Demo: the concurrency test fails (several winners). Keep this commit; it's the best interview story.",
            "**Conditional-update hold.** The SQL above, all-or-nothing, 409 details. Demo: the same test now passes 20 runs in a row. Tests: concurrency test, partial overlap test, expired-hold-is-free test.",
            "**Booking + idempotency.** Confirm hold to booking, `Idempotency-Key` handling, constraints. Demo: send the same booking request 5 times in parallel and get one booking with 5 identical responses (or 409 for in-progress ones). Tests: replay, mismatch 422, in-progress 409, expired hold 410.",
            "**Sweeper.** `SKIP LOCKED` batches, two instances in Compose. Demo: create holds with a 30-s TTL and watch them free up. Tests: release within the window, two parallel sweepers process disjoint rows.",
            "**Strategy comparison.** Optimistic and pessimistic strategies behind the interface, k6 run for each at high and low contention. Demo: a table in the README with p95, throughput and 409 rate per strategy.",
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
            "**Unit:** `Seat.isFreeAt`, hold expiry math, request hashing for idempotency (same body in a different key order hashes the same if I canonicalise JSON).",
            "**Integration (Testcontainers):** each lock strategy against the real DB; constraint violations mapped to 409; sweeper SQL; idempotency flows.",
            "**Concurrency:** the latch test below for each strategy, run in a loop; overlapping multi-seat holds to show no deadlocks.",
            "**Load (k6):** 100 users holding random seats; afterwards a SQL check that `SELECT seat_id FROM booking_seats WHERE active GROUP BY seat_id HAVING count(*) > 1` returns nothing.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "LastSeatRaceIT.java",
          code: `@Test
void onlyOneBuyerGetsTheLastSeat() throws Exception {
    int buyers = 50;
    ExecutorService pool = Executors.newFixedThreadPool(buyers);
    CountDownLatch ready = new CountDownLatch(buyers);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<Boolean>> results = new ArrayList<>();

    for (int i = 0; i < buyers; i++) {
        long buyerId = i + 1;
        results.add(pool.submit(() -> {
            ready.countDown();
            start.await(); // everyone fires at the same moment
            try {
                holdService.hold(buyerId, eventId, List.of(seatId));
                return true;
            } catch (SeatsUnavailableException e) {
                return false;
            }
        }));
    }

    ready.await();
    start.countDown();

    int winners = 0;
    for (Future<Boolean> result : results) {
        if (result.get(10, TimeUnit.SECONDS)) {
            winners++;
        }
    }
    pool.shutdown();

    assertThat(winners).isEqualTo(1);
    assertThat(seatRepository.findById(seatId).orElseThrow().getStatus())
            .isEqualTo(SeatStatus.HELD);
}`,
        },
        {
          type: "paragraph",
          text: "The first latch makes sure all 50 threads exist before any of them starts; the second releases them together, which is what creates real contention. Without the latches, threads start one by one and the test passes even with broken code. Any exception other than `SeatsUnavailableException` fails the test through `result.get`, which is what I want. The test class must not be `@Transactional`, or every thread would see uncommitted test data differently.",
        },
      ],
    },
    {
      title: "Stretch Goals",
      blocks: [
        {
          type: "list",
          items: [
            "Redis `SET seat:{id} holdId NX PX 600000` as a fast pre-check in front of PostgreSQL, with the DB still the source of truth.",
            "Server-Sent Events pushing seat map changes to open browsers.",
            "\"Best available\" seat picking: N adjacent seats in the best section.",
            "Waitlist with notification when a hold expires.",
            "Connect to Project 5: the hold becomes a pending order and payment success confirms the booking.",
            "Run the concurrency test at SERIALIZABLE isolation and explain the retries it needs.",
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
              question: "Two users click the last seat at the same time. Walk me through what happens.",
              answer:
                "Both requests run `UPDATE seats SET status = 'HELD' ... WHERE id = ? AND status = 'AVAILABLE'`. PostgreSQL lets the first one lock the row and update it. The second waits for that lock.\n\nWhen the first commits, the second re-evaluates its `WHERE` against the new version of the row, sees status is HELD, and updates zero rows. My code sees 0 instead of 1, throws, and returns 409. There's no moment where both think the seat is free.",
            },
            {
              question: "Why not just check if the seat is free and then save?",
              answer:
                "Because that's a check-then-act race. Both requests can read AVAILABLE before either writes, and both save HELD. Isolation level READ COMMITTED doesn't prevent that.\n\nI actually kept that naive version in the history: my 50-thread test produced several winners with it. The fix is to make the check and the write one atomic statement, or to lock the row before checking.",
            },
            {
              question: "Optimistic vs pessimistic locking: when would you use each?",
              answer:
                "Optimistic (`@Version`) assumes conflicts are rare. No locks are held while reading; the update fails if someone else changed the row, and the loser retries or gets an error. Great for things like editing a profile.\n\nPessimistic (`SELECT ... FOR UPDATE`) locks rows up front, so others wait. It's better when conflicts are frequent and retries are expensive, but waiting requests hold connections. In my measurements the conditional update beat both under high contention; I quote my README numbers here.",
            },
            {
              question: "How does your hold expire if the sweeper is down?",
              answer:
                "Expiry doesn't depend on the sweeper. The hold query treats `status = 'HELD' AND held_until < now()` as free, and the seat map shows it as available. The sweeper is housekeeping that resets the columns so the data stays clean and queries stay simple.",
            },
            {
              question: "What does SKIP LOCKED do and why use it in the sweeper?",
              answer:
                "`FOR UPDATE SKIP LOCKED` locks the rows it selects and silently skips rows another transaction already has locked, instead of waiting for them.\n\nSo two sweeper instances get disjoint batches, and a sweeper never blocks a buyer who is confirming that exact seat. It's the same pattern used to build job queues on top of PostgreSQL.",
            },
            {
              question: "How does your Idempotency-Key implementation work?",
              answer:
                "The client sends a unique key with the booking request. I insert `(buyer_id, key, request_hash)` with `ON CONFLICT DO NOTHING`. If the insert happened, I process the request and store the status and body on that row in the same transaction.\n\nIf the row already existed: different hash means 422, no stored response yet means 409 (still processing), otherwise I replay the stored response exactly. Keys are deleted after 24 hours.",
            },
            {
              question: "Why do you still need unique constraints if the application logic is correct?",
              answer:
                "Because \"correct\" lasts until the next feature. Someone adds an admin endpoint that books seats directly, or a bulk import, and skips my service. The partial unique index on active booking seats means the database refuses a double booking no matter which code path tries it.",
            },
            {
              question: "How do you avoid deadlocks when holding several seats?",
              answer:
                "Deadlocks happen when two transactions lock the same rows in different orders. I always sort seat ids and lock in ascending order, and the sweeper uses `ORDER BY id` too. If a deadlock still happened, PostgreSQL would abort one transaction, and I'd map that to a retryable 409.",
            },
            {
              question: "How did you test concurrency, and how do you know the test is meaningful?",
              answer:
                "An `ExecutorService` with 50 threads and two `CountDownLatch`es: one to wait until all threads are ready, one to release them together. Each tries to hold the same seat; I assert exactly one success.\n\nI know it's meaningful because the same test fails reliably against the naive implementation. A concurrency test that never failed against broken code proves nothing.",
            },
            {
              question: "What isolation level do you use and why not SERIALIZABLE?",
              answer:
                "READ COMMITTED, PostgreSQL's default. With conditional updates and row locks it's enough for this problem.\n\nSERIALIZABLE would also prevent the race, but the database aborts conflicting transactions with serialization failures, and the app has to retry them. That's more code and more aborted work under contention, so I'd only reach for it when the invariant spans many rows that are hard to lock explicitly.",
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
            "Built a seat booking API in Spring Boot and PostgreSQL with time-limited holds and zero double bookings, verified by a 50-thread `CountDownLatch` race test and a [N]-user k6 run.",
            "Compared conditional updates, optimistic `@Version` and `SELECT FOR UPDATE` under contention; chose conditional updates for [X]% higher throughput at p95 [Y] ms.",
            "Implemented an idempotent booking endpoint (`Idempotency-Key` with stored responses) and a multi-instance-safe hold sweeper using `FOR UPDATE SKIP LOCKED`.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Numbers from my own runs only",
          text: "[N], [X] and [Y] come from the README table I produced, on my laptop, with the pool size and thread counts written down. If I only built the conditional-update strategy, the comparison bullet doesn't go on the resume.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "Projects 1 to 3 finished",
            "System Design → Transactions and Locking (isolation levels, row locks, optimistic vs pessimistic)",
            "System Design → Idempotency and Webhooks (the idempotency key part)",
            "Interview Questions → Concurrency (`ExecutorService`, `CountDownLatch`, `Future`)",
            "Interview Questions → JPA and Hibernate (`@Version`, `@Lock`, `@Modifying` queries)",
            "PostgreSQL: `UPDATE ... RETURNING`, `FOR UPDATE SKIP LOCKED`, partial unique indexes, deadlocks",
            "Java → Date and Time API (`Instant`, `Duration`)",
            "REST API Design: 409 vs 410 vs 422, idempotent methods",
          ],
        },
      ],
    },
  ],
};
