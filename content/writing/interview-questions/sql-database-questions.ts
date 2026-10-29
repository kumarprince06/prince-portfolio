import type { Lesson } from "../types";

export const sqlDatabaseQuestions: Lesson = {
  slug: "sql-database-interview-questions",
  date: "2026-10-29",
  title: "SQL and Database Interview Questions",
  description:
    "The database questions backend interviews keep coming back to, from ACID, isolation levels, indexes and locking to MySQL vs PostgreSQL and scaling, plus 28 classic SQL queries written out and explained.",
  tags: ["Interview", "SQL", "PostgreSQL", "MySQL", "Databases"],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "Almost every backend interview I've prepared for had a database round hiding inside it. Sometimes it's theory (\"what's an isolation level?\"), sometimes it's a whiteboard query (\"find the second-highest salary\"), and very often it's a scenario where the real answer is a lock, an index or a constraint.",
        },
        {
          type: "paragraph",
          text: "Read each question, then **try answering it out loud before opening the answer**. Saying it forces me to notice the gaps that silent reading hides. Questions marked with ⭐ are the ones that come up most often, so if time is short, do those first.",
        },
        {
          type: "paragraph",
          text: "The SQL is PostgreSQL unless I say otherwise, with notes where MySQL differs. For the coding section, I'd create the small schema locally, insert twenty rows, and run every query before reading my version.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "The shape of a good answer",
          text: "One plain-English sentence first, then a simple everyday example, then how it actually works, then the trade-off. Interviewers relax once they hear the one-liner, and the trade-off is what separates a memorised answer from an understood one.",
        },
      ],
    },
    {
      title: "Transactions and ACID",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is a transaction?",
              answer:
                "A group of SQL statements that the database treats as one unit: either all of them take effect, or none of them do.\n\nThink of transferring money to a friend. The bank takes 500 from my account and adds 500 to theirs. If the server crashes between those two steps, I don't want the money to vanish. A transaction wraps both updates, so after a crash the database either has both changes or neither.\n\nIn SQL it's `BEGIN`, the statements, then `COMMIT` to keep them or `ROLLBACK` to undo them.",
            },
            {
              question: "⭐ What does ACID stand for?",
              answer:
                "**Atomicity**: all or nothing. The debit and the credit in a transfer commit together or not at all.\n\n**Consistency**: every constraint still holds after the transaction. A foreign key never points at a missing row, and a `CHECK (balance >= 0)` is never broken.\n\n**Isolation**: transactions running at the same time don't see each other's half-done work. How strict that is depends on the isolation level.\n\n**Durability**: once the database says \"committed\", the data survives a crash or power cut. That promise comes from the write-ahead log.",
            },
            {
              question: "How does the database keep its durability promise if it crashes right after a commit?",
              answer:
                "Through the **write-ahead log** (WAL in PostgreSQL, the redo log in MySQL InnoDB). Before changing the actual data pages, the database appends a description of the change to a sequential log file and flushes that log to disk at commit.\n\nIt's like a shopkeeper who writes every sale in a notebook before rearranging the shelves. If the lights go out mid-rearrangement, the notebook says exactly what should be on the shelves. On restart, the database replays the log from the last checkpoint.\n\nAppending to a log is fast because it's a sequential write, much cheaper than updating random pages. Replicas in PostgreSQL also stream this same log, which is how replication works.",
            },
            {
              question: "What is a savepoint?",
              answer:
                "A bookmark inside a transaction that I can roll back to without throwing away the whole transaction.\n\n`SAVEPOINT before_bonus;` then some work, and if that part fails, `ROLLBACK TO SAVEPOINT before_bonus;`. Everything before the savepoint is still there and can be committed. Frameworks use savepoints for \"nested\" transactions, such as Spring's `NESTED` propagation.",
            },
            {
              question: "Why should transactions be short?",
              answer:
                "Because a transaction holds things other people need: row locks, a database connection, and in PostgreSQL an old snapshot that stops `VACUUM` cleaning up dead rows.\n\nIt's like holding the only lift door open while you finish a phone call. Everyone else waits. The classic mistake is calling a payment gateway or sending an email inside a transaction. If the gateway takes 8 seconds, the connection and the locks are held for 8 seconds, and under load the connection pool runs dry.\n\nMy rule: do the slow outside work before or after the transaction, never inside it.",
            },
          ],
        },
      ],
    },
    {
      title: "Isolation Levels and MVCC",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What are the read anomalies that isolation levels are about?",
              answer:
                "Three classic ones, each a way of seeing someone else's work at the wrong moment.\n\nA **dirty read** is reading data another transaction hasn't committed yet. If it rolls back, I've acted on something that never existed. Like reading a cheque amount before the bank has confirmed it clears.\n\nA **non-repeatable read** is reading the same row twice in my transaction and getting different values, because someone committed an update in between.\n\nA **phantom read** is running the same query twice and getting a different set of rows, because someone inserted or deleted matching rows in between. \"How many orders are pending?\" says 5, then 6.",
            },
            {
              question: "⭐ What are the four isolation levels, and which anomalies does each allow?",
              answer:
                "From weakest to strictest: Read Uncommitted, Read Committed, Repeatable Read and Serializable. Each level blocks one more anomaly than the one before, as in the table below.\n\nStricter isn't free. Serializable can abort transactions with serialization errors that the app has to retry, so most systems run at Read Committed or Repeatable Read and handle the risky spots with explicit locks or atomic updates.",
            },
          ],
        },
        {
          type: "table",
          headers: ["Level", "Dirty read", "Non-repeatable read", "Phantom read"],
          rows: [
            ["Read Uncommitted", "possible", "possible", "possible"],
            ["Read Committed", "prevented", "possible", "possible"],
            ["Repeatable Read", "prevented", "prevented", "possible in the SQL standard"],
            ["Serializable", "prevented", "prevented", "prevented"],
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "What are the default isolation levels in PostgreSQL and MySQL?",
              answer:
                "PostgreSQL defaults to **Read Committed**. MySQL InnoDB defaults to **Repeatable Read**.\n\nThe real behaviour is a bit better than the table suggests. PostgreSQL's Repeatable Read is snapshot isolation, so it also prevents phantoms for plain reads. MySQL's Repeatable Read gives plain reads a consistent snapshot too, and uses gap (next-key) locks for locking reads so new rows can't sneak into a locked range.\n\nPostgreSQL also accepts Read Uncommitted but quietly treats it as Read Committed. It never shows dirty data.",
            },
            {
              question: "What is a lost update, and how do you prevent it?",
              answer:
                "Two people read the same value, both change it in their own code, and the second write silently overwrites the first.\n\nPicture a tea stall with a stock board saying 10 cups. Two staff members each sell one, each read \"10\", each write \"9\". Two cups were sold, but the board says 9. Read Committed does nothing to stop this, because each step on its own is perfectly valid.\n\nThere are three standard fixes. Do the maths inside one atomic statement: `UPDATE stock SET cups = cups - 1 WHERE item_id = 7`. Or lock the row first with `SELECT ... FOR UPDATE` so the second person waits. Or use optimistic locking with a version column, where the second write finds the version changed and fails instead of overwriting.",
            },
            {
              question: "What is write skew?",
              answer:
                "A subtler anomaly that even snapshot isolation allows. Two transactions read the same data, each makes a decision based on it, and each writes a *different* row, so neither overwrites the other, but together they break a rule.\n\nThe textbook case: a hospital needs at least one doctor on call. Two doctors are on call, both check \"is someone else still on call?\", both see yes, both go off call. Each update was fine alone, and now nobody is on call.\n\nFixes are Serializable isolation (PostgreSQL detects this and aborts one), locking the rows you based the decision on with `FOR UPDATE`, or turning the rule into a constraint the database enforces.",
            },
            {
              question: "What is MVCC?",
              answer:
                "Multi-Version Concurrency Control. Instead of overwriting a row in place, a writer creates a **new version** of it, and each transaction reads the version that was current for its snapshot.\n\nIt's like a restaurant menu board: while the manager prepares tomorrow's prices on a new board, customers keep reading today's board. Nobody waits for anyone. That's the big win: **readers don't block writers and writers don't block readers**. Only two writers touching the same row have to queue.\n\nPostgreSQL keeps old versions inside the table itself, which is why it needs `VACUUM`. MySQL InnoDB keeps them in undo logs.",
            },
            {
              question: "Why does PostgreSQL need `VACUUM`?",
              answer:
                "Because MVCC leaves dead row versions behind. Every `UPDATE` writes a new version and leaves the old one in the table, and a `DELETE` just marks the row dead. Something has to reclaim that space.\n\n`VACUUM` marks dead space reusable and updates the visibility map, and `ANALYZE` refreshes the statistics the planner uses. Autovacuum runs both automatically, but tables with heavy churn sometimes need tuning, or they **bloat**: they grow on disk and scans get slower even though the row count stays the same.\n\nA very long-running transaction also blocks cleanup, because its old snapshot might still need those dead versions.",
            },
          ],
        },
      ],
    },
    {
      title: "Indexes",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is an index, and what does it cost?",
              answer:
                "A separate sorted structure that lets the database find rows without reading the whole table, like the index at the back of a textbook. Without it, finding \"MVCC\" means reading every page.\n\nThe cost is on writes and storage. Every `INSERT`, `UPDATE` of an indexed column and `DELETE` also has to update each index, and every index takes disk and memory. So I add indexes for the queries that actually run, not for every column \"just in case\".",
            },
            {
              question: "How does a B-tree index work?",
              answer:
                "It's a balanced tree of sorted keys. Each node holds hundreds of keys, so even a table with millions of rows is only 3 or 4 levels deep, and a lookup touches just a handful of pages. That's O(log n).\n\nIt works like finding a name in a phone book: open near the right letter, narrow down to the page, then the line. The leaf level holds the keys in order with pointers to the rows.\n\nBecause the keys are sorted, the same index also serves range queries (`amount BETWEEN 100 AND 500`), `ORDER BY` on the indexed column, and prefix searches like `LIKE 'Pri%'`.",
            },
            {
              question: "What is a clustered index? How do MySQL and PostgreSQL differ here?",
              answer:
                "A clustered index means the table's rows are physically stored in the order of that index.\n\nIn MySQL InnoDB, the **primary key is the clustered index**: the table *is* a B-tree ordered by primary key. Secondary indexes store the primary key value, so a lookup through a secondary index finds the PK and then walks the clustered index to get the row. That's why a short primary key matters in MySQL, since it's copied into every secondary index.\n\nPostgreSQL stores tables as an unordered **heap**, and every index, including the primary key, points to a row location. `CLUSTER` can reorder a table once, but it doesn't stay ordered.",
            },
            {
              question: "⭐ What is a composite index, and what is the leftmost prefix rule?",
              answer:
                "An index on several columns together, like `(customer_id, status, ordered_at)`. It's sorted by the first column, then by the second within each first value, and so on, like a phone book sorted by surname then first name.\n\nThat ordering gives the **leftmost prefix rule**. The index helps `WHERE customer_id = ?`, `customer_id AND status`, or all three, plus `ORDER BY ordered_at` after those equalities. It can't efficiently help `WHERE status = ?` alone, just as a phone book sorted by surname can't quickly find everyone called \"Ravi\".\n\nMy column order rule: equality columns first, then the range or sort column. Newer versions of both databases can sometimes \"skip scan\" past a leading column with very few distinct values, but I don't design around that.",
            },
            {
              question: "When does the database not use an index even though one exists?",
              answer:
                "When the query hides the column or the index wouldn't actually help. The usual causes are a function on the column (`WHERE DATE(ordered_at) = ...` or `LOWER(email) = ...`), a leading wildcard (`LIKE '%gmail.com'`), an implicit type conversion (comparing a text column to a number), and an `OR` across different columns.\n\nThen there are cases where skipping the index is the *right* choice: very low selectivity (`WHERE status = 'ACTIVE'` when 95% of rows are active), a tiny table where a sequential scan is cheaper, or stale statistics that make the planner misjudge.\n\nThe fixes are rewriting the condition to leave the column bare (a date range instead of `DATE()`), an expression index like `CREATE INDEX ON customers (LOWER(email))`, or running `ANALYZE`.",
            },
            {
              question: "What is a covering index?",
              answer:
                "An index that contains every column the query needs, so the database can answer from the index alone without visiting the table.\n\nFor `SELECT status, ordered_at FROM orders WHERE customer_id = ?`, an index on `(customer_id, status, ordered_at)` covers it. PostgreSQL calls this an index-only scan, and it also has `INCLUDE` to add extra columns to the leaf level without making them part of the key: `CREATE INDEX ON orders (customer_id) INCLUDE (amount)`.",
            },
            {
              question: "What are selectivity and cardinality, and why do they matter for indexes?",
              answer:
                "Cardinality is how many distinct values a column has. Selectivity is what fraction of rows a condition matches.\n\nAn index on `email` (every value unique) is highly selective: one lookup, one row. An index on `is_active` (two values) is nearly useless for the common value, because reading half the table through an index is slower than just scanning it. That's why I put the most selective equality columns early in a composite index and don't bother indexing low-cardinality flags alone. A partial index like `WHERE status = 'PENDING'` is the exception, when the rare value is the one I query.",
            },
            {
              question: "What other index types exist besides B-tree?",
              answer:
                "In PostgreSQL: **Hash** for pure equality, **GIN** for values with many parts (JSONB keys, arrays, full-text search), **GiST** for geometric and range data (PostGIS uses it), and **BRIN** for huge tables naturally ordered by a column, like an append-only log by timestamp, where it stores just min and max per block range.\n\nTwo useful variations: a **partial index** covers only some rows (`CREATE INDEX ON orders (ordered_at) WHERE status = 'PENDING'`), and an **expression index** indexes a computed value (`LOWER(email)`). MySQL InnoDB is mostly B-tree, plus full-text and spatial indexes.",
            },
            {
              question: "How do you add an index to a big live table without freezing writes?",
              answer:
                "In PostgreSQL, `CREATE INDEX CONCURRENTLY`. A normal `CREATE INDEX` blocks writes to the table until it's done, which on a large table can mean minutes of failed inserts. The concurrent version takes longer and can't run inside a transaction block, but writes keep flowing. If it fails halfway it leaves an invalid index, which I drop and retry.\n\nMySQL InnoDB builds most indexes online by default (`ALGORITHM=INPLACE, LOCK=NONE`). Either way I'd test on production-sized data first and set a `lock_timeout` so a migration fails fast instead of queueing everything behind it.",
            },
            {
              question: "Should foreign key columns be indexed?",
              answer:
                "Usually yes. MySQL InnoDB creates an index on a foreign key automatically. PostgreSQL does not.\n\nWithout one, joining `orders` to `customers` on `customer_id` is slower, and deleting a customer forces PostgreSQL to scan the whole `orders` table to check nothing still references it. So in PostgreSQL I index the foreign keys I join on or delete through.",
            },
          ],
        },
      ],
    },
    {
      title: "Query Performance and EXPLAIN",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What's the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?",
              answer:
                "`EXPLAIN` shows the plan the database *intends* to use, with estimated costs and row counts, without running the query. `EXPLAIN ANALYZE` actually runs it and shows the real time and real row counts next to the estimates.\n\nThe most useful thing in `EXPLAIN ANALYZE` is the gap between estimated and actual rows. If the planner expected 10 rows and got 200,000, its statistics are wrong and it probably picked a bad plan.\n\nCareful: `EXPLAIN ANALYZE` on an `UPDATE` or `DELETE` really changes data, so I wrap it in `BEGIN` ... `ROLLBACK`. MySQL 8.0.18+ has `EXPLAIN ANALYZE` too.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          title: "Reading a plan",
          code: `EXPLAIN ANALYZE
SELECT * FROM orders
WHERE customer_id = 42
ORDER BY ordered_at DESC
LIMIT 20;

-- Good sign:  Index Scan using orders_customer_ordered_idx
-- Bad sign:   Seq Scan on orders  ->  Sort  (on a big table)`,
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ A query is slow. How do you optimize it?",
              answer:
                "I measure before I change anything. First `EXPLAIN ANALYZE`, looking for sequential scans on big tables, estimates far from actual rows, and sorts or hashes that spill to disk.\n\nThen the usual fixes, cheapest first: add or fix the index, select only the columns I need instead of `SELECT *`, make conditions index-friendly (a range instead of a function on the column), rewrite a heavy `NOT IN` or correlated subquery as `NOT EXISTS` or a join, and use keyset pagination instead of a deep `OFFSET`.\n\nIf the query itself looks fine, I check the surroundings: is it waiting on a lock, waiting for a pool connection, or running on a bloated table with stale statistics? Only after all that would I reach for caching.",
            },
            {
              question: "How does a SQL query actually execute?",
              answer:
                "Four stages. The parser turns the text into a tree. The rewriter expands views and rules. The **planner** considers different ways to run it (sequential scan or index scan, which join order, nested loop or hash or merge join) and picks the cheapest using table statistics. Then the executor runs that plan.\n\nThe planner is like a cab driver choosing a route from what they know about traffic. If their traffic info is from last year, they'll pick a bad road. That's why stale statistics cause bad plans, and why `ANALYZE` matters.",
            },
            {
              question: "What join algorithms does a database use?",
              answer:
                "**Nested loop**: for each row on one side, look up matches on the other. Great when one side is small and the other has an index on the join key.\n\n**Hash join**: build a hash table from the smaller side, then probe it with each row of the bigger side. Great for large unsorted inputs with an equality join.\n\n**Merge join**: walk two inputs already sorted on the join key side by side, like merging two sorted lists.\n\nI don't choose these myself; the planner does. But knowing them helps me read `EXPLAIN` and spot when a nested loop over a huge table means a missing index.",
            },
            {
              question: "What is the logical order in which a `SELECT` is evaluated?",
              answer:
                "`FROM` and joins, then `WHERE`, then `GROUP BY`, then `HAVING`, then `SELECT`, then `DISTINCT`, then `ORDER BY`, then `LIMIT`/`OFFSET`.\n\nThat order explains a lot of errors. A column alias defined in `SELECT` can't be used in `WHERE`, because `WHERE` runs first. It can be used in `ORDER BY`, because that runs after. And an aggregate like `COUNT(*) > 5` belongs in `HAVING`, not `WHERE`, because rows aren't grouped yet when `WHERE` runs. The physical execution can differ, but the result always behaves as if this order were followed.",
            },
          ],
        },
      ],
    },
    {
      title: "SQL Fundamentals",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Explain the join types.",
              answer:
                "Imagine a list of customers and a list of orders.\n\n**INNER JOIN** returns only customers who have orders, paired with those orders. **LEFT JOIN** returns every customer, with order columns filled in where there's a match and NULL where there isn't, which is how I find \"customers with no orders\" (add `WHERE o.id IS NULL`). **RIGHT JOIN** is the mirror image, and I almost always rewrite it as a LEFT JOIN for readability. **FULL OUTER JOIN** returns everything from both sides, matched where possible.\n\n**CROSS JOIN** pairs every row with every row (useful for generating combinations, like every date with every city). A **self join** joins a table to itself, like matching each employee to their manager in the same `employees` table.",
            },
            {
              question: "⭐ What's the difference between `WHERE` and `HAVING`?",
              answer:
                "`WHERE` filters individual rows **before** grouping. `HAVING` filters groups **after** aggregation.\n\nAt a food court: `WHERE` is \"ignore cancelled orders\", applied to each receipt. `HAVING` is \"show only stalls with more than 100 orders\", which you can only know after counting per stall. So `WHERE status = 'DELIVERED' GROUP BY city HAVING COUNT(*) > 100`. Filtering in `WHERE` when possible is also faster, since fewer rows reach the grouping step.",
            },
            {
              question: "`UNION` vs `UNION ALL`?",
              answer:
                "Both stack the results of two queries. `UNION` removes duplicate rows, which costs an extra sort or hash step. `UNION ALL` keeps every row and is faster.\n\nI default to `UNION ALL` and use `UNION` only when duplicates are actually possible and unwanted.",
            },
            {
              question: "⭐ `DELETE` vs `TRUNCATE` vs `DROP`?",
              answer:
                "`DELETE` removes rows, optionally with a `WHERE`, one row at a time. It fires triggers and can be rolled back. `TRUNCATE` empties the whole table in one fast operation and resets identity counters. `DROP` removes the table itself, structure and all.\n\nLike a notebook: `DELETE` erases chosen lines, `TRUNCATE` tears out every page but keeps the cover, `DROP` throws the notebook away. The table below has the details that interviewers like to probe.",
            },
          ],
        },
        {
          type: "table",
          headers: ["", "DELETE", "TRUNCATE", "DROP"],
          rows: [
            ["Removes", "Chosen rows (WHERE)", "All rows", "The whole table"],
            ["Speed on big tables", "Slow, row by row", "Fast", "Fast"],
            ["Fires row triggers", "Yes", "No", "No"],
            ["Resets identity / auto-increment", "No", "Yes", "Table is gone"],
            ["Rollback", "Yes", "Yes in PostgreSQL; no in MySQL (implicit commit)", "Yes in PostgreSQL; no in MySQL"],
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "`COUNT(*)` vs `COUNT(column)` vs `COUNT(DISTINCT column)`?",
              answer:
                "`COUNT(*)` counts rows. `COUNT(column)` counts rows where that column is **not NULL**. `COUNT(DISTINCT column)` counts unique non-NULL values.\n\nThis matters with LEFT JOINs. To count each customer's orders including customers with zero, I use `COUNT(o.id)`, which gives 0 for the NULL row. `COUNT(*)` would wrongly give 1. `COUNT(1)` is the same as `COUNT(*)`; there's no speed difference in modern databases.",
            },
            {
              question: "`IN` vs `EXISTS`, and what's the `NOT IN` NULL trap?",
              answer:
                "`IN (subquery)` checks whether a value is in a list. `EXISTS (subquery)` checks whether at least one matching row exists and can stop at the first match. Modern planners often run them the same way for positive checks.\n\nThe negative versions are not the same. If the subquery in `NOT IN` returns even one NULL, the whole condition becomes unknown for every row, and the query returns **nothing**. `x NOT IN (1, NULL)` means \"x is not 1 and x is not NULL\", and comparing to NULL is never true.\n\nSo for \"customers with no orders\" I use `NOT EXISTS` or a LEFT JOIN with `IS NULL`, never `NOT IN` on a nullable column.",
            },
            {
              question: "How does NULL behave in SQL?",
              answer:
                "NULL means \"unknown\", not zero and not empty. Any comparison with it, even `NULL = NULL`, gives unknown, which `WHERE` treats as false. So I write `IS NULL` and `IS NOT NULL`, never `= NULL`.\n\nAggregates skip NULLs: `AVG(rating)` averages only the rows that have a rating. `COALESCE(discount, 0)` turns a NULL into a default. And a unique constraint usually allows many NULLs (in PostgreSQL and MySQL), because two unknowns aren't considered equal.",
            },
            {
              question: "⭐ `ROW_NUMBER` vs `RANK` vs `DENSE_RANK`?",
              answer:
                "All three are window functions that number rows within an ordering. They differ only on ties.\n\nWith salaries 100, 100, 90: `ROW_NUMBER` gives 1, 2, 3 (ties get different numbers arbitrarily). `RANK` gives 1, 1, 3 (ties share a number, then it skips). `DENSE_RANK` gives 1, 1, 2 (ties share, no gap).\n\nLike a race: two runners tie for first. `RANK` says the next runner is third, `DENSE_RANK` says second. For \"Nth highest salary\" I want `DENSE_RANK`; for \"pick exactly one row per group\" I want `ROW_NUMBER`.",
            },
            {
              question: "What is a window function, and how is it different from `GROUP BY`?",
              answer:
                "A window function calculates something across a set of related rows **without collapsing them**. `GROUP BY` turns many rows into one row per group.\n\n`SELECT dept, AVG(salary) FROM employees GROUP BY dept` gives one row per department. `SELECT name, salary, AVG(salary) OVER (PARTITION BY dept) FROM employees` keeps every employee and adds their department's average beside them. `PARTITION BY` is the \"group\", `ORDER BY` inside `OVER` sets the order for running totals and `LAG`, and a frame like `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` sets a moving window.",
            },
            {
              question: "What is a CTE, and what's a recursive CTE?",
              answer:
                "A Common Table Expression is a named subquery defined with `WITH` at the top of a query. It makes long queries readable, like naming the steps of a recipe instead of nesting them.\n\nA **recursive CTE** refers to itself, which lets SQL walk hierarchies: an org chart, category trees, or a chain of referrals. It has an anchor part (the starting row) and a recursive part (find the children of the rows found so far), joined with `UNION ALL`, and it stops when a round finds nothing new.",
            },
            {
              question: "View vs materialized view?",
              answer:
                "A **view** is a saved query. Querying it runs the underlying query every time, so it's always current but no faster.\n\nA **materialized view** stores the result like a table. It's fast to read but goes stale until refreshed (`REFRESH MATERIALIZED VIEW CONCURRENTLY` in PostgreSQL). It suits heavy reports, like a daily sales summary, where data a few minutes old is fine. MySQL has no built-in materialized views; people use summary tables updated by a job.",
            },
            {
              question: "Should business logic go in stored procedures and triggers?",
              answer:
                "Sparingly. They run close to the data and can be fast, but the logic becomes invisible from the application code, harder to version, test and debug, and tied to one database.\n\nI'm happy to let the database enforce rules it's good at: constraints, foreign keys, unique indexes, `CHECK`. I keep workflows and business decisions in the application, where they're tested and reviewed with everything else.",
            },
          ],
        },
      ],
    },
    {
      title: "Schema Design and Keys",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is normalization? Explain 1NF, 2NF and 3NF.",
              answer:
                "Organising tables so each fact is stored in exactly one place, which prevents update anomalies (changing a customer's phone number in one row but not another).\n\n**1NF**: each column holds a single value, with no lists like \"tea, coffee\" in one cell and no repeating columns like `item1`, `item2`. **2NF**: every non-key column depends on the *whole* primary key, not part of a composite key. **3NF**: no non-key column depends on another non-key column. If `orders` stores `customer_id` and also `customer_city`, the city depends on the customer, not the order, so it belongs in `customers`.\n\nThe short version I remember: every column depends on the key, the whole key, and nothing but the key.",
            },
            {
              question: "When would you denormalize on purpose?",
              answer:
                "When reads matter more and I can keep the copy correct, or when the copy is actually a historical fact.\n\nThe best example is a price on an order line. The product's current price lives in `products`, but the order stores the price *at the time of purchase*. That isn't duplication; recomputing it from today's price would be wrong, because history must not change. Same with a cab fare: the quoted fare is saved on the ride.\n\nOther cases: an `order_count` column on customers to avoid counting every time, or a reporting table built by a job. The cost is keeping copies in sync, so I do it deliberately, not by accident.",
            },
            {
              question: "Primary key vs unique key vs foreign key?",
              answer:
                "A **primary key** uniquely identifies each row, can't be NULL, and there's one per table. A **unique key** also guarantees uniqueness but normally allows NULLs, and a table can have many, like `email` and `phone`. A **foreign key** says this column must match a primary or unique key in another table, so an order can't point at a customer who doesn't exist.\n\nUnique constraints are also my favourite concurrency tool: when two requests race to insert the same thing, the constraint lets exactly one win.",
            },
            {
              question: "Surrogate keys vs natural keys? Auto-increment vs UUID?",
              answer:
                "A natural key is a real-world value (an email, a phone number). A surrogate key is a meaningless ID the system creates. Natural keys change in real life (people change emails), so I use surrogate primary keys plus a unique constraint on the natural value.\n\nAuto-increment IDs are compact and insert at the end of the index, but they reveal how many rows exist and let someone guess the next ID. Random UUIDv4 values hide that but scatter inserts across the B-tree, which hurts write performance and cache hit rates. Time-ordered IDs (ULID or UUIDv7) give the best of both: generated in the app, hard to guess, and still inserted roughly in order.",
            },
            {
              question: "JSON vs JSONB in PostgreSQL? When should data go in a JSON column?",
              answer:
                "`JSON` stores the text exactly as sent. `JSONB` stores a parsed binary form: slightly slower to write, much faster to query, and indexable with GIN. It doesn't keep key order or whitespace. I use JSONB.\n\nA JSON column suits flexible extra attributes, like the raw payload a payment provider sent. Anything I filter, join or enforce rules on goes in proper columns, where constraints and normal indexes work.",
            },
            {
              question: "SQL vs NoSQL: how do you choose?",
              answer:
                "By access patterns and consistency needs, not by fashion.\n\nRelational databases give transactions, joins, constraints and a strict schema. That suits money, bookings, inventory and anything where relationships matter. NoSQL stores (MongoDB, DynamoDB, Cassandra) give flexible schemas and easy horizontal scaling for specific, known access patterns, usually at the cost of joins and sometimes strong consistency.\n\nFor most business backends I start with PostgreSQL and add a specialised store (Redis for ephemeral data, a search engine for full-text) only when a specific need appears.",
            },
          ],
        },
      ],
    },
    {
      title: "Locking and Concurrency",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What does `SELECT ... FOR UPDATE` do?",
              answer:
                "It reads rows and locks them until my transaction ends, so nobody else can update, delete or lock them in the meantime. Others who try just wait.\n\nIt's like picking up the last pastry at a bakery counter and holding it while you decide. Nobody else can take it, and nobody else can even put it on hold, until you either buy it (commit) or put it back (rollback).\n\nPlain `SELECT`s still read freely thanks to MVCC. I use `FOR UPDATE` when I'm about to make a decision based on what I read, such as checking a balance before debiting it.",
            },
            {
              question: "What is `SKIP LOCKED`, and where is it useful?",
              answer:
                "It tells the database: if a row is already locked by someone else, **skip it** instead of waiting. Combined with `FOR UPDATE` and `LIMIT`, it turns a table into a safe job queue that many workers can pull from at once.\n\nPicture a bank with several counters and a pile of token slips. Each clerk grabs the top slip nobody else is holding. No two clerks serve the same customer, and nobody stands around waiting for someone else's slip.\n\nIn my RideX project, the background workers claim rows exactly this way, so running several instances splits the work instead of doubling it. PostgreSQL has had it since 9.5 and MySQL since 8.0.",
            },
            {
              question: "Why would you use `FOR NO KEY UPDATE` instead of `FOR UPDATE` in PostgreSQL?",
              answer:
                "Because `FOR UPDATE` is stronger than most updates need, and it blocks inserts into child tables.\n\nWhen someone inserts a child row with a foreign key (a new offer pointing at a ride, a new order line pointing at an order), PostgreSQL takes a `KEY SHARE` lock on the parent row to make sure it isn't deleted mid-insert. `FOR UPDATE` conflicts with `KEY SHARE`, so those inserts wait behind my lock. `FOR NO KEY UPDATE` says \"I'll update this row but not its key\", and it doesn't conflict with `KEY SHARE`.\n\nI ran into exactly this in RideX: a worker locking a ride row with `FOR UPDATE` was blocking new offer rows. Switching to `FOR NO KEY UPDATE SKIP LOCKED` fixed it.",
            },
            {
              question: "Two people try to claim the same thing at the same moment. How do you make sure only one wins?",
              answer:
                "Let the database be the referee with one **conditional update**, and check how many rows it changed.\n\nSay two cab drivers tap \"accept\" on the same ride in the same millisecond. The update is `UPDATE rides SET driver_id = ?, status = 'ASSIGNED' WHERE id = ? AND status = 'SEARCHING'`. The row lock makes the two updates queue. The first changes the status and gets **1 row**. The second, once it gets the lock, re-checks the `WHERE`, sees the status is no longer `SEARCHING`, and gets **0 rows**. Zero means \"someone else got it\", which I return as a 409 Conflict.\n\nThis is what RideX's ride claim does, and a test releases two threads together to prove there's exactly one winner. A `synchronized` block wouldn't work, because with two app instances each JVM has its own lock; the database is the only place both requests meet.",
            },
            {
              question: "Optimistic vs pessimistic locking?",
              answer:
                "**Pessimistic** locking assumes a clash is likely, so it locks the row up front with `SELECT ... FOR UPDATE`. Others wait. Like booking a meeting room before using it.\n\n**Optimistic** locking assumes clashes are rare, so it doesn't lock. Each row has a `version` column, and the update says `UPDATE ... SET ..., version = version + 1 WHERE id = ? AND version = ?`. If 0 rows change, someone else updated it first, and I retry or tell the user. Like editing a shared document and getting \"this file changed since you opened it\".\n\nOptimistic suits low-contention edits, like two admins rarely editing the same setting. Pessimistic suits hot rows where retries would be constant, or where a wrong result is expensive.",
            },
            {
              question: "What is a database deadlock, and how do you prevent it?",
              answer:
                "Two transactions each hold a lock the other needs, so both would wait forever. Transaction A locks order 1 then wants order 2; transaction B locks order 2 then wants order 1.\n\nIt's two cars meeting on a one-lane bridge from both ends. The database detects the cycle and kills one transaction with an error (PostgreSQL `40P01`, MySQL `1213`) so the other can continue.\n\nPrevention: always take locks in the **same order** everywhere (for example, lock the parent row first, or sort IDs before locking several rows), keep transactions short, and touch as few rows as possible. And since deadlocks can still happen, the app should retry the aborted transaction.",
            },
            {
              question: "How do you prevent a balance from going negative under concurrency?",
              answer:
                "Do the check and the change in one atomic statement instead of read-then-write in the app.\n\n`UPDATE wallets SET balance = balance - 200 WHERE user_id = 7 AND balance >= 200`. If it changes 1 row, the debit happened. If 0, there wasn't enough money. Two concurrent debits queue on the row lock, and the second re-checks `balance >= 200` against the already-reduced balance, so it can't overdraw. A `CHECK (balance >= 0)` constraint is a good safety net on top.",
            },
            {
              question: "How do you stop duplicate inserts when the same request arrives twice?",
              answer:
                "With a **unique constraint**, not a \"check if it exists, then insert\" in code.\n\nCheck-then-insert has a gap: two identical requests both check, both see nothing, both insert. A unique index on the natural key (an idempotency key, a payment provider's event ID, an `(order_id, item_id)` pair) closes the gap, because the database lets exactly one insert succeed. The loser gets a unique-violation error that I treat as \"already done\" and return the original result.\n\n`INSERT ... ON CONFLICT DO NOTHING` (PostgreSQL) or `INSERT IGNORE` (MySQL) handle the duplicate quietly.",
            },
          ],
        },
      ],
    },
    {
      title: "MySQL vs PostgreSQL, Scaling and Pagination",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "MySQL vs PostgreSQL: what are the main differences?",
              answer:
                "Both are excellent, mature relational databases. PostgreSQL has richer SQL and types: JSONB with GIN indexes, arrays, partial and expression indexes, transactional DDL, PostGIS for geo data, and very strict standards behaviour. MySQL is simpler to run, very fast for straightforward read-heavy workloads, and has huge adoption and tooling.\n\nThe differences that bite in practice are in the table below. I've used both, and the habit I carry across is to check isolation, upsert syntax and DDL behaviour whenever I switch.",
            },
          ],
        },
        {
          type: "table",
          headers: ["Topic", "PostgreSQL", "MySQL (InnoDB)"],
          rows: [
            ["Default isolation", "Read Committed", "Repeatable Read"],
            ["Table storage", "Heap; every index points to the row", "Clustered on the primary key"],
            ["Upsert", "INSERT ... ON CONFLICT ... DO UPDATE", "INSERT ... ON DUPLICATE KEY UPDATE"],
            ["DDL in a transaction", "Yes, can be rolled back", "No, causes an implicit commit"],
            ["Old row versions", "Kept in the table; needs VACUUM", "Kept in undo logs"],
            ["Index on foreign keys", "Not created automatically", "Created automatically"],
            ["Case-insensitive LIKE", "ILIKE", "LIKE (default collations ignore case)"],
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Partitioning vs sharding?",
              answer:
                "**Partitioning** splits one big table into smaller pieces *inside one database*, for example `orders` by month. Queries for October only touch October's partition, and dropping a year of old data is a quick `DROP` of old partitions instead of a huge `DELETE`.\n\n**Sharding** splits data across *several database servers*, for example by customer ID or city. It's the way to scale writes beyond one machine, but cross-shard queries, joins and transactions become hard, and rebalancing shards is real work.\n\nLike a library: partitioning is splitting books across shelves in one building; sharding is opening branches in different cities. I'd partition first and shard only when one primary truly can't keep up.",
            },
            {
              question: "What are read replicas, and what's the catch?",
              answer:
                "Copies of the database that receive the primary's changes and serve read queries, so reporting and heavy reads don't load the primary.\n\nThe catch is **replication lag**: replication is usually asynchronous, so a replica can be a fraction of a second (or, under load, much more) behind. If a user updates their profile and the next page reads from a lagging replica, they see the old data. The standard fix is read-your-own-writes: read from the primary for a short time after a user writes, or for anything that must be current.",
            },
            {
              question: "Why use a connection pool, and is a bigger pool better?",
              answer:
                "Opening a database connection is expensive (TCP, TLS, authentication, a backend process in PostgreSQL). A pool keeps a set of open connections and lends them out, like a taxi stand where cabs wait instead of being built for each passenger.\n\nBigger isn't better. A database with 8 cores can't really run 200 queries at once; they queue inside it and fight over locks. HikariCP's rule of thumb is roughly `cores * 2 + effective disks`, often 10 to 20 connections. With many app instances, PgBouncer in front of PostgreSQL keeps the total number of real connections sane.",
            },
            {
              question: "Offset pagination vs keyset (cursor) pagination?",
              answer:
                "**Offset** pagination is `LIMIT 20 OFFSET 100000`. It's simple and lets you jump to any page, but the database still reads and throws away 100,000 rows, so deep pages get slower and slower. And if a new row arrives while someone is paging, items shift and get skipped or shown twice.\n\n**Keyset** pagination remembers the last row seen and asks for rows after it: `WHERE (ordered_at, id) < (:last_time, :last_id) ORDER BY ordered_at DESC, id DESC LIMIT 20`. The index jumps straight there, so page 5,000 is as fast as page 1, and pages stay stable. The trade-off is no \"jump to page 50\". I use keyset for feeds, infinite scroll and batch jobs, and offset for small admin tables.",
            },
            {
              question: "How do you change a column on a big table without downtime?",
              answer:
                "**Expand and contract**, in small steps that each keep the running app working.\n\nAdd the new column as nullable. Deploy code that writes to both old and new columns. Backfill old rows in batches (say 5,000 at a time, so no single statement locks the table for long). Switch reads to the new column. Once nothing reads the old column, drop it in a later release.\n\nIt's like moving house while still living in it: set up the new place, move things across room by room, and only hand back the old keys once everything is over.",
            },
          ],
        },
      ],
    },
    {
      title: "SQL Coding Questions",
      blocks: [
        {
          type: "paragraph",
          text: "These are the queries interviewers ask on a whiteboard or a shared editor. Every query below uses this small schema. I'd create it locally, insert a handful of rows, and try each question before reading my answer.",
        },
        {
          type: "code",
          language: "sql",
          title: "Practice schema (PostgreSQL)",
          code: `CREATE TABLE employees (
  id          INT PRIMARY KEY,
  name        TEXT NOT NULL,
  dept        TEXT NOT NULL,
  salary      NUMERIC(10,2) NOT NULL,
  manager_id  INT REFERENCES employees(id)
);

CREATE TABLE customers (
  id          INT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  city        TEXT NOT NULL,
  created_at  DATE NOT NULL
);

CREATE TABLE orders (
  id           INT PRIMARY KEY,
  customer_id  INT NOT NULL REFERENCES customers(id),
  city         TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  status       TEXT NOT NULL,          -- 'DELIVERED', 'CANCELLED', 'PENDING'
  ordered_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE logins (
  user_id     INT NOT NULL,
  login_date  DATE NOT NULL
);

CREATE TABLE wallets (
  user_id  INT PRIMARY KEY,
  balance  NUMERIC(10,2) NOT NULL CHECK (balance >= 0)
);

CREATE TABLE daily_sales (
  shop_id  INT  NOT NULL,
  day      DATE NOT NULL,
  total    NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (shop_id, day)
);`,
        },
        {
          type: "heading",
          text: "Ranking and the Nth Highest",
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ 1. Find the second-highest salary.",
              answer:
                "The most asked SQL question of all, and it's worth knowing three ways because the interviewer often asks \"another way?\".\n\nThe first finds the maximum below the maximum. The second sorts distinct salaries and skips one. The third ranks salaries with `DENSE_RANK`, which handles ties properly: if two people share the top salary, the next distinct salary is still rank 2. All three return nothing (or NULL for the first) if there's only one distinct salary, which is worth mentioning.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `-- 1. Max below the max
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- 2. Sort distinct salaries, skip the first
SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;

-- 3. Window function
SELECT DISTINCT salary
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 2;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ 2. Find the Nth highest salary (say N = 3).",
              answer:
                "Same `DENSE_RANK` idea, just a different number. I use `DENSE_RANK` rather than `RANK`, because with salaries 100, 100, 90, `RANK` would give 90 a rank of 3 while it's really the second distinct salary. `LIMIT 1 OFFSET N-1` on distinct salaries also works.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT DISTINCT salary
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 3;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ 3. Top 3 earners in each department.",
              answer:
                "\"Top N per group\" is the window-function question. `PARTITION BY dept` restarts the ranking for each department, like separate leaderboards per class. I wrap it in a subquery because a window function's result can't be filtered in the same query's `WHERE`.\n\nWhich rank function depends on what \"top 3\" means with ties: `DENSE_RANK` returns everyone in the top three salary levels, `ROW_NUMBER` returns exactly three people.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT dept, name, salary
FROM (
  SELECT e.*,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees e
) ranked
WHERE rnk <= 3
ORDER BY dept, salary DESC;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "4. The highest-paid employee in each department (exactly one row each).",
              answer:
                "Here I want one row per department even if two people tie, so `ROW_NUMBER` is the right tool, with `id` as a tie-breaker to make the choice stable. PostgreSQL also has a neat shortcut, `DISTINCT ON`, which keeps the first row of each group in the given order.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT dept, name, salary
FROM (
  SELECT e.*,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, id) AS rn
  FROM employees e
) ranked
WHERE rn = 1;

-- PostgreSQL shortcut
SELECT DISTINCT ON (dept) dept, name, salary
FROM employees
ORDER BY dept, salary DESC, id;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "5. Employees who earn more than their department's average.",
              answer:
                "Two ways. A **correlated subquery** computes the average for each employee's own department. A window function computes every department average in one pass, which is usually cheaper on big tables and easy to read.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `-- Correlated subquery
SELECT e.name, e.dept, e.salary
FROM employees e
WHERE e.salary > (
  SELECT AVG(x.salary) FROM employees x WHERE x.dept = e.dept
);

-- Window function
SELECT name, dept, salary
FROM (
  SELECT e.*, AVG(salary) OVER (PARTITION BY dept) AS dept_avg
  FROM employees e
) with_avg
WHERE salary > dept_avg;`,
        },
        {
          type: "heading",
          text: "Joins and Self Joins",
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ 6. Employees who earn more than their manager.",
              answer:
                "A **self join**: the same `employees` table appears twice, once as the employee and once as the manager. It's like holding two copies of the staff list side by side and matching each person to their boss's line. An inner join naturally drops people with no manager.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT e.name AS employee, e.salary,
       m.name AS manager,  m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "7. Customers who have never placed an order.",
              answer:
                "The \"anti-join\". I know both forms: a LEFT JOIN that keeps every customer and then filters to the ones with no matching order, and `NOT EXISTS`. Both are safe with NULLs.\n\nI deliberately avoid `NOT IN (SELECT customer_id FROM orders)`: if that column could ever contain a NULL, the query returns nothing at all.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

SELECT c.*
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);`,
        },
        {
          type: "qa",
          items: [
            {
              question: "8. Number of orders per customer, including customers with zero orders.",
              answer:
                "A LEFT JOIN keeps the customers with no orders, and `COUNT(o.id)` counts only real orders, so they get 0. `COUNT(*)` would be the classic bug here: it counts the NULL-filled row and reports 1. I group by `c.id` as well as the name, since two customers can share a name.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT c.id, c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY order_count DESC;`,
        },
        {
          type: "heading",
          text: "Grouping, Duplicates and Filtering Groups",
        },
        {
          type: "qa",
          items: [
            {
              question: "9. Total revenue and order count per city, for delivered orders.",
              answer:
                "The warm-up question. `WHERE` drops cancelled and pending orders row by row, then `GROUP BY` makes one line per city, like a shopkeeper adding up each city's receipts into its own pile.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT city, COUNT(*) AS orders, SUM(amount) AS revenue
FROM orders
WHERE status = 'DELIVERED'
GROUP BY city
ORDER BY revenue DESC;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "10. Cities with more than 100 delivered orders.",
              answer:
                "The filter is on the *count*, which only exists after grouping, so it goes in `HAVING`. Putting `COUNT(*) > 100` in `WHERE` is an error, and that's exactly what this question is testing.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT city, COUNT(*) AS delivered_orders
FROM orders
WHERE status = 'DELIVERED'
GROUP BY city
HAVING COUNT(*) > 100;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ 11. Find duplicate emails.",
              answer:
                "Group by the value and keep groups with more than one row. Comparing emails case-insensitively with `LOWER(email)` is a good follow-up point, since `Ravi@x.com` and `ravi@x.com` are the same person.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT LOWER(email) AS email, COUNT(*) AS copies
FROM customers
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "12. Delete duplicate customers, keeping the one with the lowest id.",
              answer:
                "The PostgreSQL version joins the table to itself and deletes every row that has a twin with a smaller id. The window-function version works in both databases: number the rows within each email and delete everything that isn't number 1.\n\nIn MySQL, a subquery that reads the same table you're deleting from has to be wrapped in a derived table (the extra `SELECT ... FROM (...) t`), or MySQL refuses it. On a real table I'd run the `SELECT` first, check the count, and then add the unique constraint so duplicates can't come back.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `-- PostgreSQL
DELETE FROM customers a
USING customers b
WHERE a.email = b.email
  AND a.id > b.id;

-- PostgreSQL and MySQL 8
DELETE FROM customers
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn
    FROM customers
  ) t
  WHERE rn > 1
);`,
        },
        {
          type: "qa",
          items: [
            {
              question: "13. Customers who ordered in every month of 2026.",
              answer:
                "This is \"relational division\": find the customers who match *all* of a set. The trick is counting: if a customer has orders in 12 distinct months of 2026, they ordered every month. Note the date filter is a half-open range on the raw column, so an index on `ordered_at` still works.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT customer_id
FROM orders
WHERE ordered_at >= '2026-01-01'
  AND ordered_at <  '2027-01-01'
GROUP BY customer_id
HAVING COUNT(DISTINCT date_trunc('month', ordered_at)) = 12;`,
        },
        {
          type: "heading",
          text: "Window Functions: Running Totals, LAG and Moving Averages",
        },
        {
          type: "qa",
          items: [
            {
              question: "14. Running total of daily revenue.",
              answer:
                "First collapse orders into one row per day, then `SUM(...) OVER (ORDER BY day)` adds up everything from the first day to the current one, like a shop's cash book where each line shows today's sales and the total so far. In MySQL, replace `ordered_at::date` with `DATE(ordered_at)`.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT day,
       revenue,
       SUM(revenue) OVER (ORDER BY day) AS running_total
FROM (
  SELECT ordered_at::date AS day, SUM(amount) AS revenue
  FROM orders
  WHERE status = 'DELIVERED'
  GROUP BY ordered_at::date
) daily
ORDER BY day;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "15. Day-over-day revenue change using `LAG`.",
              answer:
                "`LAG(revenue)` reads the previous row's value in the given order, so today minus yesterday is one subtraction. `NULLIF(..., 0)` avoids a divide-by-zero when yesterday had no revenue; the percentage simply becomes NULL. `LEAD` is the opposite and looks at the next row.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `WITH daily AS (
  SELECT ordered_at::date AS day, SUM(amount) AS revenue
  FROM orders
  WHERE status = 'DELIVERED'
  GROUP BY ordered_at::date
)
SELECT day,
       revenue,
       revenue - LAG(revenue) OVER (ORDER BY day) AS change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY day))
             / NULLIF(LAG(revenue) OVER (ORDER BY day), 0), 1) AS pct_change
FROM daily
ORDER BY day;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "16. 7-day moving average of orders per day.",
              answer:
                "A window frame: `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` averages today plus the six rows before it. One honest caveat to mention: this counts *rows*, so if a day has no orders it's missing from the data and the window stretches over more than seven calendar days. Joining against `generate_series` of all dates fixes that.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT day,
       order_count,
       ROUND(AVG(order_count) OVER (
         ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ), 2) AS moving_avg_7d
FROM (
  SELECT ordered_at::date AS day, COUNT(*) AS order_count
  FROM orders
  GROUP BY ordered_at::date
) daily
ORDER BY day;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "17. Each city's share of total revenue, as a percentage.",
              answer:
                "`SUM(SUM(amount)) OVER ()` looks odd but reads well once explained: the inner `SUM` is the per-city total from `GROUP BY`, and the outer windowed `SUM` with an empty `OVER ()` adds those totals across all cities. So every row gets the grand total next to its own.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT city,
       SUM(amount) AS revenue,
       ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 2) AS pct_of_total
FROM orders
WHERE status = 'DELIVERED'
GROUP BY city
ORDER BY revenue DESC;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "18. Each customer's first order.",
              answer:
                "Another \"one row per group\" question. `ROW_NUMBER` ordered by time, keep number 1. PostgreSQL's `DISTINCT ON` does the same thing in one line.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT *
FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ordered_at, id) AS rn
  FROM orders o
) numbered
WHERE rn = 1;

