import type { Lesson } from "../types";

export const skipLockedAndIdempotency: Lesson = {
  slug: "skip-locked-and-idempotency",
  date: "2026-11-16",
  title: "SKIP LOCKED Job Queues, Idempotency and Distributed Locks",
  description:
    "Job queues, idempotency keys and distributed locks across servers, measured on PostgreSQL 16, MySQL 8.0 and Redis 7 with Java 21 JDBC: a payout_jobs table polled by 8 workers where no lock paid 2,290 to 2,577 duplicates for 400 jobs, plain FOR UPDATE was correct but no faster than one worker (59 to 66 jobs/s with 42 to 46 s spent waiting in the claim query) and FOR UPDATE SKIP LOCKED reached 399 to 569 jobs/s with every job paid exactly once, the row lock found in the tuple's xmax with pageinspect rather than in pg_locks, a waiter blocked on a transaction ID and then on the next locker, holding the transaction during work (instant crash recovery, but 30,000 dead rows VACUUM couldn't remove) against a status and locked_until lease whose crashed jobs came back after 2 s with attempts = 2 and whose slow worker paid twice while its completion was fenced off, 32 per-driver ordering inversions fixed by partitioning workers by key, an Idempotency-Key table where check-then-insert made 398 payouts for 200 requests and INSERT ON CONFLICT DO NOTHING made exactly 200 with 600 replays, 409 while in progress and 422 for a changed body, advisory locks for one leader, a session lock leaked through a connection pool that stopped the nightly job, ShedLock 6.9.2 running a job twice with lockAtLeastFor = 0 and three times when lockAtMostFor was shorter than the run, a Redis SET NX PX lock whose DEL release freed another holder's lock, a real 200 ms GC pause outliving a 100 ms lease, fencing tokens rejecting the stale write, a SKIP LOCKED outbox relay whose crash republished 50 events that the consumer deduplicated, batch claims from 2,660 to 85,837 jobs/s, MySQL 8 queues that hit 29,121 deadlocks in a minute at REPEATABLE READ and none at READ COMMITTED, and two instances of a ride-hailing backend paying 100 drivers twice from the same scheduled job until a unique payout row and deterministic bank keys made the job safe to run any number of times.",
  tags: ["Multithreading", "PostgreSQL", "Distributed Locks", "Idempotency"],
  sections: [
    {
      title: "What SKIP LOCKED Queues, Idempotency Keys and Distributed Locks Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Why synchronized Fails Across Servers: Database Locks and Conditional Updates, showed that a Java lock only protects threads inside one JVM. As soon as the ride-hailing backend runs on three instances, two of them can read the same row, both decide it's theirs, and both act. The fix there was to move the decision into the database: a row lock (`SELECT ... FOR UPDATE`) or a conditional `UPDATE ... WHERE status = 'pending'` that only one caller can win. This lesson builds the three tools that real backends make out of that idea.",
        },
        {
          type: "paragraph",
          text: "**A job queue in a table.** Payout jobs, emails to send, or outbox events waiting for Kafka sit in a table, and several worker processes poll it. With a plain `FOR UPDATE`, every worker locks the same oldest row and the rest **queue behind it**, so eight workers run like one. `FOR UPDATE SKIP LOCKED` tells the database to step over rows another transaction has locked and return the next free one, so the workers spread out without ever taking the same job. Around it go a lease (`status`, `locked_until`, `attempts`) so a crashed worker's jobs come back, and a decision about ordering, which a parallel queue gives up.",
        },
        {
          type: "paragraph",
          text: "**Idempotency keys.** A client that times out retries. If the request was a driver payout, a naive retry pays twice. An idempotency key is a client-chosen ID sent with the request (Stripe's `Idempotency-Key` header is the best-known example); the server records it under a **unique constraint**, and only the request that inserts it first does the work. Every repeat gets the stored response back. **Distributed locks.** When a scheduled job must run on only one instance, the instances agree on a leader: a Postgres advisory lock, a row in a ShedLock table, or a Redis key with an expiry. Each of those is a lease, and a lease can expire while its holder is still working, which is why the last tool here is the **fencing token**.",
        },
        {
          type: "paragraph",
          text: "Everything below was run on PostgreSQL 16.14 and MySQL 8.0.45 in Docker, Redis 7.4.8, and Java 21.0.13 JDBC programs (pgJDBC 42.7.14, MySQL Connector/J 9.5.0, HikariCP 6.3.0, ShedLock 6.9.2). It's the last lesson of the Multithreading track. Next comes the MySQL track, starting with How MySQL Runs a Query: Setup, Tables and Data Types.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Queues in database tables are as old as relational databases, and so is the problem of many consumers fighting over the head of the queue. Oracle used a skip-locked mode internally for its Advanced Queuing for years before documenting `SKIP LOCKED` in 11g. PostgreSQL and MySQL added it much later, which is why older Java code is full of workarounds (`LIMIT 1 OFFSET random()`, advisory locks per row, \"claim by UPDATE and retry\"). Idempotency keys came from payment APIs, where a retry that doubles a charge is the worst bug there is. Distributed locks went through a public argument in 2016, when Martin Kleppmann's critique of Redis' Redlock algorithm made fencing tokens widely known.",
        },
        {
          type: "table",
          headers: ["Year / version", "Change", "Why it matters here"],
          rows: [
            ["PostgreSQL 8.2 (2006)", "Advisory locks: `pg_advisory_lock`, `pg_try_advisory_lock`", "Application-defined locks keyed by a number, held by a session"],
            ["PostgreSQL 9.1 (2011)", "Transaction-scoped advisory locks (`pg_try_advisory_xact_lock`)", "Released automatically at COMMIT or ROLLBACK"],
            ["Redis 2.6.12 (2013)", "`SET key value NX PX ms` in one command", "An atomic \"create if absent, with expiry\": the basic Redis lock"],
            ["PostgreSQL 9.3 (2013)", "`FOR NO KEY UPDATE` and `FOR KEY SHARE` row lock modes", "Lighter row locks that don't block foreign-key checks"],
            ["PostgreSQL 9.5 (2016)", "`SKIP LOCKED` and `INSERT ... ON CONFLICT`", "The two statements this lesson is built on"],
            ["2016", "Kleppmann, \"How to do distributed locking\"; ShedLock's first releases", "Fencing tokens; a lock table for Spring `@Scheduled` jobs"],
            ["MySQL 8.0 (2018)", "`FOR UPDATE SKIP LOCKED` and `NOWAIT` in InnoDB", "The same queue pattern on MySQL"],
            ["2017 onwards", "Stripe documents its `Idempotency-Key` design; the IETF httpapi group drafts an `Idempotency-Key` header", "The header becomes a common API convention"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company's payout office, where clerks pay drivers from a tray of payout slips.",
        },
        {
          type: "list",
          items: [
            "**`FOR UPDATE` is every clerk reaching for the top slip.** The first clerk holds it; the others stand in line behind her, hands out, until she's done. Eight clerks, one at work.",
            "**`SKIP LOCKED` is \"if a slip is in someone's hand, take the next one\".** Everyone works at once, nobody pays the same slip twice, but slip 7 can be finished before slip 5.",
            "**A lease is a sticky note on the slip: \"Ravi has this until 10:40\".** Ravi can go to the bank without holding the tray. If he faints, the slip becomes free at 10:40. If he comes back at 10:45, someone else may already have paid it, and the note has the newer name on it.",
            "**An idempotency key is the receipt number the driver writes on the slip.** If the same receipt number shows up again, the clerk doesn't pay it again; she hands over a copy of the first receipt.",
            "**A fencing token is the numbered ticket at a deli counter.** The bank only accepts instructions with a number higher than the last one it saw, so a clerk holding an old ticket is turned away, however sure of herself she is.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a clerk always knows how long she's been away. A program doesn't. A process frozen by a GC pause has no idea time passed, so it can't check its own sticky note. That's the gap fencing tokens close.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/skip-locked-and-idempotency-workers.svg",
          alt: "A payout_jobs table ordered by id. Rows 1, 2 and 3 are locked by workers w1, w2 and w3; the lock is stored as the locker's transaction ID in the row's xmax, and pgrowlocks shows it, not pg_locks. Row 4 is pending and is taken by worker w4 using SKIP LOCKED. A red box for plain LIMIT 1 FOR UPDATE says w4 waits for w1's transaction (wait event transactionid): 8 workers on 400 jobs of 10 ms reached 59 to 66 jobs per second (1 worker: 68), with 42 to 46 seconds of worker time spent waiting in the claim query; with no lock at all there were 2,290 to 2,577 duplicate payments. A green box for SKIP LOCKED says 8 workers reached 399 to 569 jobs per second with 400 payments, 400 distinct and no duplicates, at the cost of ordering: 32 same-driver events ran out of order unless workers own a key range. A blue box shows the lease claim: an UPDATE that sets status running, locked_until now plus the lease, attempts plus one, using SKIP LOCKED, then commit; the work happens outside the transaction and completion checks locked_by and the attempt number. Bottom left: an idempotency flow for POST /payouts with an Idempotency-Key: INSERT INTO idempotency_keys ON CONFLICT DO NOTHING RETURNING; a returned row means this request owns the key and pays, storing 201 and the body; no row means 422 if the request hash differs, 409 if still in progress, or a replay of the stored response. 200 requests sent three times at once plus one late retry produced 200 payouts, against 800 with no key and 398 with check-then-insert and no unique constraint. Bottom right: one scheduled job across instances: pg_try_advisory_xact_lock with key 20261115 has one winner and is released by commit or rollback; a Redis lock is SET with a token, NX and PX 500 plus INCR for a fence, released by a Lua script that deletes only if the token matches; A pauses 800 ms, its lease expires, B gets fence 7, and A's write with fence 6 is rejected by WHERE fence less than 6. A real 200 ms full GC outlived a 100 ms Redis lease. A rules box: queue uses FOR UPDATE SKIP LOCKED, a short claim transaction and a lease with attempts as a token; retries use a unique key in the database to decide who is first and store and replay the response; one leader uses an advisory, ShedLock or Redis lock for efficiency and a unique row or fence for correctness.",
          caption: "A lock decides who works; a unique constraint decides what counts. Every tool in this lesson is one of the two, and the safe designs use both.",
        },
        {
          type: "heading",
          text: "Which tool answers which question",
        },
        {
          type: "table",
          headers: ["Question", "Tool", "Where the truth lives", "What happens on a crash"],
          rows: [
            ["Which worker takes this job?", "`FOR UPDATE SKIP LOCKED` in a claim query", "A row lock (the locker's xid in the tuple)", "Transaction rolls back, lock gone at once"],
            ["Who owns this job while it runs for minutes?", "A lease: `status`, `locked_by`, `locked_until`, `attempts`", "Ordinary columns, committed", "Job stays claimed until `locked_until` passes"],
            ["Has this request already been done?", "Idempotency key with a unique constraint", "A row in `idempotency_keys`", "Key row stays; a stuck `in_progress` needs a timeout"],
            ["Which instance runs the 02:00 job?", "Advisory lock, ShedLock row, Redis `SET NX PX`", "A lock in Postgres memory, a row, or a Redis key", "Session ends (advisory) or lease expires (ShedLock, Redis)"],
            ["Is this writer still the legitimate one?", "Fencing token checked by the storage", "A monotonically increasing number on the protected row", "A stale writer is rejected however late it wakes up"],
          ],
        },
        {
          type: "heading",
          text: "Row lock clauses and wait policies",
        },
        {
          type: "table",
          headers: ["Clause", "Locks", "If the row is locked by someone else", "Typical use"],
          rows: [
            ["`FOR UPDATE`", "Strongest row lock (also blocks FK checks on the key)", "Wait", "Read-then-update of one row"],
            ["`FOR NO KEY UPDATE`", "Row lock that lets FK inserts referencing the row continue", "Wait", "Same, when the key isn't changing (it's what a plain `UPDATE` takes)"],
            ["`FOR UPDATE NOWAIT`", "As `FOR UPDATE`", "Error immediately (Postgres 55P03, MySQL 3572)", "Fail fast instead of piling up"],
            ["`FOR UPDATE SKIP LOCKED`", "As `FOR UPDATE`, only the rows it returns", "Pretend the row isn't there", "Queues: several consumers, one table"],
            ["`pg_try_advisory_lock(k)`", "An application-defined number, not a row", "Returns `false`", "One leader for a job"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "Before measuring speed, I wanted to see what the server actually holds while three workers poll the queue. `LockPeek` opens three sessions: `worker-A` takes the oldest job with `FOR UPDATE`, `worker-B` asks for the same thing and blocks, and `worker-C` uses `SKIP LOCKED`. An observer session then reads `pg_stat_activity`, `pg_locks`, the `pgrowlocks` extension and the raw heap page through `pageinspect`.",
        },
        {
          type: "code",
          language: "sql",
          title: "schema.sql",
          code: `DROP TABLE IF EXISTS job_runs, payout_jobs;
CREATE TABLE payout_jobs (
    id            bigserial PRIMARY KEY,
    driver_id     int         NOT NULL,
    amount_paise  int         NOT NULL,
    status        text        NOT NULL DEFAULT 'pending',   -- pending, running, done, failed
    attempts      int         NOT NULL DEFAULT 0,
    locked_by     text,
    locked_until  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT clock_timestamp(),
    done_at       timestamptz
);
CREATE INDEX payout_jobs_pending ON payout_jobs (id) WHERE status = 'pending';
-- one row every time a worker actually "pays": duplicates show up here
CREATE TABLE job_runs (
    job_id   bigint      NOT NULL,
    worker   text        NOT NULL,
    seq      bigserial,
    at       timestamptz NOT NULL DEFAULT clock_timestamp()
);`,
        },
        {
          type: "code",
          language: "java",
          title: "LockPeek.java",
          code: `import java.sql.*;
import java.util.concurrent.*;

public class LockPeek {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect(String app) throws SQLException {
        Connection c = DriverManager.getConnection(URL + "?ApplicationName=" + app, "postgres", "lesson");
        return c;
    }
    static void print(Connection c, String title, String sql) throws SQLException {
        System.out.println("-- " + title);
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            ResultSetMetaData md = rs.getMetaData();
            StringBuilder h = new StringBuilder();
            for (int i = 1; i <= md.getColumnCount(); i++) h.append(String.format("%-" + width(md, i) + "s ", md.getColumnLabel(i)));
            System.out.println(h.toString().stripTrailing());
            while (rs.next()) {
                StringBuilder r = new StringBuilder();
                for (int i = 1; i <= md.getColumnCount(); i++) r.append(String.format("%-" + width(md, i) + "s ", rs.getString(i)));
                System.out.println(r.toString().stripTrailing());
            }
        }
    }
    static int width(ResultSetMetaData md, int i) throws SQLException { return Math.max(md.getColumnLabel(i).length(), 9); }

    static String claim(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            return rs.next() ? "id " + rs.getLong(1) : "no row";
        }
    }

    public static void main(String[] args) throws Exception {
        Connection obs = connect("observer");
        try (Statement s = obs.createStatement()) {
            s.execute("TRUNCATE payout_jobs, job_runs RESTART IDENTITY");
            s.execute("INSERT INTO payout_jobs (driver_id, amount_paise) SELECT 1000 + g, 50000 + g FROM generate_series(1, 5) g");
        }
        print(obs, "the plan", "EXPLAIN (COSTS OFF) SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");

        Connection a = connect("worker-A"), b = connect("worker-B"), c = connect("worker-C");
        for (Connection x : new Connection[] {a, b, c}) x.setAutoCommit(false);
        String forUpdate = "SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE";
        System.out.println("worker-A FOR UPDATE             -> " + claim(a, forUpdate));
        ExecutorService ex = Executors.newSingleThreadExecutor();
        Future<String> bResult = ex.submit(() -> claim(b, forUpdate));
        Thread.sleep(500);
        System.out.println("worker-B FOR UPDATE             -> still waiting after 500 ms: " + !bResult.isDone());
        System.out.println("worker-C FOR UPDATE SKIP LOCKED -> " + claim(c, forUpdate + " SKIP LOCKED"));

        print(obs, "pg_stat_activity", "SELECT application_name AS app, pid, state, wait_event_type, wait_event, " +
              "pg_blocking_pids(pid) AS blocked_by, backend_xid AS xid FROM pg_stat_activity " +
              "WHERE application_name LIKE 'worker-%' ORDER BY 1");
        print(obs, "pg_locks (relation locks on the table and transaction/tuple locks)",
              "SELECT a.application_name AS app, l.locktype, " +
              "coalesce(l.relation::regclass::text, '') AS relation, coalesce(l.page::text, '') AS page, " +
              "coalesce(l.tuple::text, '') AS tuple, coalesce(l.transactionid::text, '') AS xid, l.mode, l.granted " +
              "FROM pg_locks l JOIN pg_stat_activity a USING (pid) WHERE a.application_name LIKE 'worker-%' " +
              "AND l.locktype IN ('relation', 'tuple', 'transactionid') AND (l.relation IS NULL OR l.relation = 'payout_jobs'::regclass) " +
              "ORDER BY 1, 2");
        print(obs, "the row locks live in the tuples: pgrowlocks", "SELECT locked_row, locker, multi, xids, modes, pids FROM pgrowlocks('payout_jobs')");
        print(obs, "heap page 0 (pageinspect)", "SELECT lp, t_ctid, t_xmin, t_xmax, " +
              "to_hex(t_infomask) AS infomask, (t_infomask & 128) <> 0 AS xmax_lock_only, " +
              "(t_infomask & 64) <> 0 AS xmax_excl_lock, (t_infomask2 & 8192) <> 0 AS keys_updated " +
              "FROM heap_page_items(get_raw_page('payout_jobs', 0))");

        // A finishes job 1 and commits; B wakes up, rechecks row 1 (now 'done'), moves on to row 2... which C holds
        try (Statement s = a.createStatement()) { s.executeUpdate("UPDATE payout_jobs SET status = 'done' WHERE id = 1"); }
        a.commit();
        Thread.sleep(300);
        System.out.println("worker-A commits job 1; worker-B done after 300 ms? " + bResult.isDone());
        print(obs, "who blocks worker-B now", "SELECT application_name AS app, wait_event, pg_blocking_pids(pid) AS blocked_by " +
              "FROM pg_stat_activity WHERE application_name = 'worker-B'");
        try (Statement s = c.createStatement()) { s.executeUpdate("UPDATE payout_jobs SET status = 'done' WHERE id = 2"); }
        c.commit();
        System.out.println("worker-C commits job 2; worker-B's FOR UPDATE finally returns -> " + bResult.get());
        b.commit();
        ex.shutdown();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `docker exec lesson-pg psql -U postgres -d skip_locked_and_idempotency -c "CREATE EXTENSION pageinspect; CREATE EXTENSION pgrowlocks"
java -cp postgresql-42.7.14.jar LockPeek.java`,
        },
        {
          type: "output",
          text: `-- the plan
QUERY PLAN
Limit
  ->  LockRows
        ->  Index Scan using payout_jobs_pending on payout_jobs
              Filter: (status = 'pending'::text)
worker-A FOR UPDATE             -> id 1
worker-B FOR UPDATE             -> still waiting after 500 ms: true
worker-C FOR UPDATE SKIP LOCKED -> id 2
-- pg_stat_activity
app       pid       state     wait_event_type wait_event blocked_by xid
worker-A  1203      idle in transaction Client          ClientRead {}         38481
worker-B  1205      active    Lock            transactionid {1203}     null
worker-C  1206      idle in transaction Client          ClientRead {}         38482
-- pg_locks (relation locks on the table and transaction/tuple locks)
app       locktype  relation  page      tuple     xid       mode      granted
worker-A  relation  payout_jobs                               RowShareLock t
worker-A  transactionid                               38481     ExclusiveLock t
worker-B  relation  payout_jobs                               RowShareLock t
worker-B  transactionid                               38481     ShareLock f
worker-B  tuple     payout_jobs 0         1                   AccessExclusiveLock t
worker-C  relation  payout_jobs                               RowShareLock t
worker-C  transactionid                               38482     ExclusiveLock t
-- the row locks live in the tuples: pgrowlocks
locked_row locker    multi     xids      modes     pids
(0,1)      38481     f         {38481}   {"For Update"} {1203}
(0,2)      38482     f         {38482}   {"For Update"} {1206}
-- heap page 0 (pageinspect)
lp        t_ctid    t_xmin    t_xmax    infomask  xmax_lock_only xmax_excl_lock keys_updated
1         (0,1)     38480     38481     1c3       t              t              t
2         (0,2)     38480     38482     1c3       t              t              t
3         (0,3)     38480     0         903       f              f              f
4         (0,4)     38480     0         903       f              f              f
5         (0,5)     38480     0         903       f              f              f
worker-A commits job 1; worker-B done after 300 ms? false
-- who blocks worker-B now
app       wait_event blocked_by
worker-B  transactionid {1206}
worker-C commits job 2; worker-B's FOR UPDATE finally returns -> id 3`,
        },
        {
          type: "heading",
          text: "What the output says",
        },
        {
          type: "list",
          items: [
            "**The plan has a `LockRows` node between the scan and the `Limit`.** Rows come up from the index scan one at a time and `LockRows` locks each before passing it on. The `Filter: (status = 'pending')` is kept even though the partial index already implies it, because a row that was locked by someone else is **re-checked** after the wait (Postgres calls this EvalPlanQual), and by then it may no longer match.",
            "**A row lock isn't in `pg_locks`.** `worker-A` holds only a `RowShareLock` on the table (every `SELECT ... FOR UPDATE` takes it) and an `ExclusiveLock` on its own transaction ID, 38481. The row lock itself is written into the row: `pageinspect` shows `t_xmax = 38481` on tuple 1 with infomask `0x1c3`, which has `HEAP_XMAX_LOCK_ONLY` (0x80: xmax is a locker, not a deleter) and `HEAP_XMAX_EXCL_LOCK` (0x40) set, and `keys_updated` true, the `FOR UPDATE` strength. Untouched rows have `0x903`, which includes `HEAP_XMAX_INVALID`. That's why a million locked rows cost no lock-table memory: the lock is one field in each tuple, and `pgrowlocks` finds them by reading the pages.",
            "**A waiter waits for a transaction, not for a row.** `worker-B` found xid 38481 in the tuple's xmax and asked for a `ShareLock` on that **transaction ID** (`granted = f`), which it can only get when 38481 ends. It also holds a heavyweight `tuple` lock on `(0,1)`, which queues later waiters for the same row behind it in arrival order. `pg_stat_activity` shows the wait as `Lock / transactionid` and `pg_blocking_pids` names A's pid.",
            "**`SKIP LOCKED` doesn't wait at all.** `worker-C` read tuple 1, saw that its xmax belonged to a running transaction, and moved on to tuple 2. In the source this is the `LockWaitSkip` policy: `heap_lock_tuple` returns `TM_WouldBlock` instead of sleeping, and `ExecLockRows` simply drops the row and pulls the next one from the scan.",
            "**Plain `FOR UPDATE` queues behind every lock in turn.** When A committed, B woke up, re-checked row 1 (now `done`, so it no longer matched), pulled row 2 from the scan, and found C's lock on it: `pg_blocking_pids` changed from A's pid (1203) to C's (1206). B only got a row (id 3) after C committed too. With eight workers this chain is the whole story of the next section.",
          ],
        },
      ],
    },
    {
      title: "FOR UPDATE vs SKIP LOCKED, Measured",
      blocks: [
        {
          type: "paragraph",
          text: "`QueueBench` loads 400 payout jobs and runs workers that each loop: claim the oldest pending job, spend 10 ms on it (the stand-in for calling the bank), record a payment in `job_runs`, mark the job `done`, commit. Each worker has its own JDBC connection, so to Postgres they look exactly like workers in separate JVMs. It runs three claim queries, each with 1 and 8 workers: no lock at all, `FOR UPDATE`, and `FOR UPDATE SKIP LOCKED`. Duplicates are counted from `job_runs`: every row there is one payment made.",
        },
        {
          type: "code",
          language: "java",
          title: "QueueBench.java",
          code: `import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class QueueBench {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect() throws SQLException {
        return DriverManager.getConnection(URL, "postgres", "lesson");
    }

    static final Map<String, String> CLAIM = Map.of(
        "no lock",          "SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 1",
        "FOR UPDATE",       "SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE",
        "SKIP LOCKED",      "SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");

    static void reset(int jobs) throws SQLException {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("TRUNCATE payout_jobs, job_runs RESTART IDENTITY");
            s.execute("INSERT INTO payout_jobs (driver_id, amount_paise) " +
                      "SELECT 1000 + g % 50, 50000 + g FROM generate_series(1, " + jobs + ") g");
        }
    }

    static void run(String mode, int workers, int jobs, int workMs) throws Exception {
        reset(jobs);
        AtomicLong waitNanos = new AtomicLong();
        AtomicInteger emptyPolls = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        long t0 = System.nanoTime();
        List<Future<?>> fs = new ArrayList<>();
        for (int w = 1; w <= workers; w++) {
            String name = "w" + w;
            fs.add(pool.submit(() -> {
                try (Connection c = connect()) {
                    c.setAutoCommit(false);
                    PreparedStatement claim = c.prepareStatement(CLAIM.get(mode));
                    PreparedStatement log = c.prepareStatement("INSERT INTO job_runs (job_id, worker) VALUES (?, ?)");
                    PreparedStatement done = c.prepareStatement(
                        "UPDATE payout_jobs SET status = 'done', locked_by = ?, done_at = clock_timestamp() WHERE id = ?");
                    PreparedStatement left = c.prepareStatement("SELECT count(*) FROM payout_jobs WHERE status = 'pending'");
                    while (true) {
                        long w0 = System.nanoTime();
                        ResultSet rs = claim.executeQuery();
                        waitNanos.addAndGet(System.nanoTime() - w0);
                        if (!rs.next()) {
                            c.commit();
                            ResultSet r2 = left.executeQuery(); r2.next();
                            c.commit();
                            if (r2.getLong(1) == 0) return null;
                            emptyPolls.incrementAndGet();
                            continue;
                        }
                        long id = rs.getLong(1);
                        Thread.sleep(workMs);                       // "call the bank": the work, inside the transaction
                        log.setLong(1, id); log.setString(2, name); log.executeUpdate();
                        done.setString(1, name); done.setLong(2, id); done.executeUpdate();
                        c.commit();
                    }
                }
            }));
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        try (Connection c = connect(); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT count(*), count(DISTINCT job_id), " +
                 "(SELECT count(*) FROM payout_jobs WHERE status = 'done') FROM job_runs")) {
            rs.next();
            System.out.printf("%-12s workers=%d jobs=%d  %5d ms  %6.1f jobs/s  payments=%d distinct=%d duplicates=%d  " +
                    "time in claim query=%.1f s  empty polls=%d%n",
                mode, workers, jobs, ms, jobs * 1000.0 / ms, rs.getLong(1), rs.getLong(2), rs.getLong(1) - rs.getLong(2),
                waitNanos.get() / 1e9, emptyPolls.get());
        }
    }

    public static void main(String[] args) throws Exception {
        int jobs = Integer.parseInt(args.length > 0 ? args[0] : "400");
        int workMs = Integer.parseInt(args.length > 1 ? args[1] : "10");
        System.out.println("each job takes " + workMs + " ms of work; 1 worker would need about " + (jobs * workMs / 1000.0) + " s");
        for (String mode : List.of("no lock", "FOR UPDATE", "SKIP LOCKED"))
            for (int workers : new int[] {1, 8})
                run(mode, workers, jobs, workMs);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m -cp postgresql-42.7.14.jar QueueBench.java",
        },
        {
          type: "output",
          text: `each job takes 10 ms of work; 1 worker would need about 4.0 s
no lock      workers=1 jobs=400   6605 ms    60.6 jobs/s  payments=400 distinct=400 duplicates=0  time in claim query=0.3 s  empty polls=0
no lock      workers=8 jobs=400   6069 ms    65.9 jobs/s  payments=2722 distinct=400 duplicates=2322  time in claim query=1.7 s  empty polls=0
FOR UPDATE   workers=1 jobs=400   5847 ms    68.4 jobs/s  payments=400 distinct=400 duplicates=0  time in claim query=0.2 s  empty polls=0
FOR UPDATE   workers=8 jobs=400   6781 ms    59.0 jobs/s  payments=400 distinct=400 duplicates=0  time in claim query=46.2 s  empty polls=0
SKIP LOCKED  workers=1 jobs=400   7878 ms    50.8 jobs/s  payments=400 distinct=400 duplicates=0  time in claim query=0.7 s  empty polls=0
SKIP LOCKED  workers=8 jobs=400   1003 ms   398.8 jobs/s  payments=400 distinct=400 duplicates=0  time in claim query=0.5 s  empty polls=7`,
        },
        {
          type: "list",
          items: [
            "**No lock, 8 workers: 2,722 payments for 400 jobs.** Every worker read the same oldest `pending` row, slept, paid, and marked it done; the next ones did the same until the commit became visible. Over three runs it was 2,290 to 2,577 duplicate payments (2,322 in the run above). That's the bug from the previous lesson, at queue scale.",
            "**`FOR UPDATE`, 8 workers: correct, and no faster than one worker** (59.0 to 65.8 jobs/s over three runs, against 68.4 for a single worker). The column that explains it is **time in claim query: 42 to 46 seconds** of the workers' combined time, in a run that lasted 6 to 7 seconds. Seven workers were always parked on the head row's transaction ID, exactly as in `LockPeek`.",
            "**`SKIP LOCKED`, 8 workers: 399 to 569 jobs/s, 400 payments, 400 distinct, zero duplicates.** That's 6 to 8 times one worker, close to the ideal for 8 workers on an 8-core machine that was also running other benchmarks. Time in the claim query fell to under a second.",
            "**The `empty polls` column** counts claims that returned no row while jobs were still pending: at the end of the run, the last few jobs were all locked by other workers, so a worker found nothing to do. A real worker sleeps briefly (or uses `LISTEN/NOTIFY`) on an empty poll instead of spinning.",
            "One worker was slower than the 4 seconds of pure work (5.8 to 7.9 s) because each job also pays for a commit and its WAL flush. That fixed per-job cost is what batching attacks in the Performance section.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Don't confuse correct with parallel",
          text: "A queue built on plain `FOR UPDATE` passes every correctness test you'll write: no duplicates, no lost jobs. It only fails the load test, and in production that looks like \"we scaled from 2 to 8 pods and throughput didn't move\".",
        },
      ],
    },
    {
      title: "Claim, Then Process: Leases Instead of Long Transactions",
      blocks: [
        {
          type: "paragraph",
          text: "`QueueBench` holds the row lock for the whole job: the transaction opens, the bank is called, the transaction commits. That's the simplest design, and it has one great property: if the worker dies, its transaction dies with it and the jobs are free again immediately. Its costs show up when jobs are slow: every in-flight job holds a database connection in `idle in transaction`, and every open transaction holds back VACUUM for the whole database.",
        },
        {
          type: "code",
          language: "java",
          title: "TxHeld.java",
          code: `import java.sql.*;
import java.util.*;

public class TxHeld {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect(String app) throws SQLException {
        return DriverManager.getConnection(URL + "?ApplicationName=" + app, "postgres", "lesson");
    }
    static long T0 = System.nanoTime();
    static void log(String who, String msg) { System.out.printf("%5d ms  %-8s %s%n", (System.nanoTime() - T0) / 1_000_000, who, msg); }
    static List<Long> claimLocked(Connection c, int n) throws SQLException {
        List<Long> ids = new ArrayList<>();
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                "SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT " + n + " FOR UPDATE SKIP LOCKED")) {
            while (rs.next()) ids.add(rs.getLong(1));
        }
        return ids;
    }
    static String one(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) { rs.next(); return rs.getString(1); }
    }

    public static void main(String[] args) throws Exception {
        try (Connection c = connect("setup"); Statement s = c.createStatement()) {
            s.execute("TRUNCATE payout_jobs, job_runs RESTART IDENTITY");
            s.execute("INSERT INTO payout_jobs (driver_id, amount_paise) SELECT 1000 + g, 50000 + g FROM generate_series(1, 8) g");
            s.execute("DROP TABLE IF EXISTS driver_locations");
            s.execute("CREATE TABLE driver_locations (driver_id int PRIMARY KEY, lat float8, lng float8) WITH (autovacuum_enabled = off)");
            s.execute("INSERT INTO driver_locations SELECT g, 22.5, 88.3 FROM generate_series(1, 10000) g");
        }
        Connection obs = connect("observer");

        System.out.println("=== a worker that holds its transaction open while it works, then crashes");
        Connection w1 = connect("w1");
        w1.setAutoCommit(false);
        log("w1", "locked " + claimLocked(w1, 4) + " and is 'calling the bank' inside the transaction");
        log("observer", "w1 state: " + one(obs, "SELECT state || ', xid ' || backend_xid FROM pg_stat_activity WHERE application_name = 'w1'"));

        // Meanwhile the rest of the system keeps updating hot rows
        try (Statement s = obs.createStatement()) {
            for (int i = 0; i < 3; i++) s.executeUpdate("UPDATE driver_locations SET lat = lat + 0.0001");
        }
        log("observer", "updated 10,000 driver locations 3 times; VACUUM says:");
        vacuum(obs);

        w1.abort(Runnable::run);                    // the process dies: socket closed, no COMMIT, no ROLLBACK
        log("w1", "connection dropped (crash)");
        Thread.sleep(100);
        Connection w2 = connect("w2");
        w2.setAutoCommit(false);
        log("w2", "locked " + claimLocked(w2, 4) + " immediately: the crashed transaction was rolled back");
        w2.rollback();
        log("observer", "VACUUM again, with no long transaction open:");
        vacuum(obs);

        System.out.println("=== idle_in_transaction_session_timeout as a safety net");
        Connection w3 = connect("w3");
        try (Statement s = w3.createStatement()) { s.execute("SET idle_in_transaction_session_timeout = '1s'"); }
        w3.setAutoCommit(false);
        log("w3", "locked " + claimLocked(w3, 2) + ", then stalls for 1.5 s between statements");
        Thread.sleep(1500);
        try (Statement s = w3.createStatement()) {
            s.executeUpdate("UPDATE payout_jobs SET status = 'done' WHERE id = 1");
        } catch (SQLException e) {
            log("w3", "SQLState " + e.getSQLState() + ": " + e.getMessage().lines().findFirst().orElse(""));
        }
        log("observer", "rows still pending: " + one(obs, "SELECT count(*) FROM payout_jobs WHERE status = 'pending'"));
    }

    static void vacuum(Connection obs) throws SQLException {
        try (Statement s = obs.createStatement()) {
            s.execute("VACUUM (VERBOSE) driver_locations");
            for (SQLWarning w = s.getWarnings(); w != null; w = w.getNextWarning())
                for (String line : w.getMessage().split("\\n"))
                    if (line.contains("tuples:") || line.contains("removable cutoff")) System.out.println("          " + line.trim());
        }
    }
}`,
        },
        {
          type: "output",
          text: `=== a worker that holds its transaction open while it works, then crashes
  784 ms  w1       locked [1, 2, 3, 4] and is 'calling the bank' inside the transaction
  792 ms  observer w1 state: idle in transaction, xid 38577
 1098 ms  observer updated 10,000 driver locations 3 times; VACUUM says:
          tuples: 0 removed, 40000 remain, 30000 are dead but not yet removable
          removable cutoff: 38577, which was 4 XIDs old when operation ended
 1110 ms  w1       connection dropped (crash)
 1250 ms  w2       locked [1, 2, 3, 4] immediately: the crashed transaction was rolled back
 1253 ms  observer VACUUM again, with no long transaction open:
          tuples: 30000 removed, 10000 remain, 0 are dead but not yet removable
          removable cutoff: 38582, which was 0 XIDs old when operation ended
=== idle_in_transaction_session_timeout as a safety net
 1305 ms  w3       locked [1, 2], then stalls for 1.5 s between statements
 2811 ms  w3       SQLState 25P03: FATAL: terminating connection due to idle-in-transaction timeout
 2813 ms  observer rows still pending: 8`,
        },
        {
          type: "list",
          items: [
            "**The crash recovery is instant.** `abort()` closes the socket without a `COMMIT` or `ROLLBACK`, like a killed pod. Postgres noticed the closed connection, rolled the transaction back, and `w2` locked jobs 1 to 4 140 ms later (100 ms of that was my program's own sleep). No timeout, no cleanup job.",
            "**But while `w1` was \"calling the bank\", VACUUM couldn't clean anything.** The 30,000 dead row versions in `driver_locations` (a completely different table) were \"dead but not yet removable\", because `w1`'s open transaction (xid 38577) was the oldest in the database and set the removable cutoff. The moment it was gone, the same VACUUM removed all 30,000. A worker that holds a transaction open for a 30-second bank call holds back cleanup for 30 seconds; a stuck one holds it back for hours, and every hot table bloats.",
            "**`idle_in_transaction_session_timeout` is the safety net**, here set per session to 1 s: the server killed `w3`'s connection with SQLState `25P03` once it had been idle inside a transaction for longer than that, and its two jobs went back to `pending`. Set it on the worker's connection (or role), not globally, since a global value also kills legitimate admin sessions.",
          ],
        },
        {
          type: "heading",
          text: "The lease version",
        },
        {
          type: "paragraph",
          text: "The alternative is **claim, commit, then process**: a short transaction marks the jobs as `running`, records who took them and until when (`locked_until`), and bumps `attempts`. The slow work happens with **no transaction open**. Completion is a second short transaction that only counts if the worker still owns that attempt. A job whose lease has expired is claimable again, which is how a crashed worker's jobs come back.",
        },
        {
          type: "code",
          language: "java",
          title: "LeaseQueue.java",
          code: `import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

public class LeaseQueue {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect(String app) throws SQLException {
        return DriverManager.getConnection(URL + "?ApplicationName=" + app, "postgres", "lesson");
    }
    static long T0;
    static synchronized void log(String who, String msg) {
        System.out.printf("%5d ms  %-3s %s%n", (System.nanoTime() - T0) / 1_000_000, who, msg);
    }

    // Short transaction: claim up to n jobs (new ones, or ones whose lease expired), commit, return [id, attempt]
    static final String CLAIM = """
        UPDATE payout_jobs
           SET status = 'running', locked_by = ?, locked_until = now() + make_interval(secs => ?),
               attempts = attempts + 1
         WHERE id IN (SELECT id FROM payout_jobs
                       WHERE status = 'pending' OR (status = 'running' AND locked_until < now())
                       ORDER BY id LIMIT ? FOR UPDATE SKIP LOCKED)
        RETURNING id, attempts""";
    // Completion only counts if this worker still owns this attempt (attempts acts as a fencing token)
    static final String COMPLETE = """
        UPDATE payout_jobs SET status = 'done', done_at = clock_timestamp(), locked_until = NULL
         WHERE id = ? AND status = 'running' AND locked_by = ? AND attempts = ?""";

    static List<long[]> claim(Connection c, String me, double leaseSec, int n) throws SQLException {
        List<long[]> got = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(CLAIM)) {
            ps.setString(1, me); ps.setDouble(2, leaseSec); ps.setInt(3, n);
            try (ResultSet rs = ps.executeQuery()) { while (rs.next()) got.add(new long[] {rs.getLong(1), rs.getLong(2)}); }
        }
        got.sort(Comparator.comparingLong(a -> a[0]));
        return got;
    }
    static void pay(Connection c, long id, String me) throws SQLException {   // the side effect: one row per bank transfer
        try (PreparedStatement ps = c.prepareStatement("INSERT INTO job_runs (job_id, worker) VALUES (?, ?)")) {
            ps.setLong(1, id); ps.setString(2, me); ps.executeUpdate();
        }
    }
    static boolean complete(Connection c, long id, String me, long attempt) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(COMPLETE)) {
            ps.setLong(1, id); ps.setString(2, me); ps.setLong(3, attempt);
            return ps.executeUpdate() == 1;
        }
    }
    static String ids(List<long[]> l) { return l.stream().map(a -> a[0] + (a[1] > 1 ? "(attempt " + a[1] + ")" : "")).toList().toString(); }

    static void reset(int jobs) throws SQLException {
        try (Connection c = connect("setup"); Statement s = c.createStatement()) {
            s.execute("TRUNCATE payout_jobs, job_runs RESTART IDENTITY");
            s.execute("INSERT INTO payout_jobs (driver_id, amount_paise) SELECT 1000 + g, 50000 + g FROM generate_series(1, " + jobs + ") g");
        }
    }
    static void summary() throws SQLException {
        try (Connection c = connect("check"); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT (SELECT count(*) FROM payout_jobs WHERE status = 'done'), " +
                     "(SELECT count(*) FROM job_runs), (SELECT count(DISTINCT job_id) FROM job_runs), " +
                     "(SELECT string_agg(id || ':' || attempts, ' ' ORDER BY id) FROM payout_jobs WHERE attempts > 1)")) {
            rs.next();
            System.out.printf("          done=%d  bank transfers=%d  distinct jobs paid=%d  jobs with attempts>1: %s%n",
                    rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getString(4));
        }
    }

    // Healthy worker: claim a batch, commit, do the slow work OUTSIDE any transaction, complete each
    static Callable<Void> worker(String me, double leaseSec, int batch, long workMs) {
        return () -> {
            try (Connection c = connect(me)) {
                while (true) {
                    List<long[]> jobs = claim(c, me, leaseSec, batch);
                    if (jobs.isEmpty()) {
                        try (Statement s = c.createStatement();
                             ResultSet rs = s.executeQuery("SELECT count(*) FROM payout_jobs WHERE status <> 'done'")) {
                            rs.next();
                            if (rs.getLong(1) == 0) break;
                        }
                        Thread.sleep(250);                      // poll interval
                        continue;
                    }
                    log(me, "claimed " + ids(jobs));
                    for (long[] j : jobs) {
                        Thread.sleep(workMs);
                        pay(c, j[0], me);
                        if (!complete(c, j[0], me, j[1])) log(me, "LOST the lease on job " + j[0] + " before completing it");
                    }
                }
            }
            return null;
        };
    }

    public static void main(String[] args) throws Exception {
        System.out.println("=== 1. lease of 2 s, w1 claims 4 jobs and crashes");
        reset(12);
        T0 = System.nanoTime();
        try (Connection c = connect("w1")) {
            log("w1", "claimed " + ids(claim(c, "w1", 2.0, 4)) + " ... and the process dies");
        }
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Future<Void>> fs = List.of(pool.submit(worker("w2", 2.0, 4, 50)), pool.submit(worker("w3", 2.0, 4, 50)));
        for (Future<Void> f : fs) f.get();
        summary();

        System.out.println("=== 2. lease of 1 s, but w1's bank call takes 1.5 s (a GC pause, a slow API)");
        reset(1);
        T0 = System.nanoTime();
        Future<Void> slow = pool.submit(() -> {
            try (Connection c = connect("w1")) {
                List<long[]> jobs = claim(c, "w1", 1.0, 1);
                log("w1", "claimed " + ids(jobs) + ", calling the bank...");
                Thread.sleep(1500);
                pay(c, jobs.get(0)[0], "w1");
                log("w1", "bank call returned, transfer made; complete() updated a row: " + complete(c, jobs.get(0)[0], "w1", jobs.get(0)[1]));
            }
            return null;
        });
        Thread.sleep(1200);
        try (Connection c = connect("w2")) {
            List<long[]> jobs = claim(c, "w2", 1.0, 1);
            log("w2", "claimed " + ids(jobs) + " (w1's lease expired)");
            pay(c, jobs.get(0)[0], "w2");
            log("w2", "transfer made; complete() updated a row: " + complete(c, jobs.get(0)[0], "w2", jobs.get(0)[1]));
        }
        slow.get();
        summary();
        pool.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `=== 1. lease of 2 s, w1 claims 4 jobs and crashes
   48 ms  w1  claimed [1, 2, 3, 4] ... and the process dies
   78 ms  w2  claimed [5, 6, 7, 8]
   83 ms  w3  claimed [9, 10, 11, 12]
 2069 ms  w2  claimed [1(attempt 2)]
 2070 ms  w3  claimed [2(attempt 2), 3(attempt 2), 4(attempt 2)]
          done=12  bank transfers=12  distinct jobs paid=12  jobs with attempts>1: 1:2 2:2 3:2 4:2
=== 2. lease of 1 s, but w1's bank call takes 1.5 s (a GC pause, a slow API)
   14 ms  w1  claimed [1], calling the bank...
 1227 ms  w2  claimed [1(attempt 2)] (w1's lease expired)
 1233 ms  w2  transfer made; complete() updated a row: true
 1526 ms  w1  bank call returned, transfer made; complete() updated a row: false
          done=1  bank transfers=2  distinct jobs paid=1  jobs with attempts>1: 1:2`,
        },
        {
          type: "list",
          items: [
            "**Crash recovery costs one lease length.** `w1` claimed jobs 1 to 4 and vanished. `w2` and `w3` skipped them (they were `running` with a future `locked_until`) and processed 5 to 12. At 2,069 ms, two seconds after the claim, the leases expired, the claim query's `OR (status = 'running' AND locked_until < now())` matched them, and they were re-claimed with `attempts = 2`. All 12 jobs paid exactly once. Note how `SKIP LOCKED` still matters inside the claim: `w2` and `w3` polled at the same moment, and `w2` got job 1 while `w3` got 2, 3 and 4, with no overlap.",
            "**A lease can expire while its owner is alive.** In scenario 2, `w1`'s bank call took 1.5 s against a 1 s lease. `w2` legitimately re-claimed the job and paid it. When `w1` came back, it **also** paid: two bank transfers for one job. Its `complete()` returned `false`, because the `WHERE ... AND locked_by = ? AND attempts = ?` no longer matched: the attempt number works as a fencing token for the job row, so `w1` can't mark the job done or overwrite `w2`'s result.",
            "**What the fence can't do is take back the transfer.** The side effect left the database before the check. That's why a lease-based queue needs the next section: the bank call must carry an idempotency key derived from the job (`payout:job-1`), not from the attempt, so the bank itself refuses the second transfer. Leases make a queue **at-least-once**; idempotency is what makes at-least-once safe.",
          ],
        },
        {
          type: "table",
          headers: ["", "Hold the transaction (QueueBench)", "Lease (LeaseQueue)"],
          rows: [
            ["Worker crash", "Jobs free in milliseconds", "Jobs free after `locked_until`"],
            ["Connections", "One per in-flight job, `idle in transaction`", "Only during claim and complete"],
            ["VACUUM", "Held back for the job's duration", "Not affected"],
            ["Slow job beyond the limit", "`idle_in_transaction_session_timeout` kills it, the job reruns", "Lease expires, the job reruns while the first run may still finish"],
            ["Good for", "Short jobs (tens of milliseconds) touching only the database", "Jobs that call other systems or take seconds"],
          ],
        },
      ],
    },
    {
      title: "Ordering: What SKIP LOCKED Gives Up",
      blocks: [
        {
          type: "paragraph",
          text: "`ORDER BY id` in the claim query means each worker takes the oldest **free** job, not that jobs finish in order. With jobs of different lengths, a younger job often finishes first. That's harmless for independent payouts and wrong for events that must apply in sequence for one key: \"driver earned 120\" then \"payout of the balance\" then \"reversal\". `Ordering` runs 400 events for 6 drivers on 8 workers with 2 to 15 ms of work each, and counts inversions from the order of rows in `job_runs`.",
        },
        {
          type: "code",
          language: "java",
          title: "Ordering.java",
          code: `import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

public class Ordering {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect() throws SQLException { return DriverManager.getConnection(URL, "postgres", "lesson"); }

    static void run(String mode, int workers) throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("TRUNCATE payout_jobs, job_runs RESTART IDENTITY");
            // 400 events for 6 drivers: each driver gets about 67 events in id order (e.g. earn, earn, adjust, payout ...)
            s.execute("INSERT INTO payout_jobs (driver_id, amount_paise) SELECT 1000 + g % 6, g FROM generate_series(1, 400) g");
        }
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        List<Future<?>> fs = new ArrayList<>();
        long t0 = System.nanoTime();
        for (int w = 0; w < workers; w++) {
            int me = w;
            String where = mode.equals("SKIP LOCKED") ? "status = 'pending'"
                         : "status = 'pending' AND driver_id % " + workers + " = " + me;   // each worker owns a slice of drivers
            fs.add(pool.submit(() -> {
                Random rnd = new Random(me);
                try (Connection c = connect()) {
                    c.setAutoCommit(false);
                    PreparedStatement claim = c.prepareStatement(
                        "SELECT id FROM payout_jobs WHERE " + where + " ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");
                    PreparedStatement done = c.prepareStatement("UPDATE payout_jobs SET status = 'done' WHERE id = ?");
                    PreparedStatement log = c.prepareStatement("INSERT INTO job_runs (job_id, worker) VALUES (?, ?)");
                    while (true) {
                        ResultSet rs = claim.executeQuery();
                        if (!rs.next()) { c.commit(); return null; }
                        long id = rs.getLong(1);
                        Thread.sleep(2 + rnd.nextInt(14));               // 2 to 15 ms of work
                        log.setLong(1, id); log.setString(2, "w" + me); log.executeUpdate();
                        done.setLong(1, id); done.executeUpdate();
                        c.commit();
                    }
                }
            }));
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        try (Connection c = connect(); Statement s = c.createStatement(); ResultSet rs = s.executeQuery("""
                WITH r AS (SELECT r.job_id, j.driver_id, r.seq,
                                  lag(r.job_id) OVER (ORDER BY r.seq) AS prev_global,
                                  lag(r.job_id) OVER (PARTITION BY j.driver_id ORDER BY r.seq) AS prev_same_driver
                             FROM job_runs r JOIN payout_jobs j ON j.id = r.job_id)
                SELECT count(*) FILTER (WHERE job_id < prev_global)      AS global_inversions,
                       count(*) FILTER (WHERE job_id < prev_same_driver) AS same_driver_inversions,
                       count(DISTINCT driver_id) FILTER (WHERE job_id < prev_same_driver) AS drivers_affected
                  FROM r""")) {
            rs.next();
            System.out.printf("%-26s %4d ms  finished before an older job: %3d of 400   same driver out of order: %3d (%d of 6 drivers)%n",
                    mode, ms, rs.getLong(1), rs.getLong(2), rs.getLong(3));
        }
    }

    public static void main(String[] args) throws Exception {
        run("SKIP LOCKED", 8);
        run("partitioned by driver_id", 8);
    }
}`,
        },
        {
          type: "output",
          text: `SKIP LOCKED                1409 ms  finished before an older job: 164 of 400   same driver out of order:  32 (6 of 6 drivers)
partitioned by driver_id    895 ms  finished before an older job: 190 of 400   same driver out of order:   0 (0 of 6 drivers)
SKIP LOCKED                 696 ms  finished before an older job: 161 of 400   same driver out of order:  32 (6 of 6 drivers)
partitioned by driver_id    801 ms  finished before an older job: 188 of 400   same driver out of order:   0 (0 of 6 drivers)`,
        },
        {
          type: "list",
          items: [
            "**Around 40% of jobs finished before an older job** in both modes (161 to 193 of 400). Global FIFO is gone the moment you have two workers, with or without `SKIP LOCKED`.",
            "**Plain `SKIP LOCKED` broke per-driver order 32 times in each run, for all 6 drivers.** Two events for the same driver were in flight on different workers, and the later one finished first.",
            "**Partitioning by key fixed it: 0 per-driver inversions.** Each worker only claims drivers where `driver_id % 8` equals its number, so one driver's events are always handled by one worker, in order. The cost is that a hot key can only use one worker, and here 2 of the 8 workers had no drivers at all (6 drivers, 8 slices). Kafka makes the same trade with partitions.",
            "Other ways to get per-key order: claim only the oldest pending job per key (`DISTINCT ON (driver_id)` with a check that no job for that driver is `running`), or put a per-key advisory lock in the claim. Both cost more per claim; partitioning is the simplest.",
          ],
        },
      ],
    },
    {
      title: "Idempotency Keys: Retrying a Payout Safely",
      blocks: [
        {
          type: "paragraph",
          text: "An operation is **idempotent** if doing it twice has the same effect as doing it once. \"Set the driver's status to offline\" is; \"pay the driver 850 rupees\" isn't. Networks force retries: a mobile client whose request timed out doesn't know whether the server never got it or processed it and lost the reply, so it sends it again. The client generates a unique key per logical operation (a UUID) and sends the same key on every retry; the server turns \"have I done this?\" into a **database uniqueness question**.",
        },
        {
          type: "code",
          language: "sql",
          title: "idem.sql",
          code: `DROP TABLE IF EXISTS idempotency_keys, idempotency_keys_nounique, payouts;
CREATE TABLE payouts (
    id            bigserial PRIMARY KEY,
    driver_id     int         NOT NULL,
    amount_paise  int         NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE idempotency_keys (
    idem_key       text        PRIMARY KEY,                  -- the unique constraint does the real work
    request_hash   text        NOT NULL,                     -- same key + different body = client bug
    status         text        NOT NULL DEFAULT 'in_progress',
    response_code  int,
    response_body  text,
    created_at     timestamptz NOT NULL DEFAULT now()
);
-- the same table without the constraint, to show what check-then-insert does without it
CREATE TABLE idempotency_keys_nounique (LIKE idempotency_keys INCLUDING DEFAULTS);`,
        },
        {
          type: "paragraph",
          text: "`Idempotency` simulates the payout API under retries. 200 logical payout requests are each sent **three times at once** (the original and two client retries fired by timeouts, all in flight together), then each is sent **once more, much later** (the app came back online). Five server implementations get the same traffic through a HikariCP pool of 10 connections:",
        },
        {
          type: "code",
          language: "java",
          title: "Idempotency.java",
          code: `import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class Idempotency {
    record Response(int code, String body, boolean replayed) { }

    static HikariDataSource ds;
    static final int WORK_MS = 20;                              // the payout's processing time / the bank call

    static String hash(int driver, int amount) { return Integer.toHexString(Objects.hash(driver, amount)); }

    static long insertPayout(Connection c, int driver, int amount) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("INSERT INTO payouts (driver_id, amount_paise) VALUES (?, ?) RETURNING id")) {
            ps.setInt(1, driver); ps.setInt(2, amount);
            try (ResultSet rs = ps.executeQuery()) { rs.next(); return rs.getLong(1); }
        }
    }

    static Response handle(String mode, String key, int driver, int amount) throws Exception {
        try (Connection c = ds.getConnection()) {
            switch (mode) {
                case "no idempotency key" -> {
                    c.setAutoCommit(false);
                    Thread.sleep(WORK_MS);
                    long id = insertPayout(c, driver, amount);
                    c.commit();
                    return new Response(201, "{\\"payout_id\\":" + id + "}", false);
                }
                case "check, then insert (no constraint)", "check, then insert (PRIMARY KEY)" -> {
                    String table = mode.contains("no constraint") ? "idempotency_keys_nounique" : "idempotency_keys";
                    c.setAutoCommit(false);
                    try (PreparedStatement ps = c.prepareStatement("SELECT response_code, response_body FROM " + table + " WHERE idem_key = ?")) {
                        ps.setString(1, key);
                        ResultSet rs = ps.executeQuery();
                        if (rs.next()) { c.commit(); return new Response(rs.getInt(1), rs.getString(2), true); }
                    }
                    Thread.sleep(WORK_MS);
                    long id = insertPayout(c, driver, amount);
                    String body = "{\\"payout_id\\":" + id + "}";
                    try (PreparedStatement ps = c.prepareStatement("INSERT INTO " + table +
                            " (idem_key, request_hash, status, response_code, response_body) VALUES (?, ?, 'completed', 201, ?)")) {
                        ps.setString(1, key); ps.setString(2, hash(driver, amount)); ps.setString(3, body);
                        ps.executeUpdate();
                        c.commit();
                        return new Response(201, body, false);
                    } catch (SQLException e) {
                        c.rollback();                              // 23505: the payout above is rolled back too
                        return new Response(500, "SQLState " + e.getSQLState(), false);
                    }
                }
                case "ON CONFLICT DO NOTHING, one transaction" -> {
                    c.setAutoCommit(false);
                    if (claimKey(c, key, driver, amount)) {
                        Thread.sleep(WORK_MS);
                        long id = insertPayout(c, driver, amount);
                        String body = "{\\"payout_id\\":" + id + "}";
                        complete(c, key, body);
                        c.commit();
                        return new Response(201, body, false);
                    }
                    c.commit();
                    return replay(c, key, driver, amount);
                }
                case "ON CONFLICT DO NOTHING, bank call outside" -> {
                    c.setAutoCommit(true);                         // the key row commits on its own, right away
                    if (claimKey(c, key, driver, amount)) {
                        Thread.sleep(WORK_MS);                     // call the bank with no transaction open
                        c.setAutoCommit(false);
                        long id = insertPayout(c, driver, amount);
                        String body = "{\\"payout_id\\":" + id + "}";
                        complete(c, key, body);
                        c.commit();
                        return new Response(201, body, false);
                    }
                    return replay(c, key, driver, amount);
                }
                default -> throw new IllegalArgumentException(mode);
            }
        }
    }

    static boolean claimKey(Connection c, String key, int driver, int amount) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO idempotency_keys (idem_key, request_hash) VALUES (?, ?) ON CONFLICT (idem_key) DO NOTHING RETURNING idem_key")) {
            ps.setString(1, key); ps.setString(2, hash(driver, amount));
            try (ResultSet rs = ps.executeQuery()) { return rs.next(); }   // a row back = this request owns the key
        }
    }
    static void complete(Connection c, String key, String body) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "UPDATE idempotency_keys SET status = 'completed', response_code = 201, response_body = ? WHERE idem_key = ?")) {
            ps.setString(1, body); ps.setString(2, key); ps.executeUpdate();
        }
    }
    static Response replay(Connection c, String key, int driver, int amount) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT request_hash, status, response_code, response_body FROM idempotency_keys WHERE idem_key = ?")) {
            ps.setString(1, key);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                if (!rs.getString(1).equals(hash(driver, amount))) return new Response(422, "key reused with a different body", false);
                if (rs.getString(2).equals("in_progress")) return new Response(409, "request in progress, retry later", false);
                return new Response(rs.getInt(3), rs.getString(4), true);
            }
        }
    }

    static void run(String mode, int requests) throws Exception {
        try (Connection c = ds.getConnection(); Statement s = c.createStatement()) {
            s.execute("TRUNCATE payouts, idempotency_keys, idempotency_keys_nounique RESTART IDENTITY");
        }
        Map<String, AtomicInteger> outcomes = new ConcurrentSkipListMap<>();
        Map<String, Set<String>> bodiesPerKey = new ConcurrentHashMap<>();
        ExecutorService clients = Executors.newFixedThreadPool(24);
        long t0 = System.nanoTime();
        List<Future<?>> fs = new ArrayList<>();
        List<Object[]> sent = new ArrayList<>();
        // Each payout request is sent 3 times at once: the original plus two retries fired by client timeouts
        for (int r = 0; r < requests; r++) {
            String key = "payout-" + UUID.randomUUID();
            int driver = 2000 + r, amount = 85_000 + r;
            sent.add(new Object[] {key, driver, amount});
            for (int copy = 0; copy < 3; copy++)
                fs.add(clients.submit(() -> record(outcomes, bodiesPerKey, key, handle(mode, key, driver, amount))));
        }
        for (Future<?> f : fs) f.get();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        // ...and one more retry per request, much later (the mobile app came back online)
        AtomicInteger lateReplays = new AtomicInteger();
        for (Object[] req : sent) {
            Response late = handle(mode, (String) req[0], (Integer) req[1], (Integer) req[2]);
            record(outcomes, bodiesPerKey, (String) req[0], late);
            if (late.replayed()) lateReplays.incrementAndGet();
        }
        long keysWithTwoIds = bodiesPerKey.values().stream().filter(b -> b.size() > 1).count();
        clients.shutdown();
        try (Connection c = ds.getConnection(); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT count(*), count(DISTINCT driver_id), coalesce(sum(amount_paise), 0) FROM payouts")) {
            rs.next();
            System.out.printf("%-40s %5d ms  payouts=%4d for %d drivers (expected %d)  responses=%s  late retries replayed=%d  keys answered with 2+ payout ids=%d%n",
                    mode, ms, rs.getLong(1), rs.getLong(2), requests, outcomes, lateReplays.get(), keysWithTwoIds);
        }
    }

    static Void record(Map<String, AtomicInteger> outcomes, Map<String, Set<String>> bodies, String key, Response r) {
        String label = r.code() + (r.replayed() ? " replayed" : r.code() == 500 ? " " + r.body() : "");
        outcomes.computeIfAbsent(label, k -> new AtomicInteger()).incrementAndGet();
        if (r.body().startsWith("{")) bodies.computeIfAbsent(key, k -> ConcurrentHashMap.newKeySet()).add(r.body());
        return null;
    }

    public static void main(String[] args) throws Exception {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl("jdbc:postgresql://localhost:55432/skip_locked_and_idempotency");
        cfg.setUsername("postgres"); cfg.setPassword("lesson");
        cfg.setMaximumPoolSize(10);
        ds = new HikariDataSource(cfg);
        int requests = 200;
        for (String mode : List.of("no idempotency key", "check, then insert (no constraint)", "check, then insert (PRIMARY KEY)",
                                   "ON CONFLICT DO NOTHING, one transaction", "ON CONFLICT DO NOTHING, bank call outside"))
            run(mode, requests);

        // The same key sent again with a different amount
        String key = "payout-reused";
        System.out.println("first  " + handle("ON CONFLICT DO NOTHING, one transaction", key, 3001, 90_000));
        System.out.println("again  " + handle("ON CONFLICT DO NOTHING, one transaction", key, 3001, 90_000));
        System.out.println("changed amount " + handle("ON CONFLICT DO NOTHING, one transaction", key, 3001, 95_000));
        ds.close();
    }
}`,
        },
        {
          type: "output",
          text: `no idempotency key                        1701 ms  payouts= 800 for 200 drivers (expected 200)  responses={201=800}  late retries replayed=0  keys answered with 2+ payout ids=200
check, then insert (no constraint)         973 ms  payouts= 398 for 200 drivers (expected 200)  responses={201=398, 201 replayed=402}  late retries replayed=200  keys answered with 2+ payout ids=139
check, then insert (PRIMARY KEY)           950 ms  payouts= 200 for 200 drivers (expected 200)  responses={201=200, 201 replayed=389, 500 SQLState 23505=211}  late retries replayed=200  keys answered with 2+ payout ids=0
ON CONFLICT DO NOTHING, one transaction    865 ms  payouts= 200 for 200 drivers (expected 200)  responses={201=200, 201 replayed=600}  late retries replayed=200  keys answered with 2+ payout ids=0
ON CONFLICT DO NOTHING, bank call outside   615 ms  payouts= 200 for 200 drivers (expected 200)  responses={201=200, 201 replayed=320, 409=280}  late retries replayed=200  keys answered with 2+ payout ids=0
first  Response[code=201, body={"payout_id":201}, replayed=false]
again  Response[code=201, body={"payout_id":201}, replayed=true]
changed amount Response[code=422, body=key reused with a different body, replayed=false]`,
        },
        {
          type: "list",
          items: [
            "**No key: 800 payouts for 200 requests.** Every copy and every late retry paid the driver again.",
            "**Check, then insert, without a constraint: 398 payouts.** The late retries were all caught (the key row existed by then), but the three concurrent copies all ran the `SELECT` before any of them committed its key, so most requests paid two or three times. Worse, 139 keys were answered with two different payout IDs, so the client can't even tell which one is real.",
            "**The same code with a `PRIMARY KEY` on the key: 200 payouts, but 211 HTTP 500s.** The losers' `INSERT` of the key failed with SQLState `23505` (unique violation) and rolled back their payout too, because both were in one transaction. Correct money, ugly API: the constraint is what made it correct.",
            "**`INSERT ... ON CONFLICT DO NOTHING RETURNING` first: 200 payouts, 600 clean replays.** Whoever inserts the key owns the request. The two concurrent copies **waited** on the owner's uncommitted key row (shown below), then got zero rows back, read the stored response, and returned the same `201` and the same payout ID. No errors, no duplicates, and every key got exactly one payout ID.",
            "**With the bank call outside the transaction: 200 payouts, 280 `409 Conflict`s.** Here the key row commits immediately as `in_progress` so the slow call doesn't hold a transaction. A copy that arrives while the first is still working sees `in_progress` and gets 409 \"retry later\" instead of waiting; once the first finishes, everyone gets the replay. That's the design Stripe describes for its API.",
            "**Reusing a key with a different body is a client bug, and gets 422.** The stored `request_hash` didn't match the new amount. Replaying the old response there would silently ignore the client's change.",
          ],
        },
        {
          type: "heading",
          text: "Why the duplicate waits: ON CONFLICT and an uncommitted key",
        },
        {
          type: "code",
          language: "java",
          title: "IdemPeek.java",
          code: `import java.sql.*;
import java.util.concurrent.*;

public class IdemPeek {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect(String app) throws SQLException { return DriverManager.getConnection(URL + "?ApplicationName=" + app, "postgres", "lesson"); }
    static long T0 = System.nanoTime();
    static synchronized void log(String who, String msg) { System.out.printf("%5d ms  %-9s %s%n", (System.nanoTime() - T0) / 1_000_000, who, msg); }
    static final String CLAIM = "INSERT INTO idempotency_keys (idem_key, request_hash) VALUES ('payout-42', 'h1') " +
                                "ON CONFLICT (idem_key) DO NOTHING RETURNING idem_key";
    static boolean claim(Connection c) throws SQLException { try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(CLAIM)) { return rs.next(); } }

    public static void main(String[] args) throws Exception {
        Connection obs = connect("observer");
        ExecutorService ex = Executors.newSingleThreadExecutor();
        for (boolean firstCommits : new boolean[] {true, false}) {
            try (Statement s = obs.createStatement()) { s.execute("TRUNCATE idempotency_keys"); }
            System.out.println("=== the first request " + (firstCommits ? "commits" : "rolls back (its payout failed)"));
            T0 = System.nanoTime();
            Connection first = connect("request-1"), retry = connect("request-2");
            first.setAutoCommit(false); retry.setAutoCommit(false);
            log("request-1", "INSERT ... ON CONFLICT DO NOTHING RETURNING -> " + (claim(first) ? "1 row: I own the key" : "0 rows"));
            Future<Boolean> r = ex.submit(() -> claim(retry));
            Thread.sleep(300);
            try (Statement s = obs.createStatement(); ResultSet rs = s.executeQuery(
                    "SELECT wait_event_type, wait_event, pg_blocking_pids(pid) = ARRAY[(SELECT pid FROM pg_stat_activity WHERE application_name = 'request-1')] " +
                    "FROM pg_stat_activity WHERE application_name = 'request-2'")) {
                rs.next();
                log("observer", "request-2 is waiting: " + rs.getString(1) + "/" + rs.getString(2) + ", blocked by request-1: " + rs.getBoolean(3));
            }
            if (firstCommits) first.commit(); else first.rollback();
            log("request-1", firstCommits ? "COMMIT" : "ROLLBACK");
            log("request-2", "its INSERT returns -> " + (r.get() ? "1 row: it owns the key now" : "0 rows: someone else owns it, go read the stored response"));
            retry.commit();
            first.close(); retry.close();
        }
        ex.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `=== the first request commits
  135 ms  request-1 INSERT ... ON CONFLICT DO NOTHING RETURNING -> 1 row: I own the key
  456 ms  observer  request-2 is waiting: Lock/transactionid, blocked by request-1: true
  458 ms  request-1 COMMIT
  459 ms  request-2 its INSERT returns -> 0 rows: someone else owns it, go read the stored response
=== the first request rolls back (its payout failed)
   99 ms  request-1 INSERT ... ON CONFLICT DO NOTHING RETURNING -> 1 row: I own the key
  402 ms  observer  request-2 is waiting: Lock/transactionid, blocked by request-1: true
  403 ms  request-1 ROLLBACK
  403 ms  request-2 its INSERT returns -> 1 row: it owns the key now`,
        },
        {
          type: "list",
          items: [
            "**`ON CONFLICT` can't decide while the other insert is undecided.** `request-2` found `payout-42` in the unique index, inserted by a transaction that hadn't committed, so it waited on that transaction ID (`Lock/transactionid`), exactly like a row-lock waiter.",
            "**If the owner commits, the retry gets 0 rows** and reads the stored response. **If the owner rolls back** (its payout failed), the key never existed, so the retry's insert succeeds and **it** becomes the owner. Nobody needs to clean up a half-done key, which is the big advantage of keeping the key row and the payout in one transaction when you can.",
            "When the work calls another system and the key is committed first as `in_progress`, a crash leaves it stuck there forever. Store `locked_at` (or reuse a lease) and let a retry take over an `in_progress` key older than, say, a minute, after checking with the downstream system whether the first attempt went through. That's the same lease-expiry trade-off as the queue.",
          ],
        },
      ],
    },
    {
      title: "Advisory Locks: One Leader for a Scheduled Job",
      blocks: [
        {
          type: "paragraph",
          text: "Spring's `@Scheduled(cron = \"0 0 2 * * *\")` fires on **every** instance that has the bean. Three pods means the nightly payout job runs three times. A Postgres **advisory lock** is a lock on a number your application chooses, with the same queueing and deadlock detection as table locks, but no table involved. `pg_try_advisory_lock(k)` returns `true` if this session got it and `false` immediately otherwise; the session-level lock lasts until `pg_advisory_unlock(k)` or the session ends. `pg_try_advisory_xact_lock(k)` lasts until the transaction ends.",
        },
        {
          type: "code",
          language: "sql",
          title: "payouts.sql",
          code: `DROP TABLE IF EXISTS trips, daily_payouts;
CREATE TABLE trips (
    id            bigserial PRIMARY KEY,
    driver_id     int  NOT NULL,
    completed_on  date NOT NULL,
    fare_paise    int  NOT NULL
);
INSERT INTO trips (driver_id, completed_on, fare_paise)
SELECT 5000 + g % 100, date '2026-11-15', 12000 + (g * 37) % 30000 FROM generate_series(1, 2000) g;
CREATE TABLE daily_payouts (
    id            bigserial PRIMARY KEY,
    driver_id     int  NOT NULL,
    payout_date   date NOT NULL,
    amount_paise  bigint NOT NULL,
    paid_by       text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT clock_timestamp()
);
SELECT count(*) AS trips, count(DISTINCT driver_id) AS drivers, sum(fare_paise) AS total_paise FROM trips;`,
        },
        {
          type: "code",
          language: "java",
          title: "AdvisoryLocks.java",
          code: `import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

public class AdvisoryLocks {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static final long JOB_KEY = 20261115L;                         // one bigint per scheduled job
    static long T0 = System.nanoTime();
    static synchronized void log(String who, String msg) {
        System.out.printf("%5d ms  %-10s %s%n", (System.nanoTime() - T0) / 1_000_000, who, msg);
    }
    static Connection connect(String app) throws SQLException {
        return DriverManager.getConnection(URL + "?ApplicationName=" + app, "postgres", "lesson");
    }
    static HikariDataSource pool(String app, int size) {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(URL + "?ApplicationName=" + app);
        cfg.setUsername("postgres"); cfg.setPassword("lesson");
        cfg.setMaximumPoolSize(size); cfg.setMinimumIdle(size);
        return new HikariDataSource(cfg);
    }
    static boolean tryLock(Connection c, String fn) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT " + fn + "(" + JOB_KEY + ")")) {
            rs.next(); return rs.getBoolean(1);
        }
    }
    static void exec(Connection c, String sql) throws SQLException { try (Statement s = c.createStatement()) { s.execute(sql); } }

    // The nightly job: pay every driver yesterday's fares, one "bank call" per driver
    static int payNightly(Connection c, String me, int failAfter) throws Exception {
        Map<Integer, Long> totals = new LinkedHashMap<>();
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                "SELECT driver_id, sum(fare_paise) FROM trips WHERE completed_on = date '2026-11-15' GROUP BY driver_id ORDER BY driver_id")) {
            while (rs.next()) totals.put(rs.getInt(1), rs.getLong(2));
        }
        int paid = 0;
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO daily_payouts (driver_id, payout_date, amount_paise, paid_by) VALUES (?, date '2026-11-15', ?, ?)")) {
            for (Map.Entry<Integer, Long> e : totals.entrySet()) {
                if (paid == failAfter) throw new IllegalStateException("bank API returned 503");
                Thread.sleep(3);                                       // the bank transfer
                ps.setInt(1, e.getKey()); ps.setLong(2, e.getValue()); ps.setString(3, me);
                ps.executeUpdate();
                paid++;
            }
        }
        return paid;
    }
    static void reset() throws SQLException { try (Connection c = connect("setup")) { exec(c, "TRUNCATE daily_payouts RESTART IDENTITY"); } }
    static void report(String label) throws SQLException {
        try (Connection c = connect("check"); Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                "SELECT count(*), count(DISTINCT driver_id), coalesce(sum(amount_paise), 0), " +
                "coalesce(string_agg(DISTINCT paid_by, ','), '') FROM daily_payouts")) {
            rs.next();
            System.out.printf("          %s: %d payouts for %d drivers, %,d paise (should be 100 payouts, 50,967,000 paise), paid by [%s]%n",
                    label, rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getString(4));
        }
    }
    static void showAdvisoryLocks(String when) throws SQLException {
        try (Connection c = connect("observer"); Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                "SELECT a.application_name, a.state, l.locktype, l.classid, l.objid, l.objsubid, l.mode, l.granted " +
                "FROM pg_locks l JOIN pg_stat_activity a USING (pid) WHERE l.locktype = 'advisory' ORDER BY 1")) {
            System.out.println("          pg_locks " + when + ":");
            boolean any = false;
            while (rs.next()) {
                any = true;
                System.out.printf("            %-11s %-20s %-8s classid=%s objid=%s objsubid=%s %s granted=%s%n",
                        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6),
                        rs.getString(7), rs.getString(8));
            }
            if (!any) System.out.println("            (no advisory locks)");
        }
    }

    public static void main(String[] args) throws Exception {
        ExecutorService instances = Executors.newFixedThreadPool(3);

        System.out.println("=== 1. 02:00, the @Scheduled job fires on all three instances, no coordination");
        reset(); T0 = System.nanoTime();
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            String me = "instance-" + i;
            fs.add(instances.submit(() -> {
                try (Connection c = connect(me)) { log(me, "paid " + payNightly(c, me, -1) + " drivers"); }
                return null;
            }));
        }
        for (Future<?> f : fs) f.get();
        report("result");

        System.out.println("=== 2. pg_try_advisory_lock: one instance wins, the others skip this run");
        reset(); T0 = System.nanoTime();
        fs.clear();
        for (int i = 1; i <= 3; i++) {
            String me = "instance-" + i;
            fs.add(instances.submit(() -> {
                try (Connection c = connect(me)) {
                    if (!tryLock(c, "pg_try_advisory_lock")) { log(me, "lock busy, skipping this run"); return null; }
                    try {
                        log(me, "got the lock, running the job");
                        log(me, "paid " + payNightly(c, me, -1) + " drivers");
                    } finally {
                        exec(c, "SELECT pg_advisory_unlock(" + JOB_KEY + ")");
                    }
                }
                return null;
            }));
        }
        Thread.sleep(150);
        showAdvisoryLocks("while the winner runs");
        for (Future<?> f : fs) f.get();
        report("result");

        System.out.println("=== 3. session lock + connection pool + an exception, and no unlock in finally");
        reset(); T0 = System.nanoTime();
        HikariDataSource pool1 = pool("instance-1", 1), pool2 = pool("instance-2", 1);
        try (Connection c = pool1.getConnection()) {
            if (tryLock(c, "pg_try_advisory_lock")) {
                log("instance-1", "night 1: got the lock");
                payNightly(c, "instance-1", 40);                         // throws after 40 drivers; unlock is never reached
                exec(c, "SELECT pg_advisory_unlock(" + JOB_KEY + ")");
            }
        } catch (IllegalStateException e) {
            log("instance-1", "night 1: job failed (" + e.getMessage() + "), connection returned to the pool");
        }
        showAdvisoryLocks("after night 1");
        try (Connection c = pool2.getConnection()) {
            log("instance-2", "night 2: pg_try_advisory_lock -> " + tryLock(c, "pg_try_advisory_lock"));
        }
        try (Connection c = pool1.getConnection()) {
            log("instance-1", "night 2: pg_try_advisory_lock -> " + tryLock(c, "pg_try_advisory_lock") + " (same pooled session: re-entrant)");
            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT pg_advisory_unlock(" + JOB_KEY + ")")) {
                rs.next(); log("instance-1", "night 2: one pg_advisory_unlock -> " + rs.getBoolean(1));
            }
        }
        showAdvisoryLocks("after night 2's single unlock");
        try (Connection c = pool2.getConnection()) {
            log("instance-2", "night 3: pg_try_advisory_lock -> " + tryLock(c, "pg_try_advisory_lock"));
        }
        pool1.close();
        showAdvisoryLocks("after instance-1's pool is closed");
        pool2.close();
        report("result");

        System.out.println("=== 4. pg_try_advisory_xact_lock: released by COMMIT or ROLLBACK, nothing to forget");
        reset(); T0 = System.nanoTime();
        HikariDataSource pool3 = pool("instance-1", 1);
        try (Connection c = pool3.getConnection()) {
            c.setAutoCommit(false);
            try {
                log("instance-1", "pg_try_advisory_xact_lock -> " + tryLock(c, "pg_try_advisory_xact_lock"));
                payNightly(c, "instance-1", 40);
                c.commit();
            } catch (IllegalStateException e) {
                c.rollback();
                log("instance-1", "job failed (" + e.getMessage() + "), rolled back: the 40 payouts AND the lock are gone");
            }
        }
        showAdvisoryLocks("after the rollback");
        try (Connection c = connect("instance-2")) {
            c.setAutoCommit(false);
            log("instance-2", "pg_try_advisory_xact_lock -> " + tryLock(c, "pg_try_advisory_xact_lock"));
            log("instance-2", "paid " + payNightly(c, "instance-2", -1) + " drivers");
            c.commit();
        }
        pool3.close();
        report("result");
        instances.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `=== 1. 02:00, the @Scheduled job fires on all three instances, no coordination
  503 ms  instance-1 paid 100 drivers
  505 ms  instance-3 paid 100 drivers
  506 ms  instance-2 paid 100 drivers
          result: 300 payouts for 100 drivers, 152,901,000 paise (should be 100 payouts, 50,967,000 paise), paid by [instance-1,instance-2,instance-3]
=== 2. pg_try_advisory_lock: one instance wins, the others skip this run
   20 ms  instance-1 got the lock, running the job
   23 ms  instance-3 lock busy, skipping this run
   23 ms  instance-2 lock busy, skipping this run
          pg_locks while the winner runs:
            instance-1  idle                 advisory classid=0 objid=20261115 objsubid=1 ExclusiveLock granted=t
  458 ms  instance-1 paid 100 drivers
          result: 100 payouts for 100 drivers, 50,967,000 paise (should be 100 payouts, 50,967,000 paise), paid by [instance-1]
=== 3. session lock + connection pool + an exception, and no unlock in finally
   75 ms  instance-1 night 1: got the lock
  261 ms  instance-1 night 1: job failed (bank API returned 503), connection returned to the pool
          pg_locks after night 1:
            instance-1  idle                 advisory classid=0 objid=20261115 objsubid=1 ExclusiveLock granted=t
  279 ms  instance-2 night 2: pg_try_advisory_lock -> false
  281 ms  instance-1 night 2: pg_try_advisory_lock -> true (same pooled session: re-entrant)
  282 ms  instance-1 night 2: one pg_advisory_unlock -> true
          pg_locks after night 2's single unlock:
            instance-1  idle                 advisory classid=0 objid=20261115 objsubid=1 ExclusiveLock granted=t
  299 ms  instance-2 night 3: pg_try_advisory_lock -> false
          pg_locks after instance-1's pool is closed:
            (no advisory locks)
          result: 40 payouts for 40 drivers, 20,101,200 paise (should be 100 payouts, 50,967,000 paise), paid by [instance-1]
=== 4. pg_try_advisory_xact_lock: released by COMMIT or ROLLBACK, nothing to forget
   15 ms  instance-1 pg_try_advisory_xact_lock -> true
  156 ms  instance-1 job failed (bank API returned 503), rolled back: the 40 payouts AND the lock are gone
          pg_locks after the rollback:
            (no advisory locks)
  194 ms  instance-2 pg_try_advisory_xact_lock -> true
  532 ms  instance-2 paid 100 drivers
          result: 100 payouts for 100 drivers, 50,967,000 paise (should be 100 payouts, 50,967,000 paise), paid by [instance-2]`,
        },
        {
          type: "list",
          items: [
            "**No coordination: 300 payouts, 152,901,000 paise, three times the correct 50,967,000.** Each instance read the same trip totals and paid everyone.",
            "**`pg_try_advisory_lock`: one winner, two clean skips, 100 payouts.** In `pg_locks` an advisory lock is `locktype = advisory` with the key split into `classid` (high 32 bits, here 0) and `objid` (low 32 bits, 20261115); `objsubid = 1` means it was taken with one `bigint` key (2 means the two-`int` form). The holder shows as `idle` between statements: a session lock doesn't need an open transaction.",
            "**A session lock plus a connection pool plus an exception is a trap.** The job threw after 40 drivers, the `unlock` line was never reached, and the connection went **back into the pool still holding the lock**. Night 2: instance-2 couldn't get the lock, so it skipped; nobody was paid. Instance-1 did get it, because advisory locks are **re-entrant per session** and the pool handed it the same session: the lock count went to 2. One `pg_advisory_unlock` brought it to 1, and `pg_locks` still showed it held. Night 3 skipped again. Only closing the pool (ending the session) released it. In production that's \"the nightly job silently stopped running\" until the pod restarts.",
            "**`pg_try_advisory_xact_lock` can't leak.** The rollback after the failure released the lock along with the 40 payout rows, and instance-2 got the lock 38 ms later. The price: the whole job has to run in one transaction, which (from the previous section) holds back VACUUM for its duration. For a minutes-long job, use a session lock on a **dedicated** connection with `unlock` in `finally`, or a lease table.",
            "**A rollback doesn't undo a bank transfer.** Those 40 payout rows vanished, but in real life the 40 transfers had already left. Whichever lock you use, the external call needs a deterministic idempotency key, or the retry pays those 40 drivers twice. The production section shows exactly that.",
          ],
        },
      ],
    },
    {
      title: "ShedLock-Style Scheduled Jobs",
      blocks: [
        {
          type: "paragraph",
          text: "ShedLock is the library most Spring Boot services use for this: annotate the method with `@SchedulerLock(name = \"nightlyDriverPayout\", lockAtMostFor = \"10m\", lockAtLeastFor = \"30s\")` and it keeps a row per job name in a `shedlock` table. It works with any database (and Redis, Mongo, ZooKeeper), and it doesn't hold a connection or transaction while the job runs: it's a **lease row**. I extracted the SQL its JDBC provider uses from the 6.9.2 jar (`strings` on `AbstractJdbcStorageAccessor.class`):",
        },
        {
          type: "output",
          text: `INSERT INTO shedlock (name, lock_until, locked_at, locked_by) VALUES(?, ?, ?, ?)
UPDATE shedlock SET lock_until = ?, locked_at = ?, locked_by = ? WHERE name = ? AND lock_until <= ?
UPDATE shedlock SET lock_until = ? WHERE name = ? AND locked_by = ? AND lock_until > ?
UPDATE shedlock SET lock_until = ? WHERE name = ?`,
        },
        {
          type: "list",
          items: [
            "**Acquire** is an `INSERT` (the first time; a duplicate-key error means the row exists) or a conditional `UPDATE ... WHERE lock_until <= now`: whoever updates one row wins, the conditional-update pattern from the previous lesson. `lock_until` is set to now + `lockAtMostFor`.",
            "**The third statement extends** a lock the caller still owns. **The fourth releases**: it sets `lock_until` to the later of now and `locked_at + lockAtLeastFor`, matching on the **name only**.",
            "The `?` timestamps come from the **application's clock** (`JdbcTemplateLockProvider` has a `usingDbTime()` option to use the database clock instead). Instances whose clocks disagree by more than `lockAtLeastFor` can both run.",
          ],
        },
        {
          type: "paragraph",
          text: "`ShedLockDemo` runs the real library (`JdbcLockProvider` over HikariCP) in three scenarios. Each \"instance\" has its own pool and lock provider, like a separate JVM, and the job inserts one payout per driver:",
        },
        {
          type: "code",
          language: "sql",
          title: "shedlock.sql",
          code: `DROP TABLE IF EXISTS shedlock;
-- the table ShedLock's documentation asks for
CREATE TABLE shedlock (
    name       varchar(64)  NOT NULL PRIMARY KEY,
    lock_until timestamp    NOT NULL,
    locked_at  timestamp    NOT NULL,
    locked_by  varchar(255) NOT NULL
);`,
        },
        {
          type: "code",
          language: "java",
          title: "ShedLockDemo.java",
          code: `import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import net.javacrumbs.shedlock.core.*;
import net.javacrumbs.shedlock.provider.jdbc.JdbcLockProvider;

public class ShedLockDemo {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static long T0;
    static synchronized void log(String who, String msg) {
        System.out.printf("%5d ms  %-10s %s%n", (System.nanoTime() - T0) / 1_000_000, who, msg);
    }
    static HikariDataSource ds(String app) {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(URL + "?ApplicationName=" + app);
        cfg.setUsername("postgres"); cfg.setPassword("lesson");
        cfg.setMaximumPoolSize(2);
        return new HikariDataSource(cfg);
    }
    static void exec(String sql) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL, "postgres", "lesson"); Statement s = c.createStatement()) { s.execute(sql); }
    }
    static void query(String title, String sql) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL, "postgres", "lesson"); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                StringBuilder b = new StringBuilder("          " + title + ": ");
                for (int i = 1; i <= rs.getMetaData().getColumnCount(); i++)
                    b.append(rs.getMetaData().getColumnLabel(i)).append('=').append(rs.getString(i)).append("  ");
                System.out.println(b.toString().stripTrailing());
            }
        }
    }

    // One "application instance": its own pool and its own ShedLock provider, like a separate JVM
    record Instance(String name, HikariDataSource ds, LockingTaskExecutor executor) {
        static Instance start(String name) {
            HikariDataSource ds = ShedLockDemo.ds(name);
            return new Instance(name, ds, new DefaultLockingTaskExecutor(new JdbcLockProvider(ds, "shedlock")));
        }
        // What @Scheduled + @SchedulerLock does around the method
        void fire(Duration atMostFor, Duration atLeastFor, long jobMs) {
            LockConfiguration cfg = new LockConfiguration(Instant.now(), "nightlyDriverPayout", atMostFor, atLeastFor);
            boolean[] ran = {false};
            executor.executeWithLock((Runnable) () -> {
                ran[0] = true;
                log(name, "lock acquired, paying drivers...");
                try (Connection c = ds.getConnection(); Statement s = c.createStatement()) {
                    Thread.sleep(jobMs);
                    s.executeUpdate("INSERT INTO daily_payouts (driver_id, payout_date, amount_paise, paid_by) " +
                            "SELECT driver_id, date '2026-11-15', sum(fare_paise), '" + name + "' FROM trips GROUP BY driver_id");
                } catch (Exception e) { throw new RuntimeException(e); }
                log(name, "job done");
            }, cfg);
            if (!ran[0]) log(name, "lock held elsewhere, skipped");
        }
    }

    static void scenario(String title, Duration atMostFor, Duration atLeastFor, long jobMs, long[] fireAtMs) throws Exception {
        System.out.println("=== " + title);
        exec("TRUNCATE daily_payouts, shedlock");
        List<Instance> instances = new ArrayList<>();
        for (int i = 1; i <= fireAtMs.length; i++) instances.add(Instance.start("instance-" + i));
        ExecutorService ex = Executors.newFixedThreadPool(fireAtMs.length);
        T0 = System.nanoTime();
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < fireAtMs.length; i++) {
            Instance in = instances.get(i);
            long at = fireAtMs[i];
            fs.add(ex.submit(() -> { Thread.sleep(at); log(in.name(), "cron fires"); in.fire(atMostFor, atLeastFor, jobMs); return null; }));
        }
        for (Future<?> f : fs) f.get();
        ex.shutdown();
        query("shedlock row", "SELECT name, locked_at::time(3) AS locked_at, lock_until::time(3) AS lock_until FROM shedlock");
        query("payouts", "SELECT count(*) AS payouts, count(DISTINCT driver_id) AS drivers FROM daily_payouts");
        for (Instance in : instances) in.ds().close();
    }

    public static void main(String[] args) throws Exception {
        // instance-3's clock is 1.5 s behind, so its 02:00 fires after the job has already finished elsewhere
        scenario("lockAtMostFor=10m, lockAtLeastFor=0, instance-3 fires 1.5 s late",
                Duration.ofMinutes(10), Duration.ZERO, 500, new long[] {0, 0, 1500});
        scenario("lockAtMostFor=10m, lockAtLeastFor=30s, instance-3 fires 1.5 s late",
                Duration.ofMinutes(10), Duration.ofSeconds(30), 500, new long[] {0, 0, 1500});
        scenario("lockAtMostFor=2s, but each run takes 2.5 s; instance-2 fires 2.2 s late, instance-3 2.8 s late",
                Duration.ofSeconds(2), Duration.ZERO, 2500, new long[] {0, 2200, 2800});
    }
}`,
        },
        {
          type: "output",
          text: `=== lockAtMostFor=10m, lockAtLeastFor=0, instance-3 fires 1.5 s late
    2 ms  instance-1 cron fires
    4 ms  instance-2 cron fires
   63 ms  instance-1 lock acquired, paying drivers...
   66 ms  instance-2 lock held elsewhere, skipped
  569 ms  instance-1 job done
 1503 ms  instance-3 cron fires
 1511 ms  instance-3 lock acquired, paying drivers...
 2015 ms  instance-3 job done
          shedlock row: name=nightlyDriverPayout  locked_at=01:13:33.133  lock_until=01:13:33.641
          payouts: payouts=200  drivers=100
=== lockAtMostFor=10m, lockAtLeastFor=30s, instance-3 fires 1.5 s late
    0 ms  instance-1 cron fires
    0 ms  instance-2 cron fires
    3 ms  instance-2 lock acquired, paying drivers...
    4 ms  instance-1 lock held elsewhere, skipped
  506 ms  instance-2 job done
 1500 ms  instance-3 cron fires
 1504 ms  instance-3 lock held elsewhere, skipped
          shedlock row: name=nightlyDriverPayout  locked_at=01:13:33.725  lock_until=01:14:03.726
          payouts: payouts=100  drivers=100
=== lockAtMostFor=2s, but each run takes 2.5 s; instance-2 fires 2.2 s late, instance-3 2.8 s late
    0 ms  instance-1 cron fires
    2 ms  instance-1 lock acquired, paying drivers...
 2200 ms  instance-2 cron fires
 2216 ms  instance-2 lock acquired, paying drivers...
 2517 ms  instance-1 job done
 2800 ms  instance-3 cron fires
 2811 ms  instance-3 lock acquired, paying drivers...
 4731 ms  instance-2 job done
 5326 ms  instance-3 job done
          shedlock row: name=nightlyDriverPayout  locked_at=01:13:38.126  lock_until=01:13:40.65
          payouts: payouts=300  drivers=100`,
        },
        {
          type: "list",
          items: [
            "**`lockAtLeastFor = 0` let a late instance run the job again: 200 payouts.** Instance-1 won, finished in 500 ms and released. Instance-3, whose clock was 1.5 s behind, fired after that, found an expired lock and ran the whole job. A leader lock only prevents **overlap**, not **repetition**.",
            "**`lockAtLeastFor = 30s` closed that gap: 100 payouts.** The release only moved `lock_until` back to `locked_at + 30s` (the row shows `lock_until` 30 s after `locked_at`), so the late instance found it held. Set it longer than your worst clock skew and shorter than the schedule interval.",
            "**`lockAtMostFor` shorter than the job: three overlapping runs, 300 payouts.** Instance-1's lease expired at 2 s while it was still working, so instance-2 took the lock at 2.2 s. Then, at 2.5 s, instance-1 finished and **released by name**, wiping out instance-2's lock, which should have lasted until 4.2 s. Instance-3 got the lock at 2.8 s. The release statement has no `locked_by` check, which is fine only as long as `lockAtMostFor` is comfortably longer than any run. ShedLock's documentation says the same: size `lockAtMostFor` well above the normal execution time.",
          ],
        },
      ],
    },
    {
      title: "Redis Locks, Lease Expiry and Fencing Tokens",
      blocks: [
        {
          type: "paragraph",
          text: "A Redis lock is one command: `SET lock:job <random token> NX PX 30000`. `NX` sets only if the key doesn't exist, `PX` gives it an expiry in milliseconds, and the whole thing is atomic. The token is random per acquisition so the holder can later prove it's still the holder. Releasing safely needs a compare-and-delete, which Redis can only do atomically inside a Lua script (`EVAL`): two separate commands (`GET`, then `DEL`) leave a gap in which the key can expire and be taken by someone else.",
        },
        {
          type: "paragraph",
          text: "`RedisLock` uses a small hand-written RESP client over a socket, so every command on the wire is visible, against a throwaway `redis:7-alpine` container. The protected resource is a payout batch row in Postgres. Three threads play three instances: A takes the lock with a 500 ms lease and then takes 800 ms (a slow bank call, or a GC pause), B arrives at 600 ms, and C at 900 ms. Each acquisition also does `INCR` on a counter, which gives a **fencing token**: a number that only ever increases.",
        },
        {
          type: "code",
          language: "bash",
          code: "docker run -d --name lesson-redis -p 56379:6379 redis:7-alpine",
        },
        {
          type: "code",
          language: "java",
          title: "RedisLock.java",
          code: `import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

public class RedisLock {
    // A minimal RESP client: enough for SET/GET/DEL/PTTL/INCR/EVAL
    static final class Redis implements Closeable {
        final Socket s; final BufferedInputStream in; final OutputStream out;
        Redis() throws IOException { s = new Socket("localhost", 56379); in = new BufferedInputStream(s.getInputStream()); out = s.getOutputStream(); }
        synchronized Object call(Object... args) throws IOException {
            StringBuilder b = new StringBuilder("*" + args.length + "\\r\\n");
            for (Object a : args) { String v = String.valueOf(a); b.append('$').append(v.getBytes(StandardCharsets.UTF_8).length).append("\\r\\n").append(v).append("\\r\\n"); }
            out.write(b.toString().getBytes(StandardCharsets.UTF_8)); out.flush();
            return read();
        }
        Object read() throws IOException {
            int type = in.read(); String line = line();
            return switch (type) {
                case '+' -> line;
                case '-' -> throw new IOException(line);
                case ':' -> Long.parseLong(line);
                case '$' -> { int n = Integer.parseInt(line); if (n < 0) yield null; byte[] d = in.readNBytes(n + 2); yield new String(d, 0, n, StandardCharsets.UTF_8); }
                default -> throw new IOException("unexpected " + (char) type);
            };
        }
        String line() throws IOException { StringBuilder b = new StringBuilder(); int c; while ((c = in.read()) != '\\r') b.append((char) c); in.read(); return b.toString(); }
        public void close() throws IOException { s.close(); }
    }

    static final String KEY = "lock:nightly-driver-payout";
    static final String RELEASE = """
        if redis.call('GET', KEYS[1]) == ARGV[1] then
            return redis.call('DEL', KEYS[1])
        else
            return 0
        end""";
    static long T0;
    static synchronized void log(String who, String msg) { System.out.printf("%5d ms  %-2s %s%n", (System.nanoTime() - T0) / 1_000_000, who, msg); }

    static Connection pg() throws SQLException {
        return DriverManager.getConnection("jdbc:postgresql://localhost:55432/skip_locked_and_idempotency", "postgres", "lesson");
    }
    // The protected resource: the payout batch row. With fencing, a write must carry a token newer than the last one.
    static int write(String who, long token, boolean fenced) throws SQLException {
        try (Connection c = pg(); PreparedStatement ps = c.prepareStatement(fenced
                ? "UPDATE payout_batches SET status = 'sent', written_by = ?, fence = ? WHERE id = 1 AND fence < ?"
                : "UPDATE payout_batches SET status = 'sent', written_by = ?, fence = ? WHERE id = 1")) {
            ps.setString(1, who); ps.setLong(2, token);
            if (fenced) ps.setLong(3, token);
            return ps.executeUpdate();
        }
    }

    // acquire: SET key token NX PX lease, plus a fencing token from INCR
    static long acquire(Redis r, String who, String token, long leaseMs) throws IOException {
        Object ok = r.call("SET", KEY, token, "NX", "PX", leaseMs);
        if (ok == null) return -1;
        return (Long) r.call("INCR", "fence:nightly-driver-payout");
    }
    static void release(Redis r, String who, String token, boolean safe) throws IOException {
        Object res = safe ? r.call("EVAL", RELEASE, 1, KEY, token) : r.call("DEL", KEY);
        log(who, (safe ? "compare-and-delete" : "DEL") + " -> " + res + "   (key now holds " + r.call("GET", KEY) + ")");
    }

    static void scenario(String title, boolean safeRelease, boolean fenced) throws Exception {
        System.out.println("=== " + title);
        try (Redis r = new Redis()) { r.call("DEL", KEY); }
        try (Connection c = pg(); Statement s = c.createStatement()) {
            s.execute("DELETE FROM payout_batches"); s.execute("INSERT INTO payout_batches VALUES (1, 'pending', null, 0)");
        }
        T0 = System.nanoTime();
        ExecutorService ex = Executors.newFixedThreadPool(3);
        Future<?> a = ex.submit(() -> {
            try (Redis r = new Redis()) {
                String token = UUID.randomUUID().toString();
                long fence = acquire(r, "A", token, 500);
                log("A", "acquired, lease 500 ms, fencing token " + fence);
                Thread.sleep(800);                                      // slow bank call / long pause: the lease runs out
                log("A", "back after 800 ms, lock key now holds: " + r.call("GET", KEY) + " ; writing anyway");
                log("A", "write with token " + fence + " -> rows updated: " + write("A", fence, fenced));
                release(r, "A", token, safeRelease);
            }
            return null;
        });
        Future<?> b = ex.submit(() -> {
            Thread.sleep(600);
            try (Redis r = new Redis()) {
                String token = UUID.randomUUID().toString();
                long fence = acquire(r, "B", token, 2000);
                log("B", "SET NX -> " + (fence > 0 ? "acquired, fencing token " + fence : "busy"));
                Thread.sleep(100);
                log("B", "write with token " + fence + " -> rows updated: " + write("B", fence, fenced));
                Thread.sleep(500);
                release(r, "B", token, safeRelease);
            }
            return null;
        });
        Future<?> c = ex.submit(() -> {
            Thread.sleep(900);
            try (Redis r = new Redis()) {
                long fence = acquire(r, "C", UUID.randomUUID().toString(), 2000);
                log("C", "SET NX -> " + (fence > 0 ? "acquired, fencing token " + fence + "  <-- B still thinks it holds the lock" : "busy, skipped"));
            }
            return null;
        });
        a.get(); b.get(); c.get();
        ex.shutdown();
        try (Connection cn = pg(); Statement s = cn.createStatement();
             ResultSet rs = s.executeQuery("SELECT status, written_by, fence FROM payout_batches WHERE id = 1")) {
            rs.next();
            System.out.printf("          batch row: status=%s written_by=%s fence=%d%n", rs.getString(1), rs.getString(2), rs.getLong(3));
        }
    }

    public static void main(String[] args) throws Exception {
        try (Redis r = new Redis()) { r.call("DEL", "fence:nightly-driver-payout"); }
        scenario("plain DEL release, no fencing", false, false);
        scenario("Lua compare-and-delete release, no fencing", true, false);
        scenario("Lua compare-and-delete release + fencing token checked by Postgres", true, true);
    }
}`,
        },
        {
          type: "output",
          text: `=== plain DEL release, no fencing
    5 ms  A  acquired, lease 500 ms, fencing token 1
  606 ms  B  SET NX -> acquired, fencing token 2
  774 ms  B  write with token 2 -> rows updated: 1
  807 ms  A  back after 800 ms, lock key now holds: 248743ef-cda9-4b19-8da3-4e1fb1000bae ; writing anyway
  824 ms  A  write with token 1 -> rows updated: 1
  828 ms  A  DEL -> 1   (key now holds null)
  905 ms  C  SET NX -> acquired, fencing token 3  <-- B still thinks it holds the lock
 1276 ms  B  DEL -> 1   (key now holds null)
          batch row: status=sent written_by=A fence=1
=== Lua compare-and-delete release, no fencing
    1 ms  A  acquired, lease 500 ms, fencing token 4
  603 ms  B  SET NX -> acquired, fencing token 5
  733 ms  B  write with token 5 -> rows updated: 1
  803 ms  A  back after 800 ms, lock key now holds: 300472eb-a984-413b-9812-1c089bf16261 ; writing anyway
  834 ms  A  write with token 4 -> rows updated: 1
  835 ms  A  compare-and-delete -> 0   (key now holds 300472eb-a984-413b-9812-1c089bf16261)
  901 ms  C  SET NX -> busy, skipped
 1235 ms  B  compare-and-delete -> 1   (key now holds null)
          batch row: status=sent written_by=A fence=4
=== Lua compare-and-delete release + fencing token checked by Postgres
    3 ms  A  acquired, lease 500 ms, fencing token 6
  603 ms  B  SET NX -> acquired, fencing token 7
  750 ms  B  write with token 7 -> rows updated: 1
  804 ms  A  back after 800 ms, lock key now holds: 84f613e0-c433-4b71-82e9-5a477ddd36f8 ; writing anyway
  821 ms  A  write with token 6 -> rows updated: 0
  822 ms  A  compare-and-delete -> 0   (key now holds 84f613e0-c433-4b71-82e9-5a477ddd36f8)
  902 ms  C  SET NX -> busy, skipped
 1253 ms  B  compare-and-delete -> 1   (key now holds null)
          batch row: status=sent written_by=B fence=7`,
        },
        {
          type: "list",
          items: [
            "**Plain `DEL` release: A deleted B's lock, and C got in while B was still working.** A came back after its lease had expired, wrote anyway (it can't know), then `DEL`eted the key, which by then held **B's** token. At 905 ms C acquired a lock that B still believed it held. And the batch row ended up `written_by = A, fence = 1`: the stale writer's result overwrote the legitimate one.",
            "**Lua compare-and-delete: A's release returned 0 and B's lock survived**, so C was correctly turned away. But A **still wrote** after its lease expired, and the row again shows `written_by = A`. A safe release protects the next holder; it does nothing about a holder that doesn't know its lease is gone.",
            "**Fencing token checked by Postgres: A's stale write updated 0 rows.** B wrote with token 7, which set `fence = 7`. A's write carried token 6, and `WHERE fence < 6` didn't match. The row ends `written_by = B, fence = 7`. The check has to live in the **resource** (the database row, the downstream API), because only the resource sees both writes in order.",
          ],
        },
        {
          type: "paragraph",
          text: "`redis-cli MONITOR` running during the second scenario shows the protocol, including the commands the Lua script ran (`[0 lua]`), which execute atomically: no other client's command can run between the script's `GET` and `DEL`.",
        },
        {
          type: "output",
          text: `1794771887.934312 [0 172.17.0.1:52564] "SET" "lock:nightly-driver-payout" "300472eb-a984-413b-9812-1c089bf16261" "NX" "PX" "2000"
1794771887.935132 [0 172.17.0.1:52564] "INCR" "fence:nightly-driver-payout"
1794771888.134784 [0 172.17.0.1:52560] "GET" "lock:nightly-driver-payout"
1794771888.167320 [0 172.17.0.1:52560] "EVAL" "if redis.call('GET', KEYS[1]) == ARGV[1] then\\n    return redis.call('DEL', KEYS[1])\\nelse\\n    return 0\\nend" "1" "lock:nightly-driver-payout" "bfd99f0a-091f-4aa5-8e17-a4060e028089"
1794771888.167421 [0 lua] "GET" "lock:nightly-driver-payout"
1794771888.167775 [0 172.17.0.1:52560] "GET" "lock:nightly-driver-payout"
1794771888.233457 [0 172.17.0.1:52568] "SET" "lock:nightly-driver-payout" "612edd0b-b30a-4df3-8381-9d3dcdfdcaa8" "NX" "PX" "2000"
1794771888.566818 [0 172.17.0.1:52564] "EVAL" "if redis.call('GET', KEYS[1]) == ARGV[1] then\\n    return redis.call('DEL', KEYS[1])\\nelse\\n    return 0\\nend" "1" "lock:nightly-driver-payout" "300472eb-a984-413b-9812-1c089bf16261"
1794771888.566858 [0 lua] "GET" "lock:nightly-driver-payout"
1794771888.566871 [0 lua] "DEL" "lock:nightly-driver-payout"
1794771888.567233 [0 172.17.0.1:52564] "GET" "lock:nightly-driver-payout"`,
        },
        {
          type: "heading",
          text: "A real GC pause outliving a lease",
        },
        {
          type: "paragraph",
          text: "The 800 ms \"pause\" above was a `Thread.sleep`. To check that a real pause does the same, `GcLeaseExpiry` builds a 6-million-node linked list so a full collection has work to do, takes the lock with a 100 ms lease, and calls `System.gc()` under the Serial collector, which stops every application thread. Meanwhile a separate process (a shell loop inside the Redis container, standing in for instance-2) keeps trying `SET ... NX PX 5000` as soon as A's key exists.",
        },
        {
          type: "code",
          language: "java",
          title: "GcLeaseExpiry.java",
          code: `import java.util.UUID;

public class GcLeaseExpiry {
    static final class Node { Node next; long a, b; }
    static final String KEY = "lock:nightly-driver-payout";

    public static void main(String[] args) throws Exception {
        Node head = null;                                        // a big live object graph, like a busy service's heap
        for (int i = 0; i < 6_000_000; i++) { Node n = new Node(); n.next = head; head = n; }

        try (RedisLock.Redis r = new RedisLock.Redis()) {
            String token = "A-" + UUID.randomUUID();
            System.out.println("A: SET NX PX 100 -> " + r.call("SET", KEY, token, "NX", "PX", 100));
            long t = System.nanoTime();
            System.gc();                                         // a real stop-the-world full collection
            long pausedMs = (System.nanoTime() - t) / 1_000_000;
            System.out.println("A: back after " + pausedMs + " ms; it believes it still holds the lock");
            System.out.println("A: GET " + KEY + " -> " + r.call("GET", KEY));
            System.out.println("A: PTTL -> " + r.call("PTTL", KEY) + " ms left, but not on A's lease");
        }
        if (head.a == 42) System.out.println();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# instance-2: another process that grabs the lock the moment it can
docker exec -d lesson-redis sh -c 'until [ "$(redis-cli EXISTS lock:nightly-driver-payout)" = 1 ]; do sleep 0.01; done;
  until [ "$(redis-cli SET lock:nightly-driver-payout B-instance-2 NX PX 5000)" = OK ]; do sleep 0.01; done'
javac -d gccls -cp postgresql-42.7.14.jar RedisLock.java GcLeaseExpiry.java
java -Xmx400m -XX:+UseSerialGC -Xlog:gc -cp gccls GcLeaseExpiry`,
        },
        {
          type: "output",
          text: `[0.002s][info][gc] Using Serial
[0.074s][info][gc] GC(0) Pause Young (Allocation Failure) 33M->30M(117M) 34.897ms
[0.121s][info][gc] GC(1) Pause Young (Allocation Failure) 63M->63M(117M) 41.979ms
[0.165s][info][gc] GC(2) Pause Young (Allocation Failure) 95M->95M(128M) 40.855ms
[0.264s][info][gc] GC(3) Pause Full (Allocation Failure) 95M->95M(222M) 98.631ms
[0.380s][info][gc] GC(4) Pause Young (Allocation Failure) 153M->153M(222M) 102.233ms
A: SET NX PX 100 -> OK
[0.631s][info][gc] GC(5) Pause Full (System.gc()) 185M->184M(370M) 199.999ms
A: back after 200 ms; it believes it still holds the lock
A: GET lock:nightly-driver-payout -> B-instance-2
A: PTTL -> 4906 ms left, but not on A's lease`,
        },
        {
          type: "list",
          items: [
            "**The GC log shows a 199.999 ms stop-the-world `Pause Full`**, starting right after `SET NX PX 100` returned `OK`. During it, no thread in A's JVM could run: not the job, not a lock-renewal thread, not a timer.",
            "**When A resumed, the key belonged to instance-2.** A's own view was \"I acquired it 200 ms ago and nothing has happened since\". Any code A runs next (\"check that I still hold the lock, then write\") has the same race: the pause can fall between the check and the write.",
            "Real services see pauses like this from GC, from a container being CPU-throttled, from a VM being migrated, or from a slow network call. A lease library that renews the lock in the background (Redisson's watchdog, ShedLock's `KeepAliveLockProvider`) makes expiry rarer, but a renewal thread is paused along with everything else. Only the fencing check at the resource is immune.",
            "Redlock (acquiring the same key on a majority of 5 independent Redis nodes) addresses Redis **node** failure, not this. The pause still happens in the client. If correctness depends on mutual exclusion, use the database you're writing to: a row lock, a unique constraint, or a fencing column.",
          ],
        },
      ],
    },
    {
      title: "SKIP LOCKED in MySQL 8",
      blocks: [
        {
          type: "paragraph",
          text: "MySQL 8.0 has the same clauses, `FOR UPDATE SKIP LOCKED` and `FOR UPDATE NOWAIT`, in InnoDB. The difference that matters is the default isolation level: MySQL uses **REPEATABLE READ**, where a locking read takes **next-key locks** (the record plus the gap before it) on the index it scans. `MySqlQueue` runs the same claim on the same schema (with an index on `(status, id)`), looks at `performance_schema.data_locks` under both levels, and benchmarks 8 workers with 400 jobs of 10 ms, with a 60-second cap and a retry on deadlock.",
        },
        {
          type: "code",
          language: "sql",
          title: "mysql_schema.sql",
          code: `DROP TABLE IF EXISTS job_runs, payout_jobs;
CREATE TABLE payout_jobs (
    id            bigint AUTO_INCREMENT PRIMARY KEY,
    driver_id     int         NOT NULL,
    amount_paise  int         NOT NULL,
    status        varchar(16) NOT NULL DEFAULT 'pending',
    locked_by     varchar(32),
    KEY idx_status_id (status, id)
) ENGINE=InnoDB;
CREATE TABLE job_runs (
    seq     bigint AUTO_INCREMENT PRIMARY KEY,
    job_id  bigint      NOT NULL,
    worker  varchar(32) NOT NULL
) ENGINE=InnoDB;
SELECT VERSION();`,
        },
        {
          type: "code",
          language: "java",
          title: "MySqlQueue.java",
          code: `import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

public class MySqlQueue {
    static final String URL = "jdbc:mysql://localhost:33306/skip_locked_and_idempotency";
    static Connection connect() throws SQLException { return DriverManager.getConnection(URL, "root", "lesson"); }
    static final String BASE = "SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE";

    static void reset(int jobs) throws SQLException {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("TRUNCATE job_runs"); s.execute("TRUNCATE payout_jobs");
            s.execute("INSERT INTO payout_jobs (driver_id, amount_paise) WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < " + jobs + ") " +
                      "SELECT 1000 + n % 50, 50000 + n FROM g");
        }
    }

    static void bench(String mode, int isolation, int workers, int jobs) throws Exception {
        reset(jobs);
        String sql = mode.equals("SKIP LOCKED") ? BASE + " SKIP LOCKED" : BASE;
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        List<Future<?>> fs = new ArrayList<>();
        long t0 = System.nanoTime();
        java.util.concurrent.atomic.AtomicInteger deadlocks = new java.util.concurrent.atomic.AtomicInteger();
        java.util.concurrent.atomic.AtomicInteger timeouts = new java.util.concurrent.atomic.AtomicInteger();
        long deadline = System.nanoTime() + 60_000_000_000L;            // give up after 60 s
        for (int w = 1; w <= workers; w++) {
            String me = "w" + w;
            fs.add(pool.submit(() -> {
                try (Connection c = connect()) {
                    c.setAutoCommit(false);
                    c.setTransactionIsolation(isolation);
                    PreparedStatement claim = c.prepareStatement(sql);
                    PreparedStatement log = c.prepareStatement("INSERT INTO job_runs (job_id, worker) VALUES (?, ?)");
                    PreparedStatement done = c.prepareStatement("UPDATE payout_jobs SET status = 'done', locked_by = ? WHERE id = ?");
                    while (System.nanoTime() < deadline) {
                        try {
                            ResultSet rs = claim.executeQuery();
                            if (!rs.next()) { c.commit(); return null; }
                            long id = rs.getLong(1);
                            Thread.sleep(10);
                            log.setLong(1, id); log.setString(2, me); log.executeUpdate();
                            done.setString(1, me); done.setLong(2, id); done.executeUpdate();
                            c.commit();
                        } catch (SQLException e) {
                            if (e.getErrorCode() == 1205) timeouts.incrementAndGet();          // ER_LOCK_WAIT_TIMEOUT
                            else if (e.getErrorCode() == 1213) deadlocks.incrementAndGet();   // ER_LOCK_DEADLOCK
                            else throw e;
                            c.rollback();
                        }
                    }
                    c.rollback();
                    return null;
                }
            }));
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        try (Connection c = connect(); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT count(*), count(DISTINCT job_id), (SELECT count(*) FROM payout_jobs WHERE status = 'pending') FROM job_runs")) {
            rs.next();
            System.out.printf("MySQL %-12s %-15s %5d ms  %6.1f jobs/s  payments=%d distinct=%d still pending=%d  deadlocks=%d lock wait timeouts=%d%n",
                    mode, isolation == Connection.TRANSACTION_READ_COMMITTED ? "READ COMMITTED" : "REPEATABLE READ",
                    ms, rs.getLong(2) * 1000.0 / ms, rs.getLong(1), rs.getLong(2), rs.getLong(3), deadlocks.get(), timeouts.get());
        }
    }

    static void peek(int iso) throws Exception {
        reset(5);
        Connection a = connect(), b = connect(), obs = connect();
        a.setAutoCommit(false); b.setAutoCommit(false);
        a.setTransactionIsolation(iso);
        b.setTransactionIsolation(iso);
        try (Statement s = a.createStatement(); ResultSet rs = s.executeQuery(BASE)) { rs.next(); System.out.println("A  FOR UPDATE             -> id " + rs.getLong(1)); }
        try (Statement s = b.createStatement(); ResultSet rs = s.executeQuery(BASE + " SKIP LOCKED")) { rs.next(); System.out.println("B  FOR UPDATE SKIP LOCKED -> id " + rs.getLong(1)); }
        try (Statement s = b.createStatement(); ResultSet rs = s.executeQuery("SELECT id FROM payout_jobs WHERE id = 1 FOR UPDATE NOWAIT")) {
            rs.next();
        } catch (SQLException e) {
            System.out.println("B  id 1 FOR UPDATE NOWAIT -> error " + e.getErrorCode() + ": " + e.getMessage());
        }
        System.out.println("-- performance_schema.data_locks");
        try (Statement s = obs.createStatement(); ResultSet rs = s.executeQuery(
                "SELECT ENGINE_TRANSACTION_ID AS trx, OBJECT_NAME AS tbl, INDEX_NAME AS idx, LOCK_TYPE, LOCK_MODE, LOCK_STATUS, LOCK_DATA " +
                "FROM performance_schema.data_locks WHERE OBJECT_SCHEMA = 'skip_locked_and_idempotency' ORDER BY ENGINE_TRANSACTION_ID, LOCK_TYPE DESC, INDEX_NAME")) {
            System.out.printf("%-16s %-12s %-14s %-7s %-22s %-8s %s%n", "trx", "tbl", "idx", "type", "mode", "status", "data");
            while (rs.next())
                System.out.printf("%-16s %-12s %-14s %-7s %-22s %-8s %s%n", rs.getString(1), rs.getString(2), rs.getString(3),
                        rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7));
        }
        a.rollback(); b.rollback();
        a.close(); b.close(); obs.close();
    }

    public static void main(String[] args) throws Exception {
        System.out.println("=== READ COMMITTED");
        peek(Connection.TRANSACTION_READ_COMMITTED);
        System.out.println("=== REPEATABLE READ (the MySQL default)");
        peek(Connection.TRANSACTION_REPEATABLE_READ);
        for (int iso : new int[] {Connection.TRANSACTION_READ_COMMITTED, Connection.TRANSACTION_REPEATABLE_READ}) {
            bench("FOR UPDATE", iso, 8, 400);
            bench("SKIP LOCKED", iso, 8, 400);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m -cp mysql-connector-j-9.5.0.jar MySqlQueue.java",
        },
        {
          type: "output",
          text: `=== READ COMMITTED
A  FOR UPDATE             -> id 1
B  FOR UPDATE SKIP LOCKED -> id 2
B  id 1 FOR UPDATE NOWAIT -> error 3572: Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set.
-- performance_schema.data_locks
trx              tbl          idx            type    mode                   status   data
145207           payout_jobs  null           TABLE   IX                     GRANTED  null
145207           payout_jobs  idx_status_id  RECORD  X,REC_NOT_GAP          GRANTED  'pending', 1
145207           payout_jobs  PRIMARY        RECORD  X,REC_NOT_GAP          GRANTED  1
145208           payout_jobs  null           TABLE   IX                     GRANTED  null
145208           payout_jobs  idx_status_id  RECORD  X,REC_NOT_GAP          GRANTED  'pending', 2
145208           payout_jobs  PRIMARY        RECORD  X,REC_NOT_GAP          GRANTED  2
=== REPEATABLE READ (the MySQL default)
A  FOR UPDATE             -> id 1
B  FOR UPDATE SKIP LOCKED -> id 2
B  id 1 FOR UPDATE NOWAIT -> error 3572: Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set.
-- performance_schema.data_locks
trx              tbl          idx            type    mode                   status   data
145242           payout_jobs  null           TABLE   IX                     GRANTED  null
145242           payout_jobs  idx_status_id  RECORD  X                      GRANTED  'pending', 1
145242           payout_jobs  PRIMARY        RECORD  X,REC_NOT_GAP          GRANTED  1
145243           payout_jobs  null           TABLE   IX                     GRANTED  null
145243           payout_jobs  idx_status_id  RECORD  X                      GRANTED  'pending', 2
145243           payout_jobs  PRIMARY        RECORD  X,REC_NOT_GAP          GRANTED  2
MySQL FOR UPDATE   READ COMMITTED   8654 ms    46.2 jobs/s  payments=400 distinct=400 still pending=0  deadlocks=0 lock wait timeouts=0
MySQL SKIP LOCKED  READ COMMITTED   1378 ms   290.3 jobs/s  payments=400 distinct=400 still pending=0  deadlocks=0 lock wait timeouts=0
MySQL FOR UPDATE   REPEATABLE READ 62027 ms     0.6 jobs/s  payments=38 distinct=38 still pending=362  deadlocks=29121 lock wait timeouts=0
MySQL SKIP LOCKED  REPEATABLE READ  2913 ms   137.3 jobs/s  payments=400 distinct=400 still pending=0  deadlocks=26 lock wait timeouts=0`,
        },
        {
          type: "list",
          items: [
            "**The lock lives in InnoDB's lock system, per index.** Unlike Postgres, MySQL records row locks in memory, and `data_locks` lists them: an `IX` intention lock on the table, a record lock on the secondary index entry `('pending', 1)` that the scan went through, and one on the clustered `PRIMARY` record 1.",
            "**The isolation level changes the lock mode.** Under READ COMMITTED both index locks are `X,REC_NOT_GAP` (the record only). Under REPEATABLE READ the secondary index lock is plain `X`: a next-key lock on the record **and the gap before it**.",
            "**READ COMMITTED behaved like Postgres:** `FOR UPDATE` crawled at 46 jobs/s, `SKIP LOCKED` ran at 290 jobs/s, zero duplicates, zero deadlocks. In earlier runs `SKIP LOCKED` reached 316 to 323 jobs/s.",
            "**REPEATABLE READ plus plain `FOR UPDATE` collapsed: 38 jobs in 60 seconds and 29,121 deadlocks.** Workers held gap locks at the head of the queue and each tried to insert into the gap the others held.",
            "**Even `SKIP LOCKED` deadlocked under REPEATABLE READ** (26 times, at 137 jobs/s, half the READ COMMITTED speed). `SKIP LOCKED` skips locked **records**, but the gap locks it takes still collide with the `UPDATE` that moves the entry from `('pending', id)` to `('done', id)` in the `(status, id)` index.",
          ],
        },
        {
          type: "paragraph",
          text: "`SHOW ENGINE INNODB STATUS` after the REPEATABLE READ run shows one of those deadlocks:",
        },
        {
          type: "output",
          text: `LATEST DETECTED DEADLOCK
------------------------
2026-11-15 20:02:58 125395506779712
*** (1) TRANSACTION:
TRANSACTION 177061, ACTIVE 0 sec updating or deleting
mysql tables in use 1, locked 1
LOCK WAIT 9 lock struct(s), heap size 1128, 4 row lock(s), undo log entries 2
MySQL thread id 335, OS thread handle 125395063998016, query id 352666 172.17.0.1 root updating
UPDATE payout_jobs SET status = 'done', locked_by = 'w7' WHERE id = 379

*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 84 page no 5 n bits 504 index idx_status_id of table \`skip_locked_and_idempotency\`.\`payout_jobs\` trx id 177061 lock_mode X locks gap before rec
Record lock, heap no 377 PHYSICAL RECORD: n_fields 2; compact format; info bits 32
 0: len 7; hex 70656e64696e67; asc pending;;
 1: len 8; hex 8000000000000178; asc        x;;


*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 84 page no 5 n bits 504 index idx_status_id of table \`skip_locked_and_idempotency\`.\`payout_jobs\` trx id 177061 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 377 PHYSICAL RECORD: n_fields 2; compact format; info bits 32
 0: len 7; hex 70656e64696e67; asc pending;;
 1: len 8; hex 8000000000000178; asc        x;;


*** (2) TRANSACTION:
TRANSACTION 177071, ACTIVE 0 sec updating or deleting
mysql tables in use 1, locked 1
LOCK WAIT 5 lock struct(s), heap size 1128, 4 row lock(s), undo log entries 2
MySQL thread id 333, OS thread handle 125395066111552, query id 352683 172.17.0.1 root updating
UPDATE payout_jobs SET status = 'done', locked_by = 'w8' WHERE id = 377

*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 84 page no 5 n bits 504 index idx_status_id of table \`skip_locked_and_idempotency\`.\`payout_jobs\` trx id 177071 lock_mode X
Record lock, heap no 377 PHYSICAL RECORD: n_fields 2; compact format; info bits 32
 0: len 7; hex 70656e64696e67; asc pending;;
 1: len 8; hex 8000000000000178; asc        x;;

Record lock, heap no 378 PHYSICAL RECORD: n_fields 2; compact format; info bits 32
 0: len 7; hex 70656e64696e67; asc pending;;
 1: len 8; hex 8000000000000179; asc        y;;


*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 84 page no 5 n bits 504 index idx_status_id of table \`skip_locked_and_idempotency\`.\`payout_jobs\` trx id 177071 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 377 PHYSICAL RECORD: n_fields 2; compact format; info bits 32
 0: len 7; hex 70656e64696e67; asc pending;;
 1: len 8; hex 8000000000000178; asc        x;;

*** WE ROLL BACK TRANSACTION (2)`,
        },
        {
          type: "list",
          items: [
            "Both transactions are the completion `UPDATE` of their own job (379 and 377). Changing `status` delete-marks `('pending', id)` and inserts `('done', id)` in `idx_status_id`. Every `'done'` entry sorts before every `'pending'` one, so both new entries go into **the same gap**: the one before the first pending record, here `('pending', 376)` (hex `...178`), itself delete-marked (`info bits 32`).",
            "Each transaction **holds** a lock covering that gap (from its own claim scan) and **waits** for an `insert intention` lock into it, which conflicts with the other's gap lock. Neither can proceed; InnoDB rolls one back.",
            "**The fix for a MySQL queue:** run the workers at `READ COMMITTED` (`@Transactional(isolation = Isolation.READ_COMMITTED)` in Spring, or `SET SESSION transaction_isolation = 'READ-COMMITTED'`), which drops gap locks for these statements, and retry on error 1213 anyway.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "One payout job's life in the lease-based queue, with an idempotent bank call, across two worker instances:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The job is created** in the same transaction as the business change that caused it (trip settled, payout due), so it can't be lost or created twice for one change: `INSERT INTO payout_jobs (...)`. It's `pending`, `attempts = 0`.",
            "**Worker w1 claims.** Its claim `UPDATE` runs the subquery: an index scan over `payout_jobs_pending` in `id` order, feeding `LockRows`. For each candidate tuple, `heap_lock_tuple` checks xmax: free, so it writes w1's xid into xmax with the lock-only bits. Rows already locked by w2's concurrent claim are skipped (`LockWaitSkip`). The outer `UPDATE` sets `running`, `locked_by = 'w1'`, `locked_until = now() + lease`, `attempts = 1`. **COMMIT**: the row locks disappear, but the committed columns now say the job belongs to w1.",
            "**w2 polls a moment later.** Its scan sees the job with `status = 'running'` and `locked_until` in the future, so the `WHERE` doesn't match. It never even tries to lock it.",
            "**w1 calls the bank with no transaction open,** passing `Idempotency-Key: payout:<job id>`. The bank inserts the key under its own unique constraint and executes the transfer once.",
            "**Normal path: w1 completes.** `UPDATE ... SET status = 'done' WHERE id = ? AND locked_by = 'w1' AND attempts = 1` updates 1 row. Commit. Done.",
            "**Crash path: w1 dies before completing.** Nothing happens until `locked_until` passes. Then w2's claim matches `status = 'running' AND locked_until < now()`, sets `locked_by = 'w2'`, `attempts = 2`, commits, and calls the bank with **the same key**. If w1's transfer went through, the bank returns the stored result; if not, it pays now. Either way, one transfer.",
            "**Slow path: w1 is alive but late.** w2 re-claims as above. When w1 returns, its completion `UPDATE` matches 0 rows (`attempts` is now 2), so w1 knows it lost the job and must not report success. Its bank call, if it happened, was deduplicated by the key.",
            "**Leader path for the scheduler.** The job that **creates** payout jobs each night runs on one instance, chosen by `pg_try_advisory_xact_lock` (or ShedLock). It inserts jobs with a unique `(driver_id, payout_date)`, so even if two instances both become \"leader\" through clock skew or an expired lease, the second insert of each job is a no-op.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "The statements from this lesson in one `psql` session, after loading three pending jobs (drivers 7001, 7002 and 7003) into an empty `payout_jobs`, with a second session holding row 3 `FOR UPDATE` for the `NOWAIT` line:",
        },
        {
          type: "code",
          language: "sql",
          title: "syntax.sql",
          code: `-- 1. claim up to 2 jobs as a lease, in one statement
UPDATE payout_jobs
   SET status = 'running', locked_by = 'w1', locked_until = now() + interval '30 seconds', attempts = attempts + 1
 WHERE id IN (SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 2 FOR UPDATE SKIP LOCKED)
RETURNING id, driver_id, attempts;

-- 2. complete only if this worker still owns this attempt
UPDATE payout_jobs SET status = 'done', locked_until = NULL
 WHERE id = 1 AND status = 'running' AND locked_by = 'w1' AND attempts = 1;

-- 3. fail fast instead of waiting (another session holds row 3 FOR UPDATE)
SELECT id FROM payout_jobs WHERE id = 3 FOR UPDATE NOWAIT;

-- 4. idempotency key: the first insert wins, the second gets no row
INSERT INTO idempotency_keys (idem_key, request_hash) VALUES ('payout-7f3c', 'a1b2')
ON CONFLICT (idem_key) DO NOTHING RETURNING idem_key;
INSERT INTO idempotency_keys (idem_key, request_hash) VALUES ('payout-7f3c', 'a1b2')
ON CONFLICT (idem_key) DO NOTHING RETURNING idem_key;

-- 5. advisory locks: a name hashed to a key, session and transaction scope
SELECT hashtext('nightly-driver-payout') AS key;
SELECT pg_try_advisory_lock(hashtext('nightly-driver-payout')) AS got_it;
SELECT pg_try_advisory_lock(hashtext('nightly-driver-payout')) AS again_same_session;
SELECT pg_advisory_unlock(hashtext('nightly-driver-payout')) AS unlock_1,
       pg_advisory_unlock(hashtext('nightly-driver-payout')) AS unlock_2,
       pg_advisory_unlock(hashtext('nightly-driver-payout')) AS unlock_3;
BEGIN;
SELECT pg_try_advisory_xact_lock(20261115) AS got_it;
SELECT count(*) AS advisory_locks_held FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();
COMMIT;
SELECT count(*) AS advisory_locks_held FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();`,
        },
        {
          type: "code",
          language: "bash",
          code: "docker exec -i lesson-pg psql -U postgres -d skip_locked_and_idempotency -e < syntax.sql",
        },
        {
          type: "output",
          text: `UPDATE payout_jobs
   SET status = 'running', locked_by = 'w1', locked_until = now() + interval '30 seconds', attempts = attempts + 1
 WHERE id IN (SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 2 FOR UPDATE SKIP LOCKED)
RETURNING id, driver_id, attempts;
 id | driver_id | attempts 
----+-----------+----------
  1 |      7001 |        1
  2 |      7002 |        1
(2 rows)

UPDATE 2
UPDATE payout_jobs SET status = 'done', locked_until = NULL
 WHERE id = 1 AND status = 'running' AND locked_by = 'w1' AND attempts = 1;
UPDATE 1
SELECT id FROM payout_jobs WHERE id = 3 FOR UPDATE NOWAIT;
ERROR:  could not obtain lock on row in relation "payout_jobs"
INSERT INTO idempotency_keys (idem_key, request_hash) VALUES ('payout-7f3c', 'a1b2')
ON CONFLICT (idem_key) DO NOTHING RETURNING idem_key;
  idem_key   
-------------
 payout-7f3c
(1 row)

INSERT 0 1
INSERT INTO idempotency_keys (idem_key, request_hash) VALUES ('payout-7f3c', 'a1b2')
ON CONFLICT (idem_key) DO NOTHING RETURNING idem_key;
 idem_key 
----------
(0 rows)

INSERT 0 0
SELECT hashtext('nightly-driver-payout') AS key;
    key     
------------
 -212999140
(1 row)

SELECT pg_try_advisory_lock(hashtext('nightly-driver-payout')) AS got_it;
 got_it 
--------
 t
(1 row)

SELECT pg_try_advisory_lock(hashtext('nightly-driver-payout')) AS again_same_session;
 again_same_session 
--------------------
 t
(1 row)

SELECT pg_advisory_unlock(hashtext('nightly-driver-payout')) AS unlock_1,
       pg_advisory_unlock(hashtext('nightly-driver-payout')) AS unlock_2,
       pg_advisory_unlock(hashtext('nightly-driver-payout')) AS unlock_3;
WARNING:  you don't own a lock of type ExclusiveLock
 unlock_1 | unlock_2 | unlock_3 
----------+----------+----------
 t        | t        | f
(1 row)

BEGIN;
BEGIN
SELECT pg_try_advisory_xact_lock(20261115) AS got_it;
 got_it 
--------
 t
(1 row)

SELECT count(*) AS advisory_locks_held FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();
 advisory_locks_held 
---------------------
                   1
(1 row)

COMMIT;
COMMIT
SELECT count(*) AS advisory_locks_held FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();
 advisory_locks_held 
---------------------
                   0
(1 row)`,
        },
        {
          type: "list",
          items: [
            "**One statement claims a batch.** `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED LIMIT n) RETURNING` locks, updates and returns the claimed rows in a single round trip.",
            "**`NOWAIT` errors instead of waiting**: `could not obtain lock on row in relation \"payout_jobs\"` (SQLState `55P03`). Useful for an interactive request that would rather fail than queue.",
            "**`ON CONFLICT DO NOTHING RETURNING` returns the row only to the inserter.** The second insert of the same key reports `INSERT 0 0` and zero rows. It needs a unique index or constraint on the conflict column; without one Postgres refuses with `there is no unique or exclusion constraint matching the ON CONFLICT specification`.",
            "**String job names become keys with `hashtext()`**, which returns an `int` (-212999140 here). Two different names can collide, so for a few fixed jobs I'd rather assign constant `bigint` keys in code.",
            "**Session advisory locks stack:** two successful `pg_try_advisory_lock` calls needed two unlocks; the third returned `f` with the warning `you don't own a lock of type ExclusiveLock`. **The transaction-scoped one disappeared at `COMMIT`** without any unlock call.",
          ],
        },
        {
          type: "table",
          headers: ["Spring / Java side", "What it maps to"],
          rows: [
            ["`@Scheduled(cron = \"0 0 2 * * *\")`", "Fires on every instance: needs one of the locks below"],
            ["`@SchedulerLock(name, lockAtMostFor, lockAtLeastFor)` (ShedLock)", "The `shedlock` lease row shown above"],
            ["`@Transactional(isolation = READ_COMMITTED)` on a MySQL worker", "No gap locks in the claim, no queue deadlocks"],
            ["`JdbcTemplate.queryForList(\"... FOR UPDATE SKIP LOCKED\")` inside `@Transactional`", "The hold-the-transaction queue; keep the work short"],
            ["HikariCP `maximumPoolSize`", "Caps in-flight jobs when workers hold transactions"],
            ["`Idempotency-Key` request header, `@RequestHeader`", "The key that goes into `idempotency_keys`"],
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A transactional outbox relay with SKIP LOCKED",
        },
        {
          type: "paragraph",
          text: "The **outbox pattern** solves \"write to the database and publish to Kafka\" without a distributed transaction: the service writes the event into an `outbox` table in the same transaction as the trip, and a relay process later publishes outbox rows and deletes them. Several relays can run in parallel with `DELETE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING`. Here relay-1 crashes after publishing its third batch but before committing the delete:",
        },
        {
          type: "code",
          language: "sql",
          title: "outbox.sql",
          code: `DROP TABLE IF EXISTS outbox, processed_events;
CREATE TABLE outbox (
    id         bigserial   PRIMARY KEY,
    event_id   uuid        NOT NULL DEFAULT gen_random_uuid(),
    topic      text        NOT NULL,
    payload    jsonb       NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- the consumer's side: one row per event it has applied
CREATE TABLE processed_events (event_id uuid PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT clock_timestamp());`,
        },
        {
          type: "code",
          language: "java",
          title: "OutboxRelay.java",
          code: `import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class OutboxRelay {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect() throws SQLException { return DriverManager.getConnection(URL, "postgres", "lesson"); }

    record Event(String id, String topic) { }
    static final Queue<Event> BROKER = new ConcurrentLinkedQueue<>();      // stands in for Kafka

    // Claim a batch, publish it, delete it, commit. DELETE ... RETURNING claims and removes in one statement.
    static final String CLAIM = """
        DELETE FROM outbox
         WHERE id IN (SELECT id FROM outbox ORDER BY id LIMIT ? FOR UPDATE SKIP LOCKED)
        RETURNING event_id, topic""";

    static Callable<Integer> relay(String name, int crashAfterBatches) {
        return () -> {
            int batches = 0, published = 0;
            try (Connection c = connect()) {
                c.setAutoCommit(false);
                while (true) {
                    List<Event> batch = new ArrayList<>();
                    try (PreparedStatement ps = c.prepareStatement(CLAIM)) {
                        ps.setInt(1, 50);
                        try (ResultSet rs = ps.executeQuery()) { while (rs.next()) batch.add(new Event(rs.getString(1), rs.getString(2))); }
                    }
                    if (batch.isEmpty()) { c.commit(); return published; }
                    BROKER.addAll(batch);                            // publish (the broker acks)
                    published += batch.size();
                    if (++batches == crashAfterBatches) {            // crash between publish and commit
                        c.abort(Runnable::run);
                        System.out.println(name + " crashed after publishing batch " + batches + " but before COMMIT");
                        return published;
                    }
                    c.commit();
                }
            }
        };
    }

    public static void main(String[] args) throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("TRUNCATE outbox, processed_events RESTART IDENTITY");
            // trip-completed events written in the same transaction as the trips (not shown)
            s.execute("INSERT INTO outbox (topic, payload) SELECT 'trip.completed', jsonb_build_object('trip_id', g, 'fare_paise', 15000 + g) " +
                      "FROM generate_series(1, 1000) g");
        }
        ExecutorService ex = Executors.newFixedThreadPool(3);
        long t0 = System.nanoTime();
        Future<Integer> r1 = ex.submit(relay("relay-1", 3)), r2 = ex.submit(relay("relay-2", -1)), r3 = ex.submit(relay("relay-3", -1));
        System.out.printf("relay-1 published %d, relay-2 %d, relay-3 %d in %d ms%n", r1.get(), r2.get(), r3.get(), (System.nanoTime() - t0) / 1_000_000);
        ex.shutdown();

        long distinct = BROKER.stream().map(Event::id).distinct().count();
        System.out.printf("broker received %d messages, %d distinct events, %d duplicates%n", BROKER.size(), distinct, BROKER.size() - distinct);

        // Consumer: apply each event once, using the event id as its idempotency key
        int applied = 0, skipped = 0;
        try (Connection c = connect(); PreparedStatement ps = c.prepareStatement(
                "INSERT INTO processed_events (event_id) VALUES (?::uuid) ON CONFLICT DO NOTHING")) {
            for (Event e : BROKER) { ps.setString(1, e.id()); if (ps.executeUpdate() == 1) applied++; else skipped++; }
        }
        System.out.printf("consumer applied %d, skipped %d duplicates%n", applied, skipped);
    }
}`,
        },
        {
          type: "output",
          text: `relay-1 crashed after publishing batch 3 but before COMMIT
relay-1 published 150, relay-2 450, relay-3 450 in 84 ms
broker received 1050 messages, 1000 distinct events, 50 duplicates
consumer applied 1000, skipped 50 duplicates`,
        },
        {
          type: "list",
          items: [
            "**Three relays shared 1,000 events without overlapping** while all were healthy: `SKIP LOCKED` handed each a different batch of 50.",
            "**The crash produced exactly one batch of duplicates: 1,050 messages, 1,000 distinct.** Relay-1's third batch was published, then its transaction was aborted, so the `DELETE` rolled back and the 50 rows reappeared for relay-2 and relay-3, which published them again. There's no ordering of \"publish\" and \"commit\" that avoids this: publish first gives duplicates, commit first can lose events. The outbox is **at-least-once** by design.",
            "**The consumer makes it exactly-once in effect:** it records each `event_id` in `processed_events` with `ON CONFLICT DO NOTHING` and applies only the events whose insert returned 1 row: 1,000 applied, 50 skipped. That's the idempotency-key pattern again, with the event ID as the key. In a real consumer, the `processed_events` insert and the event's effect go in one transaction.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: The payout API's first request, its retry, and a changed body",
        },
        {
          type: "paragraph",
          text: "The last three lines of the `Idempotency` output are the API contract in miniature: the first request with key `payout-reused` returned `201` with payout 201; the same request again returned `201` with the **same** payout ID and `replayed=true` (a real API would add a header such as `Idempotent-Replayed: true`); the same key with a different amount returned `422`. A client can retry blindly and a client bug can't be mistaken for a retry.",
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["Several workers consuming one table queue", "`FOR UPDATE SKIP LOCKED`, claims in batches", "Plain `FOR UPDATE` (serial), no lock (duplicates)"],
            ["Jobs that take seconds or call other services", "Lease columns, claim and complete in short transactions", "Holding a transaction open during the call"],
            ["Jobs that touch only the database and take milliseconds", "Hold the row lock for the whole job", "Leases (needless crash-recovery delay)"],
            ["Strict order per driver / per account", "Partition workers by key, or one in-flight job per key", "Assuming `ORDER BY id` gives order"],
            ["Client retries of a payment or payout", "Idempotency key with a unique constraint, store the response", "Check-then-insert without a constraint"],
            ["One instance runs a job, all in one transaction", "`pg_try_advisory_xact_lock`", "Session advisory locks on pooled connections"],
            ["One instance runs a long job, any database", "ShedLock with `lockAtMostFor` well above the run time and `lockAtLeastFor` above clock skew", "`lockAtMostFor` close to the run time"],
            ["Mutual exclusion where a mistake costs money", "A unique constraint or fencing token in the resource itself", "A Redis lock alone"],
            ["A queue at very high volume, fan-out, replay", "A real broker (Kafka, RabbitMQ), fed by an outbox", "A table queue with millions of rows a minute"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Claiming with plain FOR UPDATE and adding workers",
        },
        {
          type: "paragraph",
          text: "Every worker waits for the head row. In `QueueBench`, 8 workers did 59 to 66 jobs/s against 68 for one, and spent 42 to 46 seconds waiting in the claim query. Add `SKIP LOCKED`.",
        },
        {
          type: "heading",
          text: "Calling a slow external service inside the claim transaction",
        },
        {
          type: "paragraph",
          text: "It holds a connection per in-flight job and holds back VACUUM for the whole database: 30,000 dead rows in an unrelated table were unremovable while one worker sat `idle in transaction`. Use a lease, or at least set `idle_in_transaction_session_timeout` on the worker's connections.",
        },
        {
          type: "heading",
          text: "A lease without a check on completion",
        },
        {
          type: "paragraph",
          text: "If completion is `UPDATE ... SET status = 'done' WHERE id = ?`, a worker that lost its lease overwrites the new owner's state. Complete with `AND locked_by = ? AND attempts = ?` and treat 0 rows as \"I lost this job\".",
        },
        {
          type: "heading",
          text: "Check-then-insert for idempotency",
        },
        {
          type: "paragraph",
          text: "`SELECT` the key, then `INSERT` it after doing the work: concurrent copies all pass the check. Without a constraint it produced 398 payouts for 200 requests. The unique constraint is the mechanism; claim the key with `INSERT ... ON CONFLICT DO NOTHING RETURNING` **before** doing the work.",
        },
        {
          type: "heading",
          text: "An idempotency key that changes on every retry",
        },
        {
          type: "paragraph",
          text: "A key built from a fresh UUID per attempt, or from the attempt number, dedups nothing. In the production rebuild, the shipped job's random key per bank call let 100 drivers be paid twice. Derive it from the operation: `payout:<driver>:<date>`, the job ID, the event ID.",
        },
        {
          type: "heading",
          text: "Session advisory locks on pooled connections",
        },
        {
          type: "paragraph",
          text: "An exception that skips `pg_advisory_unlock` returns the connection to the pool still holding the lock, and re-entrancy hides it from the same instance. The nightly job stopped running for every other instance. Use the `_xact_` variants, or unlock in `finally` on a dedicated connection.",
        },
        {
          type: "heading",
          text: "Treating a leader lock as \"runs exactly once\"",
        },
        {
          type: "paragraph",
          text: "Locks prevent overlap, not repetition. A late instance (clock skew, restart, `lockAtLeastFor = 0`) runs the job again after the first one released: 200 payouts in both the ShedLock and the advisory-lock rebuilds. Make the job's writes idempotent with a unique key per unit of work.",
        },
        {
          type: "heading",
          text: "Releasing a Redis lock with DEL, or trusting it after a pause",
        },
        {
          type: "paragraph",
          text: "`DEL` after expiry deletes somebody else's lock (C got in while B was working). Compare-and-delete in Lua fixes the release but not the stale writer: a 200 ms GC pause outlived a 100 ms lease. Check a fencing token in the resource you write to.",
        },
        {
          type: "heading",
          text: "Running a MySQL queue at REPEATABLE READ",
        },
        {
          type: "paragraph",
          text: "Gap locks on the status index turned 8 `FOR UPDATE` workers into 29,121 deadlocks in a minute, and even `SKIP LOCKED` deadlocked 26 times. Use READ COMMITTED for queue workers and retry error 1213.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Claim with `FOR UPDATE SKIP LOCKED` in a single `UPDATE ... RETURNING`, in batches of 10 to 100, and back off (or `LISTEN`) on an empty poll.",
            "Index the claim: a partial index such as `ON payout_jobs (id) WHERE status = 'pending'` keeps the scan on live work instead of millions of `done` rows. Archive or delete finished jobs.",
            "For anything slower than a few tens of milliseconds, use a lease: `status`, `locked_by`, `locked_until`, `attempts`; complete with an ownership check; cap `attempts` and move poison jobs to `failed`.",
            "Make every side effect idempotent with a key derived from the work (job ID, `driver:date`, event ID), and make the downstream system enforce it.",
            "For API idempotency: a unique key column, a request hash, a stored status and response; claim with `ON CONFLICT DO NOTHING RETURNING`; reply 409 while in progress and 422 on a body mismatch; expire keys after a retention window (24 hours is common).",
            "For scheduled jobs: one leader via `pg_try_advisory_xact_lock` or ShedLock (`lockAtMostFor` well above the run time, `lockAtLeastFor` above clock skew), and a unique constraint on what the job produces.",
            "Use Redis locks for efficiency (avoid duplicate work), not for correctness; release with a token check in Lua, and fence writes when a duplicate would cost money.",
            "Run MySQL queue workers at READ COMMITTED; on both databases, retry deadlocks and serialization failures.",
            "Tune autovacuum for queue tables (lower `autovacuum_vacuum_scale_factor` on the table): every processed job leaves a dead tuple.",
            "Watch `pg_stat_activity` for `idle in transaction`, `pg_locks` for advisory locks held by idle sessions, and `n_dead_tup` on the queue table.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The queue's own overhead, with no work per job: 8 workers each claim `n` jobs at a time with `SKIP LOCKED`, mark them done and commit, over 20,000 jobs.",
        },
        {
          type: "code",
          language: "java",
          title: "Perf.java",
          code: `import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

public class Perf {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static Connection connect() throws SQLException { return DriverManager.getConnection(URL, "postgres", "lesson"); }
    static String one(Connection c, String sql) throws SQLException { try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) { rs.next(); return rs.getString(1); } }

    // Pure queue overhead: no work per job, 8 workers, claim n at a time with SKIP LOCKED, mark done, commit
    static void run(int batch, int jobs) throws Exception {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("TRUNCATE payout_jobs, job_runs RESTART IDENTITY");
            s.execute("INSERT INTO payout_jobs (driver_id, amount_paise) SELECT 1000 + g % 50, 50000 + g FROM generate_series(1, " + jobs + ") g");
            s.execute("VACUUM ANALYZE payout_jobs");
        }
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> fs = new ArrayList<>();
        long t0 = System.nanoTime();
        for (int w = 0; w < 8; w++) {
            fs.add(pool.submit(() -> {
                try (Connection c = connect()) {
                    c.setAutoCommit(false);
                    PreparedStatement claim = c.prepareStatement("""
                        UPDATE payout_jobs SET status = 'done', done_at = clock_timestamp()
                         WHERE id IN (SELECT id FROM payout_jobs WHERE status = 'pending'
                                       ORDER BY id LIMIT ? FOR UPDATE SKIP LOCKED)""");
                    claim.setInt(1, batch);
                    while (claim.executeUpdate() > 0) c.commit();
                    c.commit();
                }
                return null;
            }));
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        try (Connection c = connect()) {
            Thread.sleep(700);                                        // let the stats collector catch up
            System.out.printf("batch=%3d  %,d jobs in %5d ms = %,8.0f jobs/s   dead tuples now: %s   table size: %s%n",
                    batch, jobs, ms, jobs * 1000.0 / ms,
                    one(c, "SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'payout_jobs'"),
                    one(c, "SELECT pg_size_pretty(pg_table_size('payout_jobs'))"));
        }
    }

    public static void main(String[] args) throws Exception {
        for (int batch : new int[] {1, 10, 100}) run(batch, 20_000);
    }
}`,
        },
        {
          type: "output",
          text: `batch=  1  20,000 jobs in  4639 ms =    4,311 jobs/s   dead tuples now: 20000   table size: 1984 kB
batch= 10  20,000 jobs in   702 ms =   28,490 jobs/s   dead tuples now: 20000   table size: 2952 kB
batch=100  20,000 jobs in   233 ms =   85,837 jobs/s   dead tuples now: 20000   table size: 3232 kB`,
        },
        {
          type: "list",
          items: [
            "**Batching is the biggest lever.** One job per claim gave 2,660 to 4,311 jobs/s over three runs; 10 per claim gave 19,802 to 28,490; 100 per claim gave 60,976 to 85,837. A claim costs a round trip, a statement and a commit with a WAL flush, and batching spreads that over many jobs. The trade-off is that a crashed worker's lease covers the whole batch.",
            "**Every processed job left a dead tuple: 20,000 after 20,000 jobs.** An `UPDATE` in Postgres writes a new row version, so a busy queue table is mostly garbage until VACUUM runs. A manual `VACUUM (VERBOSE)` afterwards reported `20000 dead item identifiers removed`. One run showed 12,082 because autovacuum had already started. Queue tables want aggressive per-table autovacuum settings, or a `DELETE` of finished rows with periodic cleanup, or partitioning so old partitions can be dropped.",
            "**With real work per job, the lock choice dominates:** 59 to 66 jobs/s with `FOR UPDATE` against 399 to 569 with `SKIP LOCKED` for 10 ms jobs on 8 workers, and 46 against 290 to 323 on MySQL at READ COMMITTED.",
            "**Idempotency cost one extra insert per request, and saved work:** the `ON CONFLICT` versions finished the 600 concurrent requests in 615 to 865 ms against 1,701 ms with no key, because duplicates replayed instead of doing the 20 ms of work. Single runs on a shared machine; the ordering was stable, the exact numbers weren't.",
            "**Advisory locks are cheap** (an entry in the shared lock table, no disk write) and need no table, but each held lock uses a slot in the lock table sized by `max_locks_per_transaction`; don't take one per job.",
          ],
        },
      ],
    },
    {
      title: "Distributed Coordination in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend pays drivers every night: a Spring `@Scheduled(cron = \"0 0 2 * * *\")` method sums each driver's fares for the previous day, calls the bank's payout API per driver, and records a row in `daily_payouts`. For a year it ran on one instance. Then the service was scaled to two pods for availability. The next morning, support had a queue of drivers asking why they'd been paid twice, and finance found the payout account short by exactly one day's payouts. The first fix (a leader lock) worked for a week, until a pod with a drifting clock paid everyone twice again. I rebuilt the whole story with two instances, a bank that dedups on `Idempotency-Key` (its own connection, so our rollbacks can't undo its transfers), and 2,000 trips for 100 drivers:",
        },
        {
          type: "code",
          language: "sql",
          title: "incident.sql",
          code: `DROP TABLE IF EXISTS bank_transfers;
-- stands in for the bank's API: it remembers every Idempotency-Key it has seen
CREATE TABLE bank_transfers (
    idem_key   text   PRIMARY KEY,
    driver_id  int    NOT NULL,
    amount     bigint NOT NULL,
    requests   int    NOT NULL DEFAULT 1
);`,
        },
        {
          type: "code",
          language: "java",
          title: "PayoutIncident.java",
          code: `import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

public class PayoutIncident {
    static final String URL = "jdbc:postgresql://localhost:55432/skip_locked_and_idempotency";
    static final long JOB_KEY = 20261115L;
    static long T0;
    static synchronized void log(String who, String msg) { System.out.printf("%5d ms  %-10s %s%n", (System.nanoTime() - T0) / 1_000_000, who, msg); }
    static Connection connect(String app) throws SQLException { return DriverManager.getConnection(URL + "?ApplicationName=" + app, "postgres", "lesson"); }
    static void exec(Connection c, String sql) throws SQLException { try (Statement s = c.createStatement()) { s.execute(sql); } }

    // The bank: another system with its own connection (our rollbacks can't undo it).
    // It dedups on the Idempotency-Key header, like most payout APIs.
    static Connection bank;
    static void bankTransfer(String idemKey, int driver, long amount) throws Exception {
        Thread.sleep(3);
        synchronized (PayoutIncident.class) { bankInsert(idemKey, driver, amount); }
    }
    static void bankInsert(String idemKey, int driver, long amount) throws SQLException {
        try (PreparedStatement ps = bank.prepareStatement("INSERT INTO bank_transfers (idem_key, driver_id, amount) VALUES (?, ?, ?) " +
                "ON CONFLICT (idem_key) DO UPDATE SET requests = bank_transfers.requests + 1")) {
            ps.setString(1, idemKey); ps.setInt(2, driver); ps.setLong(3, amount); ps.executeUpdate();
        }
    }
    static Map<Integer, Long> totals(Connection c) throws SQLException {
        Map<Integer, Long> m = new LinkedHashMap<>();
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                "SELECT driver_id, sum(fare_paise) FROM trips WHERE completed_on = date '2026-11-15' GROUP BY driver_id ORDER BY driver_id")) {
            while (rs.next()) m.put(rs.getInt(1), rs.getLong(2));
        }
        return m;
    }

    // What shipped: @Scheduled(cron = "0 0 2 * * *") on every instance
    static void shipped(String me) throws Exception {
        try (Connection c = connect(me)) {
            int n = 0;
            for (Map.Entry<Integer, Long> e : totals(c).entrySet()) {
                bankTransfer(UUID.randomUUID().toString(), e.getKey(), e.getValue());   // a fresh key per call
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO daily_payouts (driver_id, payout_date, amount_paise, paid_by) VALUES (?, date '2026-11-15', ?, ?)")) {
                    ps.setInt(1, e.getKey()); ps.setLong(2, e.getValue()); ps.setString(3, me); ps.executeUpdate();
                }
                n++;
            }
            log(me, "paid " + n + " drivers");
        }
    }

    // First fix: a leader lock only
    static void lockOnly(String me) throws Exception {
        try (Connection c = connect(me)) {
            c.setAutoCommit(false);
            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT pg_try_advisory_xact_lock(" + JOB_KEY + ")")) {
                rs.next();
                if (!rs.getBoolean(1)) { log(me, "lock busy, skipped"); c.rollback(); return; }
            }
            int n = 0;
            for (Map.Entry<Integer, Long> e : totals(c).entrySet()) {
                bankTransfer(UUID.randomUUID().toString(), e.getKey(), e.getValue());
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO daily_payouts (driver_id, payout_date, amount_paise, paid_by) VALUES (?, date '2026-11-15', ?, ?)")) {
                    ps.setInt(1, e.getKey()); ps.setLong(2, e.getValue()); ps.setString(3, me); ps.executeUpdate();
                }
                n++;
            }
            c.commit();
            log(me, "got the lock, paid " + n + " drivers");
        }
    }

    // Final fix: leader lock for efficiency, a unique row per (driver, date) for correctness,
    // and a deterministic Idempotency-Key towards the bank for the side effect
    static void fixed(String me) throws Exception { fixed(me, -1); }
    static void fixed(String me, int crashAfter) throws Exception {
        try (Connection c = connect(me)) {
            c.setAutoCommit(false);
            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT pg_try_advisory_xact_lock(" + JOB_KEY + ")")) {
                rs.next();
                if (!rs.getBoolean(1)) { log(me, "lock busy, skipped"); c.rollback(); return; }
            }
            int paid = 0, already = 0;
            for (Map.Entry<Integer, Long> e : totals(c).entrySet()) {
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO daily_payouts (driver_id, payout_date, amount_paise, paid_by) " +
                        "VALUES (?, date '2026-11-15', ?, ?) ON CONFLICT (driver_id, payout_date) DO NOTHING RETURNING id")) {
                    ps.setInt(1, e.getKey()); ps.setLong(2, e.getValue()); ps.setString(3, me);
                    if (!ps.executeQuery().next()) { already++; continue; }
                }
                bankTransfer("payout:" + e.getKey() + ":2026-11-15", e.getKey(), e.getValue());
                if (++paid == crashAfter) {
                    c.abort(Runnable::run);                // the pod is killed: no COMMIT, the payout rows roll back
                    log(me, "killed after " + paid + " bank transfers");
                    return;
                }
            }
            c.commit();
            log(me, "got the lock, paid " + paid + " drivers, " + already + " already paid");
        }
    }

    interface Job { void run(String me) throws Exception; }

    static void night(String title, Job job, long secondInstanceDelayMs) throws Exception {
        try (Connection c = connect("setup")) { exec(c, "TRUNCATE daily_payouts, bank_transfers RESTART IDENTITY"); }
        System.out.println("=== " + title);
        T0 = System.nanoTime();
        ExecutorService ex = Executors.newFixedThreadPool(2);
        Future<?> a = ex.submit(() -> { log("instance-1", "02:00 cron fires"); job.run("instance-1"); return null; });
        Future<?> b = ex.submit(() -> { Thread.sleep(secondInstanceDelayMs); log("instance-2", "02:00 cron fires"); job.run("instance-2"); return null; });
        a.get(); b.get();
        ex.shutdown();
        try (Connection c = connect("check"); Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                "SELECT (SELECT count(*) FROM daily_payouts), " +
                "(SELECT count(*) FROM (SELECT driver_id FROM bank_transfers GROUP BY driver_id HAVING count(*) > 1) d), " +
                "(SELECT coalesce(sum(amount), 0) FROM bank_transfers), (SELECT coalesce(sum(requests), 0) FROM bank_transfers)")) {
            rs.next();
            System.out.printf("          payout rows=%d  drivers paid twice by the bank=%d  money moved=%,d paise (correct: 50,967,000)  bank requests=%d%n",
                    rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4));
        }
    }

    public static void main(String[] args) throws Exception {
        bank = connect("bank");                                    // autocommit: every transfer is final
        try (Connection c = connect("setup")) { exec(c, "DROP INDEX IF EXISTS daily_payouts_once"); }
        night("shipped: both instances fire together", PayoutIncident::shipped, 0);
        night("lock only: both fire together", PayoutIncident::lockOnly, 0);
        night("lock only: instance-2's clock is 1.5 s behind", PayoutIncident::lockOnly, 1500);
        try (Connection c = connect("setup")) {
            exec(c, "TRUNCATE daily_payouts");
            exec(c, "CREATE UNIQUE INDEX daily_payouts_once ON daily_payouts (driver_id, payout_date)");
        }
        night("fixed: both fire together", PayoutIncident::fixed, 0);
        night("fixed: instance-2's clock is 1.5 s behind", PayoutIncident::fixed, 1500);
        night("fixed: instance-1 is killed after 40 transfers, instance-2 runs 1.5 s later",
              me -> fixed(me, me.equals("instance-1") ? 40 : -1), 1500);
    }
}`,
        },
        {
          type: "output",
          text: `=== shipped: both instances fire together
    1 ms  instance-1 02:00 cron fires
    3 ms  instance-2 02:00 cron fires
  611 ms  instance-2 paid 100 drivers
  612 ms  instance-1 paid 100 drivers
          payout rows=200  drivers paid twice by the bank=100  money moved=101,934,000 paise (correct: 50,967,000)  bank requests=200
=== lock only: both fire together
    0 ms  instance-1 02:00 cron fires
    0 ms  instance-2 02:00 cron fires
   15 ms  instance-2 lock busy, skipped
  485 ms  instance-1 got the lock, paid 100 drivers
          payout rows=100  drivers paid twice by the bank=0  money moved=50,967,000 paise (correct: 50,967,000)  bank requests=100
=== lock only: instance-2's clock is 1.5 s behind
    0 ms  instance-1 02:00 cron fires
  465 ms  instance-1 got the lock, paid 100 drivers
 1500 ms  instance-2 02:00 cron fires
 2066 ms  instance-2 got the lock, paid 100 drivers
          payout rows=200  drivers paid twice by the bank=100  money moved=101,934,000 paise (correct: 50,967,000)  bank requests=200
=== fixed: both fire together
    0 ms  instance-1 02:00 cron fires
    0 ms  instance-2 02:00 cron fires
   15 ms  instance-2 lock busy, skipped
  558 ms  instance-1 got the lock, paid 100 drivers, 0 already paid
          payout rows=100  drivers paid twice by the bank=0  money moved=50,967,000 paise (correct: 50,967,000)  bank requests=100
=== fixed: instance-2's clock is 1.5 s behind
    0 ms  instance-1 02:00 cron fires
  564 ms  instance-1 got the lock, paid 100 drivers, 0 already paid
 1500 ms  instance-2 02:00 cron fires
 1574 ms  instance-2 got the lock, paid 0 drivers, 100 already paid
          payout rows=100  drivers paid twice by the bank=0  money moved=50,967,000 paise (correct: 50,967,000)  bank requests=100
=== fixed: instance-1 is killed after 40 transfers, instance-2 runs 1.5 s later
    0 ms  instance-1 02:00 cron fires
  236 ms  instance-1 killed after 40 bank transfers
 1500 ms  instance-2 02:00 cron fires
 2114 ms  instance-2 got the lock, paid 100 drivers, 0 already paid
          payout rows=100  drivers paid twice by the bank=0  money moved=50,967,000 paise (correct: 50,967,000)  bank requests=140`,
        },
        {
          type: "list",
          items: [
            "**Shipped: both instances paid all 100 drivers.** 200 bank transfers, 101,934,000 paise moved against 50,967,000 owed. Nothing in the code was wrong for one instance; the bug was the deployment change.",
            "**Lock only: correct while the instances fire together**, because `pg_try_advisory_xact_lock` let one through and the other skipped.",
            "**Lock only, with instance-2's clock 1.5 s behind: double payouts again.** Instance-1 finished in under half a second and committed, which released the lock. Instance-2's 02:00 came later, found the lock free, and ran the whole job. The lock never overlapped, so it never helped.",
            "**Fixed: a unique `(driver_id, payout_date)` plus `ON CONFLICT DO NOTHING RETURNING` before each transfer, and a deterministic bank key `payout:<driver>:2026-11-15`.** The late instance got the lock and found 100 drivers already paid, so it paid 0.",
            "**Fixed, with instance-1 killed after 40 transfers:** its transaction rolled back, so the 40 payout rows vanished but the 40 transfers didn't. Instance-2 re-ran all 100 drivers and sent 100 requests, of which the bank recognised 40 keys: 140 requests, 100 transfers, the correct total. Without the deterministic key, those 40 drivers would have been paid twice.",
            "**What I'd check first in an incident like this:** `daily_payouts` grouped by `(driver_id, payout_date)` having count > 1 to size the damage; the deploy log for an instance-count change; the scheduler's logs on every pod for the same job name at the same minute; and whether the job's writes have any unique constraint at all.",
            "**What prevents it next time:** a unique constraint on every job's unit of work (one payout per driver per date), idempotency keys on every external money movement derived from that unit, a leader lock for efficiency, an alert on duplicate payouts, and a test that runs the scheduled method twice in a row and asserts nothing changes the second time.",
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
              question: "What does FOR UPDATE SKIP LOCKED do?",
              answer:
                "It locks the rows a `SELECT` returns, like `FOR UPDATE`, but instead of waiting for rows that another transaction has already locked, it skips them as if they weren't there. That makes it the standard way to let several workers consume one table as a queue: each gets different rows and nobody waits. It's in PostgreSQL since 9.5 and MySQL since 8.0.",
            },
            {
              question: "Why does a job queue with plain FOR UPDATE not scale with more workers?",
              answer:
                "Every worker asks for the oldest pending row, so they all try to lock the same row. One gets it and the rest wait on its transaction; when it commits, they re-check, move to the next row and wait again. In my run, 8 workers did 59 to 66 jobs/s against 68 for a single worker, and spent 42 to 46 seconds waiting in the claim query.",
            },
            {
              question: "What is an idempotency key?",
              answer:
                "A unique ID the client generates for one logical operation and sends with every attempt, for example in an `Idempotency-Key` header. The server stores it under a unique constraint: the first request to insert it does the work and stores the response; repeats get the stored response. It makes retries of non-idempotent operations, such as payments and payouts, safe.",
            },
            {
              question: "Why does a scheduled job run several times when a service has several instances?",
              answer:
                "A scheduler like Spring's `@Scheduled` runs inside each JVM and knows nothing about the others, so every instance fires at the same cron time. Something shared has to pick one: a database lock (advisory lock, ShedLock's table), a Redis lock, or a dedicated scheduler outside the service. And because a lock can't promise \"exactly once\", the job's writes should be idempotent too.",
            },
            {
              question: "What's the difference between pg_try_advisory_lock and pg_try_advisory_xact_lock?",
              answer:
                "Both lock an application-chosen number and return `true` or `false` immediately. The plain one is held by the **session** until `pg_advisory_unlock` or disconnect, and is re-entrant (each acquire needs its own unlock). The `_xact_` one is released automatically at the end of the **transaction**, commit or rollback, and has no unlock function, so it can't leak onto a pooled connection.",
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
              question: "Where does PostgreSQL store a row lock, and why doesn't SKIP LOCKED need a lock table lookup?",
              answer:
                "In the row itself: the locker's transaction ID goes into the tuple's `xmax` with infomask bits marking it lock-only (`HEAP_XMAX_LOCK_ONLY`) and its strength. `pageinspect` showed `t_xmax = 38481` and infomask `0x1c3` on the locked tuple while `pg_locks` had no row-level entry. A reader checks whether that xid is still running; with `SKIP LOCKED` (`LockWaitSkip`) a running locker means skip, without it the reader waits on a `ShareLock` on that transaction ID. That's also why locking millions of rows doesn't exhaust lock memory in Postgres.",
            },
            {
              question: "Should a worker hold the transaction open while it processes the job?",
              answer:
                "Only for short, database-only jobs. Holding it gives instant crash recovery (the rollback frees the job) but costs a connection per in-flight job and holds back VACUUM: in my test 30,000 dead rows in another table were unremovable while one worker sat `idle in transaction`. For slow work, claim with a lease (`status`, `locked_by`, `locked_until`, `attempts`) in a short transaction, process outside, and complete with an ownership check.",
            },
            {
              question: "How does a lease-based queue recover from a crashed worker, and what new problem does it introduce?",
              answer:
                "The claim query also matches `status = 'running' AND locked_until < now()`, so a dead worker's jobs are re-claimed once the lease expires (2 s later in my test, with `attempts` going to 2). The new problem is that the lease can also expire while the worker is alive but slow, so two workers process the same job: at-least-once delivery. Completion must check ownership (`locked_by` and `attempts`), and side effects must carry an idempotency key.",
            },
            {
              question: "Why isn't 'SELECT the key, and INSERT it if missing' a correct idempotency check?",
              answer:
                "Concurrent copies of the request all run the `SELECT` before any of them commits, so all see \"missing\" and all do the work. Without a unique constraint I got 398 payouts for 200 requests. With a primary key the data stayed correct, but only because the losers failed with `23505` and rolled back, returning 500s. The correct form is to claim first with `INSERT ... ON CONFLICT DO NOTHING RETURNING`: the request that gets a row back owns the key.",
            },
            {
              question: "Does SKIP LOCKED preserve FIFO order?",
              answer:
                "No. `ORDER BY id` picks the oldest free job, but jobs finish in any order, and with any parallelism a younger job often finishes first: about 40% of my jobs finished before an older one, and per-driver order broke 32 times. If order matters per key, partition workers by key (0 inversions in my test) or allow only one in-flight job per key.",
            },
            {
              question: "What do lockAtMostFor and lockAtLeastFor mean in ShedLock?",
              answer:
                "`lockAtMostFor` is the lease: if the holder dies, the lock expires after this long. If a run takes longer than it, another instance can start an overlapping run, and in my test the first instance's release (which matches on the lock name only) then freed the second's lock too. `lockAtLeastFor` keeps the lock after the job finishes, so instances with slightly different clocks don't re-run a quick job: with 0 a 1.5 s late instance ran it again, with 30 s it skipped.",
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
              question: "What is a fencing token and why does a Redis lock need one?",
              answer:
                "A number that increases with every lock acquisition, passed along with every write, and checked by the resource being written: reject any write with a token lower than the last one accepted. A Redis lock is a lease, and the holder can't detect that it expired during a pause: in my test a real 200 ms full GC outlived a 100 ms lease and another process took the key. With fencing, the stale holder's write (token 6 after token 7 was used) matched `WHERE fence < 6` and updated 0 rows. Compare-and-delete release doesn't help with this; it only stops the stale holder from deleting the new holder's key.",
            },
            {
              question: "Why does ON CONFLICT DO NOTHING make a concurrent duplicate wait, and what happens if the first transaction rolls back?",
              answer:
                "The duplicate finds the key in the unique index, inserted by a transaction that hasn't committed, so it can't know yet whether that row will exist. It waits on that transaction ID (`Lock/transactionid` in `pg_stat_activity`). On commit it returns 0 rows; on rollback the conflicting row never existed, so the duplicate's insert succeeds and it becomes the owner. Keeping the key and the work in one transaction therefore needs no cleanup of half-done keys.",
            },
            {
              question: "Why did a MySQL SKIP LOCKED queue deadlock under REPEATABLE READ?",
              answer:
                "At REPEATABLE READ a locking read takes next-key locks: the record and the gap before it, on every index it scans. The claim scanned `(status, id)`, and the completion `UPDATE` moves an entry from `('pending', id)` to `('done', id)`, an insert into the gap just before the first pending entry. Two workers each held a lock on that gap and each wanted an insert-intention lock into it: `SHOW ENGINE INNODB STATUS` showed exactly that. Plain `FOR UPDATE` had 29,121 deadlocks in a minute; `SKIP LOCKED` 26. At READ COMMITTED there were none.",
            },
            {
              question: "Is the transactional outbox exactly-once?",
              answer:
                "No, at-least-once. The relay must publish before it commits the delete; if it crashes in between, the rows come back and are published again: one crashed batch gave me 1,050 messages for 1,000 events. Committing first instead could lose events. Effective exactly-once comes from the consumer deduplicating on the event ID with a unique constraint, which applied 1,000 and skipped 50.",
            },
            {
              question: "Can a session-level advisory lock outlive the work that took it?",
              answer:
                "Yes, whenever the session outlives the work, which a connection pool guarantees. In my test a job threw before its unlock, the pooled connection kept the lock, other instances skipped the job on the following nights, and the same instance could re-acquire it (re-entrant) so one unlock still left it held. It only went away when the pool closed. Use `pg_try_advisory_xact_lock`, or a dedicated connection with unlock in `finally`, and alert on advisory locks held by `idle` sessions in `pg_locks`.",
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
              question: "Your payout workers run on 8 pods polling a jobs table. Throughput is the same as with 2 pods, the database CPU is low, and pg_stat_activity shows most workers 'active' with wait_event transactionid. What's happening and what do you change?",
              answer:
                "The claim query locks the oldest pending row with plain `FOR UPDATE`, so all workers line up behind one transaction: the `transactionid` wait is them waiting for the head row's locker, and `pg_blocking_pids` will point at one worker. Add `SKIP LOCKED` to the claim (8 workers went from 59 to 66 jobs/s to 399 to 569 in my test), claim in batches, and make sure there's an index (ideally partial, `WHERE status = 'pending'`) that serves the `ORDER BY` so the scan doesn't walk finished jobs.",
            },
            {
              question: "After a deploy, autovacuum can't keep up, every table bloats, and pg_stat_activity shows dozens of 'idle in transaction' sessions from the job workers. What changed and how do you fix it?",
              answer:
                "The workers now hold a transaction open while doing slow work (probably an external call added inside the claim transaction). Each open transaction pins the removable cutoff for the whole database: in my test 30,000 dead rows in an unrelated table were unremovable until one idle-in-transaction worker went away. Short term: set `idle_in_transaction_session_timeout` on the worker role. Fix: switch to a lease (claim and commit, call outside, complete with an ownership check) and make the call idempotent.",
            },
            {
              question: "Some drivers report being paid twice for the same day since the service was scaled to two instances. The nightly job has @Scheduled and a ShedLock annotation. What do you look for?",
              answer:
                "First the timing: if both runs started at nearly the same time, `lockAtMostFor` may be shorter than the run (a lease expired mid-run). If the second started after the first finished, it's clock skew with `lockAtLeastFor` too small: in my rebuild, a 1.5 s late instance ran the whole job again with `lockAtLeastFor = 0`. Then fix the real gap: a unique constraint on `(driver_id, payout_date)` with `ON CONFLICT DO NOTHING` before the transfer, and a deterministic idempotency key towards the bank. With both, a duplicate run paid 0 drivers and a crashed run's 40 transfers were deduplicated by the bank. Then size the damage with a `GROUP BY driver_id, payout_date HAVING count(*) > 1` and arrange recovery with finance.",
            },
            {
              question: "A mobile client retries a payout request after a timeout. Your logs show the retry and the original both returning 201 with different payout IDs. The idempotency table exists. Why?",
              answer:
                "The check isn't atomic: the service probably `SELECT`s the key, does the work, then inserts the key, and the table has no unique constraint (or the insert doesn't use it). Concurrent copies both pass the check. In my test that gave 398 payouts for 200 requests and 139 keys answered with two different payout IDs. Add a unique constraint, claim the key with `INSERT ... ON CONFLICT DO NOTHING RETURNING` before the work, store the response with the key, and return it to repeats; reject a reused key with a different body with 422.",
            },
            {
              question: "The nightly settlement job hasn't run for three nights on any instance, with no errors in the logs except one failure three nights ago. It uses pg_try_advisory_lock. What's the likely cause?",
              answer:
                "The failure skipped `pg_advisory_unlock`, the connection went back to the pool still holding the session lock, and every later attempt from other instances got `false` and logged a quiet \"skipping\". The instance that owns that pooled connection may even acquire it again (it's re-entrant) and still leave it held after one unlock. Confirm with `pg_locks` where `locktype = 'advisory'` and the holder is an `idle` session; terminate that backend or restart the pod to release it, then switch to `pg_try_advisory_xact_lock` or unlock in `finally` on a dedicated connection.",
            },
            {
              question: "A team uses a Redis lock with a 30 s TTL to make sure only one instance recalculates surge prices, and sometimes two results get written within a minute, the older one last. How do you explain and fix it?",
              answer:
                "The holder outlived its lease: a GC pause, CPU throttling or a slow call took longer than the TTL, another instance acquired the lock, and when the first one resumed it wrote its stale result after the new one. My test reproduced it with a real 200 ms GC pause against a 100 ms lease, and the stale write overwrote the fresh one until the storage checked a fencing token. Fix: get an increasing token at acquisition (`INCR`, or a database sequence), write with `WHERE fence < :token`, release with a compare-and-delete Lua script, and if overlap must never happen, take the lock in the database you write to.",
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
            "In two `psql` sessions, `BEGIN` and run `SELECT id FROM payout_jobs WHERE status = 'pending' ORDER BY id LIMIT 2 FOR UPDATE SKIP LOCKED` in each. Which ids does each get? Then run the same query in the second session with `NOWAIT` instead of `SKIP LOCKED`.",
            "In one session, run `SELECT pg_try_advisory_lock(1)` twice and `SELECT pg_advisory_unlock(1)` once, then look for it in `pg_locks`.",
            "Run `INSERT INTO idempotency_keys_nounique (idem_key, request_hash) VALUES ('k', 'h') ON CONFLICT (idem_key) DO NOTHING`.",
            "Change `GcLeaseExpiry` to take the lock with `PX 1000` instead of `PX 100` and run it again with the competing shell loop.",
            "Run `MySqlQueue`'s `peek` under REPEATABLE READ and READ COMMITTED and compare the `LOCK_MODE` on `idx_status_id`.",
            "In `ShedLockDemo`, change the first scenario's `lockAtLeastFor` from `Duration.ZERO` to 30 seconds and count the payouts.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 gives the first session the two oldest pending ids and the second session the next two (with `QueueBench`'s freshly loaded table: 1 and 2, then 3 and 4), and the `NOWAIT` query fails with `ERROR: could not obtain lock on row in relation \"payout_jobs\"`. Step 2 still shows one advisory row in `pg_locks`, because session locks stack and need one unlock per lock. Step 3 fails with `there is no unique or exclusion constraint matching the ON CONFLICT specification`: `ON CONFLICT` only works with a unique index behind it. Step 4: the GC pause (229 ms in my run) is shorter than the lease, so `GET` returns A's own token and `PTTL` shows the rest of A's lease (767 ms for me). Step 5: `X` (next-key, record plus gap) under REPEATABLE READ and `X,REC_NOT_GAP` under READ COMMITTED. Step 6: the late instance skips and the job pays 100 drivers instead of 200, as in the second scenario.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `QUEUE      SELECT ... ORDER BY id LIMIT n FOR UPDATE SKIP LOCKED
           no lock: duplicates (2,290-2,577)   FOR UPDATE: serial (59-66/s)
           SKIP LOCKED: parallel (399-569/s), 0 duplicates, no FIFO
           PG row lock = locker xid in tuple xmax (not in pg_locks)

LEASE      claim: status=running, locked_by, locked_until, attempts+1; COMMIT
           work outside any transaction
           complete WHERE locked_by = me AND attempts = mine (else: lost it)
           crash -> back after locked_until; slow -> runs twice (at-least-once)
           holding the tx instead: instant recovery, blocks VACUUM

IDEMPOTENT INSERT key ... ON CONFLICT DO NOTHING RETURNING  -> owner does work
           no row: hash differs 422 | in_progress 409 | done -> replay
           check-then-insert without UNIQUE = duplicates (398 for 200)
           key derived from the work: job id, driver:date, event id

LEADER     pg_try_advisory_xact_lock(k): released at COMMIT/ROLLBACK
           session lock + pool + exception = leaked lock, job stops
           ShedLock: lockAtMostFor > run time, lockAtLeastFor > clock skew
           a lock prevents overlap, not repetition: add a UNIQUE row

REDIS      SET k token NX PX ms; release = Lua (GET == token ? DEL : 0)
           a 200 ms GC pause outlived a 100 ms lease
           fencing: INCR token, resource writes WHERE fence < token

MYSQL 8    SKIP LOCKED / NOWAIT exist; run workers at READ COMMITTED
           REPEATABLE READ gap locks: 29,121 deadlocks in 60 s`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Across servers, the database (or another shared store) decides who works, and a unique constraint decides what counts. `SKIP LOCKED` turns a table into a parallel queue, leases keep long work out of transactions at the price of at-least-once delivery, and idempotency keys turn at-least-once into a single effect.",
            "Every distributed lock in this lesson was a lease, and every lease failed somewhere: a late instance after release, a lease shorter than the job, a GC pause longer than the TTL, a session lock that never ended. The designs that stayed correct didn't rely on the lock alone: they had a unique row or a fencing token in the resource being written.",
            "That completes the Multithreading and Concurrency track: from threads and the Java Memory Model, through locks, atomics, executors and concurrent collections, to coordination across machines. Next comes the MySQL track, starting with How MySQL Runs a Query: Setup, Tables and Data Types: installing MySQL 8 in Docker, what happens between sending a query and getting rows back, and choosing data types for the riders, drivers and trips tables that the rest of the track builds on.",
          ],
        },
      ],
    },
  ],
};
