import type { Lesson } from "../types";

export const digitalWalletLedger: Lesson = {
  slug: "digital-wallet-ledger",
  date: "2026-10-29",
  title: "Project 6: Digital Wallet with a Double-Entry Ledger",
  description:
    "A PRD for a wallet backend where money never appears or disappears: an append-only double-entry ledger, BigDecimal amounts, idempotent transfers, lock ordering against deadlocks, keyset-paginated statements and a nightly reconciliation job.",
  difficulty: "Medium",
  tags: ["Backend Project", "PRD", "Java", "Spring Boot", "PostgreSQL", "Concurrency", "Payments"],
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "This is the first project in my list where a bug costs real money instead of showing a wrong page. Two transfers from the same wallet in the same second, a retry after a network timeout, a crash between the debit and the credit. Each of these is a classic interview question, and in a wallet I have to answer all of them in code, with tests that prove it.",
        },
        {
          type: "list",
          items: [
            "**What it proves to an interviewer:** I can keep data correct under concurrency, not just make endpoints that work for one user at a time.",
            "**Job skills it covers:** `@Transactional` boundaries, pessimistic and optimistic locking, deadlock avoidance, idempotency keys, `BigDecimal`, Flyway migrations, keyset pagination, scheduled jobs, and integration tests against a real PostgreSQL with Testcontainers.",
            "**Honest effort:** 3 to 4 weekends. One for accounts and the ledger, one for transfers and concurrency tests, one for statements, reconciliation and the audit trail, and a spare one because the concurrency tests will find something.",
          ],
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the old shop notebook (the khata) at a kirana store. The shopkeeper never rubs out a line. If he made a mistake, he writes a new line that corrects it. And for every rupee that moves, two things are written: where it came from and where it went. My wallet works the same way. Users open a wallet, top it up from a (fake) payment gateway, send money to other users, and download a statement. Every movement is written as a pair of ledger lines that must add up to zero, and a job checks every night that the notebook still balances.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a **user**, I want to create a wallet in my currency, so that I can hold a balance.",
            "As a **user**, I want to top up my wallet, so that I can spend from it.",
            "As a **user**, I want to send money to another user by their wallet ID, so that I can split a dinner bill.",
            "As a **user**, I want to retry a transfer safely when my app times out, so that I'm never charged twice.",
            "As a **user**, I want a statement with running balances, so that I can see where my money went.",
            "As an **operator**, I want a daily reconciliation report, so that I find a broken balance before a customer does.",
            "As an **operator**, I want to freeze a wallet, so that a suspected fraud account can't move money.",
            "As an **auditor**, I want an unchangeable record of every movement and admin action, so that I can explain any balance.",
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
            ["FR-01", "A user can register, log in and receive a JWT", "Must"],
            ["FR-02", "A user can open one wallet per currency; a wallet starts at zero", "Must"],
            ["FR-03", "A user can top up from a fake gateway; the top-up is credited only after the gateway confirms", "Must"],
            ["FR-04", "A user can transfer to another wallet of the same currency", "Must"],
            ["FR-05", "Every money movement writes balanced ledger entries (total debits equal total credits) in one transaction", "Must"],
            ["FR-06", "Ledger entries are never updated or deleted; corrections are new reversing entries", "Must"],
            ["FR-07", "Transfers and top-ups require an `Idempotency-Key`; a repeat returns the original result", "Must"],
            ["FR-08", "A transfer that would make the balance negative is rejected with 422", "Must"],
            ["FR-09", "Frozen wallets can't send or receive", "Must"],
            ["FR-10", "A statement lists entries newest first, with running balance, using cursor pagination", "Must"],
            ["FR-11", "A daily job reconciles every wallet balance against its ledger and every transfer's debits against its credits", "Must"],
            ["FR-12", "Admin actions (freeze, unfreeze, reversal) are written to an append-only audit log with actor and reason", "Must"],
            ["FR-13", "An admin can reverse a transfer, which posts opposite entries linked to the original", "Should"],
            ["FR-14", "Per-user daily transfer limit, configurable", "Should"],
            ["FR-15", "Statement export as CSV for a date range", "Could"],
            ["FR-16", "Multi-currency transfer with a stored FX rate", "Could"],
          ],
        },
      ],
    },
    {
      title: "Non-Functional Requirements",
      blocks: [
        {
          type: "paragraph",
          text: "Every target here is something I can measure on my own laptop with Docker, k6 and a test. No \"10,000 TPS\" claims I can't check.",
        },
        {
          type: "table",
          headers: ["ID", "Requirement", "Target and how I check it"],
          rows: [
            ["NFR-01", "Money is conserved under concurrency", "After 10,000 random concurrent transfers among 50 wallets, the sum of all balances is unchanged and reconciliation reports zero mismatches (integration test)"],
            ["NFR-02", "No deadlocks", "1,000 A to B and 1,000 B to A transfers fired at the same time finish with zero deadlock errors (integration test)"],
            ["NFR-03", "No double spend", "100 threads send the full balance at once; exactly one succeeds (integration test)"],
            ["NFR-04", "Transfer latency", "p95 under 100 ms at 50 virtual users for 2 minutes against local Docker PostgreSQL (k6)"],
            ["NFR-05", "Statement page speed", "p95 under 30 ms for any page, including deep pages, with 1,000,000 ledger rows on one wallet (k6 plus `EXPLAIN ANALYZE`)"],
            ["NFR-06", "Reconciliation run time", "Under 60 seconds for 1,000,000 ledger rows (timed in the job log)"],
            ["NFR-07", "Idempotency", "The same key sent 20 times in parallel produces exactly one transfer (integration test)"],
            ["NFR-08", "Security", "Passwords hashed with BCrypt; a user can only read their own wallets (403 test for someone else's wallet)"],
          ],
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "paragraph",
          text: "Four tables do the real work. `accounts` holds the current balance as a cached number for fast checks. `ledger_entries` is the truth. `transfers` groups the entries of one movement and carries the idempotency key. `audit_log` records who did what. There are also **system accounts**, like a gateway clearing account, so a top-up is a normal transfer from \"money arriving from the gateway\" to the user. System accounts are allowed to go negative; user wallets are not.",
        },
        {
          type: "diagram",
          text: `┌──────────────┐        ┌──────────────────┐
│ users        │ 1    n │ accounts         │
│ id (PK)      ├────────┤ id (PK, UUID)    │
│ email        │        │ owner_id (FK)    │
│ password_hash│        │ type USER|SYSTEM │
└──────────────┘        │ currency         │
                        │ balance          │
                        │ status           │
                        │ version          │
                        └────────┬─────────┘
                                 │ 1
                                 │
                                 │ n
┌──────────────────┐ 1    n ┌────┴─────────────┐
│ transfers        ├────────┤ ledger_entries   │
│ id (PK, UUID)    │        │ id (PK, BIGINT)  │
│ initiator_id     │        │ transfer_id (FK) │
│ idempotency_key  │        │ account_id (FK)  │
│ kind TOPUP|P2P|  │        │ direction DR|CR  │
│      REVERSAL    │        │ amount           │
│ reverses_id (FK) │        │ balance_after    │
│ amount, currency │        │ created_at       │
│ status           │        └──────────────────┘
└──────────────────┘
┌──────────────────┐        ┌───────────────────────┐
│ audit_log        │        │ reconciliation_runs   │
│ id, actor_id     │        │ id, started_at        │
│ action, target   │        │ mismatches, details   │
│ reason, at       │        └───────────────────────┘
└──────────────────┘`,
          caption: "One transfer owns two or more ledger entries; the balance on accounts is a cache of the entries.",
        },
        {
          type: "code",
          language: "sql",
          title: "V1__ledger.sql (core tables)",
          code: `CREATE TABLE accounts (
    id         UUID PRIMARY KEY,
    owner_id   UUID,
    type       VARCHAR(10)   NOT NULL CHECK (type IN ('USER', 'SYSTEM')),
    currency   CHAR(3)       NOT NULL,
    balance    NUMERIC(19,4) NOT NULL DEFAULT 0,
    status     VARCHAR(10)   NOT NULL DEFAULT 'ACTIVE',
    version    BIGINT        NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT user_balance_not_negative CHECK (type = 'SYSTEM' OR balance >= 0)
);

CREATE TABLE transfers (
    id              UUID PRIMARY KEY,
    initiator_id    UUID          NOT NULL,
    idempotency_key VARCHAR(64)   NOT NULL,
    kind            VARCHAR(10)   NOT NULL,
    amount          NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency        CHAR(3)       NOT NULL,
    reverses_id     UUID REFERENCES transfers (id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (initiator_id, idempotency_key)
);

CREATE TABLE ledger_entries (
    id            BIGSERIAL PRIMARY KEY,
    transfer_id   UUID          NOT NULL REFERENCES transfers (id),
    account_id    UUID          NOT NULL REFERENCES accounts (id),
    direction     VARCHAR(6)    NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount        NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(19,4) NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ledger_by_account ON ledger_entries (account_id, id DESC);

-- Flyway runs as the table owner; the app connects as wallet_app,
-- which may read and insert ledger rows but never update or delete them
GRANT SELECT, INSERT ON ledger_entries TO wallet_app;
GRANT USAGE ON SEQUENCE ledger_entries_id_seq TO wallet_app;`,
        },
        {
          type: "callout",
          tone: "note",
          title: "Debit and credit, in plain words",
          text: "For a user wallet, a **CREDIT** adds money and a **DEBIT** takes it away. A transfer of 500 from Asha to Ravi is two lines: DEBIT Asha 500, CREDIT Ravi 500. Add up all debits and all credits of any transfer and they're equal. If they ever aren't, the reconciliation job shouts.",
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
            ["POST", "/api/v1/auth/register", "Create a user", "201 / 400, 409 email taken"],
            ["POST", "/api/v1/auth/login", "Get a JWT", "200 / 401"],
            ["POST", "/api/v1/wallets", "Open a wallet in a currency", "201 / 409 already exists"],
            ["GET", "/api/v1/wallets/{id}", "Balance and status", "200 / 403, 404"],
            ["POST", "/api/v1/wallets/{id}/top-ups", "Start a top-up (needs `Idempotency-Key`)", "202 / 400, 403"],
            ["POST", "/api/v1/webhooks/fake-gateway", "Gateway confirms a top-up (HMAC signed)", "200 / 401 bad signature"],
            ["POST", "/api/v1/transfers", "Send money (needs `Idempotency-Key`)", "201, or 200 on replay / 400, 403, 409 key reused with different body, 422 insufficient funds or frozen"],
            ["GET", "/api/v1/transfers/{id}", "Transfer detail", "200 / 403, 404"],
            ["GET", "/api/v1/wallets/{id}/statement?cursor=&limit=", "Ledger lines, newest first", "200 / 400 bad cursor, 403"],
            ["POST", "/api/v1/admin/wallets/{id}/freeze", "Freeze with a reason", "200 / 403"],
            ["POST", "/api/v1/admin/transfers/{id}/reversal", "Reverse a transfer", "201 / 409 already reversed, 422"],
            ["GET", "/api/v1/admin/reconciliation-runs", "Recent reconciliation results", "200 / 403"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/transfers  (header Idempotency-Key: 6f1c2a90-7d1e-4b8e-9a51-0c3f2e7d9b14)",
          code: `{
  "fromWalletId": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
  "toWalletId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "amount": "500.00",
  "currency": "INR",
  "note": "Dinner split"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "201 Created",
          code: `{
  "transferId": "a3bb189e-8bf9-3888-9912-ace4e6543002",
  "status": "COMPLETED",
  "amount": "500.00",
  "currency": "INR",
  "fromBalanceAfter": "1250.00",
  "createdAt": "2026-10-29T10:15:30Z"
}`,
        },
        {
          type: "paragraph",
          text: "Amounts travel as strings, not JSON numbers. A JavaScript client would otherwise parse `\"500.10\"` into a binary double, which is the exact bug `BigDecimal` exists to avoid.",
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "paragraph",
          text: "One Spring Boot app, one PostgreSQL. That's on purpose. The hard part of this project is correctness inside the database, and adding Kafka or a second service would only hide it. Inside the app I split code by feature: `account`, `transfer`, `ledger`, `statement`, `reconciliation`, `audit`.",
        },
        {
          type: "diagram",
          text: `  Client (Postman / k6)
        │  HTTPS + JWT
        ▼
┌─────────────────────────────────────────────┐
│ Spring Boot app                             │
│                                             │
│  TransferController ─► TransferService      │
│                         │ 1. idempotency    │
│                         │ 2. lock accounts  │
│                         │    in id order    │
│                         │ 3. check balance  │
│                         │ 4. insert entries │
│                         │ 5. update balances│
│                         ▼                   │
│                    LedgerRepository         │
│                                             │
│  StatementController ─► keyset query        │
│  @Scheduled ReconciliationJob (02:00 daily) │
│  FakeGatewayWebhookController (HMAC check)  │
└──────────────────────┬──────────────────────┘
                       │ one DB transaction per transfer
                       ▼
               ┌───────────────┐
               │ PostgreSQL 16 │
               └───────────────┘`,
        },
        {
          type: "paragraph",
          text: "A transfer is one database transaction. It either writes the transfer row, both ledger lines and both balance updates, or nothing. There is no moment where Asha has been debited and Ravi not yet credited, because nobody outside the transaction can see half of it.",
        },
        {
          type: "code",
          language: "java",
          title: "TransferService.java (core of the transfer)",
          code: `@Transactional
public TransferResult transfer(UUID userId, String idempotencyKey, TransferRequest req) {
    Optional<Transfer> previous = transfers.findByInitiatorIdAndIdempotencyKey(userId, idempotencyKey);
    if (previous.isPresent()) {
        return TransferResult.replayOf(previous.get(), req); // 409 if the body differs
    }

    // Always lock the smaller id first, so two opposite transfers can't deadlock
    UUID first = req.fromWalletId().compareTo(req.toWalletId()) < 0 ? req.fromWalletId() : req.toWalletId();
    UUID second = first.equals(req.fromWalletId()) ? req.toWalletId() : req.fromWalletId();
    Account a = accounts.lockById(first).orElseThrow(WalletNotFoundException::new);
    Account b = accounts.lockById(second).orElseThrow(WalletNotFoundException::new);

    Account from = a.getId().equals(req.fromWalletId()) ? a : b;
    Account to = from == a ? b : a;
    from.assertOwnedBy(userId);
    from.debit(req.amount());   // throws InsufficientFundsException or WalletFrozenException
    to.credit(req.amount());

    Transfer t = transfers.save(Transfer.p2p(userId, idempotencyKey, req));
    ledger.saveAll(List.of(
            LedgerEntry.debit(t, from, req.amount()),
            LedgerEntry.credit(t, to, req.amount())));
    return TransferResult.created(t, from);
}`,
        },
        {
          type: "code",
          language: "java",
          title: "AccountRepository.java",
          code: `public interface AccountRepository extends JpaRepository<Account, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE) // SELECT ... FOR UPDATE
    @Query("select a from Account a where a.id = :id")
    Optional<Account> lockById(@Param("id") UUID id);
}`,
        },
        {
          type: "paragraph",
          text: "Two requests with the same new idempotency key can both miss the `findBy` check at the same moment. The `UNIQUE (initiator_id, idempotency_key)` constraint is the real guard: the second insert fails, its transaction rolls back, and the controller catches `DataIntegrityViolationException`, reads the winner's transfer in a fresh transaction and returns it.",
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
            ["Java 21", "Current LTS; records keep requests, commands and results short and immutable"],
            ["Spring Boot 3 (Web, Data JPA, Security, Validation)", "The standard stack in Java backend job posts"],
            ["PostgreSQL 16", "Real row locks, `NUMERIC`, `CHECK` constraints and per-user grants for an append-only table"],
            ["Flyway", "Versioned schema; the grants live in a migration, not in someone's memory"],
            ["`BigDecimal` + `NUMERIC(19,4)`", "Exact decimal money; no floating-point drift"],
            ["Spring `@Scheduled` + ShedLock", "Nightly reconciliation that runs once even with two app instances"],
            ["JUnit 5 + Testcontainers", "Concurrency tests need a real PostgreSQL; H2 locks differently"],
            ["k6", "Load test from the laptop with p95 numbers I can quote"],
            ["Docker Compose", "One command to start the app and the database"],
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Why BigDecimal (results in the comments)",
          code: `System.out.println(0.1 + 0.2);                                          // 0.30000000000000004
System.out.println(new BigDecimal("0.10").add(new BigDecimal("0.20")));  // 0.30
System.out.println(new BigDecimal(0.1));                                 // 0.1000000000000000055511151231257827021181583404541015625
System.out.println(new BigDecimal("2.50").equals(new BigDecimal("2.5")));    // false, scale differs
System.out.println(new BigDecimal("2.50").compareTo(new BigDecimal("2.5"))); // 0, same value
System.out.println(new BigDecimal("10.00").divide(new BigDecimal("3"), 2, RoundingMode.HALF_EVEN)); // 3.33`,
        },
        {
          type: "paragraph",
          text: "Three rules I follow: build from a `String`, never from a `double`; compare with `compareTo`, never `equals`; and always pass a scale and `RoundingMode` to `divide`, or a value like 10/3 throws `ArithmeticException`.",
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Double-entry ledger as the source of truth",
        },
        {
          type: "paragraph",
          text: "**Decision:** every movement writes balanced debit and credit lines; `accounts.balance` is a cache updated in the same transaction. **Trade-off:** more rows and more code than a single `balance = balance - x`, but any balance can be rebuilt and explained line by line, and a bug shows up as a reconciliation mismatch instead of silent loss.",
        },
        {
          type: "heading",
          text: "ADR-2: Pessimistic locks for transfers, optimistic for everything else",
        },
        {
          type: "paragraph",
          text: "**Decision:** transfers use `SELECT ... FOR UPDATE` on both accounts. Profile and status edits use `@Version`. **Trade-off:** a hot wallet (a merchant receiving many payments) serialises its transfers. With optimistic locking under that contention, most requests would fail and retry, which is worse. Pessimistic locking waits instead of failing, and it's predictable.",
        },
        {
          type: "heading",
          text: "ADR-3: Lock in a fixed order",
        },
        {
          type: "paragraph",
          text: "**Decision:** always lock the account with the smaller UUID first. **Trade-off:** none really, apart from a few lines of code. Without it, Asha to Ravi locks Asha then waits for Ravi, while Ravi to Asha locks Ravi then waits for Asha, and PostgreSQL kills one of them with a deadlock error. Like two people in a narrow corridor: if everyone keeps to the left, nobody gets stuck.",
        },
        {
          type: "heading",
          text: "ADR-4: Store a running balance on each ledger line",
        },
        {
          type: "paragraph",
          text: "**Decision:** `balance_after` is written on every entry while the account row is locked. **Trade-off:** one more column, but statements don't need a window function over millions of rows, and the reconciliation job can check that consecutive lines chain correctly.",
        },
        {
          type: "heading",
          text: "ADR-5: Keyset pagination for statements",
        },
        {
          type: "paragraph",
          text: "**Decision:** the cursor is the last entry `id`; the next page is `WHERE id < :cursor ORDER BY id DESC LIMIT 50`. **Trade-off:** no \"jump to page 400\", but page 400 is as fast as page 1, and new entries arriving don't shift rows between pages the way `OFFSET` does.",
        },
        {
          type: "code",
          language: "sql",
          title: "Statement page (uses the ledger_by_account index)",
          code: `SELECT id, transfer_id, direction, amount, balance_after, created_at
FROM ledger_entries
WHERE account_id = :accountId
  AND id < :cursor
ORDER BY id DESC
LIMIT 50;`,
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Transfer to the same wallet: reject with 400 before taking any lock.",
            "Amount of zero, negative, or with more decimals than the currency allows (`500.001` INR): reject with 400.",
            "Currency mismatch between the two wallets: reject with 422.",
            "Same `Idempotency-Key` with a different body: 409, never silently return the old result for a new request.",
            "Two parallel requests with the same new key: the unique constraint picks one winner; the loser returns the winner's result.",
            "Balance exactly equal to the amount: allowed, and the wallet lands on exactly zero.",
            "Wallet frozen between the client's balance check and the transfer: the frozen check happens after the lock, inside the transaction.",
            "Gateway webhook arrives twice: the top-up is credited once, keyed on the gateway's payment ID.",
            "Gateway webhook arrives before the top-up row is committed: return a non-2xx so the gateway retries, or store and match later.",
            "Reversal of a transfer whose receiver has already spent the money: reject, or allow only with an explicit admin flag that lets the receiver go negative. Decide and document it.",
            "Reversing a reversal: blocked with 409.",
            "Statement cursor that isn't a number or belongs to another wallet: 400, never leak other users' rows.",
            "Reconciliation running while transfers continue: compare only entries created before the run's start time.",
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
            "**Skeleton.** Docker Compose with PostgreSQL, Flyway V1, register, login, open wallet. Demo: create two users with wallets in Postman. Tests: auth controller tests, wallet repository test on Testcontainers.",
            "**Top-up through a fake gateway.** System clearing account, top-up start, signed webhook, ledger entries. Demo: top up 1,000 and see it on the wallet. Tests: duplicate webhook credits once; bad signature gets 401.",
            "**Transfers.** Lock ordering, balance check, balanced entries, idempotency. Demo: send money, retry with the same key, get the same response. Tests: insufficient funds 422, same key 20 times in parallel gives one transfer, A to B and B to A at the same time finish without deadlock.",
            "**Statements.** Keyset pagination with running balance. Demo: seed 1,000,000 rows and page through. Tests: no duplicates or gaps across pages while new transfers arrive; `EXPLAIN` shows an index scan.",
            "**Reconciliation and audit.** Nightly job, admin freeze and reversal, audit log. Demo: corrupt a balance by hand in psql and watch the job report it. Tests: job finds a planted mismatch; reversal posts linked opposite entries.",
            "**Load test and write-up.** k6 script, README with measured numbers and the design decisions. Demo: k6 summary with p95. Tests: whole suite green in GitHub Actions.",
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
            "**Unit tests:** `Account.debit` and `credit` rules, money validation, cursor encoding. Plain JUnit, no Spring.",
            "**Integration tests (Testcontainers PostgreSQL):** every endpoint's happy path and main failures, plus the constraint and grant checks (an `UPDATE` on `ledger_entries` as the app user must fail).",
            "**Concurrency tests:** a fixed thread pool and a `CountDownLatch` so all threads start together. Assert conservation of money, exactly-one success for double spend, zero deadlocks for opposite transfers.",
            "**Property-style test:** random sequences of transfers, then assert the ledger sum for each account equals its `balance` and every transfer's debits equal its credits.",
            "**Load test:** k6 at 50 virtual users for 2 minutes; record p95 and error rate in the README.",
          ],
        },
        {
          type: "code",
          language: "sql",
          title: "Two reconciliation checks the job runs",
          code: `-- 1. Every transfer balances
SELECT transfer_id
FROM ledger_entries
GROUP BY transfer_id
HAVING SUM(CASE WHEN direction = 'DEBIT'  THEN amount ELSE 0 END)
    <> SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END);

-- 2. Every cached balance matches its ledger
SELECT a.id, a.balance, COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount
                                          ELSE -e.amount END), 0) AS ledger_balance
FROM accounts a
LEFT JOIN ledger_entries e ON e.account_id = a.id
GROUP BY a.id, a.balance
HAVING a.balance <> COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount
                                      ELSE -e.amount END), 0);`,
        },
      ],
    },
    {
      title: "Stretch Goals",
      blocks: [
        {
          type: "list",
          items: [
            "Holds (authorize now, capture later), the way a hotel blocks money on a card.",
            "Multi-currency transfers with an FX system account and a stored rate per transfer.",
            "Outbox table and an event per completed transfer, for a future notification service (Project 8).",
            "Daily balance snapshots so reconciliation only checks entries since the last snapshot.",
            "Monthly partitioning of `ledger_entries` by `created_at`.",
            "Fraud rule: more than N transfers to new recipients in an hour freezes the wallet for review.",
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
              question: "Why not just keep a balance column and update it?",
              answer:
                "Because a single number can't explain itself. If a balance is wrong, there's no trail of how it got there.\n\nWith double entry, every change is a pair of lines that must cancel out. The balance column is still there for fast checks, but the ledger is the truth, and the nightly job proves the two agree.",
            },
            {
              question: "How do you stop two withdrawals from spending the same money?",
              answer:
                "Both transfers lock the source account with `SELECT ... FOR UPDATE` inside the transaction. The second one waits until the first commits, then reads the new balance and fails the check.\n\nThere's also a `CHECK (balance >= 0)` on user accounts as a last line of defence. My test fires 100 threads at once to send the full balance and asserts exactly one succeeds.",
            },
            {
              question: "How did you avoid deadlocks?",
              answer:
                "Lock ordering. Every transfer locks the two accounts in the order of their IDs, so two opposite transfers ask for the locks in the same order and one simply waits.\n\nI proved it with a test that runs 1,000 transfers each way at the same time and asserts zero deadlock errors.",
            },
            {
              question: "Pessimistic or optimistic locking, and why?",
              answer:
                "Pessimistic for transfers, because a busy wallet gets real contention, and with optimistic locking most of those requests would fail with a version conflict and need retries.\n\nOptimistic `@Version` for things that rarely collide, like changing a wallet's display name or status.",
            },
            {
              question: "What happens if the client times out and retries a transfer?",
              answer:
                "The client sends the same `Idempotency-Key`. I find the original transfer by `(initiator_id, idempotency_key)` and return its result instead of moving money again.\n\nIf two retries race, the unique constraint lets only one insert win; the other catches the violation and returns the winner's result. A reused key with a different body gets 409.",
            },
            {
              question: "Why BigDecimal and not double?",
              answer:
                "`double` is binary floating point, so `0.1 + 0.2` is `0.30000000000000004`. In money, those tiny errors add up and break reconciliation.\n\n`BigDecimal` built from a String is exact. I compare with `compareTo` because `equals` also compares scale, so `2.50` and `2.5` aren't equal by `equals`.",
            },
            {
              question: "Why is the ledger append-only, and how do you enforce it?",
              answer:
                "So history can't be rewritten, by a bug or by a person. A mistake is fixed with a reversal, which is new lines linked to the old transfer.\n\nIt's enforced in the database, not just in code: the app's DB user has no `UPDATE` or `DELETE` rights on `ledger_entries`, and a test checks that an update fails.",
            },
            {
              question: "Why keyset pagination for statements?",
              answer:
                "`OFFSET 100000` makes the database read and throw away 100,000 rows, so deep pages get slower and slower. It also shifts rows when new entries arrive, so users see duplicates.\n\nKeyset uses the last seen `id` with an index on `(account_id, id DESC)`, so every page is an index range scan of 50 rows.",
            },
            {
              question: "What does the reconciliation job check, and what does it do when it finds a problem?",
              answer:
                "It checks that every transfer's debits equal its credits and that every account's cached balance equals the sum of its ledger lines.\n\nIt never fixes anything itself. It records the mismatch in `reconciliation_runs` and logs an error, because an automatic fix could hide the bug that caused it.",
            },
            {
              question: "How would this scale to many app instances?",
              answer:
                "The app is stateless, and all the locking happens in PostgreSQL, so more instances just work. The scheduled job uses ShedLock so only one instance runs it.\n\nThe real limit is a single hot account. For a merchant wallet I'd look at splitting it into sub-accounts or batching credits, but I'd measure first.",
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
            "Built a Spring Boot wallet backend on an append-only double-entry ledger in PostgreSQL, with idempotent transfers and a nightly reconciliation job that verifies every balance against its ledger.",
            "Prevented double spending and deadlocks with ordered `SELECT ... FOR UPDATE` locks; proved with Testcontainers concurrency tests (N concurrent transfers, zero balance drift).",
            "Served statements with keyset pagination at p95 of X ms over 1M ledger rows, measured with k6.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Only claim what you built",
          text: "Replace X and N with the numbers from your own k6 summary and test runs, and mention the machine they ran on if asked. If a bullet describes a stretch goal you didn't finish, cut it. An interviewer will pull on exactly the thread you're least sure about.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "**Transactions and Locking** (System Design): isolation levels, `FOR UPDATE`, `@Version`, and why side effects belong after commit.",
            "**Idempotency and Webhooks** (System Design): idempotency keys and verifying a signed webhook.",
            "**Multithreading and Concurrency**: thread pools, `CountDownLatch`, and how to write a test that really runs things at the same time.",
            "**MySQL** section for indexes and `EXPLAIN`; the ideas carry over to PostgreSQL, which this project uses.",
            "**Spring & Spring Boot**: `@Transactional` proxies and why a call from inside the same class skips them.",
            "`BigDecimal` basics: scale, `RoundingMode`, and `compareTo` versus `equals`.",
          ],
        },
      ],
    },
  ],
};