-- PostgreSQL shortcut
SELECT DISTINCT ON (customer_id) *
FROM orders
ORDER BY customer_id, ordered_at, id;`,
        },
        {
          type: "heading",
          text: "Gaps, Pivots and Hierarchies",
        },
        {
          type: "qa",
          items: [
            {
              question: "19. Users who logged in on 3 or more consecutive days.",
              answer:
                "The famous \"gaps and islands\" problem. The trick: number each user's login dates in order, then subtract that number from the date. For an unbroken streak, the date goes up by one each day and so does the row number, so the difference stays the same. Every streak gets its own constant \"group\" value.\n\nFor dates 1, 2, 3 and 5 of a month, the row numbers are 1, 2, 3, 4, and date minus number is 0, 0, 0, 1. The first three share a group. `DISTINCT` first is important, because two logins on the same day would break the counting.\n\nIn PostgreSQL, a date minus an integer is a date. In MySQL, use `DATE_SUB(login_date, INTERVAL rn DAY)`.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `WITH days AS (
  SELECT DISTINCT user_id, login_date
  FROM logins
),
grouped AS (
  SELECT user_id,
         login_date,
         login_date - ROW_NUMBER() OVER (
           PARTITION BY user_id ORDER BY login_date
         )::int AS streak_group
  FROM days
)
SELECT user_id,
       MIN(login_date) AS streak_start,
       COUNT(*)        AS streak_days
