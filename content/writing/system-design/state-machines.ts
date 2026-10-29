import type { Lesson } from "../types";

export const stateMachines: Lesson = {
  slug: "state-machines",
  date: "2026-10-29",
  title: "State Machines for Business Workflows",
  description:
    "Why status codes scattered across a codebase go wrong, and how I model a booking or refund lifecycle as a Java enum with allowed transitions, a transition service that records history, and conditional updates that stop two people changing the same status at once.",
  tags: ["System Design", "State Machines", "Domain Modelling", "Java", "Spring"],
  sections: [
    {
      title: "What a State Machine Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think about a food order in a delivery app. It's **placed**, then **accepted** by the restaurant, then **picked up** by a rider, then **delivered**. It can be **cancelled** early on. What it can't do is go from \"delivered\" back to \"placed\", or get picked up before the restaurant accepted it. The order is always in exactly one of a few named situations, and only certain moves between them make sense.",
        },
        {
          type: "paragraph",
          text: "That's a **state machine**: a fixed set of **states**, and a fixed set of allowed **transitions** between them. Everything else is forbidden. A traffic light is the textbook one (green, yellow, red, never green straight to red). In backend work, almost every important entity has one: bookings, rides, payments, refunds, KYC checks, support tickets.",
        },
        {
          type: "paragraph",
          text: "The idea is old and simple. What this lesson is about is writing it down **in one place in the code**, instead of letting it live as a status column that any line anywhere can set to anything.",
        },
      ],
    },
    {
      title: "Why It Matters",
      blocks: [
        {
          type: "paragraph",
          text: "In a SaaS codebase I've worked on, statuses started as integers in a config file: `1` for requested, `2` for confirmed, and so on. Over the years the same numbers were copied into controllers, jobs, reports and SQL queries. Each place had its own idea of which moves were okay. The bugs that came out of that looked like this:",
        },
        {
          type: "list",
          items: [
            "**Impossible states.** A ride marked `COMPLETED` that never had a driver, because one code path forgot a check another path had.",
            "**Going backwards.** A late \"payment pending\" message overwrote a `PAID` order, because the handler just set the status to whatever it received.",
            "**Magic numbers.** `if (status == 4 || status == 7)` in a report. Nobody remembers what 7 was, and someone added a new status 8 that the report ignores.",
            "**Races.** An admin approves a refund while another rejects it in the same second, and both writes \"succeed\".",
            "**No history.** A customer asks \"who cancelled my booking and when?\" and the database only knows the current status.",
          ],
        },
        {
          type: "paragraph",
          text: "A state machine fixes all of these with the same move: one type that lists every state and every allowed transition, and one service that is the only way to change the status.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "A railway ticket's journey through a reservation system is how I picture it.",
        },
        {
          type: "list",
          items: [
            "The ticket can be **waitlisted**, **RAC**, **confirmed**, **cancelled** or **travelled**. Never \"half confirmed\". That's the list of states.",
            "The rule book at the counter says which stamps can follow which: waitlisted can become RAC or confirmed, confirmed can become cancelled or travelled. That's the transition table.",
            "Only the counter clerk stamps tickets, not anyone who walks past. That's the transition service: the one place allowed to change status.",
            "Every stamp goes in a register with the clerk's name and the time. That's the history table.",
            "If two clerks pick up the same ticket at once, the register only lets the first stamp in. That's the conditional update.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Two lifecycles",
        },
        {
          type: "diagram",
          text: `BOOKING

  REQUESTED ──► CONFIRMED ──► ASSIGNED ──► STARTED ──► COMPLETED
      │             │             │
      └─────────────┴─────────────┴──────► CANCELLED


REFUND

  REQUESTED ──► APPROVED ──► PROCESSING ──► SUCCEEDED
      │                          │    ▲
      ▼                          ▼    │ retry
   REJECTED                     FAILED ┘

  final states:  COMPLETED, CANCELLED, SUCCEEDED, REJECTED`,
          caption: "A booking can be cancelled until the trip starts. A failed refund can be retried; a succeeded one is final.",
        },
        {
          type: "paragraph",
          text: "Drawing the diagram first is half the work. Every arrow becomes one entry in the transition table. Every state with no outgoing arrow is a **final** state. If the business can't agree on an arrow, it's much better to find out on a whiteboard than in production.",
        },
        {
          type: "heading",
          text: "The pieces",
        },
        {
          type: "table",
          headers: ["Piece", "What it is", "Where it lives"],
          rows: [
            ["States", "A closed list of names", "A Java `enum`"],
            ["Transitions", "Which state may follow which", "A method on the enum, `next()`"],
            ["Guard", "\"Is this move allowed?\"", "`canTransitionTo` / `assertCanTransition`"],
            ["Transition service", "The only code that changes status", "One Spring service per entity"],
            ["History", "Who moved it, from what, to what, when, why", "A `*_status_history` table"],
            ["Concurrency guard", "Two moves at once: only one wins", "`UPDATE ... WHERE status = :from`"],
            ["Domain events", "\"Booking cancelled\" for others to react to", "Published by the service, handled after commit"],
          ],
        },
        {
          type: "heading",
          text: "The enum as the single source of truth",
        },
        {
          type: "paragraph",
          text: "A Java enum is a great fit: the compiler knows every value, `switch` expressions can be checked for completeness, and I can hang behaviour on it. The transition table lives right next to the states:",
        },
        {
          type: "code",
          language: "java",
          title: "BookingStatus.java",
          code: `public enum BookingStatus {
    REQUESTED, CONFIRMED, ASSIGNED, STARTED, COMPLETED, CANCELLED;

    public Set<BookingStatus> next() {
        return switch (this) {
            case REQUESTED -> EnumSet.of(CONFIRMED, CANCELLED);
            case CONFIRMED -> EnumSet.of(ASSIGNED, CANCELLED);
            case ASSIGNED  -> EnumSet.of(STARTED, CANCELLED);
            case STARTED   -> EnumSet.of(COMPLETED);
            case COMPLETED, CANCELLED -> EnumSet.noneOf(BookingStatus.class);
        };
    }

    public boolean canTransitionTo(BookingStatus target) { return next().contains(target); }
}`,
        },
        {
          type: "paragraph",
          text: "The `switch` has no `default`. That's on purpose: if someone adds a new state and forgets to give it transitions, the code doesn't compile, because a `switch` expression over an enum must cover every constant.",
        },
        {
          type: "heading",
          text: "The transition service",
        },
        {
          type: "diagram",
          text: `  controller / job / webhook worker
              │  "cancel booking 12, by rider 5, reason: changed plans"
              ▼
  BookingTransitions.move(12, CANCELLED, actor, reason)
      1. load booking, read current status (CONFIRMED)
      2. CONFIRMED.assertCanTransition(CANCELLED)       ── else 409
      3. UPDATE bookings SET status='CANCELLED'
           WHERE id=12 AND status='CONFIRMED'          ── 0 rows? someone else moved it
      4. INSERT booking_status_history (CONFIRMED -> CANCELLED, rider 5, now, reason)
      5. publish BookingCancelled                       ── listeners run after commit`,
          caption: "Every status change in the system goes through this one door.",
        },
        {
          type: "heading",
          text: "Storing the status",
        },
        {
          type: "paragraph",
          text: "In JPA, `@Enumerated(EnumType.STRING)` stores the name (`'CANCELLED'`). The default, `ORDINAL`, stores the position (`5`), and that breaks silently the day someone inserts a new constant in the middle of the enum: every existing row now means a different status. Strings cost a few bytes more and are readable in SQL, logs and reports. I add a `CHECK` constraint (or a Postgres enum type) so the database rejects typos too.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What an enum really is",
        },
        {
          type: "paragraph",
          text: "`javac` turns `enum BookingStatus { ... }` into a `final` class that extends `java.lang.Enum<BookingStatus>`, with one `public static final` field per constant, created once when the class is initialised. Each constant carries a `name()` and an `ordinal()`, which is just its position in the declaration. Because there's exactly one instance per constant, comparing with `==` is safe and fast.",
        },
        {
          type: "paragraph",
          text: "`EnumSet` is the reason `next()` is cheap. For enums with up to 64 constants it's a `RegularEnumSet`, which stores membership as bits in one `long`. `contains` is a single bit test. Building a fresh `EnumSet` on each call is fine for normal traffic; if it ever showed up in a profile, I'd compute the sets once in a static `EnumMap`.",
        },
        {
          type: "heading",
          text: "How a switch over an enum compiles",
        },
        {
          type: "paragraph",
          text: "A `switch` on an enum doesn't compare names. `javac` switches on the constant's ordinal, through a small lookup array it generates so the code still works if the enum is recompiled with constants in a different order. For a `switch` **expression** with no `default`, the compiler also adds a hidden fallback that throws `IncompatibleClassChangeError` in case a constant is added later without recompiling the switch. I checked with `javap` on JDK 21: the bytecode reads the `$SwitchMap$` array, calls `ordinal()`, and ends with `new java/lang/IncompatibleClassChangeError`. (Pattern-matching switches use `MatchException` instead.) So exhaustiveness is checked at compile time and also protected at runtime.",
        },
        {
          type: "heading",
          text: "How JPA stores and loads the status",
        },
        {
          type: "list",
          items: [
            "With `EnumType.STRING`, Hibernate writes `status.name()` and reads with `BookingStatus.valueOf(columnValue)`. An unknown string in the database throws on load, which is a loud and useful failure.",
            "With `EnumType.ORDINAL`, it writes `status.ordinal()` and reads `values()[n]`. Reordering constants silently changes meaning.",
            "With a custom `AttributeConverter<BookingStatus, Integer>`, I decide the mapping myself, which is how I bridge old integer columns during a migration.",
          ],
        },
        {
          type: "heading",
          text: "Why the conditional update closes the race",
        },
        {
          type: "paragraph",
          text: "Two admins open the same refund, both see `REQUESTED`, one clicks Approve, the other Reject. Both pass the enum check, because both read `REQUESTED`. The enum alone can't stop this; it only knows about the value each request read. The database closes the gap: `UPDATE refunds SET status = 'APPROVED' WHERE id = 7 AND status = 'REQUESTED'` takes a row lock. The second update waits, then re-checks its `WHERE` against the committed row, finds `APPROVED`, and changes nothing. The returned row count of 0 tells my service it lost.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A refund lifecycle you can run",
        },
        {
          type: "paragraph",
          text: "The whole state machine for a refund, plus a tiny driver that tries a legal path and then one illegal move:",
        },
        {
          type: "code",
          language: "java",
          title: "RefundLifecycle.java",
          code: `import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

public class RefundLifecycle {
    enum RefundStatus {
        REQUESTED, APPROVED, REJECTED, PROCESSING, SUCCEEDED, FAILED;

        Set<RefundStatus> next() {
            return switch (this) {
                case REQUESTED  -> EnumSet.of(APPROVED, REJECTED);
                case APPROVED   -> EnumSet.of(PROCESSING);
                case PROCESSING -> EnumSet.of(SUCCEEDED, FAILED);
                case FAILED     -> EnumSet.of(PROCESSING);   // allow a retry
                case REJECTED, SUCCEEDED -> EnumSet.noneOf(RefundStatus.class);
            };
        }

        boolean canTransitionTo(RefundStatus target) { return next().contains(target); }

        void assertCanTransition(RefundStatus target) {
            if (!canTransitionTo(target))
                throw new IllegalStateException("refund cannot go " + this + " -> " + target);
        }

        boolean isFinal() { return next().isEmpty(); }
    }

    public static void main(String[] args) {
        RefundStatus status = RefundStatus.REQUESTED;
        List<String> history = new ArrayList<>();
        for (RefundStatus target : List.of(RefundStatus.APPROVED, RefundStatus.PROCESSING,
                RefundStatus.SUCCEEDED, RefundStatus.PROCESSING)) {
            try {
                status.assertCanTransition(target);
                history.add(status + " -> " + target);
                status = target;
            } catch (IllegalStateException e) {
                System.out.println("blocked: " + e.getMessage());
            }
        }
        System.out.println("history: " + history);
        System.out.println(status + " is final? " + status.isFinal());
    }
}`,
        },
        {
          type: "output",
          text: `blocked: refund cannot go SUCCEEDED -> PROCESSING
history: [REQUESTED -> APPROVED, APPROVED -> PROCESSING, PROCESSING -> SUCCEEDED]
SUCCEEDED is final? true`,
        },
        {
          type: "paragraph",
          text: "The last move, `SUCCEEDED -> PROCESSING`, is exactly what a late or duplicate webhook would try. The enum refused it with a clear message instead of quietly moving a finished refund backwards.",
        },
        {
          type: "heading",
          text: "Two admins, one refund",
        },
        {
          type: "paragraph",
          text: "To see the concurrency guard in action without a database, I used `AtomicReference.compareAndSet`, which behaves like the conditional `UPDATE`: change the value only if it still equals what I expect. One thread approves, one rejects, both released at the same moment:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoAdmins.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

public class TwoAdmins {
    public static void main(String[] args) throws Exception {
        int rounds = 10_000, bothWon = 0;
        for (int i = 0; i < rounds; i++) {
            // UPDATE refunds SET status = ? WHERE id = ? AND status = 'REQUESTED'
            AtomicReference<String> status = new AtomicReference<>("REQUESTED");
            CountDownLatch go = new CountDownLatch(1);
            boolean[] won = new boolean[2];
            Thread approve = new Thread(() -> { await(go); won[0] = status.compareAndSet("REQUESTED", "APPROVED"); });
            Thread reject  = new Thread(() -> { await(go); won[1] = status.compareAndSet("REQUESTED", "REJECTED"); });
            approve.start(); reject.start(); go.countDown(); approve.join(); reject.join();
            if (won[0] == won[1]) bothWon++;          // both true or both false would be a bug
        }
        System.out.println(rounds + " races, rounds where not exactly one admin won: " + bothWon);
    }

    static void await(CountDownLatch latch) {
        try { latch.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `10000 races, rounds where not exactly one admin won: 0`,
        },
        {
          type: "paragraph",
          text: "Ten thousand races, and every time exactly one admin's decision stuck. The loser should get a friendly message like \"this refund was already approved by someone else\", not a 500.",
        },
        {
          type: "heading",
          text: "The entity",
        },
        {
          type: "code",
          language: "java",
          title: "Refund.java",
          code: `@Entity
public class Refund {
    @Id @GeneratedValue
    private Long id;

    @Enumerated(EnumType.STRING)          // stores 'APPROVED', never 1 or 2
    @Column(nullable = false, length = 20)
    private RefundStatus status;

    private Instant statusChangedAt;

    // no public setStatus(): status only changes through RefundTransitions
}`,
        },
        {
          type: "heading",
          text: "The transition service",
        },
        {
          type: "code",
          language: "java",
          title: "RefundTransitions.java",
          code: `@Service
public class RefundTransitions {
    private final RefundRepository refunds;
    private final RefundHistoryRepository history;
    private final ApplicationEventPublisher events;

    // constructor omitted

    @Transactional
    public void move(long refundId, RefundStatus to, Actor actor, String reason) {
        RefundStatus from = refunds.findStatus(refundId).orElseThrow();
        from.assertCanTransition(to);                                  // 1. is the arrow allowed?
        if (refunds.updateStatus(refundId, from, to) == 0) {           // 2. did we win the race?
            throw new ConcurrentTransitionException(refundId, from, to);
        }
        history.save(new RefundHistory(refundId, from, to, actor.type(), actor.id(), reason, Instant.now()));
        events.publishEvent(new RefundStatusChanged(refundId, from, to));  // 3. tell others
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "RefundRepository.java",
          code: `@Modifying
@Query("""
       update Refund r set r.status = :to, r.statusChangedAt = CURRENT_TIMESTAMP
       where r.id = :id and r.status = :from
       """)
int updateStatus(@Param("id") long id, @Param("from") RefundStatus from, @Param("to") RefundStatus to);`,
        },
        {
          type: "list",
          items: [
            "`assertCanTransition` catches bad requests early with a clear error, before touching the row.",
            "`updateStatus` repeats `from` in the `WHERE`, so if anyone changed the status after I read it, I change nothing and find out from the 0.",
            "The history row is in the same transaction, so it's impossible to have a status change without a history entry, or the other way round.",
            "The event is published inside the transaction, but listeners annotated with `@TransactionalEventListener` run only after commit. A rolled-back move never sends \"your refund was approved\".",
          ],
        },
        {
          type: "heading",
          text: "The history table",
        },
        {
          type: "code",
          language: "sql",
          code: `CREATE TABLE refund_status_history (
    id          BIGSERIAL PRIMARY KEY,
    refund_id   BIGINT      NOT NULL REFERENCES refunds(id),
    from_status VARCHAR(20) NOT NULL,
    to_status   VARCHAR(20) NOT NULL,
    actor_type  VARCHAR(20) NOT NULL,   -- CUSTOMER, ADMIN, SYSTEM, PROVIDER
    actor_id    BIGINT,                 -- null for SYSTEM
    reason      TEXT,
    created_at  TIMESTAMP   NOT NULL
);`,
        },
        {
          type: "paragraph",
          text: "Now \"who cancelled this and when?\" is a single query. It's also the audit trail finance teams ask for, and the easiest way to debug a stuck workflow: the history shows the last move that happened.",
        },
        {
          type: "heading",
          text: "Reacting to transitions",
        },
        {
          type: "code",
          language: "java",
          title: "RefundNotifications.java",
          code: `@Component
class RefundNotifications {
    @TransactionalEventListener   // AFTER_COMMIT by default
    void on(RefundStatusChanged e) {
        if (e.to() == RefundStatus.SUCCEEDED) {
            mailer.sendRefundDone(e.refundId());
        }
    }
}`,
        },
        {
          type: "paragraph",
          text: "The transition service doesn't know about emails, SMS or analytics. Each of those is a separate listener. Adding \"notify the finance channel on large refunds\" is a new listener, not another `if` inside the service.",
        },
        {
          type: "heading",
          text: "Moving from legacy integer codes to an enum",
        },
        {
          type: "paragraph",
          text: "Most real systems don't start clean. The status is an `int` column, and the numbers are spread across the code. I don't rewrite it all at once. The first step is an enum that knows the old codes:",
        },
        {
          type: "code",
          language: "java",
          title: "LegacyCodes.java",
          code: `import java.util.Arrays;

public class LegacyCodes {
    enum BookingStatus {
        REQUESTED(1), CONFIRMED(2), ASSIGNED(3), STARTED(4), COMPLETED(5), CANCELLED(9);

        final int legacyCode;                       // the old int still stored in the table
        BookingStatus(int legacyCode) { this.legacyCode = legacyCode; }

        static BookingStatus fromLegacyCode(int code) {
            return Arrays.stream(values())
                    .filter(s -> s.legacyCode == code)
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("unknown booking status code " + code));
        }
    }

    public static void main(String[] args) {
        System.out.println(BookingStatus.fromLegacyCode(3));
        System.out.println(BookingStatus.COMPLETED.legacyCode);
        try {
            BookingStatus.fromLegacyCode(7);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `ASSIGNED
5
unknown booking status code 7`,
        },
        {
          type: "paragraph",
          text: "An unknown code fails loudly instead of being treated as some default. Then a JPA converter lets the entity use the enum while the column stays an integer:",
        },
        {
          type: "code",
          language: "java",
          title: "BookingStatusConverter.java",
          code: `@Converter
class BookingStatusConverter implements AttributeConverter<BookingStatus, Integer> {
    public Integer convertToDatabaseColumn(BookingStatus status) {
        return status == null ? null : status.legacyCode;
    }
    public BookingStatus convertToEntityAttribute(Integer code) {
        return code == null ? null : BookingStatus.fromLegacyCode(code);
    }
}`,
        },
        {
          type: "paragraph",
          text: "The migration then goes in small, safe steps:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Add the enum with `legacyCode` and the converter. Nothing in the database changes.",
            "Replace magic numbers one file at a time: `status == 2` becomes `status == BookingStatus.CONFIRMED`. Each change is tiny and reviewable.",
            "Route every status write through the transition service. A search for direct `setStatus` calls shows what's left.",
            "Once nothing reads the integers directly (including reports and raw SQL), add a string column, backfill it, switch the entity to `EnumType.STRING`, and drop the old column.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "A public setStatus()",
        },
        {
          type: "paragraph",
          text: "If any code can call `booking.setStatus(COMPLETED)`, the transition table is a suggestion. I remove the setter, or make it package-private, so the transition service is the only way in.",
        },
        {
          type: "heading",
          text: "EnumType.ORDINAL",
        },
        {
          type: "paragraph",
          text: "Someone adds `ON_HOLD` between `CONFIRMED` and `ASSIGNED`, and every existing `ASSIGNED` row in the database now reads as `ON_HOLD`. No error, just wrong data. Always `EnumType.STRING`.",
        },
        {
          type: "heading",
          text: "Checking the transition but not guarding the write",
        },
        {
          type: "paragraph",
          text: "`assertCanTransition` on a value I read earlier, followed by a plain `save()`, still loses races. The `WHERE status = :from` (or a row lock, or `@Version`) is what makes it safe.",
        },
        {
          type: "heading",
          text: "Applying external events blindly",
        },
        {
          type: "paragraph",
          text: "Setting the status straight from a webhook payload lets a late \"processing\" event overwrite \"succeeded\". Map the external status to a target state, then ask the state machine whether that move is allowed. If it's a backward move, log it and ignore it.",
        },
        {
          type: "heading",
          text: "Too many states",
        },
        {
          type: "paragraph",
          text: "Not everything is a state. \"Refund email sent\" is a fact about a side effect, not a stage of the refund. Mixing them leads to `SUCCEEDED_EMAIL_SENT` and `SUCCEEDED_EMAIL_FAILED`. Keep side-effect tracking in separate columns or tables.",
        },
        {
          type: "heading",
          text: "Status lists copied around",
        },
        {
          type: "paragraph",
          text: "`List.of(REQUESTED, CONFIRMED, ASSIGNED)` written in five places to mean \"active bookings\". Put it on the enum once, `isActive()` or a static `ACTIVE` set, and use that everywhere.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Draw the diagram first and agree on it with the people who own the process.",
            "One enum per lifecycle, with its transitions defined on the enum, and a `switch` with no `default` so new states can't be forgotten.",
            "Give the enum helpers that answer business questions: `isFinal()`, `isActive()`, `isCancellable()`.",
            "One transition service per entity, and no other code writes the status.",
            "Guard every transition write with `WHERE status = :from` and check the row count.",
            "Record history in the same transaction: from, to, actor type, actor id, reason, time.",
            "Publish a domain event per transition and do side effects in after-commit listeners.",
            "Store enums as strings, with a database `CHECK` constraint or enum type.",
            "Migrate legacy codes gradually, with a `legacyCode` field and an `AttributeConverter`.",
            "Make final states really final. If a business needs to \"reopen\", that's a new transition someone has to decide on, not a hack.",
          ],
        },
      ],
    },
    {
      title: "Trade-offs",
      blocks: [
        {
          type: "table",
          headers: ["Approach", "Good at", "Weak at", "Use when"],
          rows: [
            ["Status column, no rules", "Zero setup", "Every bug in the Why section", "Prototypes only"],
            ["Enum + transition table", "Simple, readable, compile-checked, easy to test", "Doesn't model timers or nested states by itself", "Most business workflows"],
            ["Enum + transition service + history", "Audit trail, single door, race-safe", "A bit more code per entity", "Anything involving money or customers"],
            ["Spring Statemachine (or similar library)", "Hierarchical states, guards, actions, timers, persistence built in", "Learning curve, more config, harder to debug, extra dependency", "Complex machines with nested or parallel states"],
            ["Workflow engine (Temporal, Camunda)", "Long-running processes, retries, timers, visual tooling", "Separate infrastructure to run and learn", "Multi-day processes across many services"],
          ],
        },
        {
          type: "paragraph",
          text: "I start with a plain enum every time. I'd only reach for a library when the machine grows nested states (\"in trip\" containing \"waiting\", \"moving\", \"paused\"), parallel regions, or many time-based transitions. If you do pick a library, check its current release and support status first; a workflow library is a long-term commitment.",
        },
      ],
    },
    {
      title: "State Machines in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A simple, realistic service: a rider cancels a cab booking. The rules are \"you can cancel until the trip starts\", and \"a cancellation after a driver is assigned costs a small fee\".",
        },
        {
          type: "code",
          language: "java",
          title: "CancelBookingService.java",
          code: `@Service
public class CancelBookingService {
    private final BookingTransitions transitions;
    private final BookingRepository bookings;

    @Transactional
    public CancelResult cancel(long bookingId, long riderId, String reason) {
        Booking booking = bookings.findOwnedBy(bookingId, riderId).orElseThrow();
        BookingStatus current = booking.getStatus();
        if (!current.canTransitionTo(BookingStatus.CANCELLED)) {
            return CancelResult.notAllowed(current);         // e.g. STARTED
        }
        BigDecimal fee = current == BookingStatus.ASSIGNED ? CANCELLATION_FEE : BigDecimal.ZERO;
        transitions.move(bookingId, current, BookingStatus.CANCELLED, Actor.rider(riderId), reason);
        return CancelResult.cancelled(fee);
    }
}`,
        },
        {
          type: "list",
          items: [
            "The rule \"until the trip starts\" isn't written in this service at all. It's the transition table: `STARTED` has no arrow to `CANCELLED`.",
            "The fee depends on the state we're leaving, which is a clean, testable rule.",
            "`transitions.move` takes the expected `from` state. If the driver tapped \"start trip\" in the same second, the conditional update returns 0, `move` throws, the transaction rolls back, and the rider gets \"your trip has already started\" instead of a cancelled trip that's actually moving.",
            "A history row records the rider, the reason and the time, and a `BookingCancelled` event lets the driver app, the notifications and the fee charging react after commit.",
          ],
        },
        {
          type: "paragraph",
          text: "Testing it is pleasant too: the transition table can be tested exhaustively with a loop over `values()`, and the service test only needs to check the fee rule and the \"not allowed\" path.",
        },
        {
          type: "code",
          language: "java",
          code: `@Test
void finalStatesHaveNoWayOut() {
    for (BookingStatus s : BookingStatus.values()) {
        boolean isFinal = s == BookingStatus.COMPLETED || s == BookingStatus.CANCELLED;
        assertEquals(isFinal, s.next().isEmpty(), s.name());
    }
}`,
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is a finite state machine, in business terms?",
              answer:
                "A fixed set of states an entity can be in, plus a fixed set of allowed moves between them. A booking is requested, confirmed, assigned, started, completed or cancelled, and only certain moves make sense.\n\nWriting it down explicitly means the code can refuse impossible moves, like completing a booking that never started, instead of trusting every caller to remember the rules.",
            },
            {
              question: "Why are status codes spread across many files a problem?",
              answer:
                "Each place ends up with its own copy of the rules, and they drift. One path checks that a driver was assigned before completing, another forgets. Magic numbers like `status == 7` lose their meaning, and a new status is ignored by every place nobody remembered to update.\n\nOne enum with the transitions on it, and one service that writes the status, puts the rules in exactly one place.",
            },
            {
              question: "How would you model allowed transitions in Java?",
              answer:
                "As an enum where each constant knows its next states, for example a `next()` method using a `switch` expression that returns an `EnumSet`. Then `canTransitionTo(target)` is `next().contains(target)`, and `assertCanTransition` throws if not.\n\nUsing a `switch` expression without `default` means adding a new constant breaks compilation until its transitions are defined.",
            },
            {
              question: "Why store enums as strings and not ordinals?",
              answer:
                "An ordinal is the constant's position in the declaration. Insert or reorder a constant and every stored number silently means a different status.\n\nStrings survive reordering, are readable in SQL and logs, and an unknown value fails loudly on load. The extra storage is a few bytes per row.",
            },
            {
              question: "What does a transition service do?",
              answer:
                "It's the only code allowed to change an entity's status. It loads the current state, checks the move against the transition table, writes the new status with a guard against concurrent changes, records a history row, and publishes a domain event.\n\nControllers, jobs and webhook handlers all call it instead of setting the status themselves.",
            },
            {
              question: "How do you prevent two concurrent transitions from both succeeding?",
              answer:
                "Make the write conditional on the state I read: `UPDATE ... SET status = :to WHERE id = :id AND status = :from`. The database serialises the two updates, and the second one matches zero rows because the status already changed.\n\nAlternatives are a pessimistic row lock before reading, or optimistic locking with `@Version`. The enum check alone isn't enough, because both requests read the same old state.",
            },
            {
              question: "Why keep a status history table?",
              answer:
                "The current status only tells me where an entity is, not how it got there. History answers who changed it, when, from what and why, which support, finance and auditors all ask for.\n\nIt's also the fastest way to debug a stuck workflow. Writing it in the same transaction as the status change guarantees the two never disagree.",
            },
            {
              question: "What are domain events and why publish them on transitions?",
              answer:
                "Facts like \"refund succeeded\" or \"booking cancelled\" that other parts of the system can react to. Publishing them from the transition service keeps that service small; notifications, analytics and follow-up work live in their own listeners.\n\nIn Spring I publish with `ApplicationEventPublisher` and handle with `@TransactionalEventListener`, so listeners run only if the transition actually committed.",
            },
            {
              question: "A webhook says a payment is pending, but your order is already paid. What should happen?",
              answer:
                "Nothing should change. The handler maps the external status to a target state and asks the state machine if the move is allowed. `PAID` to `PENDING` isn't an arrow, so the event is logged and ignored.\n\nWebhooks can arrive out of order, so applying them blindly would move orders backwards. Only forward moves are applied.",
            },
            {
              question: "How would you migrate a legacy integer status column to an enum without a big-bang release?",
              answer:
                "Add an enum where each constant carries its legacy code, plus a `fromLegacyCode` that throws on unknown values. Use a JPA `AttributeConverter` so the entity uses the enum while the column stays an integer.\n\nThen replace magic numbers file by file, route writes through a transition service, and only at the end add a string column, backfill it, switch to `EnumType.STRING` and drop the old column. Each step is small and can ship alone.",
            },
            {
              question: "When would you use Spring Statemachine or a workflow engine instead of an enum?",
              answer:
                "When the machine needs things an enum doesn't give me cheaply: nested states, parallel regions, many timer-based transitions, or long-running processes that span services and days.\n\nFor the usual business lifecycle, an enum plus a transition service is simpler to read, test and debug, so I start there and only move up when the complexity is real.",
            },
            {
              question: "How does a switch expression over an enum guarantee exhaustiveness?",
              answer:
                "The compiler checks that every constant is covered when there's no `default`, and refuses to compile otherwise. That's a compile-time check.\n\nIt also inserts a hidden fallback that throws at runtime (an `IncompatibleClassChangeError` for a plain enum switch, which I confirmed with `javap` on JDK 21) in case the enum gains a constant later and the class with the switch isn't recompiled. So a missing case can't silently fall through.",
            },
            {
              question: "What's the difference between a state and a flag?",
              answer:
                "A state is a stage in the lifecycle that decides what can happen next, like `APPROVED`. A flag is a fact about something on the side, like \"confirmation email sent\".\n\nMixing them leads to state explosion: `APPROVED_EMAIL_SENT`, `APPROVED_EMAIL_FAILED`. I keep states for the lifecycle and track side effects separately.",
            },
            {
              question: "How do you test a state machine?",
              answer:
                "The transition table is small and pure, so I test it exhaustively: loop over all pairs of states and assert which moves are allowed, and that final states have no outgoing moves.\n\nThe service gets a few focused tests: a legal move writes history and an event, an illegal move is rejected, and a concurrent move (two threads with a latch) leaves exactly one winner.",
            },
            {
              question: "Should a failed refund be a final state?",
              answer:
                "It depends on the business, which is why the diagram has to be agreed first. In my refund example `FAILED` can go back to `PROCESSING`, because many provider failures are temporary and support wants to retry.\n\nIf retries create a new refund instead, then `FAILED` would be final and the new attempt would be its own row with its own history. Either is fine; what matters is that it's written down once in the enum.",
            },
          ],
        },
      ],
    },
    {
      title: "Try It Yourself",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "Run `RefundLifecycle.java`. Add a `CANCELLED` state that's reachable only from `REQUESTED` and `APPROVED`, and check that the compiler forces you to handle it in `next()`.",
            "Write a test that loops over every pair of `RefundStatus` values and prints a table of allowed moves. Compare it with the diagram.",
            "Draw the lifecycle of something you use every day (a food order, a parcel, a support ticket), then turn it into an enum.",
            "In a Spring Boot app, create an entity with `@Enumerated(EnumType.STRING)` and look at the column in the database. Switch to `ORDINAL`, reorder the constants, and see what happens to existing rows.",
            "Build a small transition service with `UPDATE ... WHERE status = :from`, and a test where two threads approve and reject at the same time. Assert exactly one wins.",
            "Add a history table and a `@TransactionalEventListener` that logs every transition. Make the service throw after publishing and check that nothing is logged.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `STATE MACHINE   fixed states + allowed transitions; everything else forbidden

ENUM            one per lifecycle
                next()  switch, no default  -> new state won't compile
                canTransitionTo / assertCanTransition / isFinal

ONE DOOR        transition service is the only writer of status
                1 check the arrow
                2 UPDATE ... WHERE id = ? AND status = :from   (0 rows = lost race)
                3 INSERT history (from, to, actor, reason, time)
                4 publish event -> listeners AFTER_COMMIT

STORAGE         @Enumerated(STRING) + CHECK constraint; never ORDINAL
EXTERNAL EVENTS map to a target state; ignore backward moves
LEGACY CODES    enum(legacyCode) + AttributeConverter -> migrate file by file
LIBRARY?        only for nested/parallel states, timers, long workflows`,
          caption: "What I check before any new status column goes in.",
        },
        {
          type: "list",
          items: [
            "Draw the diagram, put it in an enum, and let the compiler help keep it complete.",
            "Change status through one service that checks the move, guards the write, records history and publishes an event.",
            "Start with a plain enum. Reach for a library only when the workflow truly outgrows it.",
          ],
        },
      ],
    },
  ],
};
