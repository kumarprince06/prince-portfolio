import type { Lesson } from "../types";

export const transactionsAndLocking: Lesson = {
  slug: "transactions-and-locking",
  date: "2026-10-29",
  title: "Transactions and Locking",
  description:
    "What a database transaction really promises, which race conditions slip through each isolation level, and the locking tools I reach for in Java and Spring: FOR UPDATE, @Version, conditional updates, SKIP LOCKED and side effects after commit.",
  tags: ["System Design", "Databases", "Transactions", "Concurrency", "Spring"],
  sections: [
    {
      title: "What a Transaction Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think about paying at a tea stall with UPI. Money leaves my account and lands in the stall owner's account. If the first half happens and the second doesn't, someone is out of pocket. Either both halves happen, or neither does. That \"all or nothing\" bundle is a **transaction**.",
        },
        {
          type: "paragraph",
          text: "In a database, a transaction is a group of reads and writes that the database treats as one unit. I start it, do my work, and then either `COMMIT` (keep everything) or `ROLLBACK` (throw everything away). In Spring I usually don't write those words myself. I put `@Transactional` on a service method and Spring begins the transaction before the method and commits or rolls back after it.",
        },
        {
          type: "paragraph",
          text: "The other half of this lesson is **locking**. A transaction keeps my own work consistent, but my app has many requests running at the same time. Two drivers tap \"accept\" on the same ride in the same second. Two top-ups hit the same wallet. Locking is how I decide who goes first, and what the second one sees when its turn comes.",
        },
      ],
    },
    {
      title: "Why It Matters",
      blocks: [
        {
          type: "paragraph",
          text: "Most concurrency bugs I've seen in backend code were not exotic. They were a read, a decision in Java, and a write, with another request sneaking in between the read and the write. They pass every unit test because unit tests run one request at a time. They show up in production on a busy evening, as a ride assigned to two drivers or a wallet that's 50 short.",
        },
        {
          type: "list",
          items: [
            "**Money.** A lost update on a balance is real money gone, and nobody gets an error.",
            "**Double work.** Two workers pick up the same job and send the same email or charge the same card twice.",
            "**Stuck systems.** A transaction that holds a lock while it waits on a slow payment API blocks every other request for that row, and connection pools run dry.",
            "**Ghost side effects.** An SMS says \"ride confirmed\" for a ride whose transaction later rolled back.",
          ],
        },
        {
          type: "paragraph",
          text: "The good news is that the toolbox is small. Once I knew five or six patterns and when each one fits, most of these bugs became easy to spot in code review.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a single bank passbook that several clerks can update.",
        },
        {
          type: "list",
          items: [
            "**No locking:** two clerks each photocopy the page showing 100, each add 50 on their copy, and each write 150 back into the passbook. One deposit is gone. That's a **lost update**.",
            "**Pessimistic locking (`FOR UPDATE`):** a clerk takes the passbook to their desk. Anyone else who wants it waits in the queue until it's put back.",
            "**Optimistic locking (`@Version`):** the passbook has a page number. A clerk writes only if the page number is still the one they read. If someone changed it in the meantime, they start again with the fresh page.",
            "**Conditional update:** the clerk says \"write 'ASSIGNED' only if it still says 'SEARCHING'\". Whoever says it first wins; the other is told \"nothing changed\".",
            "**SKIP LOCKED:** a pile of passbooks and several clerks. Each clerk grabs the next passbook nobody is holding, instead of queueing behind the one at the top.",
          ],
        },
        {
          type: "paragraph",
          text: "And one rule from the bank that maps perfectly: you don't hold the passbook while you phone another branch. A clerk who does that makes the whole queue wait on a phone call.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "ACID in plain words",
        },
        {
          type: "table",
          headers: ["Letter", "Means", "In practice"],
          rows: [
            ["**A**tomicity", "All or nothing", "A crash halfway leaves no partial writes behind"],
            ["**C**onsistency", "Rules still hold after commit", "Constraints, foreign keys and unique indexes are checked. Business rules are still my job"],
            ["**I**solation", "Concurrent transactions don't see each other's half-done work", "How much they're shielded depends on the isolation level"],
            ["**D**urability", "Committed means saved", "The write is in the write-ahead log (or redo log) on disk before `COMMIT` returns"],
          ],
        },
        {
          type: "paragraph",
          text: "Isolation is the one that surprises people, because it's a dial, not a switch. The weaker the level, the more concurrency the database allows, and the more anomalies can leak through.",
        },
        {
          type: "heading",
          text: "The anomalies",
        },
        {
          type: "list",
          items: [
            "**Dirty read:** I read a row another transaction changed but hasn't committed. If it rolls back, I acted on data that never existed.",
            "**Non-repeatable read:** I read a row twice in one transaction and get different values, because someone committed in between.",
            "**Phantom read:** I run the same `WHERE` query twice and get a different set of rows, because someone inserted a matching row.",
            "**Lost update:** two transactions read the same value, both compute a new value in code, both write. The second write silently overwrites the first.",
            "**Write skew:** two transactions read overlapping data, each checks a rule (\"at least one doctor stays on call\"), and each updates a different row. Both rules looked fine alone; together they break.",
          ],
        },
        {
          type: "heading",
          text: "Isolation levels",
        },
        {
          type: "table",
          headers: ["Level", "Dirty read", "Non-repeatable", "Phantom", "Notes"],
          rows: [
            ["READ UNCOMMITTED", "possible", "possible", "possible", "Postgres treats it as READ COMMITTED"],
            ["READ COMMITTED", "no", "possible", "possible", "**Postgres default.** Each statement sees a fresh snapshot"],
            ["REPEATABLE READ", "no", "no", "standard says possible", "**MySQL InnoDB default.** One snapshot for the whole transaction"],
            ["SERIALIZABLE", "no", "no", "no", "Behaves as if transactions ran one at a time; expect retries"],
          ],
        },
        {
          type: "paragraph",
          text: "Two details that bit me when moving between databases:",
        },
        {
          type: "list",
          items: [
            "In **Postgres REPEATABLE READ**, if two transactions update the same row, the second one fails with `could not serialize access due to concurrent update`. The lost update is turned into an error I must retry.",
            "In **MySQL REPEATABLE READ**, a plain `SELECT` reads from the snapshot, but `UPDATE` and `SELECT ... FOR UPDATE` always work on the latest committed row. So the classic read-in-Java-then-write lost update still happens. The higher default level does **not** protect me there.",
          ],
        },
        {
          type: "heading",
          text: "The lost update, drawn out",
        },
        {
          type: "diagram",
          text: `  time   Transaction A                 Transaction B
  ────   ───────────────────────────   ───────────────────────────
   t1    SELECT balance  -> 100
   t2                                  SELECT balance  -> 100
   t3    (Java) 100 + 50 = 150
   t4                                  (Java) 100 + 50 = 150
   t5    UPDATE balance = 150
   t6    COMMIT
   t7                                  UPDATE balance = 150
   t8                                  COMMIT
                                                  final: 150, not 200`,
          caption: "Both reads happened before either write. Nothing errored, and one top-up vanished.",
        },
        {
          type: "heading",
          text: "The four fixes",
        },
        {
          type: "table",
          headers: ["Tool", "SQL shape", "Good for"],
          rows: [
            ["Atomic update", "`UPDATE wallet SET balance = balance + 50 WHERE id = ?`", "Simple arithmetic the database can do itself"],
            ["Conditional update (compare-and-set)", "`UPDATE rides SET status='ASSIGNED' WHERE id=? AND status='SEARCHING'`", "Claiming something or moving a status forward"],
            ["Pessimistic lock", "`SELECT ... FOR UPDATE`, then update", "Complex logic on a hot row where conflicts are common"],
            ["Optimistic lock", "`UPDATE ... SET version = version + 1 WHERE id=? AND version=?`", "Edits where conflicts are rare, like a profile or a settings form"],
          ],
        },
        {
          type: "paragraph",
          text: "The first one is the most underrated. If the database can compute the new value itself, there's no read-then-write gap at all.",
        },
        {
          type: "heading",
          text: "Pessimistic locking and the re-check",
        },
        {
          type: "diagram",
          text: `  Transaction A                          Transaction B
  ─────────────────────────────────      ─────────────────────────────────
  SELECT * FROM rides WHERE id=7
    FOR UPDATE        -> status SEARCHING
                                         SELECT * FROM rides WHERE id=7
                                           FOR UPDATE      ... waits ...
  status is SEARCHING, so assign
  UPDATE rides SET status='ASSIGNED'
  COMMIT  (lock released)
                                         ... gets the row -> status ASSIGNED
                                         re-check: not SEARCHING any more
                                         -> return "already taken"`,
          caption: "B waited, then saw A's committed change. The re-check after the lock is what makes it safe.",
        },
        {
          type: "paragraph",
          text: "The lock only helps if my decision is made **after** I hold it, on the data I read **with** it. A common bug is loading the ride, checking `status == SEARCHING` in Java, and only then locking. By then the check is stale. Always lock first, then read, then decide.",
        },
        {
          type: "heading",
          text: "SKIP LOCKED for worker queues",
        },
        {
          type: "paragraph",
          text: "When several worker instances poll the same jobs table, plain `FOR UPDATE` makes them queue behind each other on the same first row. `FOR UPDATE SKIP LOCKED` (Postgres 9.5+, MySQL 8.0+) tells the database: skip any row someone else has locked and give me the next free one. Each worker gets a different batch with no waiting.",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT id FROM outbox
WHERE status = 'PENDING' AND next_attempt_at <= now()
ORDER BY id
LIMIT 20
FOR UPDATE SKIP LOCKED;`,
        },
        {
          type: "paragraph",
          text: "In Postgres I often use `FOR NO KEY UPDATE SKIP LOCKED` instead. `FOR NO KEY UPDATE` is a slightly weaker row lock: it still blocks other writers, but it doesn't block inserts in child tables whose foreign key points at this row. If the worker is only going to change a status column, not the primary key, it's the better fit.",
        },
        {
          type: "heading",
          text: "Deadlocks",
        },
        {
          type: "diagram",
          text: `  Transfer A (wallet 1 -> 2)        Transfer B (wallet 2 -> 1)
  lock wallet 1   ok                 lock wallet 2   ok
  lock wallet 2   waits for B ─┐     lock wallet 1   waits for A ─┐
                               └──── neither can move ◄───────────┘
  database detects the cycle and kills one transaction`,
          caption: "Fix: always lock rows in the same order, for example lowest id first.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "MVCC: why readers don't block writers",
        },
        {
          type: "paragraph",
          text: "Both Postgres and InnoDB use **multi-version concurrency control**. Like a shared Google Doc with version history, an update doesn't overwrite a row in place for everyone. It creates a new version, and older versions stay around for transactions that still need them.",
        },
        {
          type: "list",
          items: [
            "**Postgres** stores every version as a separate tuple in the table. Each tuple header has `xmin` (the transaction that created it) and `xmax` (the one that deleted or replaced it). A transaction's **snapshot** is a list of which transaction ids were committed when it started, and visibility is just a check of `xmin` and `xmax` against that list. Old tuples are cleaned up later by `VACUUM`.",
            "**InnoDB** keeps only the newest version in the table and writes the previous values to the **undo log**. A reader with an older **read view** walks back through the undo chain until it finds a version it's allowed to see. A purge thread removes undo records nobody needs any more.",
          ],
        },
        {
          type: "paragraph",
          text: "So a plain `SELECT` never waits for a writer. It just reads an older version. That's also exactly why the lost update happens: my `SELECT` happily gave me the old balance while someone else was changing it.",
        },
        {
          type: "heading",
          text: "What FOR UPDATE actually does",
        },
        {
          type: "list",
          items: [
            "**Postgres** doesn't keep row locks in a big shared-memory table. It writes the locker's transaction id into the tuple's `xmax` field with lock-mode bits. Another transaction that wants the row sees that id, and waits on that **transaction** to finish (a lock on the transaction id, which lives in the lock table). In READ COMMITTED, once the first transaction commits, the waiter re-reads the newest version of the row and re-evaluates its `WHERE` clause against it. If the row no longer matches, it's skipped.",
            "**InnoDB** keeps record locks in its lock system, attached to **index records**. Under REPEATABLE READ, a locking read over a range also takes **gap locks** (next-key locks) so nobody can insert a phantom into that range. That's why a `FOR UPDATE` on a column without an index can lock far more rows than expected: it locks every index record it scans.",
          ],
        },
        {
          type: "heading",
          text: "How the database spots a deadlock",
        },
        {
          type: "paragraph",
          text: "Both databases build a \"waits-for\" graph: transaction A waits for B, B waits for A. A cycle means deadlock. InnoDB checks for cycles immediately when a transaction starts waiting, and rolls back the cheaper one with error 1213 (`Deadlock found when trying to get lock`). Postgres waits `deadlock_timeout` (1 second by default) before running the check, then aborts one with `deadlock detected` (SQLSTATE `40P01`). Either way, the losing transaction must be retried by my code.",
        },
        {
          type: "heading",
          text: "How Spring runs code after commit",
        },
        {
          type: "paragraph",
          text: "When a `@Transactional` method starts a new transaction, Spring's `AbstractPlatformTransactionManager` turns on **transaction synchronization** for the current thread. `TransactionSynchronizationManager` holds a `ThreadLocal` list of `TransactionSynchronization` callbacks. Anything can register one during the transaction.",
        },
        {
          type: "paragraph",
          text: "At commit time, the manager runs them in a fixed order:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`beforeCommit` on every registered callback (Hibernate flushes here).",
            "`beforeCompletion`.",
            "The real JDBC `commit()`.",
            "`afterCommit`. The data is now committed and visible to others.",
            "`afterCompletion(STATUS_COMMITTED)`, then the `ThreadLocal`s are cleared and the connection goes back to the pool.",
          ],
        },
        {
          type: "paragraph",
          text: "On rollback, `afterCommit` never runs, and `afterCompletion` gets `STATUS_ROLLED_BACK`. That's the whole trick behind \"send the SMS only if the ride really saved\". `@TransactionalEventListener` is built on the same mechanism: publishing the event registers a synchronization, and the listener method is called from the matching phase, `AFTER_COMMIT` by default.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "The connection is still bound in afterCommit",
          text: "During `afterCommit` the transaction has committed, but its resources are still bound to the thread. Spring's own Javadoc warns that data access code run there will still **participate** in the original transaction, and its writes won't be committed. Any database write from `afterCommit` or an after-commit listener must use `Propagation.REQUIRES_NEW`. Since Spring 6.1, a `@TransactionalEventListener` that also carries `@Transactional` is rejected at startup unless it's `REQUIRES_NEW` or `NOT_SUPPORTED`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The lost update, for real",
        },
        {
          type: "paragraph",
          text: "Before touching a database, I wanted to watch a lost update happen in plain Java. Two threads play two transactions. A `CountDownLatch` forces the bad timing: both read before either writes.",
        },
        {
          type: "code",
          language: "java",
          title: "LostUpdate.java",
          code: `import java.util.concurrent.CountDownLatch;

public class LostUpdate {
    static int balance = 100;                        // the wallet row

    public static void main(String[] args) throws Exception {
        CountDownLatch bothHaveRead = new CountDownLatch(2);
        Runnable addFifty = () -> {
            int seen = balance;                      // SELECT balance
            bothHaveRead.countDown();
            try { bothHaveRead.await(); } catch (InterruptedException e) { }
            balance = seen + 50;                     // UPDATE ... SET balance = seen + 50
        };
        Thread a = new Thread(addFifty), b = new Thread(addFifty);
        a.start(); b.start(); a.join(); b.join();
        System.out.println("two top-ups of 50 on 100, expected 200, got " + balance);
    }
}`,
        },
        {
          type: "output",
          text: `two top-ups of 50 on 100, expected 200, got 150`,
        },
        {
          type: "paragraph",
          text: "Every run prints 150. The latch makes sure each thread has its own stale copy of `100` before writing. That's the diagram from earlier, as code.",
        },
        {
          type: "heading",
          text: "The simplest fix: let the database do the math",
        },
        {
          type: "code",
          language: "java",
          title: "WalletRepository.java",
          code: `public interface WalletRepository extends JpaRepository<Wallet, Long> {

    @Modifying
    @Query("update Wallet w set w.balance = w.balance + :amount where w.id = :id")
    int addToBalance(@Param("id") long id, @Param("amount") BigDecimal amount);
}`,
        },
        {
          type: "paragraph",
          text: "There's no read in Java, so there's no gap. The database takes a row lock for the `UPDATE` and the second top-up simply waits a few microseconds and then adds to 150.",
        },
        {
          type: "heading",
          text: "Compare-and-set: one driver wins",
        },
        {
          type: "paragraph",
          text: "Claiming a ride is a status change, so I use a conditional update. The `WHERE status = 'SEARCHING'` is the condition. The database returns how many rows changed, and that number tells me if I won.",
        },
        {
          type: "code",
          language: "java",
          title: "RideRepository.java",
          code: `@Modifying
@Query("""
       update Ride r set r.status = 'ASSIGNED', r.driverId = :driverId
       where r.id = :rideId and r.status = 'SEARCHING'
       """)
int claim(@Param("rideId") long rideId, @Param("driverId") long driverId);

// in the service
if (rides.claim(rideId, driverId) == 0) {
    throw new RideAlreadyTakenException(rideId);   // someone else got there first
}`,
        },
        {
          type: "paragraph",
          text: "To convince myself that exactly one caller wins, I simulated it with `AtomicReference.compareAndSet`, which is the same idea in memory: change the value only if it's still what I expect. Two threads, released at the same instant, ten thousand times:",
        },
        {
          type: "code",
          language: "java",
          title: "ClaimRace.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public class ClaimRace {
    // UPDATE rides SET status = 'ASSIGNED' WHERE id = ? AND status = 'SEARCHING'
    static final AtomicReference<String> status = new AtomicReference<>("SEARCHING");

    static int claim() {
        return status.compareAndSet("SEARCHING", "ASSIGNED") ? 1 : 0;   // rows affected
    }

    public static void main(String[] args) throws Exception {
        int rounds = 10_000;
        AtomicInteger doubleClaims = new AtomicInteger();
        for (int i = 0; i < rounds; i++) {
            status.set("SEARCHING");
            CountDownLatch start = new CountDownLatch(1);
            AtomicInteger wins = new AtomicInteger();
            Runnable driver = () -> {
                try { start.await(); } catch (InterruptedException e) { return; }
                wins.addAndGet(claim());
            };
            Thread d1 = new Thread(driver), d2 = new Thread(driver);
            d1.start(); d2.start();
            start.countDown();                    // release both at once
            d1.join(); d2.join();
            if (wins.get() != 1) doubleClaims.incrementAndGet();
        }
        System.out.println(rounds + " races, rounds without exactly one winner: " + doubleClaims.get());
    }
}`,
        },
        {
          type: "output",
          text: `10000 races, rounds without exactly one winner: 0`,
        },
        {
          type: "paragraph",
          text: "In my RideX project I test the real thing the same way: two threads, one `CountDownLatch`, both call the claim endpoint's service method against a real Postgres, and the test asserts that exactly one gets `1` back.",
        },
        {
          type: "heading",
          text: "Pessimistic lock with a re-check",
        },
        {
          type: "code",
          language: "java",
          title: "RideService.java",
          code: `public interface RideRepository extends JpaRepository<Ride, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)                 // SELECT ... FOR UPDATE
    @Query("select r from Ride r where r.id = :id")
    Optional<Ride> findByIdForUpdate(@Param("id") long id);
}

@Transactional
public void cancel(long rideId, long riderId) {
    Ride ride = rides.findByIdForUpdate(rideId).orElseThrow();
    // decide only now, on data read under the lock
    if (ride.getStatus() == RideStatus.STARTED) {
        throw new CannotCancelStartedRideException(rideId);
    }
    ride.cancel(riderId);
}`,
        },
        {
          type: "paragraph",
          text: "The lock is held until the method's transaction ends. Any other request that calls `findByIdForUpdate` on the same ride waits at that line, then sees my committed change.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Lock as the first read",
          text: "If the same entity was already loaded earlier in this persistence context, a later lock call may lock the row without refreshing the fields Hibernate already has in memory. I make the locking query the first time I load that row in the transaction, or I use `entityManager.refresh(ride, LockModeType.PESSIMISTIC_WRITE)`.",
        },
        {
          type: "paragraph",
          text: "In RideX, refresh-token rotation uses `PESSIMISTIC_WRITE`. Two tabs refreshing with the same token at the same moment would otherwise both get new tokens. With the lock, the second request waits, re-reads, sees the token is already used, and is rejected.",
        },
        {
          type: "heading",
          text: "Optimistic locking with @Version",
        },
        {
          type: "code",
          language: "java",
          title: "Ride.java",
          code: `@Entity
public class Ride {
    @Id private Long id;

    @Enumerated(EnumType.STRING)
    private RideStatus status;

    @Version                 // Hibernate adds "and version = ?" to every update
    private long version;
}`,
        },
        {
          type: "paragraph",
          text: "With `@Version`, Hibernate's update becomes `update ride set ..., version = 4 where id = ? and version = 3`. If that touches zero rows, someone else saved first, and Spring throws `ObjectOptimisticLockingFailureException`. Here is the same logic in plain Java, so I could see both the conflict and the retry:",
        },
        {
          type: "code",
          language: "java",
          title: "OptimisticVersion.java",
          code: `public class OptimisticVersion {
    static final class Row { int balance = 100; long version = 0; }
    static final Row row = new Row();

    record Snapshot(int balance, long version) {}

    static Snapshot read() { return new Snapshot(row.balance, row.version); }

    // UPDATE wallet SET balance = ?, version = version + 1 WHERE id = ? AND version = ?
    static int update(int newBalance, long expectedVersion) {
        if (row.version != expectedVersion) return 0;
        row.balance = newBalance;
        row.version++;
        return 1;
    }

    static void topUp(String who, Snapshot seen, int amount) {
        int rows = update(seen.balance() + amount, seen.version());
        if (rows == 1) {
            System.out.println(who + ": saved, balance " + row.balance + ", version " + row.version);
        } else {
            System.out.println(who + ": 0 rows, stale version " + seen.version() + " -> retry");
            Snapshot fresh = read();
            update(fresh.balance() + amount, fresh.version());
            System.out.println(who + ": retried, balance " + row.balance + ", version " + row.version);
        }
    }

    public static void main(String[] args) {
        Snapshot a = read();                      // both read version 0
        Snapshot b = read();
        topUp("tx-A", a, 50);
        topUp("tx-B", b, 50);
    }
}`,
        },
        {
          type: "output",
          text: `tx-A: saved, balance 150, version 1
tx-B: 0 rows, stale version 0 -> retry
tx-B: retried, balance 200, version 2`,
        },
        {
          type: "paragraph",
          text: "Nobody waited, and nothing was lost. The cost moved to the loser, who has to read again and redo its work. That's a good deal when conflicts are rare and a bad one when they're constant. The ride entity in RideX has `@Version` as a safety net behind the conditional claim update.",
        },
        {
          type: "heading",
          text: "A worker that claims jobs with SKIP LOCKED",
        },
        {
          type: "code",
          language: "java",
          title: "OutboxRepository.java",
          code: `@Query(value = """
        select * from outbox
        where status = 'PENDING' and next_attempt_at <= now()
        order by id
        limit :batch
        for update skip locked
        """, nativeQuery = true)
List<OutboxMessage> claimBatch(@Param("batch") int batch);`,
        },
        {
          type: "paragraph",
          text: "I call it inside a short `@Transactional` method that marks the rows `SENDING` and commits straight away, then do the slow sending outside the transaction. If I ran three copies of the app, each instance would grab a different 20 rows. RideX's dispatch sweep, payment-order worker and outbox worker all claim their rows this way, and the sweep uses `FOR NO KEY UPDATE SKIP LOCKED`.",
        },
        {
          type: "heading",
          text: "Deadlock, and the lock-ordering fix",
        },
        {
          type: "paragraph",
          text: "A transfer between two wallets locks both. If transfer A locks \"from\" first and transfer B goes the other way, they can block each other forever. I simulated it with two `ReentrantLock`s. A database would detect the cycle and kill one; here each side gives up after 200 ms:",
        },
        {
          type: "code",
          language: "java",
          title: "LockOrder.java",
          code: `import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class LockOrder {
    static final ReentrantLock[] wallets = { new ReentrantLock(), new ReentrantLock() };

    static String transfer(int first, int second, CountDownLatch bothStarted) {
        wallets[first].lock();
        try {
            bothStarted.countDown();
            bothStarted.await(300, TimeUnit.MILLISECONDS);
            // a database would detect the cycle and kill one; we give up after 200 ms
            if (!wallets[second].tryLock(200, TimeUnit.MILLISECONDS)) return "stuck";
            wallets[second].unlock();
            return "done";
        } catch (InterruptedException e) {
            return "interrupted";
        } finally {
            wallets[first].unlock();
        }
    }

    static void race(String label, int a1, int a2, int b1, int b2) throws Exception {
        CountDownLatch latch = new CountDownLatch(2);
        String[] r = new String[2];
        Thread a = new Thread(() -> r[0] = transfer(a1, a2, latch));
        Thread b = new Thread(() -> r[1] = transfer(b1, b2, latch));
        a.start(); b.start(); a.join(); b.join();
        System.out.println(label + " -> A " + r[0] + ", B " + r[1]);
    }

    public static void main(String[] args) throws Exception {
        race("lock 'from' first ", 0, 1, 1, 0);      // A: 0->1, B: 1->0
        race("lock lower id first", 0, 1, 0, 1);     // both lock wallet 0 first
    }
}`,
        },
        {
          type: "output",
          text: `lock 'from' first  -> A stuck, B stuck
lock lower id first -> A done, B done`,
        },
        {
          type: "paragraph",
          text: "With a consistent order, the second transfer just waits for the first instead of forming a cycle. In SQL the same idea is `SELECT ... WHERE id IN (?, ?) ORDER BY id FOR UPDATE`.",
        },
        {
          type: "heading",
          text: "Side effects after commit",
        },
        {
          type: "code",
          language: "java",
          title: "BookingService.java",
          code: `@Transactional
public Booking confirm(long bookingId) {
    Booking booking = bookings.findByIdForUpdate(bookingId).orElseThrow();
    booking.confirm();
    events.publishEvent(new BookingConfirmed(booking.getId(), booking.getPhone()));
    return booking;
}

@Component
class BookingSms {
    @TransactionalEventListener   // phase = AFTER_COMMIT by default
    void onConfirmed(BookingConfirmed event) {
        sms.send(event.phone(), "Your booking is confirmed");
    }
}`,
        },
        {
          type: "paragraph",
          text: "If `confirm` throws after `publishEvent`, the transaction rolls back and the SMS is never sent. Without a transaction at all, a `@TransactionalEventListener` is skipped by default (unless `fallbackExecution = true`), which surprised me the first time.",
        },
        {
          type: "paragraph",
          text: "The lower-level version is a callback, which I use when I'm not in a Spring-event mood:",
        },
        {
          type: "code",
          language: "java",
          code: `TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override
    public void afterCommit() {
        paymentWorker.wakeUp(orderId);     // runs only if the commit succeeded
    }
});`,
        },
        {
          type: "paragraph",
          text: "`registerSynchronization` throws `IllegalStateException` if there's no active transaction, so it's a cheap way to also catch code that was supposed to be transactional but isn't.",
        },
        {
          type: "heading",
          text: "Propagation in one look",
        },
        {
          type: "table",
          headers: ["Propagation", "If a transaction exists", "If none exists"],
          rows: [
            ["`REQUIRED` (default)", "Join it", "Start one"],
            ["`REQUIRES_NEW`", "Suspend it, start a new one, commit it on its own", "Start one"],
            ["`NESTED`", "Savepoint inside it (JDBC only)", "Start one"],
            ["`MANDATORY`", "Join it", "Throw"],
            ["`SUPPORTS`", "Join it", "Run without"],
            ["`NOT_SUPPORTED`", "Suspend it, run without", "Run without"],
            ["`NEVER`", "Throw", "Run without"],
          ],
        },
        {
          type: "code",
          language: "java",
          title: "AuditLog.java",
          code: `@Service
class AuditLog {
    // own transaction: safe to call from afterCommit or an AFTER_COMMIT listener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String action, long entityId) {
        audits.save(new AuditEntry(action, entityId, Instant.now()));
    }
}`,
        },
        {
          type: "paragraph",
          text: "`REQUIRES_NEW` takes a **second** database connection while the first is suspended. If a busy request path does that, the pool needs room for two connections per request, or requests start waiting on each other for connections.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Read in Java, decide, write",
        },
        {
          type: "paragraph",
          text: "`wallet.setBalance(wallet.getBalance().add(amount))` inside `@Transactional` is the lost update from the diagram. The transaction doesn't stop it at READ COMMITTED, and doesn't stop it on MySQL at REPEATABLE READ either. Use an atomic `UPDATE`, a lock, or `@Version`.",
        },
        {
          type: "heading",
          text: "Checking state before taking the lock",
        },
        {
          type: "paragraph",
          text: "Loading the ride, checking its status, and then calling a `FOR UPDATE` method later in the same transaction. The check was done on data from before the lock. The lock must come first.",
        },
        {
          type: "heading",
          text: "Calling a payment API inside the transaction",
        },
        {
          type: "paragraph",
          text: "Like a shopkeeper who keeps the cash drawer open while calling the bank: everyone in the queue waits. The row lock and the database connection are both held for as long as the API takes, which on a bad day is 30 seconds. Under load, the pool runs out of connections and the whole app stalls, not just payments. And if the API succeeded but the commit then fails, I've charged a card for an order that doesn't exist. In RideX I moved the gateway call out of the trip-completion transaction into a worker that runs after commit and sends an idempotency key.",
        },
        {
          type: "heading",
          text: "Self-invocation",
        },
        {
          type: "paragraph",
          text: "`this.saveAudit()` from inside the same bean skips Spring's proxy, so `@Transactional(propagation = REQUIRES_NEW)` on `saveAudit` is silently ignored. The method has to be on another bean.",
        },
        {
          type: "heading",
          text: "Expecting rollback on checked exceptions",
        },
        {
          type: "paragraph",
          text: "By default Spring rolls back on `RuntimeException` and `Error` only. A checked exception commits whatever was written. Use `@Transactional(rollbackFor = Exception.class)` or throw unchecked exceptions.",
        },
        {
          type: "heading",
          text: "Sending emails or events before commit",
        },
        {
          type: "paragraph",
          text: "A Kafka message or SMS sent inside the transaction can't be unsent if the transaction rolls back. Worse, a consumer may receive the message and query the database before my commit lands, and not find the row. After-commit hooks fix the first problem. An outbox table fixes both, because the message row commits with the data.",
        },
        {
          type: "heading",
          text: "FOR UPDATE on a column without an index",
        },
        {
          type: "paragraph",
          text: "On InnoDB, a locking read that scans the table locks every index record it walks over, which can mean the whole table. Make sure the `WHERE` of a locking query hits an index.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Keep transactions short: read, decide, write, commit. Milliseconds, not seconds.",
            "No network calls inside a transaction: no HTTP, no SMS, no S3 upload. Do them after commit or from a worker.",
            "Prefer a single atomic or conditional `UPDATE` over read-modify-write, and check the returned row count.",
            "Use `FOR UPDATE` for hot rows with complex logic, and decide only after the lock is held.",
            "Use `@Version` where conflicts are rare and a retry or a \"someone else changed this, reload\" message is acceptable.",
            "Lock multiple rows in a fixed order, and be ready to retry on deadlock and serialization errors.",
            "Use `SKIP LOCKED` for job tables that several workers poll.",
            "Put side effects in `afterCommit` or `@TransactionalEventListener`, and give any database writes there `REQUIRES_NEW`.",
            "Set a lock timeout (`jakarta.persistence.lock.timeout` hint, or `lock_timeout` in Postgres) so a stuck lock fails fast instead of hanging requests.",
            "Know your database's default isolation level. Don't assume MySQL behaviour on Postgres or the other way round.",
          ],
        },
      ],
    },
    {
      title: "Trade-offs",
      blocks: [
        {
          type: "table",
          headers: ["Approach", "Strengths", "Costs", "Use when"],
          rows: [
            ["Atomic `UPDATE`", "No gap, no retry, fast", "Only for logic SQL can express", "Counters, balances, stock"],
            ["Conditional `UPDATE`", "One statement, the loser learns at once", "Needs a clear \"expected\" state", "Claims and status changes"],
            ["`FOR UPDATE`", "Simple mental model, no lost work", "Others wait; deadlock risk; holds a connection", "Hot rows, conflicts are common"],
            ["`@Version`", "No waiting, scales for reads", "Loser redoes work; bad under heavy contention", "Rare conflicts, user edits"],
            ["`SKIP LOCKED`", "Workers never queue on each other", "Order is not strict; can starve a stuck row", "Job and outbox tables"],
            ["SERIALIZABLE", "The database finds every anomaly", "More aborts, every write path needs retries", "Small, critical, complex invariants"],
          ],
        },
      ],
    },
    {
      title: "Transactions in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small, realistic example: completing a cab trip and charging the rider. The first version I'd write looks innocent:",
        },
        {
          type: "code",
          language: "java",
          title: "TripService.java (first version)",
          code: `@Transactional
public void completeTrip(long tripId) {
    Trip trip = trips.findById(tripId).orElseThrow();
    trip.complete(fareCalculator.fareFor(trip));
    paymentGateway.charge(trip.getRiderId(), trip.getFare());  // HTTP call, up to 10 s
}`,
        },
        {
          type: "paragraph",
          text: "Three problems hide in five lines. Two \"complete\" taps (driver's app retried) can both pass because there's no lock or condition. The HTTP call holds the row lock and a pooled connection while it waits on the gateway. And if the commit fails after the charge succeeds, the rider has paid for a trip still marked in progress.",
        },
        {
          type: "code",
          language: "java",
          title: "TripService.java (fixed)",
          code: `@Transactional
public void completeTrip(long tripId) {
    // conditional update: only one caller can move STARTED -> COMPLETED
    int changed = trips.markCompleted(tripId, fareCalculator.fareFor(tripId));
    if (changed == 0) return;                          // already completed: nothing to do

    paymentOrders.save(PaymentOrder.pending(tripId)); // commits with the trip
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override public void afterCommit() { paymentWorker.wakeUp(); }
    });
}`,
        },
        {
          type: "paragraph",
          text: "Now the transaction only writes two rows and commits in a few milliseconds. The payment order row is the promise \"charge this trip\", and it can't exist unless the trip really completed. A worker claims pending orders with `SKIP LOCKED`, calls the gateway with an idempotency key like `trip-123:charge`, and marks the order paid. The `wakeUp` is only a nudge to start early; if the app crashes before it runs, the worker's normal poll still finds the row. This is close to how RideX handles trip completion.",
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
              question: "What does ACID stand for, and which letter causes the most confusion?",
              answer:
                "Atomicity (all or nothing), Consistency (constraints still hold after commit), Isolation (concurrent transactions don't see each other's half-done work) and Durability (once committed, it survives a crash because it's in the write-ahead log).\n\nIsolation causes the most confusion because it's a setting, not a guarantee. At READ COMMITTED, the Postgres default, two transactions can still lose each other's updates if they read in Java and write back.",
            },
            {
              question: "What is a lost update, and does REPEATABLE READ prevent it?",
              answer:
                "Two transactions read the same value, each computes a new value in application code, and each writes. The second write overwrites the first without any error.\n\nIt depends on the database. Postgres REPEATABLE READ detects it and fails the second transaction with a serialization error. MySQL InnoDB REPEATABLE READ does not, because its `UPDATE` works on the latest committed row while the earlier `SELECT` read an old snapshot. So on MySQL I still need an atomic update, a lock or a version column.",
            },
            {
              question: "What are the default isolation levels of MySQL and Postgres?",
              answer:
                "MySQL InnoDB defaults to REPEATABLE READ. Postgres defaults to READ COMMITTED.\n\nThe practical difference: in Postgres each statement sees the latest committed data, while in MySQL a plain `SELECT` keeps reading the same snapshot for the whole transaction. Locking reads and updates in MySQL still see the latest data, which is why the two levels behave differently from what their names suggest.",
            },
            {
              question: "Pessimistic or optimistic locking: how do you choose?",
              answer:
                "By how often conflicts happen and how expensive a retry is. Pessimistic (`FOR UPDATE`) makes others wait, which is right for hot rows like a wallet or a ride being claimed, where conflicts are common.\n\nOptimistic (`@Version`) lets everyone work and fails the late writer, which is right for things like editing a profile where two people rarely collide. Under heavy contention optimistic locking wastes work, because most attempts fail and retry.",
            },
            {
              question: "Why should you re-check the state after acquiring a lock?",
              answer:
                "Because whatever I read before the lock may already be out of date. Another transaction could have changed the row between my first read and my lock.\n\nThe safe order is lock, then read, then decide. With Hibernate, I also make sure the locking query is the first load of that row in the persistence context, or use `refresh` with a lock mode, so I'm not looking at stale fields cached in memory.",
            },
            {
              question: "How does a conditional UPDATE act like compare-and-set?",
              answer:
                "`UPDATE rides SET status = 'ASSIGNED' WHERE id = ? AND status = 'SEARCHING'` only changes the row if it's still in the expected state. The database takes a row lock for the update, so two concurrent callers are serialized, and the second one finds the status is no longer `SEARCHING`.\n\nThe returned row count is the answer: 1 means I won, 0 means someone else did. It's the same idea as `AtomicReference.compareAndSet`. My simulation of 10,000 two-thread races had exactly one winner every time.",
            },
            {
              question: "What does SKIP LOCKED do, and where is it useful?",
              answer:
                "It makes a locking `SELECT` skip rows that other transactions currently hold locked, instead of waiting for them. Each caller gets only free rows.\n\nIt's ideal for job tables, outboxes and dispatch sweeps where several worker instances poll the same table. Each one grabs a different batch with no waiting and no double processing. It's not for queries that must see every row, like reports.",
            },
            {
              question: "What is FOR NO KEY UPDATE in Postgres?",
              answer:
                "A row lock that's slightly weaker than `FOR UPDATE`. It still blocks other updates and deletes of the row, but it doesn't conflict with `FOR KEY SHARE`, the lock Postgres takes when a child table inserts a row with a foreign key pointing at this one.\n\nSo if I'm only going to update non-key columns, like a status, `FOR NO KEY UPDATE` avoids blocking unrelated inserts that reference the row. A plain `UPDATE` that doesn't change key columns already takes this lock mode.",
            },
            {
              question: "What is a deadlock, and how do you prevent it?",
              answer:
                "Two transactions each hold a lock the other needs, so neither can continue. The database finds the cycle in its waits-for graph and rolls one back: InnoDB immediately, Postgres after `deadlock_timeout`, one second by default.\n\nPrevention is mostly lock ordering: always lock rows in the same order, such as lowest id first. Keeping transactions short helps, and the code should still retry the victim, because deadlocks can't be ruled out completely.",
            },
            {
              question: "Why is it bad to call an external API inside a database transaction?",
              answer:
                "The transaction holds its locks and its pooled connection for as long as the call takes. A slow API turns into long lock waits for other requests and an exhausted connection pool, which can stall the whole application.\n\nIt's also not atomic: if the API call succeeds and the commit then fails, the outside world has changed and my database hasn't. The fix is to commit first and make the call after commit, usually from a worker with an idempotency key.",
            },
            {
              question: "How does Spring run code after a transaction commits?",
              answer:
                "When a transaction starts, Spring activates transaction synchronization for that thread. Code can register a `TransactionSynchronization` with `TransactionSynchronizationManager`, and the transaction manager calls `beforeCommit`, `beforeCompletion`, commits, then calls `afterCommit` and `afterCompletion`.\n\n`@TransactionalEventListener` sits on top of this: the event is held until the chosen phase, `AFTER_COMMIT` by default. If the transaction rolls back, `afterCommit` listeners never run.",
            },
            {
              question: "Why do database writes in afterCommit need REQUIRES_NEW?",
              answer:
                "Because during `afterCommit` the original transaction's resources are still bound to the thread. A `REQUIRED` method would join that already-committed transaction, and its writes would never be committed.\n\n`REQUIRES_NEW` suspends the old one and starts a real new transaction on a fresh connection. Spring 6.1 even refuses to start if a `@TransactionalEventListener` has `@Transactional` with anything other than `REQUIRES_NEW` or `NOT_SUPPORTED`.",
            },
            {
              question: "What is the difference between REQUIRED, REQUIRES_NEW and NESTED?",
              answer:
                "`REQUIRED` joins the current transaction or starts one; if the inner method fails, the whole thing rolls back. `REQUIRES_NEW` suspends the current transaction and runs in a completely separate one that commits on its own, using a second connection.\n\n`NESTED` stays in the same transaction but sets a savepoint, so the inner part can roll back to the savepoint without undoing the outer work. It works with JDBC-based transaction managers, not JTA.",
            },
            {
              question: "Why does @Transactional sometimes not work?",
              answer:
                "The common causes are self-invocation (a method calling another method of the same bean skips the proxy), the method not being public in older Spring versions, the class not being a Spring bean, or a checked exception, which doesn't trigger rollback by default.\n\nI check by logging `TransactionSynchronizationManager.isActualTransactionActive()` inside the method, or by turning on debug logging for `org.springframework.transaction`.",
            },
            {
              question: "How does MVCC let reads and writes run in parallel?",
              answer:
                "An update creates a new version of the row instead of overwriting it in place for everyone. Postgres keeps versions as separate tuples tagged with `xmin` and `xmax`; InnoDB keeps the latest row and rebuilds old versions from the undo log.\n\nEach transaction reads with a snapshot that says which versions it may see, so plain reads never wait for writers. The flip side is that a plain read can give me an old value, which is exactly how a lost update gets started.",
            },
            {
              question: "Two workers keep picking up the same outbox row and sending the message twice. How do you fix it?",
              answer:
                "Make the claim exclusive. Either claim with `SELECT ... FOR UPDATE SKIP LOCKED` in a short transaction that also sets the status to `SENDING`, or use a conditional update like `UPDATE outbox SET status='SENDING' WHERE id=? AND status='PENDING'` and only send if it returned 1.\n\nEven then, a crash between sending and marking `SENT` can cause a resend, so the receiver should be idempotent too, for example by deduplicating on a message id.",
            },
            {
              question: "Your service gets 'Deadlock found when trying to get lock' in production. What do you do?",
              answer:
                "First, make sure the code retries the failed transaction a couple of times, because that's the expected handling for a deadlock victim. Then find the cause: `SHOW ENGINE INNODB STATUS` prints the latest deadlock with both transactions' statements and locks.\n\nUsually the fix is consistent lock ordering, or adding an index so a locking statement doesn't scan and lock extra rows, or shrinking the transaction so it holds locks for less time.",
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
            "Run `LostUpdate.java`. Then change the write to happen inside `synchronized (LostUpdate.class) { balance += 50; }` with no separate read, and confirm it prints 200.",
            "Create a `wallet` table in Postgres. Open two `psql` sessions, `BEGIN` in both, `SELECT balance` in both, then `UPDATE ... SET balance = <value + 50>` in both. Watch the second one wait, then commit both and check the result.",
            "Repeat step 2 with `BEGIN ISOLATION LEVEL REPEATABLE READ` and note the `could not serialize access` error. If you have MySQL, try the same and compare.",
            "In two sessions, run `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` on a small jobs table and confirm each session gets a different row.",
            "Write a Spring Boot test with two threads and a `CountDownLatch` that both call a `claim` method using a conditional update. Assert exactly one gets `1`.",
            "Add `@TransactionalEventListener` to a service that logs \"sent SMS\". Throw an exception after `publishEvent` and confirm the log line never appears.",
            "Create a deadlock on purpose with two sessions updating rows 1 and 2 in opposite order. Read the error, then fix it by ordering the updates.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `TRANSACTION   all or nothing; COMMIT or ROLLBACK
ISOLATION     RU < RC (Postgres default) < RR (MySQL default) < SERIALIZABLE
ANOMALIES     dirty, non-repeatable, phantom, lost update, write skew

LOST UPDATE   read in Java, write back -> someone's change vanishes
FIXES         balance = balance + ?          atomic update
              ... WHERE status = 'SEARCHING'  compare-and-set, check rows
              SELECT ... FOR UPDATE           lock, THEN read, THEN decide
              @Version                        conflict -> retry

WORKERS       FOR UPDATE SKIP LOCKED  (Postgres: FOR NO KEY UPDATE ...)
DEADLOCK      lock in a fixed order; retry the victim

RULES         short transactions; no HTTP inside
              side effects AFTER_COMMIT; DB writes there = REQUIRES_NEW
              checked exceptions don't roll back; self-calls skip the proxy`,
          caption: "The page I'd glance at before reviewing any code that writes to a shared row.",
        },
        {
          type: "list",
          items: [
            "A transaction makes my own writes all-or-nothing. It doesn't automatically protect me from other requests.",
            "Most races are read-decide-write. Close the gap with an atomic update, a conditional update, a lock, or a version.",
            "Hold locks briefly, never across a network call, and run side effects only after the commit has really happened.",
          ],
        },
      ],
    },
  ],
};