FROM grouped
GROUP BY user_id, streak_group
HAVING COUNT(*) >= 3;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "20. Pivot: orders per city with one column per status.",
              answer:
                "Turning rows into columns. PostgreSQL's `FILTER` clause counts only matching rows inside each aggregate. The `CASE` version works in every database, including MySQL. It's the same as a shopkeeper's ledger with one column per order status instead of one line per order.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `-- PostgreSQL
SELECT city,
       COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
       COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
       COUNT(*) FILTER (WHERE status = 'PENDING')   AS pending
FROM orders
GROUP BY city;

-- Portable (MySQL too)
SELECT city,
       SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
       SUM(CASE WHEN status = 'PENDING'   THEN 1 ELSE 0 END) AS pending
FROM orders
GROUP BY city;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "21. Cancellation rate per city, only for cities with at least 20 orders.",
              answer:
                "A pivot-style count divided by the total, with `100.0` to force decimal division (integer division would round everything down to 0). `HAVING` drops small cities, where one cancellation out of three orders would look like a 33% disaster.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT city,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'CANCELLED') / COUNT(*), 1)
         AS cancel_pct
FROM orders
GROUP BY city
HAVING COUNT(*) >= 20
ORDER BY cancel_pct DESC;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "22. Everyone under a given manager, at every level (an org chart).",
              answer:
                "A recursive CTE. The anchor row is the manager we start from. The recursive part finds everyone whose `manager_id` is someone already found, one level down per round, and it stops when a round finds no one new. The `level` column says how far down each person is. MySQL 8 supports the same syntax.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `WITH RECURSIVE team AS (
  SELECT id, name, manager_id, 1 AS level
  FROM employees
  WHERE id = 1                      -- the starting manager

  UNION ALL

  SELECT e.id, e.name, e.manager_id, t.level + 1
  FROM employees e
  JOIN team t ON e.manager_id = t.id
)
SELECT * FROM team ORDER BY level, name;`,
        },
        {
          type: "heading",
          text: "Writes, Concurrency and Performance",
        },
        {
          type: "qa",
          items: [
            {
              question: "23. Upsert: add today's sales to a shop's daily total, creating the row if it doesn't exist.",
              answer:
                "An upsert is insert-or-update in one atomic statement, so two requests can't both decide \"the row doesn't exist\" and both insert. It needs a unique key to detect the clash, here the primary key `(shop_id, day)`.\n\nIn PostgreSQL, `EXCLUDED` means \"the row I tried to insert\". MySQL uses `ON DUPLICATE KEY UPDATE`; since 8.0.20 the recommended way to refer to the new row is a row alias rather than the older `VALUES()` function.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `-- PostgreSQL
