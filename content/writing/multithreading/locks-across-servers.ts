import type { Lesson } from "../types";

export const locksAcrossServers: Lesson = {
  slug: "locks-across-servers",
  date: "2026-11-16",
  title: "Why synchronized Fails Across Servers: Database Locks and Conditional Updates",
  description:
    "What happens to a synchronized check-then-act when the same service runs as two JVM processes against PostgreSQL 16, measured: a driver-assignment method that gave 0 double bookings in one JVM gave 71 to 139 drivers two trips each out of 300 across eight two-instance runs, then each fix measured on the same workload: the conditional UPDATE ... WHERE status = 'AVAILABLE' with its row count (0 double bookings, 652 to 958 lost races retried per instance), SELECT ... FOR UPDATE with the waiting session caught in pg_locks as an ungranted transactionid ShareLock and the row lock found in the tuple header (xmax plus HEAP_XMAX_EXCL_LOCK and HEAP_XMAX_LOCK_ONLY) rather than in pg_locks, FOR UPDATE blocking a foreign-key INSERT into trips until a 1-second lock_timeout while FOR NO KEY UPDATE and a plain UPDATE let it through as a MultiXact, optimistic locking with a version column (576 to 950 retries), a partial unique index as the last line of defence (107 to 147 SQLState 23505 per instance, and a CREATE UNIQUE INDEX CONCURRENTLY that failed on the existing duplicates and left an INVALID index), READ COMMITTED re-checking the newest row version, REPEATABLE READ failing with 40001 instead of losing the update but still allowing two inserts for one driver that only SERIALIZABLE caught, lock_timeout (55P03 after 517 ms) vs statement_timeout (57014) vs NOWAIT (2 ms), a wallet debit that lost 94 to 100 of 200 charges with read-modify-write in Java, MySQL 8.0 InnoDB whose default REPEATABLE READ gave 146 double bookings and no error at all because UPDATE and FOR UPDATE read the latest row while plain SELECT reads the snapshot, and a Friday-evening incident in a ride-hailing backend where scaling dispatch to two pods assigned the same driver to two riders.",
  tags: ["Multithreading", "Distributed Systems", "PostgreSQL", "MySQL", "Locking", "Concurrency"],
  sections: [
    {
      title: "What Locking Across Servers Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Race Conditions, Thread Dumps and Testing Concurrent Code, closed the in-process part of this track: how to find a race, read a thread dump and write a test that actually catches the bug. Every tool in this track so far, from `synchronized` to `ReentrantLock` to `ConcurrentHashMap.compute`, has one thing in common: it coordinates threads **inside one JVM**. A monitor lives in an object's header, in one process's heap. A second process has its own heap, its own objects and its own monitors, and can't see the first one's at all.",
        },
        {
          type: "paragraph",
          text: "That's fine until the service is deployed as more than one instance, which in production it almost always is: two pods behind a load balancer, a blue-green deploy where old and new versions overlap for a few minutes, an autoscaler that adds a third pod on Friday evening. The `synchronized` method that guarded \"pick an available driver, then mark him busy\" still compiles, still passes every test and still runs. It just stops protecting anything, because the two instances' threads never meet on the same monitor. The only thing they share is the **database**, so that's where the coordination has to move.",
        },
        {
          type: "paragraph",
          text: "This lesson runs the same dispatch service as two separate JVM processes against PostgreSQL 16 and counts the damage, then measures each fix on the same workload: an atomic **conditional update** and its row count, **pessimistic locking** with `SELECT ... FOR UPDATE` (and what it looks like in `pg_locks` and in the row itself), `FOR NO KEY UPDATE` and why foreign keys care, **optimistic locking** with a version column, **unique constraints** as the last line of defence, what each **isolation level** does to the race, **lock timeouts**, and how MySQL's InnoDB gives a different answer to the same SQL.",
        },
        {
          type: "paragraph",
          text: "Not everything fits in a row lock, though. Picking work from a queue table without everyone fighting over the same row, making a retried request safe to run twice, and locking something that isn't a row at all are the subject of the next lesson, SKIP LOCKED Job Queues, Idempotency and Distributed Locks.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Databases solved the \"many clients, one row\" problem long before Java existed. IBM's System R (mid 1970s) introduced row-level locking and Jim Gray's work on lock granularity and transaction isolation; ANSI SQL-92 named the four isolation levels. In 1995 Berenson, Bernstein, Gray and others published *A Critique of ANSI SQL Isolation Levels*, which named the **lost update** anomaly this lesson keeps meeting and described snapshot isolation, the model PostgreSQL's and InnoDB's `REPEATABLE READ` are built on. Optimistic locking with a version counter goes back to Kung and Robinson's 1981 paper on optimistic concurrency control, and reached Java developers through Hibernate and JPA's `@Version`.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["SQL-92 (1992)", "`READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`", "The four names every driver and `@Transactional` uses"],
            ["PostgreSQL 6.5 (1999)", "MVCC and row-level locks stored in the tuple header", "Why row locks don't show up one-per-row in `pg_locks`"],
            ["JPA 1.0 (2006)", "`@Version` and `OptimisticLockException`", "The version-column pattern, built into the ORM"],
            ["PostgreSQL 9.1 (2011)", "`SERIALIZABLE` becomes true serializable (SSI)", "Catches the check-then-insert race that `REPEATABLE READ` misses"],
            ["PostgreSQL 9.3 (2013)", "`FOR NO KEY UPDATE` and `FOR KEY SHARE`; `lock_timeout`", "Foreign-key checks stop blocking on ordinary updates; bounded lock waits"],
            ["PostgreSQL 9.5 (2016)", "`SKIP LOCKED`", "Job queues on a table (next lesson)"],
            ["MySQL 8.0 (2018)", "`NOWAIT`, `SKIP LOCKED`, `performance_schema.data_locks`", "InnoDB's lock table becomes queryable like `pg_locks`"],
            ["PostgreSQL 16 / MySQL 8.0.45 (used here)", "Versions this lesson ran on", "Defaults: `read committed` in Postgres, `REPEATABLE-READ` in InnoDB"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company has one shared board of drivers, and two dispatch offices in different buildings that both assign drivers from it by phone.",
        },
        {
          type: "list",
          items: [
            "**`synchronized` is a talking stick inside one office.** Only the dispatcher holding the stick may look at the board and assign a driver. It works perfectly within the office. The other office has its own stick, so a dispatcher there can look at the same board at the same moment, see the same driver free, and assign him too.",
            "**A conditional update is a rule written on the board itself**: \"you may only write a trip next to a driver whose box still says FREE, and you must read the box as you write\". Whoever writes second finds the box already filled and picks someone else. Nobody waits; somebody occasionally retries.",
            "**`SELECT ... FOR UPDATE` is putting your hand on the driver's card while you decide.** The other office's dispatcher reaches for the same card and has to wait until you let go, and when you do, the card already says ON TRIP.",
            "**A version column is a serial number on the card.** You note \"card 7, version 0\", and when you come back to write, you only write if it still says version 0. If someone changed it in between, the number has moved on and you start again.",
            "**A unique index is the security guard at the car park** who refuses to let one car leave with two passengers' trip slips, however the offices got confused.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real dispatcher who finds the box filled just shrugs and picks another driver. In a database, what the second writer sees depends on the **isolation level**: in PostgreSQL's `READ COMMITTED` it quietly re-reads the box, in `REPEATABLE READ` it's told \"the board changed since you started, start your whole call again\", and in MySQL's `REPEATABLE READ` it can be shown two different versions of the same box in one transaction. Those differences are where most of the surprises in this lesson come from.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/locks-across-servers-two-instances.svg",
          alt: "Left, two blue boxes, one per JVM process: instance A and instance B, each with its own monitor of DispatchService. Instance A runs step 1, SELECT an available driver and gets 7, and step 3, UPDATE driver 7 with trip 1007 and INSERT trip 1007 and commit. Instance B runs step 2, the same SELECT that also returns 7, and step 4, UPDATE driver 7 with trip 2007 and INSERT trip 2007 and commit. Arrows lead from both to a middle box, PostgreSQL, the only shared thing: the drivers row for id 7 shows status ON_TRIP and trip_id 2007 because B wrote last, and a red trips box holds trip 1007 for driver 7 from instance A and trip 2007 for driver 7 from instance B. Text: both checks ran before either write, both writes succeeded, nothing failed; measured, 71 to 139 of 300 trips shared a driver across 8 runs; one instance with 8 threads, 0 of 300. Right, a green box titled move the decision into the database lists the fixes with their measured results: conditional UPDATE with WHERE id = 7 AND status = AVAILABLE, 1 row means won and 0 lost, 652 to 958 retries; SELECT FOR UPDATE, where B waits on a transactionid ShareLock that is not granted, 0 retries and waiters re-read the new row; a version column, 576 to 950 retries per instance; a partial unique index on trips driver_id where status is ASSIGNED, SQLState 23505 on the loser, 107 to 147; REPEATABLE READ or SERIALIZABLE, could not serialize access, SQLState 40001, retry the transaction. Every fix gives 300 trips, 300 drivers and 0 double assignments. A bottom panel shows what a waiting session looks like: the tuple header of row 0,7 has xmax set to A's transaction id with HEAP_XMAX_EXCL_LOCK, HEAP_XMAX_LOCK_ONLY and HEAP_KEYS_UPDATED; pg_locks shows A holding its transactionid ExclusiveLock (the row lock itself is not in pg_locks) and B holding a tuple lock on drivers 0,7 while its transactionid ShareLock is not granted; pg_stat_activity shows B waiting on Lock transactionid with pg_blocking_pids equal to A. A last line: FOR UPDATE blocks a foreign-key INSERT into trips, which needs FOR KEY SHARE; FOR NO KEY UPDATE and a plain UPDATE of status do not.",
          caption: "Each JVM has its own monitor, so synchronized orders only its own threads. The database row is the one thing both instances share, so the decision has to happen there.",
        },
        {
          type: "heading",
          text: "The fixes side by side",
        },
        {
          type: "table",
          headers: ["Fix", "SQL shape", "What the loser sees", "Measured on 2 x 150 trips"],
          rows: [
            ["None: `synchronized` check-then-act", "`SELECT` available, then `UPDATE ... WHERE id = ?`", "Nothing: both succeed", "71 to 139 drivers with two trips"],
            ["Conditional update", "`UPDATE ... WHERE id = ? AND status = 'AVAILABLE'`", "Row count 0: pick another driver", "0; 652 to 958 retries per instance"],
            ["Pessimistic lock", "`SELECT ... FOR UPDATE` in a transaction", "Waits, then reads the new row version", "0; 0 retries"],
            ["Optimistic lock", "`UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?`", "Row count 0: re-read and retry", "0; 576 to 950 retries"],
            ["Unique constraint", "Partial unique index on `trips(driver_id)`", "SQLState `23505`, transaction rolled back", "0; 107 to 147 violations"],
            ["Stricter isolation", "`REPEATABLE READ` or `SERIALIZABLE`", "SQLState `40001`, retry the whole transaction", "0; 103 to 149 failures"],
          ],
        },
        {
          type: "heading",
          text: "PostgreSQL row lock modes",
        },
        {
          type: "table",
          headers: ["Mode", "Taken by", "Conflicts with", "Typical use"],
          rows: [
            ["`FOR UPDATE`", "`SELECT ... FOR UPDATE`, `DELETE`, an `UPDATE` that changes a key column", "All four modes", "You may delete the row or change its key"],
            ["`FOR NO KEY UPDATE`", "`SELECT ... FOR NO KEY UPDATE`, ordinary `UPDATE`", "`FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`", "Claim a row whose key won't change (the usual case)"],
            ["`FOR SHARE`", "`SELECT ... FOR SHARE`", "`FOR UPDATE`, `FOR NO KEY UPDATE`", "Several readers stop anyone writing the row"],
            ["`FOR KEY SHARE`", "Foreign-key checks on the parent row", "`FOR UPDATE` only", "\"This driver must still exist while I insert a trip for him\""],
          ],
        },
        {
          type: "heading",
          text: "Isolation levels on both engines",
        },
        {
          type: "table",
          headers: ["Level", "PostgreSQL 16", "MySQL 8.0 InnoDB"],
          rows: [
            ["`READ COMMITTED`", "**Default.** Each statement sees a new snapshot; an `UPDATE` that waited re-checks its `WHERE` on the newest row version", "Same idea: each statement reads the latest committed data"],
            ["`REPEATABLE READ`", "One snapshot per transaction; writing a row someone else changed since then fails with `40001`", "**Default.** Plain `SELECT` reads the snapshot, but `UPDATE` and `FOR UPDATE` read and write the latest version, with no error"],
            ["`SERIALIZABLE`", "Snapshot plus SSI: tracks read/write dependencies and fails one transaction with `40001`", "Turns plain `SELECT`s into `FOR SHARE` locking reads"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Why the JVM's lock can't help",
        },
        {
          type: "paragraph",
          text: "A `synchronized` method locks the monitor of one object (here the `DispatchService` class object). As the synchronized and monitors lesson showed, that lock lives in the object's mark word and, when contended, in an `ObjectMonitor` in the JVM's own memory. A second JVM process loads its own `DispatchService` class into its own heap, with its own mark word. There is no API, no flag and no JVM option that makes two processes share a monitor. So the question is not \"which Java lock\" but \"which **database** lock\", and before using one it pays to see where PostgreSQL keeps it.",
        },
        {
          type: "heading",
          text: "A row lock is written into the row",
        },
        {
          type: "paragraph",
          text: "I opened three psql sessions, driven by a bash script with sleeps, each with an `application_name` so they're easy to find. Session A (instance A) locks driver 7 with `FOR UPDATE` and holds it for 4 seconds; session B (instance B) asks for the same lock a second later; session C, a second after that, looks at everything Postgres knows about the wait.",
        },
        {
          type: "code",
          language: "sql",
          title: "session A (PGAPPNAME=instance-A)",
          code: `SELECT to_char(clock_timestamp(), 'HH24:MI:SS.MS') AS t, pg_backend_pid() AS pid;
BEGIN;
SELECT id, status FROM drivers WHERE id = 7 FOR UPDATE;
SELECT pg_sleep(4);
UPDATE drivers SET status = 'ON_TRIP', trip_id = 1007 WHERE id = 7;
SELECT to_char(clock_timestamp(), 'HH24:MI:SS.MS') AS commit_at;
COMMIT;`,
        },
        {
          type: "code",
          language: "sql",
          title: "session B (PGAPPNAME=instance-B), started 1 s later",
          code: `SELECT to_char(clock_timestamp(), 'HH24:MI:SS.MS') AS t, pg_backend_pid() AS pid;
BEGIN;
SELECT id, status, trip_id FROM drivers WHERE id = 7 FOR UPDATE;
SELECT to_char(clock_timestamp(), 'HH24:MI:SS.MS') AS got_lock_at;
ROLLBACK;`,
        },
        {
          type: "code",
          language: "sql",
          title: "session C, while B waits",
          code: `SELECT application_name AS app, pid, state, wait_event_type, wait_event, pg_blocking_pids(pid) AS blocked_by, backend_xid
FROM pg_stat_activity WHERE application_name LIKE 'instance-%' ORDER BY app;

SELECT a.application_name AS app, l.locktype, l.relation::regclass AS rel, l.page, l.tuple,
       l.virtualxid AS vxid, l.transactionid AS xid, l.mode, l.granted
FROM pg_locks l JOIN pg_stat_activity a USING (pid)
WHERE a.application_name LIKE 'instance-%'
ORDER BY app, l.granted DESC, l.locktype, rel;

SELECT * FROM pgrowlocks('drivers');                       -- CREATE EXTENSION pgrowlocks

WITH me AS (SELECT ctid, (ctid::text::point)[0]::int AS blk, (ctid::text::point)[1]::int AS lp FROM drivers WHERE id = 7)
SELECT me.ctid, h.t_xmin, h.t_xmax, (heap_tuple_infomask_flags(h.t_infomask, h.t_infomask2)).raw_flags
FROM me, heap_page_items(get_raw_page('drivers', me.blk)) h WHERE h.lp = me.lp;   -- CREATE EXTENSION pageinspect`,
        },
        {
          type: "paragraph",
          text: "What A and B printed (trimmed to the result rows):",
        },
        {
          type: "output",
          text: `-- session A
      t       | pid
--------------+------
 19:36:41.770 | 1162
 id |  status
----+-----------
  7 | AVAILABLE
  commit_at
--------------
 19:36:45.776

-- session B
      t       | pid
--------------+------
 19:36:42.796 | 1168
 id | status  | trip_id
----+---------+---------
  7 | ON_TRIP |    1007
 got_lock_at
--------------
 19:36:45.779`,
        },
        {
          type: "paragraph",
          text: "And what session C saw while B was stuck:",
        },
        {
          type: "output",
          text: `    app     | pid  | state  | wait_event_type |  wait_event   | blocked_by | backend_xid
------------+------+--------+-----------------+---------------+------------+-------------
 instance-A | 1162 | active | Timeout         | PgSleep       | {}         |       38472
 instance-B | 1168 | active | Lock            | transactionid | {1162}     |
(2 rows)

    app     |   locktype    |     rel      | page | tuple |  vxid  |  xid  |        mode         | granted
------------+---------------+--------------+------+-------+--------+-------+---------------------+---------
 instance-A | relation      | drivers      |      |       |        |       | RowShareLock        | t
 instance-A | relation      | drivers_pkey |      |       |        |       | RowShareLock        | t
 instance-A | transactionid |              |      |       |        | 38472 | ExclusiveLock       | t
 instance-A | virtualxid    |              |      |       | 4/4403 |       | ExclusiveLock       | t
 instance-B | relation      | drivers      |      |       |        |       | RowShareLock        | t
 instance-B | relation      | drivers_pkey |      |       |        |       | RowShareLock        | t
 instance-B | tuple         | drivers      |    0 |     7 |        |       | AccessExclusiveLock | t
 instance-B | virtualxid    |              |      |       | 5/4243 |       | ExclusiveLock       | t
 instance-B | transactionid |              |      |       |        | 38472 | ShareLock           | f
(9 rows)

 locked_row | locker | multi |  xids   |     modes      |  pids
------------+--------+-------+---------+----------------+--------
 (0,7)      |  38472 | f     | {38472} | {"For Update"} | {1162}
(1 row)

 ctid  | t_xmin | t_xmax |                                                   raw_flags
-------+--------+--------+---------------------------------------------------------------------------------------------------------------
 (0,7) |  38470 |  38472 | {HEAP_HASNULL,HEAP_HASVARWIDTH,HEAP_XMAX_EXCL_LOCK,HEAP_XMAX_LOCK_ONLY,HEAP_XMIN_COMMITTED,HEAP_KEYS_UPDATED}
(1 row)`,
        },
        {
          type: "list",
          items: [
            "**The row lock is not in `pg_locks`.** A holds only table-level `RowShareLock`s (the mode any `SELECT ... FOR UPDATE` takes on the table and the index it used) and an `ExclusiveLock` on its own transaction ID, 38472. There is no \"row 7\" entry. Postgres stores the row lock **in the row**: the last query shows the tuple at `(0,7)` with `t_xmax = 38472` and the flags `HEAP_XMAX_LOCK_ONLY` (xmax means \"locked by\", not \"deleted by\") and `HEAP_XMAX_EXCL_LOCK` (exclusive). `HEAP_KEYS_UPDATED` is how a `FOR UPDATE` lock is told apart from a weaker `FOR NO KEY UPDATE`. That's why locking a million rows doesn't need a million entries in shared memory: the shared lock table only holds what is being **waited** for.",
            "**Locking a row gave A a transaction ID.** A plain `SELECT` doesn't need one, but writing xmax does: `backend_xid` is 38472 for A.",
            "**B waits for A's transaction, not for the row.** B's ungranted lock is a `ShareLock` on `transactionid 38472`, A's ID: \"wake me when that transaction ends\". The granted `tuple` lock on `drivers (0,7)` marks B as first in line for that particular row, so a third session asking for the same row queues behind B instead of racing it.",
            "**`pg_stat_activity` tells the same story in one line:** B's `wait_event_type` is `Lock`, `wait_event` is `transactionid`, and `pg_blocking_pids(1168)` is `{1162}`. In production that's the first query to run when requests hang.",
            "**`pgrowlocks` decodes the tuple header for you:** row `(0,7)`, locker 38472, mode `For Update`, pid 1162. It reads the table's pages, so it's slow on big tables, but it's the only way to list row locks.",
            "**B got the lock 3 ms after A committed** (45.776 to 45.779), almost 3 seconds after asking for it, and it saw **A's new version**: `ON_TRIP`, trip 1007. In `READ COMMITTED`, a statement that waited for a row lock re-reads the newest version of that row before returning it. That re-check is what makes every fix in this lesson work.",
          ],
        },
        {
          type: "heading",
          text: "Where LockRows sits in the plan",
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN (COSTS OFF) SELECT id FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1 FOR UPDATE;
EXPLAIN (COSTS OFF) UPDATE drivers SET status = 'ON_TRIP', trip_id = 1000 WHERE id = 1 AND status = 'AVAILABLE';`,
        },
        {
          type: "output",
          text: `                      QUERY PLAN
------------------------------------------------------
 Limit
   ->  LockRows
         ->  Index Scan using drivers_pkey on drivers
               Filter: (status = 'AVAILABLE'::text)
(4 rows)

                   QUERY PLAN
------------------------------------------------
 Update on drivers
   ->  Index Scan using drivers_pkey on drivers
         Index Cond: (id = 1)
         Filter: (status = 'AVAILABLE'::text)
(4 rows)`,
        },
        {
          type: "list",
          items: [
            "**`LockRows` is a plan node, below `Limit`.** The index scan produces candidate rows in `id` order; `LockRows` locks each one, and if it had to wait and the row changed meanwhile, it re-evaluates the `Filter` on the new version. A row that no longer says `AVAILABLE` is dropped, and the scan simply continues to the next one. `Limit` sees only rows that were locked **and** still match. That's why the `FOR UPDATE` version of the dispatch code below never got an empty result while drivers were left.",
            "**The conditional `UPDATE` has the same check built into the write.** The `Filter: (status = 'AVAILABLE')` is evaluated on the row the update is about to change; if it had to wait for another transaction's lock, Postgres re-runs the filter on the committed new version (the executor calls this EvalPlanQual). A row that stopped matching is skipped, and the statement reports `UPDATE 0`.",
          ],
        },
        {
          type: "heading",
          text: "The defaults that decide how long anyone waits",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT name, setting, unit FROM pg_settings
WHERE name IN ('default_transaction_isolation','lock_timeout','statement_timeout','deadlock_timeout',
               'idle_in_transaction_session_timeout','log_lock_waits','max_locks_per_transaction')
ORDER BY name;`,
        },
        {
          type: "output",
          text: `                name                 |    setting     | unit
-------------------------------------+----------------+------
 deadlock_timeout                    | 1000           | ms
 default_transaction_isolation       | read committed |
 idle_in_transaction_session_timeout | 0              | ms
 lock_timeout                        | 0              | ms
 log_lock_waits                      | off            |
 max_locks_per_transaction           | 64             |
 statement_timeout                   | 0              | ms
(7 rows)`,
        },
        {
          type: "paragraph",
          text: "Out of the box, PostgreSQL 16 waits for a lock **forever** (`lock_timeout = 0`), lets a statement run forever (`statement_timeout = 0`), lets a session sit idle inside an open transaction holding its locks forever, and logs none of it (`log_lock_waits = off`). Only deadlocks are detected, after `deadlock_timeout` (1 s) of waiting. Every one of those zeros is a production decision someone has to make; the lock-timeout section below measures the options.",
        },
      ],
    },
    {
      title: "The Bug: a synchronized Check-Then-Act in Two Processes",
      blocks: [
        {
          type: "paragraph",
          text: "The dispatch service below is one instance of the service. Each instance runs four request threads with their own JDBC connection; each thread takes trip IDs from a shared counter and assigns a driver to each. \"Nearest available driver\" is simulated by the lowest available `id`, so both instances want the same driver at the same moment, which is exactly what happens at a busy pickup point. The original method, `assignSynchronized`, is a check-then-act inside `synchronized`. The other methods are the fixes measured in the following sections; the first argument picks one.",
        },
        {
          type: "code",
          language: "sql",
          title: "schema.sql",
          code: `DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS wallets;
CREATE TABLE drivers (
    id       int PRIMARY KEY,
    name     text NOT NULL,
    status   text NOT NULL DEFAULT 'AVAILABLE',   -- AVAILABLE | ON_TRIP
    trip_id  bigint,
    version  int  NOT NULL DEFAULT 0
);
CREATE TABLE trips (
    id        bigint PRIMARY KEY,
    driver_id int REFERENCES drivers(id),
    status    text NOT NULL DEFAULT 'ASSIGNED',
    instance  text NOT NULL
);
CREATE TABLE wallets (
    rider_id int PRIMARY KEY,
    balance  int NOT NULL
);
INSERT INTO drivers (id, name) SELECT g, 'driver-' || g FROM generate_series(1, 300) g;
INSERT INTO wallets VALUES (1, 10000);`,
        },
        {
          type: "code",
          language: "java",
          title: "DispatchService.java",
          code: `import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.concurrent.atomic.AtomicInteger;

// One instance of the dispatch service. Run two of these as separate JVM processes.
// args: strategy instanceName startAtEpochMillis tripsPerInstance threads [jdbcUrl]
public class DispatchService {
    static String url = "jdbc:postgresql://localhost:55432/locks_across_servers";
    static final AtomicInteger assigned = new AtomicInteger(), retries = new AtomicInteger(),
            emptyLocks = new AtomicInteger(), uniqueViolations = new AtomicInteger(),
            serializationFailures = new AtomicInteger(), noDriver = new AtomicInteger();

    static Connection connect() throws SQLException {
        return DriverManager.getConnection(url, url.contains("mysql") ? "root" : "postgres", "lesson");
    }

    static Integer firstAvailable(Connection c, String suffix) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT id FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1" + suffix);
             ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getInt(1) : null;
        }
    }

    static void insertTrip(Connection c, long tripId, int driverId, String instance) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO trips (id, driver_id, instance) VALUES (?, ?, ?)")) {
            ps.setLong(1, tripId);
            ps.setInt(2, driverId);
            ps.setString(3, instance);
            ps.executeUpdate();
        }
    }

    static int update(Connection c, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) ps.setObject(i + 1, params[i]);
            return ps.executeUpdate();
        }
    }

    // The original code: check, then act, inside synchronized. Safe in ONE JVM only.
    static synchronized boolean assignSynchronized(Connection c, long tripId, String instance) throws SQLException {
        Integer driver = firstAvailable(c, "");                                    // check
        if (driver == null) return false;
        update(c, "UPDATE drivers SET status = 'ON_TRIP', trip_id = ? WHERE id = ?", tripId, driver);   // act
        insertTrip(c, tripId, driver, instance);
        c.commit();
        return true;
    }

    // Fix 1: the check moves into the UPDATE's WHERE clause; the row count says who won
    static boolean assignConditional(Connection c, long tripId, String instance) throws SQLException {
        while (true) {
            Integer driver = firstAvailable(c, "");
            if (driver == null) return false;
            int rows = update(c, "UPDATE drivers SET status = 'ON_TRIP', trip_id = ? WHERE id = ? AND status = 'AVAILABLE'",
                    tripId, driver);
            if (rows == 1) {
                insertTrip(c, tripId, driver, instance);
                c.commit();
                return true;
            }
            c.rollback();
            retries.incrementAndGet();                                             // someone else got him first
        }
    }

    // Fix 2: pessimistic, lock the row while reading it
    static boolean assignForUpdate(Connection c, long tripId, String instance) throws SQLException {
        while (true) {
            Integer driver = firstAvailable(c, " FOR UPDATE");
            if (driver == null) {
                c.rollback();
                if (firstAvailable(c, "") == null) { c.rollback(); return false; }
                emptyLocks.incrementAndGet();                                      // the locked row stopped matching
                continue;
            }
            update(c, "UPDATE drivers SET status = 'ON_TRIP', trip_id = ? WHERE id = ?", tripId, driver);
            insertTrip(c, tripId, driver, instance);
            c.commit();
            return true;
        }
    }

    // Fix 3: optimistic, a version column and retry
    static boolean assignOptimistic(Connection c, long tripId, String instance) throws SQLException {
        while (true) {
            int driver, version;
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT id, version FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1");
                 ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) { c.rollback(); return false; }
                driver = rs.getInt(1);
                version = rs.getInt(2);
            }
            int rows = update(c, "UPDATE drivers SET status = 'ON_TRIP', trip_id = ?, version = version + 1 WHERE id = ? AND version = ?",
                    tripId, driver, version);
            if (rows == 1) {
                insertTrip(c, tripId, driver, instance);
                c.commit();
                return true;
            }
            c.rollback();
            retries.incrementAndGet();
        }
    }

    // The synchronized code again, but with a stricter isolation level or a unique index behind it
    static boolean assignWithRetry(Connection c, long tripId, String instance) throws SQLException {
        while (true) {
            try {
                return assignSynchronized(c, tripId, instance);
            } catch (SQLException e) {
                c.rollback();
                String state = e.getSQLState();
                if ("40001".equals(state)) serializationFailures.incrementAndGet();
                else if ("23505".equals(state) || "23000".equals(state)) uniqueViolations.incrementAndGet();
                else throw e;
                retries.incrementAndGet();
            }
        }
    }

    public static void main(String[] args) throws Exception {
        String strategy = args[0], instance = args[1];
        long startAt = Long.parseLong(args[2]);
        int trips = Integer.parseInt(args[3]), threads = Integer.parseInt(args[4]);
        if (args.length > 5) url = args[5];
        int isolation = switch (strategy) {
            case "repeatable-read" -> Connection.TRANSACTION_REPEATABLE_READ;
            case "serializable" -> Connection.TRANSACTION_SERIALIZABLE;
            default -> Connection.TRANSACTION_READ_COMMITTED;
        };
        long base = instance.equals("A") ? 1_000 : 2_000;            // trip ids don't collide between instances
        AtomicInteger next = new AtomicInteger();
        Thread[] ts = new Thread[threads];
        for (int t = 0; t < threads; t++) {
            ts[t] = Thread.ofPlatform().name(instance + "-http-" + t).unstarted(() -> {
                try (Connection c = connect()) {
                    c.setAutoCommit(false);
                    c.setTransactionIsolation(isolation);
                    while (System.currentTimeMillis() < startAt) Thread.sleep(1);
                    int k;
                    while ((k = next.getAndIncrement()) < trips) {
                        long tripId = base + k;
                        boolean ok = switch (strategy) {
                            case "synchronized" -> assignSynchronized(c, tripId, instance);
                            case "conditional" -> assignConditional(c, tripId, instance);
                            case "for-update" -> assignForUpdate(c, tripId, instance);
                            case "optimistic" -> assignOptimistic(c, tripId, instance);
                            default -> assignWithRetry(c, tripId, instance);   // unique-index, repeatable-read, serializable
                        };
                        if (ok) assigned.incrementAndGet(); else noDriver.incrementAndGet();
                    }
                } catch (Exception e) {
                    System.out.println(Thread.currentThread().getName() + " failed: " + e);
                }
            });
        }
        for (Thread t : ts) t.start();
        long t0 = System.nanoTime();
        for (Thread t : ts) t.join();
        long ms = (System.currentTimeMillis() - startAt);
        System.out.printf("instance %s %-15s assigned %d, no driver %d, retries %d, empty FOR UPDATE %d, 23505 %d, 40001 %d, %d ms%n",
                instance, strategy, assigned.get(), noDriver.get(), retries.get(), emptyLocks.get(),
                uniqueViolations.get(), serializationFailures.get(), ms);
    }
}`,
        },
        {
          type: "paragraph",
          text: "A small script resets the tables, starts **two separate JVM processes** (`-Xmx64m` each) that both begin at the same wall-clock instant, and then counts trips, drivers used and drivers with more than one trip:",
        },
        {
          type: "code",
          language: "bash",
          title: "run-two.sh",
          code: `#!/bin/bash
# Usage: run-two.sh <strategy> [trips-per-instance] [threads]
S=$1; N=\${2:-150}; T=\${3:-4}
PG=~/.m2/repository/org/postgresql/postgresql/42.7.14/postgresql-42.7.14.jar
docker exec -i lesson-pg psql -q -U postgres -d locks_across_servers -c \\
  "TRUNCATE trips; UPDATE drivers SET status = 'AVAILABLE', trip_id = NULL, version = 0; UPDATE wallets SET balance = 10000;"
START=$(( $(date +%s%3N) + 1500 ))
java -Xmx64m -cp $PG:. DispatchService $S A $START $N $T > a.out &
java -Xmx64m -cp $PG:. DispatchService $S B $START $N $T > b.out &
wait
cat a.out b.out
docker exec -i lesson-pg psql -U postgres -d locks_across_servers -c "
SELECT count(*) AS trips,
       count(DISTINCT driver_id) AS drivers_used,
       count(*) - count(DISTINCT driver_id) AS double_assigned,
       (SELECT count(*) FROM drivers WHERE status = 'AVAILABLE') AS still_available
FROM trips;"`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -cp postgresql-42.7.14.jar DispatchService.java && ./run-two.sh synchronized",
        },
        {
          type: "output",
          text: `instance A synchronized    assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 4347 ms
instance B synchronized    assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 4477 ms
 trips | drivers_used | double_assigned | still_available
-------+--------------+-----------------+-----------------
   300 |          191 |             109 |             109
(1 row)`,
        },
        {
          type: "paragraph",
          text: "Both instances reported 150 successful assignments and no errors. The database disagrees: 300 trips went to only 191 drivers, so **109 drivers were sent to two riders at once**, and 109 drivers who should be working were still sitting `AVAILABLE`. Looking at the damaged rows after another run:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT t.driver_id, array_agg(t.id ORDER BY t.id) AS trip_ids, array_agg(t.instance ORDER BY t.id) AS instances,
       d.status, d.trip_id AS driver_row_says
FROM trips t JOIN drivers d ON d.id = t.driver_id
GROUP BY t.driver_id, d.status, d.trip_id HAVING count(*) > 1 ORDER BY t.driver_id LIMIT 5;`,
        },
        {
          type: "output",
          text: ` driver_id |  trip_ids   | instances | status  | driver_row_says
-----------+-------------+-----------+---------+-----------------
         1 | {1000,2000} | {A,B}     | ON_TRIP |            2000
         3 | {1003,2003} | {A,B}     | ON_TRIP |            2003
         4 | {1006,2005} | {A,B}     | ON_TRIP |            2005
         6 | {1008,2006} | {A,B}     | ON_TRIP |            2006
         7 | {1002,2007} | {A,B}     | ON_TRIP |            2007
(5 rows)`,
        },
        {
          type: "paragraph",
          text: "Every pair is one trip from A and one from B: never two from the same instance, because inside one JVM `synchronized` did its job. The driver row remembers only the last writer (`driver_row_says` is always B's trip here), so A's rider is waiting for a driver whose app shows somebody else's pickup. That is a **lost update**: A's write to the driver row was silently overwritten. As a control, I ran a **single** instance with eight threads and all 300 trips:",
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx64m -cp postgresql-42.7.14.jar:. DispatchService synchronized A $(( $(date +%s%3N) + 500 )) 300 8",
        },
        {
          type: "output",
          text: `instance A synchronized    assigned 300, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 6092 ms
 trips | drivers_used | double_assigned | still_available
-------+--------------+-----------------+-----------------
   300 |          300 |               0 |               0
(1 row)`,
        },
        {
          type: "list",
          items: [
            "**One JVM, any number of threads: 0 double bookings.** Two JVMs: 109, 100 and 71 in the first three runs, 124, 130, 139, 134 and 129 later, so between 71 and 139 out of 300 in eight runs. The code didn't change; the deployment did.",
            "**Why so many?** Each check-then-act is two round trips to the database (plus a commit) with nothing held in between. Both instances look for the lowest available `id` at nearly the same moment, both get the same answer, and both write. The `synchronized` serialises each instance's own four threads, which makes each instance a single fast loop chasing the other.",
            "**Nothing fails.** No exception, no constraint violation, no log line. The only symptom is in the data: two trips for one driver and drivers who never got a ride. In production that shows up as rider complaints, not alerts.",
            "**`synchronized` also cost throughput.** All four threads of an instance queue on one monitor, so only one assignment per instance is in flight at a time. The timings in these runs varied a lot (575 ms to 4.5 s for the same 150 trips) because other agents were benchmarking on the same machine; the counts were what mattered.",
          ],
        },
      ],
    },
    {
      title: "Fix 1: the Atomic Conditional UPDATE",
      blocks: [
        {
          type: "paragraph",
          text: "The smallest fix moves the check into the write. `assignConditional` still reads a candidate driver, but its `UPDATE` only changes the row if it **still** says `AVAILABLE`, and the returned row count tells the caller who won: 1 means this instance claimed the driver, 0 means another instance got there first, so roll back and pick again. No `synchronized`, no explicit lock.",
        },
        {
          type: "code",
          language: "java",
          title: "the heart of assignConditional",
          code: `int rows = update(c, "UPDATE drivers SET status = 'ON_TRIP', trip_id = ? WHERE id = ? AND status = 'AVAILABLE'",
        tripId, driver);
if (rows == 1) { insertTrip(c, tripId, driver, instance); c.commit(); return true; }
c.rollback();
retries.incrementAndGet();          // someone else got him first: read again and retry`,
        },
        {
          type: "code",
          language: "bash",
          code: "./run-two.sh conditional",
        },
        {
          type: "output",
          text: `instance A conditional     assigned 150, no driver 0, retries 933, empty FOR UPDATE 0, 23505 0, 40001 0, 839 ms
instance B conditional     assigned 150, no driver 0, retries 947, empty FOR UPDATE 0, 23505 0, 40001 0, 844 ms
 trips | drivers_used | double_assigned | still_available
-------+--------------+-----------------+-----------------
   300 |          300 |               0 |               0
(1 row)`,
        },
        {
          type: "list",
          items: [
            "**300 trips, 300 drivers, 0 double bookings**, in this run and in all four runs I made of it.",
            "**Why it's safe:** the `UPDATE` takes a row lock before changing the row. If the other instance's `UPDATE` holds that lock, this one waits; when the other commits, Postgres re-evaluates `status = 'AVAILABLE'` on the new version (the `Filter` in the plan above), finds `ON_TRIP`, skips the row and returns `UPDATE 0`. The check and the write happen under the same row lock, so there is no gap between them for the other instance to slip into.",
            "**The cost is retries, not waiting.** 933 and 947 lost races for 150 assignments each, because eight threads in two instances all chased the same lowest `id`. Most retries were cheap (the row was already `ON_TRIP` when the update looked at it, so it didn't wait at all). With real \"nearest driver\" queries, candidates spread out and retries drop; the next lesson's `SKIP LOCKED` removes most of them.",
            "**Check the row count.** `executeUpdate` returns it; ignoring it turns this fix back into the bug, because a conditional `UPDATE` that matched nothing is not an error.",
            "**It also ran without `synchronized`**, so all four threads per instance worked in parallel: 839 ms here, against 575 ms to 4.5 s for the broken version on the same noisy machine.",
          ],
        },
      ],
    },
    {
      title: "Fix 2: SELECT ... FOR UPDATE (Pessimistic Locking)",
      blocks: [
        {
          type: "paragraph",
          text: "Pessimistic locking takes the lock **while reading**, so nobody else can change the row between the read and the write. `assignForUpdate` runs the same `SELECT` with `FOR UPDATE` appended, inside a transaction, then writes and commits. The lock is held until commit or rollback. I also counted how often the locking `SELECT` came back empty while drivers were still available, in case a locked row that stopped matching made `LIMIT 1` return nothing.",
        },
        {
          type: "code",
          language: "bash",
          code: "./run-two.sh for-update",
        },
        {
          type: "output",
          text: `instance A for-update      assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 1099 ms
instance B for-update      assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 1166 ms
 trips | drivers_used | double_assigned | still_available
-------+--------------+-----------------+-----------------
   300 |          300 |               0 |               0
(1 row)`,
        },
        {
          type: "list",
          items: [
            "**0 double bookings and 0 retries.** Where the conditional update lost races and retried, `FOR UPDATE` made the losers **wait**: a thread that wanted driver 12 while another held him parked on the other transaction's ID (the `transactionid ShareLock` in `pg_locks`), and when it woke, `LockRows` re-checked `status`, dropped the row and moved on to driver 13 within the same statement.",
            "**No empty results.** Here the index scan delivers rows in `id` order below `LockRows`, so a row rejected after the wait is simply replaced by the next one. The PostgreSQL docs do warn that with `ORDER BY` and a locking clause, rows can come back out of order when the sort runs before the lock and the sort column changes while waiting. Check `EXPLAIN` for your own query before relying on this.",
            "**The lock lives as long as the transaction.** That's the price: anything slow between `SELECT ... FOR UPDATE` and `COMMIT` (a call to the maps API to compute an ETA, a payment pre-authorisation, a retry loop with sleeps) makes every other instance that wants that driver wait for it. Keep the locked section to the reads and writes that need it, and nothing else.",
            "**Lock rows in a consistent order** if a transaction locks more than one (always by `id`, for example). Two instances locking drivers 5 and 9 in opposite orders deadlock; Postgres detects that after `deadlock_timeout` and kills one with SQLState `40P01`.",
          ],
        },
      ],
    },
    {
      title: "FOR UPDATE vs FOR NO KEY UPDATE and Foreign Keys",
      blocks: [
        {
          type: "paragraph",
          text: "`trips.driver_id` references `drivers(id)`. To insert a trip, Postgres must make sure the driver row exists and can't be deleted (or have its `id` changed) before the insert commits, so the foreign-key check takes a `FOR KEY SHARE` lock on the driver row. `FOR KEY SHARE` conflicts with only one mode: `FOR UPDATE`. I locked driver 9 three different ways in session A for 3 seconds, and had session B insert a trip for driver 9 with `lock_timeout = '1s'`:",
        },
        {
          type: "code",
          language: "sql",
          title: "session A, one of three statements",
          code: `BEGIN;
SELECT id FROM drivers WHERE id = 9 FOR UPDATE;          -- run 1
-- SELECT id FROM drivers WHERE id = 9 FOR NO KEY UPDATE; -- run 2
-- UPDATE drivers SET status = 'ON_TRIP' WHERE id = 9;    -- run 3
SELECT pg_sleep(3);
COMMIT;`,
        },
        {
          type: "code",
          language: "sql",
          title: "session B, 0.5 s later (\\timing on)",
          code: `SET lock_timeout = '1s';
BEGIN;
INSERT INTO trips (id, driver_id, instance) VALUES (5001, 9, 'B');
SELECT pg_sleep(1.5);
COMMIT;`,
        },
        {
          type: "code",
          language: "sql",
          title: "session C, 1.2 s after A started",
          code: "SELECT locked_row, multi, modes, pids FROM pgrowlocks('drivers');",
        },
        {
          type: "output",
          text: `######## run 1: A holds FOR UPDATE
--- B
INSERT INTO trips (id, driver_id, instance) VALUES (5001, 9, 'B');
ERROR:  canceling statement due to lock timeout
CONTEXT:  while locking tuple (0,9) in relation "drivers"
SQL statement "SELECT 1 FROM ONLY "public"."drivers" x WHERE "id" OPERATOR(pg_catalog.=) $1 FOR KEY SHARE OF x"
Time: 1001.577 ms (00:01.002)
--- C
 (0,9)      | f     | {"For Update"} | {1329}

######## run 2: A holds FOR NO KEY UPDATE
--- B
INSERT INTO trips (id, driver_id, instance) VALUES (5002, 9, 'B');
INSERT 0 1
Time: 3.122 ms
--- C
 (0,9)      | t     | {"For No Key Update","Key Share"} | {1357,1365}

######## run 3: A ran a plain UPDATE of status
--- B
INSERT INTO trips (id, driver_id, instance) VALUES (5003, 9, 'B');
INSERT 0 1
Time: 1.349 ms
--- C
 (0,9)      | t     | {"No Key Update","Key Share"} | {1381,1389}`,
        },
        {
          type: "list",
          items: [
            "**`FOR UPDATE` blocked an unrelated insert.** B wasn't touching the driver row at all; it was inserting a trip. The `CONTEXT` line shows the hidden query the foreign-key trigger ran: `SELECT 1 FROM ONLY \"public\".\"drivers\" x WHERE \"id\" = $1 FOR KEY SHARE OF x`. It waited the full second and failed. Without `lock_timeout` it would have waited the whole 3 seconds A held the lock.",
            "**`FOR NO KEY UPDATE` let the insert through in 3 ms.** It promises not to delete the row or change its key, which is all the foreign key cares about. `pgrowlocks` then showed **two lockers on one row**: `multi = t`, modes `For No Key Update` and `Key Share`, two pids. When more than one transaction locks a row, the tuple's xmax can't hold both IDs, so Postgres stores a **MultiXact** ID there, pointing to a list of members in `pg_multixact`.",
            "**A plain `UPDATE` that doesn't touch a key column takes `FOR NO KEY UPDATE` automatically** (run 3: `No Key Update`), which is why ordinary updates of a parent row stopped blocking child inserts in 9.3.",
            "**Rule of thumb:** if you lock a row only to update non-key columns (status, trip, version, balance), use `FOR NO KEY UPDATE`. Reach for `FOR UPDATE` only if the transaction may delete the row or change its key. In the dispatch code, swapping one for the other changes nothing for driver claims, but it stops claims from stalling trip inserts and payout rows that reference the same driver.",
          ],
        },
      ],
    },
    {
      title: "Fix 3: Optimistic Locking with a Version Column",
      blocks: [
        {
          type: "paragraph",
          text: "Optimistic locking takes no lock while reading. It reads the row and its `version`, does its work, and writes only if the version is unchanged, bumping it at the same time. It's a compare-and-set on a row, the database twin of the CAS loop from the atomics lesson. JPA's `@Version` generates exactly this `UPDATE ... WHERE id = ? AND version = ?` and throws `OptimisticLockException` when the row count is 0.",
        },
        {
          type: "code",
          language: "java",
          title: "the heart of assignOptimistic",
          code: `// read: SELECT id, version FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1
int rows = update(c, "UPDATE drivers SET status = 'ON_TRIP', trip_id = ?, version = version + 1 WHERE id = ? AND version = ?",
        tripId, driver, version);
if (rows == 1) { insertTrip(c, tripId, driver, instance); c.commit(); return true; }
c.rollback();
retries.incrementAndGet();          // the version moved on: read again`,
        },
        {
          type: "code",
          language: "bash",
          code: "./run-two.sh optimistic",
        },
        {
          type: "output",
          text: `instance A optimistic      assigned 150, no driver 0, retries 635, empty FOR UPDATE 0, 23505 0, 40001 0, 1556 ms
instance B optimistic      assigned 150, no driver 0, retries 749, empty FOR UPDATE 0, 23505 0, 40001 0, 1692 ms
 trips | drivers_used | double_assigned | still_available
-------+--------------+-----------------+-----------------
   300 |          300 |               0 |               0
(1 row)`,
        },
        {
          type: "list",
          items: [
            "**0 double bookings, 635 and 749 retries.** Across four runs, 576 to 950 retries per instance: the same order as the conditional update, because under this much contention both are \"lose the race, read again\".",
            "**How it differs from the conditional update:** the conditional update checks the **business condition** (`status = 'AVAILABLE'`), the version check detects **any** change to the row since it was read, even one that wouldn't matter (a rating update, a location ping written to the same row). That makes it general: an edit screen for a driver's profile can use it without knowing which fields conflict. It also means more false conflicts on hot rows.",
            "**It needs every writer to bump the version.** A batch job or a SQL console `UPDATE` that changes the row without `version = version + 1` is invisible to the check and can be silently overwritten.",
            "**It shines when conflicts are rare and the work between read and write is long** (a user editing a form for a minute): nothing is locked during that minute. Under heavy contention on a few hot rows, pessimistic locking or a conditional update wastes less work.",
          ],
        },
      ],
    },
    {
      title: "Fix 4: Unique Constraints as the Last Line of Defence",
      blocks: [
        {
          type: "paragraph",
          text: "A constraint doesn't prevent the race; it makes the database refuse the result. \"A driver has at most one active trip\" is a partial unique index: unique on `driver_id`, but only for rows whose status is `ASSIGNED`, so finished trips don't count. I added it and ran the **original, broken** `synchronized` code again, retrying the whole transaction when the insert fails with SQLState `23505` (unique violation):",
        },
        {
          type: "code",
          language: "sql",
          code: "CREATE UNIQUE INDEX trips_one_active_trip_per_driver ON trips (driver_id) WHERE status = 'ASSIGNED';",
        },
        {
          type: "code",
          language: "bash",
          code: "./run-two.sh unique-index",
        },
        {
          type: "output",
          text: `instance A unique-index    assigned 150, no driver 0, retries 107, empty FOR UPDATE 0, 23505 107, 40001 0, 1630 ms
instance B unique-index    assigned 150, no driver 0, retries 132, empty FOR UPDATE 0, 23505 132, 40001 0, 1748 ms
 trips | drivers_used | double_assigned | still_available
-------+--------------+-----------------+-----------------
   300 |          300 |               0 |               0
(1 row)`,
        },
        {
          type: "list",
          items: [
            "**The broken code became correct.** Every race that used to produce a double booking now ended in `23505` for the second inserter: 107 and 132 here, 116 to 147 per instance in three more runs. Because the insert is in the same transaction as the driver `UPDATE`, the rollback also undid the overwrite of the driver row, and the retry picked a fresh driver.",
            "**Why it holds across instances:** the second inserter finds the first one's uncommitted index entry for the same `driver_id` and waits on that transaction's ID; when the first commits, the second fails with `23505` (if the first rolled back, it would proceed). It's the same kind of transaction-ID wait as a row lock, but on a value that didn't exist yet, which no `SELECT ... FOR UPDATE` can lock.",
            "**It's a safety net, not the design.** It turns a silent data bug into a loud error, but every caught race is a wasted transaction. Keep it even after fixing the logic: it catches the batch job, the second code path and the future refactor nobody reviewed.",
            "**Adding it to a table that already has duplicates fails.** The production section shows `CREATE UNIQUE INDEX CONCURRENTLY` failing on existing double bookings and leaving an invalid index behind.",
          ],
        },
      ],
    },
    {
      title: "Isolation Levels: Re-check, 40001 and SERIALIZABLE",
      blocks: [
        {
          type: "paragraph",
          text: "Could a stricter isolation level have fixed the original code without touching the SQL? I stepped two connections (\"instance A\" and \"instance B\") through each level by hand, in one JVM, printing what each saw. The first three cases write the same driver row; the last two never write a shared row at all: each checks for an active trip for driver 21 and inserts its own.",
        },
        {
          type: "code",
          language: "java",
          title: "IsolationDemo.java",
          code: `import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.concurrent.CompletableFuture;

// Two connections, one per "instance", stepping through each isolation level by hand
public class IsolationDemo {
    static final String URL = "jdbc:postgresql://localhost:55432/locks_across_servers";
    static final long T0 = System.nanoTime();

    static void log(String who, String what) {
        System.out.printf("%5d ms  %s  %s%n", (System.nanoTime() - T0) / 1_000_000, who, what);
    }

    static Connection open(int isolation) throws SQLException {
        Connection c = DriverManager.getConnection(URL, "postgres", "lesson");
        c.setAutoCommit(false);
        c.setTransactionIsolation(isolation);
        return c;
    }

    static String status(Connection c, int driver) throws SQLException {
        try (Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT status, trip_id FROM drivers WHERE id = " + driver)) {
            rs.next();
            return rs.getString(1) + " trip " + rs.getObject(2);
        }
    }

    static int exec(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement()) { return s.executeUpdate(sql); }
    }

    static void reset(int driver) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL, "postgres", "lesson"); Statement s = c.createStatement()) {
            s.executeUpdate("UPDATE drivers SET status = 'AVAILABLE', trip_id = NULL WHERE id = " + driver);
            s.executeUpdate("DELETE FROM trips WHERE driver_id = " + driver);
        }
    }

    // Both instances read the driver as AVAILABLE, then both write
    static void readThenWrite(String level, int isolation, String whereExtra) throws Exception {
        int d = 20;
        reset(d);
        System.out.println("== " + level + (whereExtra.isEmpty() ? ", plain UPDATE" : ", UPDATE ... " + whereExtra));
        try (Connection a = open(isolation); Connection b = open(isolation)) {
            log("A", "reads driver 20: " + status(a, d));
            log("B", "reads driver 20: " + status(b, d));
            log("A", "UPDATE rows=" + exec(a, "UPDATE drivers SET status = 'ON_TRIP', trip_id = 1001 WHERE id = 20" + whereExtra));
            CompletableFuture<String> bWrite = CompletableFuture.supplyAsync(() -> {
                try {
                    int rows = exec(b, "UPDATE drivers SET status = 'ON_TRIP', trip_id = 2001 WHERE id = 20" + whereExtra);
                    return "UPDATE rows=" + rows;
                } catch (SQLException e) {
                    return "ERROR " + e.getSQLState() + ": " + e.getMessage().lines().findFirst().orElse("");
                }
            });
            Thread.sleep(300);
            log("B", "UPDATE still waiting: " + !bWrite.isDone());
            a.commit();
            log("A", "COMMIT");
            log("B", bWrite.get());
            try { b.commit(); log("B", "COMMIT"); } catch (SQLException e) { log("B", "COMMIT failed " + e.getSQLState()); }
        }
        try (Connection c = open(Connection.TRANSACTION_READ_COMMITTED)) { log("-", "final row: " + status(c, d)); }
    }

    // Neither instance updates a shared row: each checks for an active trip, then inserts its own
    static void checkThenInsert(String level, int isolation) throws Exception {
        int d = 21;
        reset(d);
        System.out.println("== " + level + ", check trips then INSERT (no shared row is written)");
        String check = "SELECT count(*) FROM trips WHERE driver_id = 21 AND status = 'ASSIGNED'";
        try (Connection a = open(isolation); Connection b = open(isolation)) {
            for (Connection c : new Connection[] {a, b}) {
                try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(check)) {
                    rs.next();
                    log(c == a ? "A" : "B", "active trips for driver 21: " + rs.getInt(1));
                }
            }
            log("A", "INSERT rows=" + exec(a, "INSERT INTO trips (id, driver_id, instance) VALUES (1101, 21, 'A')"));
            log("B", "INSERT rows=" + exec(b, "INSERT INTO trips (id, driver_id, instance) VALUES (2101, 21, 'B')"));
            a.commit();
            log("A", "COMMIT");
            try { b.commit(); log("B", "COMMIT"); }
            catch (SQLException e) { log("B", "COMMIT failed " + e.getSQLState() + ": " + e.getMessage().lines().findFirst().orElse("")); }
        }
        try (Connection c = open(Connection.TRANSACTION_READ_COMMITTED); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT count(*) FROM trips WHERE driver_id = 21")) {
            rs.next();
            log("-", "trips for driver 21: " + rs.getInt(1));
        }
    }

    public static void main(String[] args) throws Exception {
        readThenWrite("READ COMMITTED", Connection.TRANSACTION_READ_COMMITTED, "");
        readThenWrite("READ COMMITTED", Connection.TRANSACTION_READ_COMMITTED, " AND status = 'AVAILABLE'");
        readThenWrite("REPEATABLE READ", Connection.TRANSACTION_REPEATABLE_READ, "");
        checkThenInsert("REPEATABLE READ", Connection.TRANSACTION_REPEATABLE_READ);
        checkThenInsert("SERIALIZABLE", Connection.TRANSACTION_SERIALIZABLE);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -cp postgresql-42.7.14.jar IsolationDemo.java",
        },
        {
          type: "output",
          text: `== READ COMMITTED, plain UPDATE
  868 ms  A  reads driver 20: AVAILABLE trip null
  872 ms  B  reads driver 20: AVAILABLE trip null
  874 ms  A  UPDATE rows=1
 1179 ms  B  UPDATE still waiting: true
 1181 ms  A  COMMIT
 1182 ms  B  UPDATE rows=1
 1184 ms  B  COMMIT
 1221 ms  -  final row: ON_TRIP trip 2001
== READ COMMITTED, UPDATE ...  AND status = 'AVAILABLE'
 1303 ms  A  reads driver 20: AVAILABLE trip null
 1306 ms  B  reads driver 20: AVAILABLE trip null
 1307 ms  A  UPDATE rows=1
 1608 ms  B  UPDATE still waiting: true
 1617 ms  A  COMMIT
 1619 ms  B  UPDATE rows=0
 1621 ms  B  COMMIT
 1664 ms  -  final row: ON_TRIP trip 1001
== REPEATABLE READ, plain UPDATE
 1751 ms  A  reads driver 20: AVAILABLE trip null
 1755 ms  B  reads driver 20: AVAILABLE trip null
 1757 ms  A  UPDATE rows=1
 2058 ms  B  UPDATE still waiting: true
 2067 ms  A  COMMIT
 2070 ms  B  ERROR 40001: ERROR: could not serialize access due to concurrent update
 2070 ms  B  COMMIT
 2097 ms  -  final row: ON_TRIP trip 1001
== REPEATABLE READ, check trips then INSERT (no shared row is written)
 2167 ms  A  active trips for driver 21: 0
 2169 ms  B  active trips for driver 21: 0
 2171 ms  A  INSERT rows=1
 2174 ms  B  INSERT rows=1
 2177 ms  A  COMMIT
 2178 ms  B  COMMIT
 2207 ms  -  trips for driver 21: 2
== SERIALIZABLE, check trips then INSERT (no shared row is written)
 2260 ms  A  active trips for driver 21: 0
 2262 ms  B  active trips for driver 21: 0
 2264 ms  A  INSERT rows=1
 2266 ms  B  INSERT rows=1
 2267 ms  A  COMMIT
 2274 ms  B  COMMIT failed 40001: ERROR: could not serialize access due to read/write dependencies among transactions
 2296 ms  -  trips for driver 21: 1`,
        },
        {
          type: "list",
          items: [
            "**`READ COMMITTED`, plain `UPDATE`: the lost update.** B's `UPDATE` waited 300 ms for A's row lock, then re-checked its `WHERE id = 20` on the new version. The id still matched, so B overwrote A's trip: the final row says trip 2001, and A's rider has no driver. Waiting for the lock didn't help, because the condition B re-checked didn't include the thing that changed.",
            "**`READ COMMITTED`, conditional `UPDATE`: the same wait, a different answer.** The re-check now included `status = 'AVAILABLE'`, the new version said `ON_TRIP`, and B got `rows=0`. Same isolation level, same lock; the only difference is what's in the `WHERE` clause. This is why the conditional update is the default fix.",
            "**`REPEATABLE READ`: an error instead of a lost update.** B's snapshot was taken at its first read, before A committed. When B tried to update a row that had changed since that snapshot, Postgres refused with SQLState `40001`, `could not serialize access due to concurrent update`. B's `commit()` then returned normally, but there was nothing to commit: the transaction was already aborted, and the final row kept A's trip 1001. The application must catch `40001` and **rerun the whole transaction**, including the read; the two-instance runs with retries are in the Performance section (121 to 149 serialization failures per instance under `REPEATABLE READ`, 103 to 149 under `SERIALIZABLE`, 0 double bookings in all of them).",
            "**`REPEATABLE READ` missed the check-then-insert.** When the two transactions don't write the same row (each inserts its own trip), there is no conflict to detect: both saw 0 active trips in their snapshots, both inserted, both committed, and driver 21 has 2 trips. This is **write skew**, and snapshot isolation allows it.",
            "**`SERIALIZABLE` caught it.** Postgres's Serializable Snapshot Isolation tracks which rows (or index ranges) each transaction read and which it wrote. A read 'no active trip for driver 21' and B wrote one, and vice versa: a dangerous cycle. B's `COMMIT` failed with `40001`, `could not serialize access due to read/write dependencies among transactions`, and driver 21 ended with one trip. Note it failed at **commit**, not at the insert: code that only handles errors on statements will miss it.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Isolation is a database setting, not a Java one",
          text: "`synchronized` and isolation levels solve different problems. An isolation level decides what a transaction is allowed to see and when the database refuses to commit; it says nothing about threads. A stricter level doesn't make the race go away, it turns the race into an error your code has to retry. Without the retry loop, `REPEATABLE READ` just converts double bookings into failed requests.",
        },
      ],
    },
    {
      title: "Lock Timeouts: lock_timeout, statement_timeout and NOWAIT",
      blocks: [
        {
          type: "paragraph",
          text: "Pessimistic locking means waiting, and with Postgres's defaults that wait is unbounded. If one instance holds a driver row while its pod is frozen in a 40-second GC pause or stuck on a hung HTTP call, every request in every other instance that wants that driver queues behind it, holding a connection from the pool. Instance A below locks driver 11 and keeps its transaction open; instance B tries five ways of not waiting forever:",
        },
        {
          type: "code",
          language: "java",
          title: "LockTimeouts.java",
          code: `import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

// Instance A holds driver 11's row lock; instance B tries four ways of not waiting forever
public class LockTimeouts {
    static final String URL = "jdbc:postgresql://localhost:55432/locks_across_servers";

    interface Attempt { void run(Statement s) throws SQLException; }

    static void attempt(Connection b, String label, Attempt setup, String sql) throws SQLException {
        long t = System.nanoTime();
        try (Statement s = b.createStatement()) {
            setup.run(s);
            s.executeQuery(sql);
            System.out.printf("%-38s got the lock after %4d ms%n", label, (System.nanoTime() - t) / 1_000_000);
        } catch (SQLException e) {
            System.out.printf("%-38s %4d ms  SQLState %s  %s%n", label, (System.nanoTime() - t) / 1_000_000,
                    e.getSQLState(), e.getMessage().lines().findFirst().orElse(""));
        }
        b.rollback();
    }

    public static void main(String[] args) throws Exception {
        try (Connection a = DriverManager.getConnection(URL, "postgres", "lesson");
             Connection b = DriverManager.getConnection(URL, "postgres", "lesson")) {
            a.setAutoCommit(false);
            b.setAutoCommit(false);
            try (Statement s = a.createStatement()) {
                s.executeQuery("SELECT id FROM drivers WHERE id = 11 FOR UPDATE");      // A holds the row
            }
            String lock = "SELECT id FROM drivers WHERE id = 11 FOR UPDATE";
            attempt(b, "SET LOCAL lock_timeout = '500ms'", s -> s.execute("SET LOCAL lock_timeout = '500ms'"), lock);
            attempt(b, "SET LOCAL statement_timeout = '800ms'", s -> s.execute("SET LOCAL statement_timeout = '800ms'"), lock);
            attempt(b, "FOR UPDATE NOWAIT", s -> { }, lock + " NOWAIT");
            attempt(b, "JDBC setQueryTimeout(1)", s -> s.setQueryTimeout(1), lock);
            attempt(b, "statement_timeout on a slow query", s -> s.execute("SET LOCAL statement_timeout = '300ms'"),
                    "SELECT pg_sleep(1)");
            a.rollback();
            attempt(b, "after A rolls back", s -> s.execute("SET LOCAL lock_timeout = '500ms'"), lock);
        }
    }
}`,
        },
        {
          type: "output",
          text: `SET LOCAL lock_timeout = '500ms'        517 ms  SQLState 55P03  ERROR: canceling statement due to lock timeout
SET LOCAL statement_timeout = '800ms'   809 ms  SQLState 57014  ERROR: canceling statement due to statement timeout
FOR UPDATE NOWAIT                         2 ms  SQLState 55P03  ERROR: could not obtain lock on row in relation "drivers"
JDBC setQueryTimeout(1)                1011 ms  SQLState 57014  ERROR: canceling statement due to user request
statement_timeout on a slow query       301 ms  SQLState 57014  ERROR: canceling statement due to statement timeout
after A rolls back                     got the lock after    1 ms`,
        },
        {
          type: "list",
          items: [
            "**`lock_timeout` limits waiting for a lock**, and only that: it fired after 517 ms with SQLState `55P03` (`lock_not_available`). It applies to each lock wait separately, so a statement that waits for several locks can wait several times as long. It's the right knob for \"don't queue behind another instance's lock\".",
            "**`statement_timeout` limits the whole statement**, lock wait or not: 809 ms for the lock wait, and 301 ms for a `pg_sleep(1)` that held no lock at all. SQLState `57014` (`query_canceled`). It's the right knob for \"no request runs a query longer than this\", and it can't tell a slow plan from a lock wait.",
            "**`NOWAIT` fails at once** (2 ms) with `55P03` and a clearer message, `could not obtain lock on row in relation \"drivers\"`. Good for \"if someone else is assigning this driver right now, skip him\"; the next lesson's `SKIP LOCKED` does that skipping inside the query.",
            "**JDBC's `setQueryTimeout(1)` is enforced by the driver**, which sends a cancel request after 1 second: the server reports it as `canceling statement due to user request`, also `57014`. It costs a timer per statement on the client and a second connection for the cancel; a server-side `statement_timeout` is cheaper and also covers queries run by other tools.",
            "**`SET LOCAL` lasts until the end of the transaction**, so it can't leak into the next transaction on a pooled connection. A plain `SET` stays on the connection until changed, which with HikariCP means it follows the connection to whichever request borrows it next. For a service-wide default, set it on the database role (`ALTER ROLE dispatch SET lock_timeout = '2s'`) or through the driver's `options` URL parameter, and use `SET LOCAL` for the exceptions.",
            "**Every failure aborts the transaction.** After any of these errors, the transaction can only roll back. That's why the program calls `rollback()` after each attempt, and why retry logic has to restart the whole transaction, not just the statement.",
          ],
        },
        {
          type: "paragraph",
          text: "MySQL's equivalent is `innodb_lock_wait_timeout`, which **defaults to 50 seconds**. I held driver 11 with `FOR UPDATE` in one mysql session and tried from another:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT @@innodb_lock_wait_timeout AS default_wait;
SET SESSION innodb_lock_wait_timeout = 1;
START TRANSACTION;
SELECT id FROM drivers WHERE id = 11 FOR UPDATE;
SELECT id FROM drivers WHERE id = 11 FOR UPDATE NOWAIT;
ROLLBACK;`,
        },
        {
          type: "output",
          text: `+--------------+
| default_wait |
+--------------+
|           50 |
+--------------+
ERROR 1205 (HY000) at line 4: Lock wait timeout exceeded; try restarting transaction
ERROR 3572 (HY000) at line 5: Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set.`,
        },
        {
          type: "paragraph",
          text: "Both MySQL errors arrive with the generic SQLState `HY000`, so Java code has to look at the vendor error code (`1205`, `3572`) instead. And unlike Postgres, a lock wait timeout in InnoDB by default rolls back only the **statement**, not the transaction (unless `innodb_rollback_on_timeout` is on), so code that catches it and carries on is still inside a half-done transaction.",
        },
      ],
    },
    {
      title: "MySQL InnoDB: Same SQL, Different Answers",
      blocks: [
        {
          type: "paragraph",
          text: "I created the same `drivers` and `trips` tables in MySQL 8.0.45 (InnoDB, default isolation `REPEATABLE-READ`) and pointed the same `DispatchService` at it with Connector/J 9.6.0, two processes again:",
        },
        {
          type: "code",
          language: "bash",
          code: `for s in synchronized repeatable-read conditional for-update; do
  ./run-two-mysql.sh $s     # same script, jdbc:mysql://localhost:33306/locks_across_servers
done`,
        },
        {
          type: "output",
          text: `== mysql synchronized
instance A synchronized    assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 2618 ms
instance B synchronized    assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 2654 ms
+-------+--------------+-----------------+-----------------+
| trips | drivers_used | double_assigned | still_available |
+-------+--------------+-----------------+-----------------+
|   300 |          160 |             140 |             140 |
+-------+--------------+-----------------+-----------------+
== mysql repeatable-read
instance A repeatable-read assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 2148 ms
instance B repeatable-read assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 2144 ms
+-------+--------------+-----------------+-----------------+
| trips | drivers_used | double_assigned | still_available |
+-------+--------------+-----------------+-----------------+
|   300 |          154 |             146 |             146 |
+-------+--------------+-----------------+-----------------+
== mysql conditional
instance A conditional     assigned 150, no driver 0, retries 882, empty FOR UPDATE 0, 23505 0, 40001 0, 5044 ms
instance B conditional     assigned 150, no driver 0, retries 958, empty FOR UPDATE 0, 23505 0, 40001 0, 5032 ms
+-------+--------------+-----------------+-----------------+
| trips | drivers_used | double_assigned | still_available |
+-------+--------------+-----------------+-----------------+
|   300 |          300 |               0 |               0 |
+-------+--------------+-----------------+-----------------+
== mysql for-update
instance A for-update      assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 3659 ms
instance B for-update      assigned 150, no driver 0, retries 0, empty FOR UPDATE 0, 23505 0, 40001 0, 3688 ms
+-------+--------------+-----------------+-----------------+
| trips | drivers_used | double_assigned | still_available |
+-------+--------------+-----------------+-----------------+
|   300 |          300 |               0 |               0 |
+-------+--------------+-----------------+-----------------+`,
        },
        {
          type: "list",
          items: [
            "**`REPEATABLE READ` on MySQL did not save the broken code: 146 double bookings and not a single error.** On Postgres the same strategy produced 0 double bookings and 121 to 149 `40001`s per instance. Same code, same isolation level name, opposite outcome.",
            "**The conditional update and `FOR UPDATE` worked on InnoDB too**: 0 double bookings each. Those two fixes are portable; relying on the isolation level is not.",
          ],
        },
        {
          type: "paragraph",
          text: "The reason is InnoDB's two kinds of read. A plain `SELECT` is a **consistent read** from the transaction's snapshot. `UPDATE`, `DELETE` and `SELECT ... FOR UPDATE` are **locking reads** of the **latest committed** version, and they don't check whether that version is newer than the snapshot. Two mysql sessions show it directly; session A locks driver 7, sleeps 3 seconds, assigns him and commits, while session B, inside one `REPEATABLE READ` transaction, reads him four times:",
        },
        {
          type: "code",
          language: "sql",
          title: "session B (mysql -vvv), started 0.5 s after A",
          code: `START TRANSACTION;
SELECT id, status, trip_id FROM drivers WHERE id = 7;              -- consistent read
SELECT id, status, trip_id FROM drivers WHERE id = 7 FOR UPDATE;   -- locking read: waits for A
SELECT id, status, trip_id FROM drivers WHERE id = 7;              -- consistent read again
UPDATE drivers SET trip_id = 2007 WHERE id = 7;
SELECT id, status, trip_id FROM drivers WHERE id = 7;
ROLLBACK;`,
        },
        {
          type: "output",
          text: `+----+-----------+---------+
| id | status    | trip_id |
+----+-----------+---------+
|  7 | AVAILABLE |    NULL |
+----+-----------+---------+
1 row in set (0.00 sec)

+----+---------+---------+
| id | status  | trip_id |
+----+---------+---------+
|  7 | ON_TRIP |    1007 |
+----+---------+---------+
1 row in set (2.55 sec)

+----+-----------+---------+
| id | status    | trip_id |
+----+-----------+---------+
|  7 | AVAILABLE |    NULL |
+----+-----------+---------+
1 row in set (0.00 sec)

Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

+----+---------+---------+
| id | status  | trip_id |
+----+---------+---------+
|  7 | ON_TRIP |    2007 |
+----+---------+---------+
1 row in set (0.00 sec)`,
        },
        {
          type: "list",
          items: [
            "**One transaction, two truths.** B's plain `SELECT`s said `AVAILABLE` before and after A committed (the snapshot), while the `FOR UPDATE` between them waited 2.55 s and returned `ON_TRIP, 1007` (the latest version). Then B's `UPDATE` overwrote A's committed trip with no complaint, and from then on B saw its own write. In Postgres, B's write to a row changed after its snapshot would have failed with `40001`.",
            "**That's why the check-then-act code loses updates in InnoDB's `REPEATABLE READ`:** the check reads the snapshot, the write goes to the latest row. MySQL's documentation calls this out: in `REPEATABLE READ`, use locking reads (`FOR UPDATE`, `FOR SHARE`) when you read data you are about to write based on.",
            "**The conditional update works because its `WHERE` is evaluated by a locking read**, on the latest version, so `status = 'AVAILABLE'` sees A's change and matches nothing. One Connector/J detail: by default `executeUpdate` returns **matched** rows, not changed rows (`useAffectedRows=false`), which is what a conditional update wants; an update that sets a column to the value it already has still returns 1.",
          ],
        },
        {
          type: "paragraph",
          text: "While B waited, a third session looked at InnoDB's lock table. Unlike Postgres, InnoDB keeps row locks in memory, per index record, and MySQL 8.0 exposes them in `performance_schema`:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT ENGINE_TRANSACTION_ID AS trx, OBJECT_NAME AS tbl, INDEX_NAME AS idx, LOCK_TYPE, LOCK_MODE, LOCK_STATUS, LOCK_DATA
FROM performance_schema.data_locks WHERE OBJECT_SCHEMA = 'locks_across_servers' ORDER BY ENGINE_TRANSACTION_ID, LOCK_TYPE;
SELECT REQUESTING_ENGINE_TRANSACTION_ID AS waiting_trx, BLOCKING_ENGINE_TRANSACTION_ID AS blocking_trx FROM performance_schema.data_lock_waits;`,
        },
        {
          type: "output",
          text: `+------+---------+---------+-----------+---------------+-------------+-----------+
| trx  | tbl     | idx     | LOCK_TYPE | LOCK_MODE     | LOCK_STATUS | LOCK_DATA |
+------+---------+---------+-----------+---------------+-------------+-----------+
| 6098 | drivers | PRIMARY | RECORD    | X,REC_NOT_GAP | GRANTED     | 7         |
| 6098 | drivers | NULL    | TABLE     | IX            | GRANTED     | NULL      |
| 6099 | drivers | PRIMARY | RECORD    | X,REC_NOT_GAP | WAITING     | 7         |
| 6099 | drivers | NULL    | TABLE     | IX            | GRANTED     | NULL      |
+------+---------+---------+-----------+---------------+-------------+-----------+
4 rows in set (0.00 sec)

+-------------+--------------+
| waiting_trx | blocking_trx |
+-------------+--------------+
|        6099 |         6098 |
+-------------+--------------+
1 row in set (0.01 sec)`,
        },
        {
          type: "list",
          items: [
            "**The row lock is a record lock on the clustered index** (`PRIMARY`, `LOCK_DATA 7`): `X,REC_NOT_GAP` means exclusive, on the record only, not the gap before it, because `id = 7` is an equality search on a unique index. A range condition or a non-unique index would add gap or next-key locks, which also block inserts into the range.",
            "**Both transactions hold an `IX` table lock** (intention exclusive), the InnoDB counterpart of Postgres's `RowShareLock`/`RowExclusiveLock` on the table: it only conflicts with whole-table locks.",
            "**`data_lock_waits` names waiter and blocker directly** (6099 waits for 6098), the MySQL version of `pg_blocking_pids`. Unlike `pg_locks`, `data_locks` lists **every** row lock held, not just the ones being waited for, since InnoDB keeps them in memory.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing one race between instance A and instance B for driver 7, first with the broken code, then with each fix, in PostgreSQL's default `READ COMMITTED`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**A's request thread enters `assignSynchronized`** and takes the monitor of `DispatchService` in **A's** heap. At the same moment, B's request thread takes the monitor of `DispatchService` in **B's** heap. Neither knows about the other; neither waits.",
            "**Both run the check:** `SELECT id FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1`. Each sees a snapshot of committed data taken when its statement started; neither has written yet, so both get 7.",
            "**A runs `UPDATE drivers SET status = 'ON_TRIP', trip_id = 1007 WHERE id = 7`.** Postgres finds the row, sees no lock on it, writes A's transaction ID into the old version's xmax and creates a new version. A now holds the row lock until commit.",
            "**B runs its `UPDATE ... WHERE id = 7`.** It finds xmax set by a transaction that is still running, so it takes the `tuple` lock (first in line), then waits on a `ShareLock` for A's transaction ID: `pg_stat_activity` shows `Lock / transactionid`.",
            "**A inserts trip 1007 and commits.** Its transaction ID is marked committed in the commit log, and its `transactionid` lock is released, which wakes B.",
            "**B re-checks its `WHERE` on A's new version** (EvalPlanQual). `id = 7` still matches, so B overwrites status and trip: trip 2007. B inserts trip 2007 and commits. Driver 7 has two trips; A's write is lost. Nothing reported an error.",
            "**With the conditional update,** step 6 re-checks `id = 7 AND status = 'AVAILABLE'` on the new version, finds `ON_TRIP`, skips the row and returns `UPDATE 0`. B's Java code sees 0, rolls back and picks the next driver.",
            "**With `FOR UPDATE`,** the wait happens in step 2 instead: B's locking `SELECT` waits for A, and `LockRows` re-checks `status` on the new version, rejects 7, and continues the scan to driver 8, which it locks and returns. B never sees 7 at all.",
            "**With a version column,** step 6 re-checks `id = 7 AND version = 0` on a version that now says 1: `UPDATE 0`, retry.",
            "**With the partial unique index,** B's update of the driver row still goes through, but its `INSERT` of trip 2007 finds A's committed index entry for `driver_id = 7, status = 'ASSIGNED'` and fails with `23505`; the rollback undoes B's driver update too.",
            "**With `REPEATABLE READ`,** step 6 doesn't re-check at all: the row changed after B's snapshot, so B's update fails with `40001`, and B's code reruns the whole transaction with a new snapshot, in which driver 7 is no longer available.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "sql",
          title: "syntax.sql",
          code: `-- 1. Conditional UPDATE: the check is part of the write; the row count says who won
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3001 WHERE id = 30 AND status = 'AVAILABLE';
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3002 WHERE id = 30 AND status = 'AVAILABLE';

-- 2. Pick and claim in one statement, and get the winner back
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3003
WHERE id = (SELECT id FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1)
  AND status = 'AVAILABLE'
RETURNING id, trip_id;

-- 3. Pessimistic: lock while reading, with a bounded wait
BEGIN;
SET LOCAL lock_timeout = '2s';
SELECT id, status FROM drivers WHERE id = 31 FOR NO KEY UPDATE;
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3004 WHERE id = 31;
COMMIT;

-- 4. Optimistic: compare-and-set on a version column
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3005, version = version + 1 WHERE id = 32 AND version = 0;
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3006, version = version + 1 WHERE id = 32 AND version = 0;

-- 5. The safety net: at most one active trip per driver
CREATE UNIQUE INDEX trips_one_active_trip_per_driver ON trips (driver_id) WHERE status = 'ASSIGNED';
INSERT INTO trips (id, driver_id, instance) VALUES (3007, 33, 'A');
INSERT INTO trips (id, driver_id, instance) VALUES (3008, 33, 'B');

-- 6. A stricter isolation level for one transaction
BEGIN ISOLATION LEVEL REPEATABLE READ;
SHOW transaction_isolation;
COMMIT;`,
        },
        {
          type: "output",
          text: `UPDATE drivers SET status = 'ON_TRIP', trip_id = 3001 WHERE id = 30 AND status = 'AVAILABLE';
UPDATE 1
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3002 WHERE id = 30 AND status = 'AVAILABLE';
UPDATE 0
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3003
WHERE id = (SELECT id FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1)
  AND status = 'AVAILABLE'
RETURNING id, trip_id;
 id | trip_id
----+---------
  1 |    3003
(1 row)

UPDATE 1
BEGIN;
BEGIN
SET LOCAL lock_timeout = '2s';
SET
SELECT id, status FROM drivers WHERE id = 31 FOR NO KEY UPDATE;
 id |  status
----+-----------
 31 | AVAILABLE
(1 row)

UPDATE drivers SET status = 'ON_TRIP', trip_id = 3004 WHERE id = 31;
UPDATE 1
COMMIT;
COMMIT
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3005, version = version + 1 WHERE id = 32 AND version = 0;
UPDATE 1
UPDATE drivers SET status = 'ON_TRIP', trip_id = 3006, version = version + 1 WHERE id = 32 AND version = 0;
UPDATE 0
CREATE UNIQUE INDEX trips_one_active_trip_per_driver ON trips (driver_id) WHERE status = 'ASSIGNED';
CREATE INDEX
INSERT INTO trips (id, driver_id, instance) VALUES (3007, 33, 'A');
INSERT 0 1
INSERT INTO trips (id, driver_id, instance) VALUES (3008, 33, 'B');
ERROR:  duplicate key value violates unique constraint "trips_one_active_trip_per_driver"
DETAIL:  Key (driver_id)=(33) already exists.
BEGIN ISOLATION LEVEL REPEATABLE READ;
BEGIN
SHOW transaction_isolation;
 transaction_isolation
-----------------------
 repeatable read
(1 row)

COMMIT;
COMMIT`,
        },
        {
          type: "paragraph",
          text: "The output was the same on every run. Part 2 returns the claimed driver with `RETURNING`, so one round trip both picks and claims. Part 4's second update matched nothing because the first had already moved the version to 1. Part 5's `ERROR` is the safety net working, and in a transaction it would abort the transaction.",
        },
        {
          type: "table",
          headers: ["Java / Spring side", "What it does", "Database effect"],
          rows: [
            ["`int rows = ps.executeUpdate()`", "Row count of a conditional or versioned update", "0 means another instance won: retry or give up"],
            ["`conn.setTransactionIsolation(...)` / `@Transactional(isolation = ...)`", "Isolation for the next transaction", "Postgres `40001` or a stale MySQL read, depending on the engine"],
            ["`e.getSQLState()`", "Classify failures", "`40001` serialization, `40P01` deadlock, `55P03` lock not available, `57014` cancelled, `23505` unique violation"],
            ["JPA `@Version`", "Adds `AND version = ?` and bumps it", "`OptimisticLockException` on row count 0"],
            ["JPA `LockModeType.PESSIMISTIC_WRITE`", "Adds a locking clause to the `SELECT`", "Row lock until commit; check which clause your dialect emits"],
            ["`SET LOCAL lock_timeout = '2s'`", "Bounded lock waits for this transaction", "`55P03` instead of an endless wait"],
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A wallet debit that loses money",
        },
        {
          type: "paragraph",
          text: "The other classic lost update is a balance. A rider's wallet starts at 10,000. Each of two instances charges it 100 times, 10 each, so it should end at 8,000. The first version reads the balance, subtracts in Java and writes the result back, each charge in its own `READ COMMITTED` transaction. The second lets the database do the arithmetic in one conditional statement, which also refuses to go negative:",
        },
        {
          type: "code",
          language: "java",
          title: "WalletDebit.java",
          code: `import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

// Charges rider 1's wallet 100 times, 10 each. Two of these run as separate processes.
// args: mode startAtEpochMillis
public class WalletDebit {
    public static void main(String[] args) throws Exception {
        String mode = args[0];
        long startAt = Long.parseLong(args[1]);
        int ok = 0, declined = 0;
        try (Connection c = DriverManager.getConnection(
                "jdbc:postgresql://localhost:55432/locks_across_servers", "postgres", "lesson")) {
            c.setAutoCommit(false);
            while (System.currentTimeMillis() < startAt) Thread.sleep(1);
            for (int i = 0; i < 100; i++) {
                if (mode.equals("read-modify-write")) {
                    int balance;
                    try (PreparedStatement ps = c.prepareStatement("SELECT balance FROM wallets WHERE rider_id = 1");
                         ResultSet rs = ps.executeQuery()) {
                        rs.next();
                        balance = rs.getInt(1);                      // read
                    }
                    try (PreparedStatement ps = c.prepareStatement("UPDATE wallets SET balance = ? WHERE rider_id = 1")) {
                        ps.setInt(1, balance - 10);                  // modify in Java, write back
                        ps.executeUpdate();
                    }
                    ok++;
                } else {                                             // atomic: the database does the arithmetic
                    try (PreparedStatement ps = c.prepareStatement(
                            "UPDATE wallets SET balance = balance - 10 WHERE rider_id = 1 AND balance >= 10")) {
                        if (ps.executeUpdate() == 1) ok++; else declined++;
                    }
                }
                c.commit();
            }
        }
        System.out.println(mode + ": " + ok + " debits of 10 committed, " + declined + " declined");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `for m in read-modify-write atomic; do for i in 1 2 3; do
  psql -c "UPDATE wallets SET balance = 10000"
  S=$(( $(date +%s%3N) + 1200 ))
  java -Xmx48m -cp $PG:. WalletDebit $m $S > w1 & java -Xmx48m -cp $PG:. WalletDebit $m $S > w2 & wait
  cat w1 w2; psql -Atc "SELECT 'balance ' || balance || ' (expected 8000)' FROM wallets"
done; done`,
        },
        {
          type: "output",
          text: `read-modify-write: 100 debits of 10 committed, 0 declined
read-modify-write: 100 debits of 10 committed, 0 declined
balance 8990 (expected 8000)
read-modify-write: 100 debits of 10 committed, 0 declined
read-modify-write: 100 debits of 10 committed, 0 declined
balance 9000 (expected 8000)
read-modify-write: 100 debits of 10 committed, 0 declined
read-modify-write: 100 debits of 10 committed, 0 declined
balance 8940 (expected 8000)
atomic: 100 debits of 10 committed, 0 declined
atomic: 100 debits of 10 committed, 0 declined
balance 8000 (expected 8000)
atomic: 100 debits of 10 committed, 0 declined
atomic: 100 debits of 10 committed, 0 declined
balance 8000 (expected 8000)
atomic: 100 debits of 10 committed, 0 declined
atomic: 100 debits of 10 committed, 0 declined
balance 8000 (expected 8000)`,
        },
        {
          type: "list",
          items: [
            "**Read-modify-write lost 99, 100 and 94 of the 200 charges**: the rider paid for barely more than half the rides. Both instances read the same balance, both wrote `balance - 10`, and one write erased the other. Every instance reported 100 successful debits; nothing failed.",
            "**`balance = balance - 10` never lost one**, in all three runs. The `UPDATE` reads the current value under its row lock, so two concurrent debits queue on the row and each subtracts from the other's result. `AND balance >= 10` makes \"enough money?\" part of the same atomic step; a declined debit returns row count 0 instead of a negative balance.",
            "**The Java equivalent is `AtomicLong.addAndGet` vs `get` then `set`** from the atomics lesson. The database version works across any number of processes because the row lock, not a JVM object, is what serialises the writers.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Pick and claim in one statement",
        },
        {
          type: "paragraph",
          text: "Every fix so far still made two or three round trips per assignment. Postgres can pick, claim and record the trip in **one** statement: a data-modifying CTE that updates the driver and inserts the trip, in autocommit mode, with no retry loop in Java. I ran it from two processes, one thread each, with the row lock in the subquery and without it:",
        },
        {
          type: "code",
          language: "java",
          title: "ClaimOneStatement.java",
          code: `import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

// Pick and claim a driver in ONE statement, autocommit, no retry loop in Java.
// args: instanceName startAtEpochMillis trips [nolock]
public class ClaimOneStatement {
    static final String CLAIM = """
            WITH claimed AS (
                UPDATE drivers SET status = 'ON_TRIP', trip_id = ?
                WHERE id = (SELECT id FROM drivers WHERE status = 'AVAILABLE' ORDER BY id LIMIT 1 FOR NO KEY UPDATE)
                  AND status = 'AVAILABLE'
                RETURNING id)
            INSERT INTO trips (id, driver_id, instance) SELECT ?, id, ? FROM claimed
            RETURNING driver_id""";

    public static void main(String[] args) throws Exception {
        String instance = args[0];
        long startAt = Long.parseLong(args[1]);
        int trips = Integer.parseInt(args[2]), assigned = 0, empty = 0;
        long base = instance.equals("A") ? 1_000 : 2_000;
        try (Connection c = DriverManager.getConnection(
                "jdbc:postgresql://localhost:55432/locks_across_servers", "postgres", "lesson");
             PreparedStatement ps = c.prepareStatement(
                     args.length > 3 ? CLAIM.replace(" FOR NO KEY UPDATE", "") : CLAIM)) {
            while (System.currentTimeMillis() < startAt) Thread.sleep(1);
            for (int k = 0; k < trips; k++) {
                ps.setLong(1, base + k);
                ps.setLong(2, base + k);
                ps.setString(3, instance);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) assigned++; else empty++;      // empty: no driver claimed this time
                }
            }
        }
        System.out.printf("instance %s %-7s %d assigned, %d came back empty, %d ms%n",
                instance, args.length > 3 ? "no lock" : "locked", assigned, empty, System.currentTimeMillis() - startAt);
    }
}`,
        },
        {
          type: "output",
          text: `instance A locked  150 assigned, 0 came back empty, 651 ms
instance B locked  150 assigned, 0 came back empty, 644 ms
trips 300, double_assigned 0
instance A locked  150 assigned, 0 came back empty, 557 ms
instance B locked  150 assigned, 0 came back empty, 559 ms
trips 300, double_assigned 0
instance A locked  150 assigned, 0 came back empty, 791 ms
instance B locked  150 assigned, 0 came back empty, 787 ms
trips 300, double_assigned 0
instance A no lock 23 assigned, 127 came back empty, 607 ms
instance B no lock 131 assigned, 19 came back empty, 609 ms
trips 154, double_assigned 0
instance A no lock 2 assigned, 148 came back empty, 591 ms
instance B no lock 149 assigned, 1 came back empty, 595 ms
trips 151, double_assigned 0
instance A no lock 26 assigned, 124 came back empty, 565 ms
instance B no lock 125 assigned, 25 came back empty, 567 ms
trips 151, double_assigned 0`,
        },
        {
          type: "list",
          items: [
            "**With `FOR NO KEY UPDATE` in the subquery, all 300 requests got a driver, every run**, in one round trip each and with no Java retry loop: the subquery's `LockRows` skips a driver that was claimed while it waited, exactly as in the `FOR UPDATE` fix.",
            "**Without the lock, it was still safe, but 146 to 149 of 300 requests came back empty** while drivers were available. The subquery picked driver 7 from its snapshot, the outer `UPDATE` waited for the other instance, re-checked `status = 'AVAILABLE'`, matched nothing, and the CTE inserted nothing. No double booking, but half the riders were told \"no drivers nearby\". Correct and useless.",
            "**One statement is not automatically one atomic decision.** The subquery and the outer update look at the row at different moments; the lock in the subquery is what ties them together. This is the shape the next lesson builds on, with `SKIP LOCKED` so the two instances don't even wait for each other.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Avoid"],
          rows: [
            ["Claim a resource if it's still free (driver, seat, coupon)", "Conditional `UPDATE ... WHERE state = 'FREE'` and check the row count", "`synchronized`/`ReentrantLock` around a `SELECT` then `UPDATE`"],
            ["Increment or decrement a number (balance, stock, seats left)", "`SET x = x - ? WHERE id = ? AND x >= ?`", "Reading the value into Java and writing back the result"],
            ["Read several rows, decide in Java, then write, all in a short transaction", "`SELECT ... FOR NO KEY UPDATE` (or `FOR UPDATE` if deleting), consistent lock order, `lock_timeout`", "Holding the lock across HTTP calls or user think time"],
            ["Long edit (a form open for minutes), rare conflicts", "Version column (`@Version`) and a clear \"someone else changed this\" error", "Pessimistic locks held across requests"],
            ["An invariant that must never break, whatever code path writes", "Unique or partial unique index, `CHECK`, foreign keys", "Relying only on application checks"],
            ["The decision depends on rows that may not exist yet (\"no active trip for this driver\")", "Unique index, or `SERIALIZABLE` with retries", "`REPEATABLE READ` (allows write skew)"],
            ["The same code must behave the same on MySQL and Postgres", "Conditional updates and locking reads", "Relying on `REPEATABLE READ` semantics"],
            ["Many workers taking jobs from a table", "`FOR UPDATE SKIP LOCKED` (next lesson)", "Plain `FOR UPDATE` (everyone waits on the first row)"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Trusting synchronized in a service that runs more than once",
        },
        {
          type: "paragraph",
          text: "It protects only threads in the same JVM. With two instances it gave 71 to 139 double bookings in 300 assignments, and with one instance 0, so tests on a laptop never see it. Any `synchronized`, `ReentrantLock`, `ConcurrentHashMap.computeIfAbsent` or in-memory cache that guards **shared data in a database** is a bug the day a second pod starts.",
        },
        {
          type: "heading",
          text: "Ignoring the row count",
        },
        {
          type: "paragraph",
          text: "A conditional or versioned `UPDATE` that matched no rows is not an error: `executeUpdate` returns 0 and the code carries on as if it had won. Every conditional update needs an `if (rows == 0)` branch, and Spring Data `@Modifying` queries need to return `int`, not `void`.",
        },
        {
          type: "heading",
          text: "Putting the check in the WHERE clause of the wrong statement",
        },
        {
          type: "paragraph",
          text: "`UPDATE ... WHERE id = ?` after a separate `SELECT ... WHERE status = 'AVAILABLE'` re-checks only the id. The isolation demo showed it: the waiting update re-read the row, the id still matched, and the trip was overwritten. The condition that defines \"still free\" has to be in the statement that writes.",
        },
        {
          type: "heading",
          text: "Expecting REPEATABLE READ to behave the same on MySQL",
        },
        {
          type: "paragraph",
          text: "On Postgres it turned the race into `40001` errors; on InnoDB it gave 146 double bookings with no error, because InnoDB's `UPDATE` and `FOR UPDATE` read the latest version while plain `SELECT` reads the snapshot. Never rely on isolation-level semantics for correctness in code that may run on both.",
        },
        {
          type: "heading",
          text: "A stricter isolation level without a retry loop",
        },
        {
          type: "paragraph",
          text: "`REPEATABLE READ` and `SERIALIZABLE` don't prevent conflicts; they report them as `40001`, and the whole transaction (including its reads) has to run again. Without a retry, users get errors instead of wrong data, which is better, but still an outage. And `SERIALIZABLE` may fail at `COMMIT`, so the retry must wrap the commit too.",
        },
        {
          type: "heading",
          text: "FOR UPDATE where FOR NO KEY UPDATE would do",
        },
        {
          type: "paragraph",
          text: "`FOR UPDATE` conflicts with the `FOR KEY SHARE` lock every foreign-key check takes, so it blocks inserts into child tables (trips, payouts, ratings) that reference the locked row. In the measurement, the trip insert waited until its 1 s `lock_timeout`; with `FOR NO KEY UPDATE` it took 3 ms.",
        },
        {
          type: "heading",
          text: "Holding a row lock across slow work",
        },
        {
          type: "paragraph",
          text: "A row lock lives until the transaction ends. `@Transactional` on a method that locks a driver and then calls the maps API, a payment gateway or another service keeps every other instance waiting for that driver for as long as the call takes, and holds a pooled connection the whole time. Do the slow work before or after the transaction, and keep the lock to the reads and writes that need it.",
        },
        {
          type: "heading",
          text: "No lock or statement timeout",
        },
        {
          type: "paragraph",
          text: "PostgreSQL's defaults are `lock_timeout = 0` and `statement_timeout = 0`: wait forever. One stuck transaction can then pile up every request that touches the same rows until the connection pool is exhausted, and the symptom is \"the whole service is slow\", not \"a lock\". Set both, plus `idle_in_transaction_session_timeout` for sessions that forgot to commit. MySQL's `innodb_lock_wait_timeout` defaults to 50 seconds, which is too long for a request path.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Assume every service runs as at least two instances, even if it runs as one today: blue-green deploys and autoscalers will make it two without asking.",
            "Put the condition that makes a write valid into the write itself (`WHERE status = 'AVAILABLE'`, `WHERE balance >= ?`, `WHERE version = ?`) and always check the row count.",
            "Back every business invariant with a constraint: unique and partial unique indexes, foreign keys, `CHECK (balance >= 0)`. Application checks find most problems; constraints find the rest.",
            "When you lock rows to update them, use `FOR NO KEY UPDATE` unless you delete or change the key, lock in a consistent order, and keep the transaction short.",
            "Set `lock_timeout` and `statement_timeout` (per role or per connection) and use `SET LOCAL` for exceptions; never leave a request path able to wait forever.",
            "Retry on `40001` and `40P01` with a small randomised backoff and a cap, rerunning the whole transaction; treat `55P03` as \"busy, try another resource or fail fast\".",
            "Keep slow work (HTTP calls, payment gateways) outside the transaction that holds row locks.",
            "Monitor lock waits: turn on `log_lock_waits`, alert on sessions waiting on `Lock` in `pg_stat_activity` and on `idle in transaction` sessions, and on InnoDB watch `data_lock_waits`.",
            "Test with two processes, not two threads: a test that starts two instances of the service against a real database (Testcontainers, or two JVMs as in this lesson) is the only test that sees this class of bug.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Correctness first, but the fixes don't cost the same. I ran every strategy three times on the contended workload (two processes, four threads each, 150 trips per instance, everyone chasing the lowest id), printing each instance's retries and time and the final counts. For the unique-index strategy the loop creates the index first and drops it after:",
        },
        {
          type: "code",
          language: "bash",
          code: `for s in synchronized conditional for-update optimistic unique-index repeatable-read serializable; do
  for i in 1 2 3; do
    ./run-two.sh $s > r.txt
    echo "$s run$i: $(grep -o 'retries [0-9]*' r.txt | tr '\\n' ' ') $(grep -o '[0-9]* ms' r.txt | tr '\\n' ' ') | $(sed -n 5p r.txt)"
  done
done`,
        },
        {
          type: "output",
          text: `synchronized run1: retries 0 retries 0  1169 ms 1151 ms  |    300 |          176 |             124 |             124
synchronized run2: retries 0 retries 0  916 ms 945 ms  |    300 |          170 |             130 |             130
synchronized run3: retries 0 retries 0  663 ms 640 ms  |    300 |          161 |             139 |             139
conditional run1: retries 864 retries 826  1101 ms 1107 ms  |    300 |          300 |               0 |               0
conditional run2: retries 747 retries 804  1236 ms 1281 ms  |    300 |          300 |               0 |               0
conditional run3: retries 708 retries 652  1689 ms 1643 ms  |    300 |          300 |               0 |               0
for-update run1: retries 0 retries 0  2368 ms 2675 ms  |    300 |          300 |               0 |               0
for-update run2: retries 0 retries 0  939 ms 934 ms  |    300 |          300 |               0 |               0
for-update run3: retries 0 retries 0  908 ms 902 ms  |    300 |          300 |               0 |               0
optimistic run1: retries 738 retries 791  1458 ms 1516 ms  |    300 |          300 |               0 |               0
optimistic run2: retries 789 retries 950  921 ms 983 ms  |    300 |          300 |               0 |               0
optimistic run3: retries 576 retries 783  1417 ms 1587 ms  |    300 |          300 |               0 |               0
unique-index run1: retries 117 retries 133  1596 ms 1695 ms  |    300 |          300 |               0 |               0
unique-index run2: retries 145 retries 116  1261 ms 1156 ms  |    300 |          300 |               0 |               0
unique-index run3: retries 124 retries 147  1137 ms 1238 ms  |    300 |          300 |               0 |               0
repeatable-read run1: retries 137 retries 149  1731 ms 1802 ms  |    300 |          300 |               0 |               0
repeatable-read run2: retries 149 retries 148  1535 ms 1530 ms  |    300 |          300 |               0 |               0
repeatable-read run3: retries 149 retries 139  1520 ms 1467 ms  |    300 |          300 |               0 |               0
serializable run1: retries 149 retries 128  1938 ms 1774 ms  |    300 |          300 |               0 |               0
serializable run2: retries 103 retries 148  1871 ms 2185 ms  |    300 |          300 |               0 |               0
serializable run3: retries 111 retries 141  2162 ms 2448 ms  |    300 |          300 |               0 |               0`,
        },
        {
          type: "paragraph",
          text: "The columns after `|` are trips, drivers used, double assignments and drivers left available. Then the same strategies with no contention at all: one instance, one thread, 300 trips, twice:",
        },
        {
          type: "output",
          text: `instance A synchronized    assigned 300,  902 ms
instance A conditional     assigned 300,  1040 ms
instance A for-update      assigned 300,  817 ms
instance A optimistic      assigned 300,  919 ms
instance A repeatable-read assigned 300,  805 ms
instance A serializable    assigned 300,  1510 ms
instance A synchronized    assigned 300,  728 ms
instance A conditional     assigned 300,  657 ms
instance A for-update      assigned 300,  882 ms
instance A optimistic      assigned 300,  630 ms
instance A repeatable-read assigned 300,  778 ms
instance A serializable    assigned 300,  814 ms`,
        },
        {
          type: "list",
          items: [
            "**Without contention, every strategy costs the same:** 2 to 5 ms per assignment, 630 to 1,510 ms for 300, with the order changing between the two runs. Each assignment is two or three statements and a commit, and with `synchronous_commit = on` every commit waits for a WAL flush, which most likely dominates. Choosing `FOR UPDATE` over a conditional update is not a performance decision when conflicts are rare.",
            "**Under contention, the difference is retries vs waiting.** The conditional update and the version column threw away 576 to 958 attempts per instance; `FOR UPDATE` threw away none but parked threads on row locks; the unique index and the isolation levels wasted 103 to 149 whole transactions per instance. Wall time ended up in the same 0.6 to 2.7 s band for all of them, with run-to-run noise larger than the differences, because other agents were benchmarking on the same 8-core machine.",
            "**`SERIALIZABLE` costs a little more** even without conflicts (it tracks predicate locks for every read): its slowest uncontended run was 1,510 ms, but the second was 814 ms, so on this machine I can't separate that cost from noise. Under contention it failed 103 to 149 transactions per instance, the same order as `REPEATABLE READ`.",
            "**The single-statement claim from Example 2 was the fastest correct option** at 557 to 791 ms per 150 trips with one thread per instance, because it is one round trip and one commit per assignment, and it never retries.",
            "**The real performance problem with locks is lock hold time**, not lock cost. A transaction that holds a driver for 4 seconds (the `pg_sleep(4)` in the `pg_locks` demo) made the next one wait 2.98 s. In production, hold time is whatever runs between the lock and the commit.",
            "These are wall-clock measurements on a shared machine with a Docker database, not a benchmark harness. The counts (double bookings, retries, errors) were stable across runs; the timings were not.",
          ],
        },
      ],
    },
    {
      title: "Locks Across Servers in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend's dispatch service had run as a single pod for a year. Its `assignDriver` method picked the nearest available driver and marked him `ON_TRIP`, inside `synchronized`, with a comment saying \"prevents double assignment\". For a Friday evening peak, the team raised the deployment's replicas from one to two. Within an hour support had tickets from riders whose driver \"accepted\" and then drove to someone else, and from drivers whose app showed one pickup while a second rider kept calling them. No errors in the logs, no alerts: both pods were healthy and every request returned 200.",
        },
        {
          type: "paragraph",
          text: "I reproduced it with the two-process run (129 double bookings out of 300 in this run), then went through what the on-call engineer did: measure the damage, add the safety net, clean up, fix the code.",
        },
        {
          type: "code",
          language: "sql",
          title: "fix.sql",
          code: `-- 1. Find the damage
SELECT count(*) AS drivers_with_two_active_trips
FROM (SELECT driver_id FROM trips WHERE status = 'ASSIGNED' GROUP BY driver_id HAVING count(*) > 1) d;

-- 2. Try to add the safety net while duplicates still exist
CREATE UNIQUE INDEX CONCURRENTLY trips_one_active_trip_per_driver ON trips (driver_id) WHERE status = 'ASSIGNED';
SELECT indexrelid::regclass AS index, indisvalid FROM pg_index WHERE indrelid = 'trips'::regclass AND NOT indisprimary;
DROP INDEX CONCURRENTLY trips_one_active_trip_per_driver;

-- 3. Keep the trip the driver row points to, send the others back to matching
UPDATE trips t SET status = 'REMATCH'
FROM drivers d
WHERE d.id = t.driver_id AND t.status = 'ASSIGNED' AND d.trip_id <> t.id;

-- 4. Now the index builds
CREATE UNIQUE INDEX CONCURRENTLY trips_one_active_trip_per_driver ON trips (driver_id) WHERE status = 'ASSIGNED';
SELECT status, count(*) FROM trips GROUP BY status ORDER BY status;`,
        },
        {
          type: "output",
          text: ` drivers_with_two_active_trips
-------------------------------
                           129
(1 row)

CREATE UNIQUE INDEX CONCURRENTLY trips_one_active_trip_per_driver ON trips (driver_id) WHERE status = 'ASSIGNED';
ERROR:  could not create unique index "trips_one_active_trip_per_driver"
DETAIL:  Key (driver_id)=(1) is duplicated.

              index               | indisvalid
----------------------------------+------------
 trips_one_active_trip_per_driver | f
(1 row)

DROP INDEX
UPDATE 129
CREATE INDEX

  status  | count
----------+-------
 ASSIGNED |   171
 REMATCH  |   129
(2 rows)`,
        },
        {
          type: "list",
          items: [
            "**The damage query is the first thing to run:** 129 drivers had two active trips. In production the same query, run every minute and alerted on when non-zero, would have caught the incident in minutes instead of through support tickets.",
            "**The safety net couldn't go in while the damage was there.** `CREATE UNIQUE INDEX CONCURRENTLY` (which builds without blocking writes) scanned the table, found driver 1 twice and failed, and because a concurrent build can't roll back like a normal one, it left an **invalid** index behind (`indisvalid = f`). An invalid index isn't used for queries but is still maintained on every insert, so it has to be dropped (`DROP INDEX CONCURRENTLY`) before trying again.",
            "**Cleanup is a business decision, made in SQL.** The driver row's `trip_id` says which trip the driver actually saw (the last writer); the other 129 trips went back to matching as `REMATCH`. After that, the index built, and from then on the database itself refuses a second active trip for any driver, whatever code path tries.",
            "**Then the code fix:** the check moved into the `UPDATE` (`AND status = 'AVAILABLE'`, row count checked), the `synchronized` was deleted, and `lock_timeout` was set for the dispatch role. Each of those two fixes on its own gave 300 trips to 300 drivers in every measured run, so together they leave no gap.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "A Java lock is a promise about one process. Scaling a service from one replica to two is a correctness change, not just a capacity change, and every `synchronized` around database state needs reviewing before it happens.",
            "The database is the coordination point, so the decision belongs in SQL: a conditional update or a locking read, plus a constraint that makes the invalid state impossible.",
            "Data bugs don't page anyone. A cheap invariant query on a schedule (\"drivers with more than one active trip\") is the alert that would have caught this one.",
            "Add constraints early. Adding a unique index after duplicates exist means a cleanup first, under pressure, in production.",
          ],
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        {
          type: "heading",
          text: "Beginner",
        },
        {
          type: "qa",
          items: [
            {
              question: "Why doesn't synchronized prevent a race between two instances of the same service?",
              answer:
                "Because a monitor belongs to an object in one JVM's heap. Two instances are two processes with two heaps, two copies of the class and two monitors, so their threads never contend. The only thing they share is the database, so the coordination has to happen there. In my test, the same `synchronized` check-then-act gave 0 double bookings with one instance and 71 to 139 out of 300 with two.",
            },
            {
              question: "What is a check-then-act race, in database terms?",
              answer:
                "Reading a value to decide (\"is driver 7 available?\"), then writing based on that decision in a separate statement, with nothing preventing someone else from changing the value in between. Two clients both see \"available\" and both write. It's the same pattern as `if (!map.containsKey(k)) map.put(k, v)` in Java, and it's fixed the same way: make the check and the act one atomic operation.",
            },
            {
              question: "What is a conditional update, and how do you know whether it worked?",
              answer:
                "An `UPDATE` whose `WHERE` clause includes the condition that makes the change valid, such as `UPDATE drivers SET status = 'ON_TRIP', trip_id = ? WHERE id = ? AND status = 'AVAILABLE'`. The database checks and writes under one row lock. The row count returned by `executeUpdate` tells you the result: 1 means you claimed the row, 0 means it no longer matched (someone else won). Ignoring the row count turns it back into the bug.",
            },
            {
              question: "What is the difference between pessimistic and optimistic locking?",
              answer:
                "Pessimistic locking locks the row when reading it (`SELECT ... FOR UPDATE`), so others wait until the transaction ends. Optimistic locking takes no lock: it reads a version number and writes only if the version is unchanged (`WHERE id = ? AND version = ?`), retrying if not. Pessimistic suits short transactions on hot rows; optimistic suits rare conflicts and long gaps between read and write, such as a form a user edits for a minute. In my runs, `FOR UPDATE` had 0 retries, the version column 576 to 950 per instance.",
            },
            {
              question: "What is a lost update?",
              answer:
                "Two transactions read the same value, both compute a new value from it, and the second write overwrites the first, so one change disappears. My wallet example: two instances charged 100 times 10 each with read-then-write in Java, and the balance ended at 8,990, 9,000 and 8,940 instead of 8,000. `UPDATE wallets SET balance = balance - 10` fixed it, because the database computes from the current value under the row lock.",
            },
          ],
        },
        {
          type: "heading",
          text: "Intermediate",
        },
        {
          type: "qa",
          items: [
            {
              question: "What does PostgreSQL's READ COMMITTED do when an UPDATE has to wait for another transaction's row lock?",
              answer:
                "It waits for the other transaction to end, then, if that transaction committed, re-evaluates the `WHERE` clause on the newest version of the row (EvalPlanQual) and updates it only if it still matches. That's why `WHERE id = 7 AND status = 'AVAILABLE'` safely returns 0 after a competitor commits, while `WHERE id = 7` alone matches again and overwrites the competitor's trip. I watched both cases: the plain update returned 1 and the final row had the second writer's trip; the conditional one returned 0.",
            },
            {
              question: "What's the difference between FOR UPDATE and FOR NO KEY UPDATE in PostgreSQL?",
              answer:
                "`FOR UPDATE` says you may delete the row or change its key; it conflicts with every row lock mode, including the `FOR KEY SHARE` lock foreign-key checks take. `FOR NO KEY UPDATE` promises the key stays the same, so it doesn't conflict with `FOR KEY SHARE`. In my test, inserting a trip that references a driver locked `FOR UPDATE` waited until its 1 s `lock_timeout`; with `FOR NO KEY UPDATE` it took 3 ms, and `pgrowlocks` showed a MultiXact with both lockers. A plain `UPDATE` of non-key columns takes `FOR NO KEY UPDATE` automatically.",
            },
            {
              question: "Why are unique constraints called the last line of defence?",
              answer:
                "Because they make the invalid state impossible regardless of how the code got there: a second code path, a batch job, a bug introduced later. A partial unique index on `trips(driver_id) WHERE status = 'ASSIGNED'` made even the broken `synchronized` code correct: the losing insert failed with `23505` (107 to 147 times per instance) and its transaction rolled back. It doesn't stop the race, it rejects the result, so it's a safety net behind a correct design, not the design.",
            },
            {
              question: "How do lock_timeout and statement_timeout differ?",
              answer:
                "`lock_timeout` limits how long a statement waits to acquire a lock, per lock, and fails with `55P03`. `statement_timeout` limits the statement's total run time, whether it's waiting for a lock or computing, and fails with `57014`. In my test, `lock_timeout = 500ms` fired at 517 ms, `statement_timeout = 800ms` at 809 ms, and `NOWAIT` failed in 2 ms. Both default to 0 (no limit) in PostgreSQL. Use `SET LOCAL` so the setting ends with the transaction instead of following a pooled connection.",
            },
            {
              question: "Where are row locks stored in PostgreSQL, and why don't you see them in pg_locks?",
              answer:
                "In the row itself: the locker's transaction ID goes into the tuple's xmax with infomask bits such as `HEAP_XMAX_LOCK_ONLY` and `HEAP_XMAX_EXCL_LOCK`. I read them with `pageinspect` while a session held `FOR UPDATE`. `pg_locks` only shows the holder's lock on its own transaction ID, and for a waiter, a `tuple` lock (its place in line) plus an ungranted `ShareLock` on the holder's transaction ID. That design lets a transaction lock millions of rows without filling shared memory. `pgrowlocks` lists row locks by scanning the table.",
            },
            {
              question: "What SQLStates should a Java service retry, and how?",
              answer:
                "`40001` (serialization failure) and `40P01` (deadlock) mean \"rerun the whole transaction\": start a new transaction, redo the reads, redo the writes, with a capped number of attempts and a small randomised backoff. `55P03` (lock not available, from `lock_timeout` or `NOWAIT`) usually means \"busy\": pick another resource or fail fast. `23505` from a safety-net unique index means another instance won: re-pick. Retrying only the failed statement doesn't work, because the transaction is already aborted. In Spring, `40001`, `40P01` and `55P03` surface as subclasses of `ConcurrencyFailureException`, and `23505` as `DuplicateKeyException`.",
            },
          ],
        },
        {
          type: "heading",
          text: "Advanced",
        },
        {
          type: "qa",
          items: [
            {
              question: "Does REPEATABLE READ prevent lost updates?",
              answer:
                "In PostgreSQL, yes, by failing: if a transaction tries to update or lock a row that changed after its snapshot, it gets `40001` (`could not serialize access due to concurrent update`). My two-instance run had 0 double bookings and 121 to 149 such failures per instance. In MySQL InnoDB, no: `UPDATE` and `FOR UPDATE` read the latest committed version without checking it against the snapshot, so the same code gave 146 double bookings and no errors. And even in PostgreSQL, `REPEATABLE READ` allows write skew, where two transactions read overlapping data and write different rows.",
            },
            {
              question: "What is write skew, and which isolation level catches it?",
              answer:
                "Two transactions read the same data, each makes a decision based on it, and each writes a **different** row, so no write-write conflict is detected, but the combined result breaks an invariant. My example: both checked \"no active trip for driver 21\" and each inserted its own trip; under `REPEATABLE READ` both committed and the driver had two trips. PostgreSQL's `SERIALIZABLE` (Serializable Snapshot Isolation, since 9.1) tracks read/write dependencies and aborted one at `COMMIT` with `40001`. A unique index catches this particular case too, more cheaply.",
            },
            {
              question: "Why can a single UPDATE with a subquery still miss, and how do you fix it?",
              answer:
                "In `UPDATE drivers SET ... WHERE id = (SELECT id ... WHERE status = 'AVAILABLE' LIMIT 1) AND status = 'AVAILABLE'`, the subquery picks a driver from its snapshot, and if another instance claims him first, the outer update waits, re-checks, matches nothing and updates zero rows. It's safe but useless: in my runs 146 to 149 of 300 requests came back empty with drivers still available. Adding `FOR NO KEY UPDATE` to the subquery makes its `LockRows` node wait, re-check and move on to the next driver, and all 300 were assigned. `SKIP LOCKED` goes further and doesn't wait at all.",
            },
            {
              question: "How does MySQL InnoDB store and expose row locks compared with PostgreSQL?",
              answer:
                "InnoDB keeps row locks in an in-memory lock system, attached to index records, and MySQL 8.0 exposes every one of them in `performance_schema.data_locks`: my waiting session showed `RECORD` locks `X,REC_NOT_GAP` on `PRIMARY` for `LOCK_DATA 7`, one `GRANTED`, one `WAITING`, plus `IX` table locks, and `data_lock_waits` named waiter and blocker. Range scans and non-unique indexes add gap and next-key locks that also block inserts. PostgreSQL writes row locks into the tuple header on disk and shows only waits in `pg_locks`.",
            },
            {
              question: "When would you choose SERIALIZABLE over explicit locking?",
              answer:
                "When the invariant spans many rows or rows that may not exist yet, and writing the right locks by hand is error-prone: \"at least one driver on duty per zone\", \"no overlapping bookings\". SERIALIZABLE makes every transaction behave as if run one at a time, at the cost of predicate-lock tracking and `40001` failures that every transaction path must retry, including at `COMMIT`. For a single-row claim, a conditional update is simpler, cheaper and portable; for a uniqueness rule, a constraint is cheaper still.",
            },
          ],
        },
        {
          type: "heading",
          text: "Scenario-Based",
        },
        {
          type: "qa",
          items: [
            {
              question: "After scaling the dispatch service from one pod to two, riders report drivers being assigned to two trips at once. There are no errors in the logs. What happened and what do you do?",
              answer:
                "The assignment is a check-then-act protected by a JVM lock (`synchronized` or similar), which only coordinates threads inside one pod. First, measure: `SELECT driver_id FROM trips WHERE status = 'ASSIGNED' GROUP BY driver_id HAVING count(*) > 1`. Fix the code by moving the check into the write (`UPDATE ... WHERE id = ? AND status = 'AVAILABLE'` and check the row count) or by locking the row in the transaction (`FOR NO KEY UPDATE`). Then clean up the duplicates and add a partial unique index as a safety net; it can't be created while duplicates exist (my `CREATE UNIQUE INDEX CONCURRENTLY` failed and left an invalid index). In my reproduction, two instances double-booked 71 to 139 of 300 trips; every fix brought it to 0.",
            },
            {
              question: "At peak, dispatch requests start timing out and the connection pool is exhausted. pg_stat_activity shows dozens of sessions with wait_event_type Lock, wait_event transactionid, all with the same pid in pg_blocking_pids. What do you look for?",
              answer:
                "One transaction is holding row locks and not finishing, and everyone who needs those rows queues behind it. Look at the blocking pid's `state`, `query`, `xact_start` and `state_change`: `idle in transaction` usually means application code locked rows and then did something slow (an HTTP call inside `@Transactional`) or leaked a connection without committing. Short term: terminate the blocker (`pg_terminate_backend`). Long term: move slow work outside the transaction, set `lock_timeout` so waiters fail fast with `55P03` instead of exhausting the pool, set `idle_in_transaction_session_timeout`, and enable `log_lock_waits`.",
            },
            {
              question: "Inserts into the trips table become slow whenever the driver-status job runs, although the job never touches trips. Why?",
              answer:
                "The job probably locks driver rows with `SELECT ... FOR UPDATE`. Inserting a trip runs a foreign-key check that takes `FOR KEY SHARE` on the referenced driver row, and `FOR KEY SHARE` conflicts with `FOR UPDATE`, so trip inserts wait for the job's transactions. In my test the insert waited until its 1 s `lock_timeout`, and the `CONTEXT` line showed the hidden `SELECT 1 FROM ONLY \"public\".\"drivers\" x ... FOR KEY SHARE OF x`. Switch the job to `FOR NO KEY UPDATE` (the insert then took 3 ms), and keep its transactions short.",
            },
            {
              question: "A team moved their wallet service from PostgreSQL to MySQL. The code reads the balance, checks it and updates it in a REPEATABLE READ transaction, and relied on 40001 retries for safety. Now balances occasionally go wrong. Why?",
              answer:
                "PostgreSQL's `REPEATABLE READ` fails a transaction that writes a row changed since its snapshot; InnoDB's doesn't. In InnoDB, the plain `SELECT` reads the snapshot but the `UPDATE` writes over the latest version without complaint, so concurrent debits silently overwrite each other. I saw it directly: a session read `AVAILABLE` from its snapshot, `FOR UPDATE` in the same transaction returned `ON_TRIP`, and its update overwrote the other session's committed trip; the two-instance run gave 146 double bookings with zero errors. Fix it portably: `UPDATE wallets SET balance = balance - ? WHERE rider_id = ? AND balance >= ?` and check the row count, or read with `SELECT ... FOR UPDATE`.",
            },
            {
              question: "You switched the trip-claim code to REPEATABLE READ to fix a race. Double bookings stopped, but the error rate went up and some riders now see 'something went wrong'. What did you miss?",
              answer:
                "`REPEATABLE READ` reports conflicts as `40001` serialization failures instead of preventing them, and the code doesn't retry. In my runs that was 121 to 149 failures per instance per 150 assignments under heavy contention. Add a retry wrapper that reruns the whole transaction on `40001` (and `40P01`) with a small randomised backoff and a cap, or better, replace the read-then-write with a conditional update, which has no serialization failures under `READ COMMITTED` and behaves the same on MySQL.",
            },
            {
              question: "A payout job and the dispatch service sometimes fail with 'deadlock detected'. Both update several driver rows in one transaction. What's going on and how do you fix it?",
              answer:
                "They lock the same rows in different orders: one locks driver 5 then 9, the other 9 then 5, and each waits for the other. PostgreSQL detects the cycle after `deadlock_timeout` (1 s by default) and aborts one with `40P01`. Fix the order: lock rows sorted by id (for example `SELECT ... WHERE id = ANY(?) ORDER BY id FOR NO KEY UPDATE` before updating), keep the transactions short, and retry `40P01` as a transient failure. The deadlock report in the server log names both statements and the rows.",
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
            "Run `DispatchService synchronized` as one process with eight threads, then as two processes with four threads each, and compare `double_assigned`.",
            "In two psql sessions, run `BEGIN; UPDATE drivers SET status = 'ON_TRIP' WHERE id = 40;` in the first, and the same statement with `AND status = 'AVAILABLE'` in the second. Commit the first and look at the second's row count.",
            "While one session holds `SELECT ... FOR UPDATE` on a driver, run `SELECT * FROM pg_locks WHERE NOT granted` and `SELECT pid, pg_blocking_pids(pid) FROM pg_stat_activity WHERE wait_event_type = 'Lock'` from a third session.",
            "Lock a driver `FOR UPDATE` in one session and insert a trip for him in another with `SET lock_timeout = '1s'`. Repeat with `FOR NO KEY UPDATE`.",
            "In `REPEATABLE READ`, read a driver, let another session update and commit him, then try `SELECT ... FOR UPDATE` on him in the first session. Try the same in MySQL.",
            "Create the partial unique index while duplicate active trips exist, using `CONCURRENTLY`, and then check `pg_index.indisvalid`.",
            "Remove `FOR NO KEY UPDATE` from `ClaimOneStatement` and run two instances.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 gives 0 double bookings with one process and dozens to more than a hundred with two. Step 2 prints `UPDATE 0` for the second session, after it waited for the first to commit. Step 3 shows an ungranted `transactionid` `ShareLock` and the holder's pid; there is no row-level entry for the holder. Step 4 fails with `canceling statement due to lock timeout` and a `FOR KEY SHARE` query in the `CONTEXT`, then succeeds at once with `FOR NO KEY UPDATE`. Step 5 is the engine difference: PostgreSQL fails with `could not serialize access due to concurrent update`, while MySQL returns the other session's committed values even though a plain `SELECT` in the same transaction still shows the old ones. Step 6 fails with `Key (driver_id)=(...) is duplicated` and leaves an index with `indisvalid = f` that must be dropped. Step 7 stays free of double bookings, but around half the requests get no driver.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHY         synchronized = a monitor in ONE JVM's heap
            2 instances = 2 heaps = 2 monitors = no coordination
            measured: 1 JVM 0/300 double bookings, 2 JVMs 71..139/300, no errors

FIXES       conditional UPDATE ... WHERE id = ? AND status = 'AVAILABLE'
              -> check rows: 1 won, 0 lost (READ COMMITTED re-checks newest row)
            SELECT ... FOR NO KEY UPDATE (FOR UPDATE only to delete / change key)
              -> waiters park on holder's transactionid, re-check, move on
            version column: WHERE id = ? AND version = ?  -> 0 rows = retry
            partial UNIQUE index -> 23505 on the loser (safety net, add it early)
            balance = balance - ? WHERE balance >= ?  (never read-modify-write)

ISOLATION   PG READ COMMITTED: re-check WHERE after waiting (plain WHERE id = lost update)
            PG REPEATABLE READ: 40001 on concurrent update; still allows write skew
            PG SERIALIZABLE: SSI, 40001 possibly at COMMIT; retry the whole txn
            MySQL REPEATABLE READ (default): SELECT = snapshot, UPDATE/FOR UPDATE =
              latest row, NO error -> 146/300 double bookings

INSIDE PG   row lock = xmax + HEAP_XMAX_LOCK_ONLY in the tuple, not in pg_locks
            waiter: tuple lock + ShareLock on holder's xid (granted = f)
            pg_stat_activity Lock/transactionid, pg_blocking_pids, pgrowlocks
            FK insert takes FOR KEY SHARE -> blocked only by FOR UPDATE

TIMEOUTS    lock_timeout -> 55P03   statement_timeout -> 57014   NOWAIT -> 55P03 now
            PG defaults 0 (forever); InnoDB innodb_lock_wait_timeout 50 s (1205)
            SET LOCAL per transaction; retry 40001 / 40P01, fail fast on 55P03`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A JVM lock coordinates threads, not servers. Once a service runs twice, the database is the only shared place to decide anything, so the check has to live in the SQL that writes: a conditional update with its row count, or a locking read in a short transaction.",
            "Back the decision with a constraint, set lock and statement timeouts, retry serialization failures as whole transactions, and don't trust isolation-level names across engines: PostgreSQL's `REPEATABLE READ` reports the conflict, MySQL's silently overwrites.",
            "Next comes SKIP LOCKED Job Queues, Idempotency and Distributed Locks: letting many instances take work from one table without waiting on each other's rows, making a retried request or a redelivered message safe to process twice, and when an advisory lock or a Redis lock is the right tool for something that isn't a row.",
          ],
        },
      ],
    },
  ],
};