INSERT INTO daily_sales (shop_id, day, total)
VALUES (7, CURRENT_DATE, 250.00)
ON CONFLICT (shop_id, day)
DO UPDATE SET total = daily_sales.total + EXCLUDED.total;

-- MySQL 8.0.20+
INSERT INTO daily_sales (shop_id, day, total)
VALUES (7, CURRENT_DATE, 250.00) AS new_row
ON DUPLICATE KEY UPDATE total = daily_sales.total + new_row.total;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "24. Debit a wallet without ever going negative, with no race.",
              answer:
                "The check and the change happen in one statement, so there's no gap between \"read the balance\" and \"write the new balance\" for another request to sneak into. The app looks at the affected-row count: 1 means paid, 0 means insufficient funds. The `CHECK (balance >= 0)` in the schema is the safety net if someone writes a careless update elsewhere.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `UPDATE wallets
SET balance = balance - 200.00
WHERE user_id = 7
  AND balance >= 200.00;
-- 1 row updated = debited; 0 rows = not enough balance`,
        },
        {
          type: "qa",
          items: [
            {
              question: "25. Let several workers pull pending orders from the same table without processing one twice.",
              answer:
                "`FOR UPDATE SKIP LOCKED` with a `LIMIT`. Each worker locks a small batch that nobody else holds, processes it, marks it done and commits, which releases the locks. A second worker running the same query at the same moment simply gets the next unlocked rows instead of waiting. This is the database-as-a-queue pattern; RideX's background workers claim their rows the same way so multiple instances share the work.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `BEGIN;

SELECT id, customer_id, amount
FROM orders
WHERE status = 'PENDING'
ORDER BY ordered_at
LIMIT 10
FOR UPDATE SKIP LOCKED;

-- process those 10 orders in the app, then:
UPDATE orders SET status = 'DELIVERED' WHERE id IN (/* the claimed ids */);

COMMIT;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "26. Paginate a customer's orders with keyset pagination instead of `OFFSET`.",
              answer:
                "The client sends back the `ordered_at` and `id` of the last order it saw, and the query asks for orders strictly older than that pair. The `id` breaks ties when two orders share a timestamp, so nothing is skipped or repeated. With the index below, page 1,000 costs the same as page 1.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `CREATE INDEX orders_customer_time_idx
  ON orders (customer_id, ordered_at DESC, id DESC);

SELECT id, amount, status, ordered_at
FROM orders
WHERE customer_id = 42
  AND (ordered_at, id) < ('2026-10-01 10:15:00+00', 9031)
ORDER BY ordered_at DESC, id DESC
LIMIT 20;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "27. Why is this query slow, and how do you fix it? `SELECT * FROM orders WHERE DATE(ordered_at) = '2026-10-01'`",
              answer:
                "Wrapping the column in `DATE()` hides it from the index on `ordered_at`, so the database has to compute `DATE()` for every row: a full scan. Rewrite the condition as a half-open range on the bare column, and the index works again.\n\nThe same rule applies to `LOWER(email) = ...` (use an expression index or store emails lower-cased) and `amount + 10 > 100` (move the arithmetic to the other side).",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `-- Slow: function on the column, index can't be used
SELECT * FROM orders WHERE DATE(ordered_at) = '2026-10-01';

-- Fast: range on the bare column
SELECT * FROM orders
WHERE ordered_at >= '2026-10-01'
  AND ordered_at <  '2026-10-02';`,
        },
        {
          type: "qa",
          items: [
            {
              question: "28. Which index would you create for this query, and why?",
              answer:
                "The query is `SELECT * FROM orders WHERE customer_id = ? AND status = 'DELIVERED' ORDER BY ordered_at DESC LIMIT 20`.\n\nEquality columns first, then the sort column: `(customer_id, status, ordered_at DESC)`. The database jumps to that customer's delivered orders, which are already sorted by time inside the index, and reads just the first 20. No separate sort step. I'd confirm with `EXPLAIN ANALYZE`: I want an Index Scan, not a Seq Scan followed by a Sort. On a live table, `CONCURRENTLY` keeps writes flowing while it builds.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `CREATE INDEX CONCURRENTLY orders_customer_status_time_idx
  ON orders (customer_id, status, ordered_at DESC);`,
        },
      ],
    },
    {
      title: "Quick Revision",
      blocks: [
        {
          type: "paragraph",
          text: "The whole page on one screen. If I can explain every line of this out loud with an everyday example, I'm ready for the database round.",
        },
        {
          type: "diagram",
          caption: "SQL and database cheat sheet",
          text: `TRANSACTIONS
  ACID        atomic | consistent | isolated | durable (WAL)
  Keep short  no HTTP calls / emails inside a transaction

ISOLATION                 dirty   non-repeatable   phantom
  Read Uncommitted         yes        yes            yes
  Read Committed  (PG)     no         yes            yes
  Repeatable Read (MySQL)  no         no             std: yes
  Serializable             no         no             no
  Lost update  -> atomic UPDATE | FOR UPDATE | @Version
  MVCC         readers don't block writers; PG needs VACUUM

INDEXES
  B-tree      sorted, 3-4 levels, = / range / ORDER BY
  Composite   (a, b, c): a | a,b | a,b,c  -- not b alone
  Order       equality cols first, then range/sort col
  Not used    f(col), LIKE '%x', type cast, low selectivity
  Live table  CREATE INDEX CONCURRENTLY (PG)

LOCKING
  FOR UPDATE              lock rows until commit
  FOR NO KEY UPDATE       same, but child inserts not blocked
  SKIP LOCKED             job queue for many workers
  Conditional UPDATE      WHERE status = 'X' -> 1 row wins, 0 lost
  Deadlock                same lock order everywhere + retry
  Duplicates              unique constraint is the referee

SQL
  Order       FROM > WHERE > GROUP BY > HAVING > SELECT > ORDER BY > LIMIT
  Ranks       100,100,90  ROW_NUMBER 1,2,3  RANK 1,1,3  DENSE 1,1,2
  NOT IN      breaks on NULL -> use NOT EXISTS / LEFT JOIN IS NULL
  COUNT(col)  skips NULLs (use with LEFT JOIN for zero counts)
  Islands     date - ROW_NUMBER() = same value for a streak
  Upsert      PG ON CONFLICT | MySQL ON DUPLICATE KEY UPDATE

SCALE
  Partition   one DB, table split (by month)
  Shard       many DBs (by customer / city)
  Replica     scales reads, watch lag (read your own writes)
  Pool        small: ~ cores * 2 + disks
  Paginate    keyset (ordered_at, id) < (:t, :id) beats OFFSET`,
        },
      ],
    },
  ],
};
