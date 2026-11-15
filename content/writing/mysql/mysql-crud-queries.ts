import type { Lesson } from "../types";

export const mysqlCrudQueries: Lesson = {
  slug: "mysql-crud-queries",
  date: "2026-11-16",
  title: "SELECT, WHERE, ORDER BY, INSERT, UPDATE and DELETE",
  description:
    "Reading and writing rows in MySQL 8.0.45, measured from the server's own counters: a SELECT that runs FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT in that order (500,000 rows read, 450,000 kept, 4 groups, 2 kept, 1 sent), an alias that fails in WHERE with error 1054 and works in ORDER BY, an AND/OR precedence bug that let a Bengaluru trip into a Kolkata report, a BETWEEN on DATETIME that dropped three of four trips on 2 November, a leading-wildcard LIKE that examined 200,000 rows for one match against 3 for a prefix, = NULL that matches nothing, a NOT IN with one NULL that returned no drivers at all, AVG over a nullable rating that moved from 4.436 to 3.697 with COALESCE, NULLs sorting first ascending and last descending, a collation that treats MONSOON and monsoon as ties, a page 2 that returned exactly the same 20 trips as page 1 because ORDER BY fare_paise had ties and the filesort used a 40-row priority queue, 1,304 to 1,315 repeated and as many missing trips over 625 pages until id was added to the ORDER BY, OFFSET 499,980 examining 500,000 rows for 20 (240 to 461 ms) against 20 rows and 0.17 ms by keyset, DISTINCT through a temporary table or a skip scan, 100,000 JDBC inserts in 100 statements with rewriteBatchedStatements=true against 100,000 without it, ON DUPLICATE KEY UPDATE reporting 1, 2 or 0 affected rows, INSERT IGNORE turning a duplicate, a truncated name and a NULL city into warnings, REPLACE giving a rider a new id and silently cascading away his devices, safe updates mode refusing unkeyed writes, SET evaluated left to right, Connector/J returning found rows unless useAffectedRows=true, a one-statement purge that locked 501,719 records to delete 16,991 against id-range chunks that locked 10,034 each, TRUNCATE that can't be rolled back, a soft-delete unique key built on a generated column, string-concatenated SQL that returned every rider or the drivers table while PreparedStatement returned nothing, and a settlement export whose LIMIT/OFFSET paging examined 125,750,001 rows and silently skipped 16,991 trips when a purge ran underneath it.",
  tags: ["MySQL", "SQL", "JDBC", "Pagination", "InnoDB"],
  sections: [
    {
      title: "What CRUD Queries Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, How MySQL Runs a Query: Setup, Tables and Data Types, built the ride-hailing schema (riders, drivers, trips, payments, payouts), followed one query from the client to the `.ibd` file, and measured what each data type really stores. This lesson puts rows into those tables and gets them back out: the four statements that make up almost all of the SQL a backend service ever sends. People call them **CRUD**: Create (`INSERT`), Read (`SELECT`), Update (`UPDATE`) and Delete (`DELETE`).",
        },
        {
          type: "paragraph",
          text: "They look simple, and that's the problem. Each one has a handful of rules that aren't visible in the syntax: a `SELECT` doesn't run in the order it's written, `NULL` is neither equal nor unequal to anything, `ORDER BY` with ties gives no fixed order, `LIMIT ... OFFSET` reads every row it skips, an \"upsert\" reports 2 rows for one row, `REPLACE` deletes before it inserts, an `UPDATE` reports rows it didn't change (or not, depending on a JDBC flag), and a `DELETE` with a filter on an unindexed column locks far more rows than it deletes. Every one of those has caused a production incident somewhere, and every one is measurable.",
        },
        {
          type: "paragraph",
          text: "So this lesson does each statement properly and then asks the server what it actually did: `EXPLAIN ANALYZE` for the order of evaluation, `performance_schema.events_statements_history` for rows examined against rows sent, the `Handler_read_*` counters for how the engine was called, the optimizer trace for how a sort with `LIMIT` was done, and `performance_schema.data_locks` for what a `DELETE` locked. On the Java side it measures what a backend developer meets: JDBC batching, affected-row counts, and SQL injection with and without `PreparedStatement`.",
        },
        {
          type: "paragraph",
          text: "Everything was run on MySQL 8.0.45 in Docker (`mysql:8.0`, default `REPEATABLE READ`, `sql_mode` strict), with Connector/J 9.5.0 on Java 21. The next lesson, Joins: INNER, LEFT, Self and Anti Joins, combines rows from several of these tables in one query.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "SQL began at IBM in 1974 as SEQUEL, the query language for the System R research database, built on Edgar Codd's relational model. The four data statements (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) were there from the start and haven't changed shape since. `NULL` and its three-valued logic (true, false, unknown) came from Codd too, and they're the source of most of the surprises in the reading half of this lesson. MySQL added its own extensions on top of the standard, and several of them (`LIMIT`, `REPLACE`, `INSERT IGNORE`, `ON DUPLICATE KEY UPDATE`, `ORDER BY ... LIMIT` on `UPDATE` and `DELETE`) are exactly the ones people reach for in production.",
        },
        {
          type: "table",
          headers: ["When", "Change", "Why it matters here"],
          rows: [
            ["1974", "SEQUEL at IBM, later renamed SQL", "`SELECT ... FROM ... WHERE` as a declarative query"],
            ["1986 / 1992", "SQL-86, then SQL-92 (the big one: joins in `FROM`, `CASE`, `COALESCE`)", "The core every database still shares"],
            ["1995 to 2000", "MySQL 3.x: `LIMIT`, `REPLACE`, `INSERT IGNORE`, multi-row `VALUES`", "MySQL-only syntax that the whole PHP and later Java world adopted"],
            ["2003", "MySQL 4.0: multi-table `UPDATE`/`DELETE`; 4.1: `INSERT ... ON DUPLICATE KEY UPDATE`", "The upsert most MySQL code uses"],
            ["Mid-2000s", "Connector/J 3.1 adds `rewriteBatchedStatements`", "Turns a JDBC batch into multi-row inserts"],
            ["2008", "SQL:2008 `OFFSET ... FETCH FIRST n ROWS ONLY`", "The standard paging syntax; MySQL 8.0 still rejects it with error 1064 (I checked)"],
            ["2018 to 2019", "MySQL 8.0 GA (2018); `PS_CURRENT_THREAD_ID()` in 8.0.16 and `EXPLAIN ANALYZE` in 8.0.18 (2019)", "The tools this lesson uses to see what happened"],
            ["2020", "8.0.19 row alias `INSERT ... AS new`; 8.0.20 deprecates `VALUES()` in `ON DUPLICATE KEY UPDATE`", "Write upserts the new way; the old one warns"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The ride-hailing company's records room, with one clerk who answers written requests.",
        },
        {
          type: "list",
          items: [
            "**A `SELECT` is a request slip.** You write \"trip id, fare in rupees as `fare_rupees`, only fares over 300, biggest first, top 20\". The clerk doesn't work top to bottom: she first pulls the drawer (`FROM`), then throws out slips that don't match (`WHERE`), then writes the columns you asked for on a clean sheet (`SELECT`), then sorts (`ORDER BY`), then counts off 20 (`LIMIT`). Your nickname `fare_rupees` only exists once she writes the clean sheet, which is why she can't filter on it.",
            "**`NULL` is a blank box on a form.** Ask \"is the fare equal to blank?\" and she says she can't tell, so the form doesn't qualify. Ask \"is the fare box blank?\" (`IS NULL`) and she can answer.",
            "**`OFFSET 10000` is asking for the forms after the first 10,000.** She has no bookmark, so she counts 10,000 forms by hand every time. A keyset request (\"forms after trip 10,000\") lets her open the drawer at the tab.",
            "**`REPLACE` is shredding the old form and writing a new one** with a new form number, which also shreds anything stapled to it. `ON DUPLICATE KEY UPDATE` corrects the existing form in place.",
            "**A `DELETE` with no usable index is the clerk putting a hold on every drawer she looks into**, not just the forms she shreds, until the job is done.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a clerk with tied forms (two fares of exactly 130 rupees) would keep them in the same order every time. MySQL doesn't promise that, and when it sorts with a `LIMIT` it really does return ties in a different order for different page sizes, as the paging section shows.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/mysql/mysql-crud-queries-evaluation-order.svg",
          alt: "A pipeline of seven boxes showing the order MySQL evaluates a SELECT, measured with EXPLAIN ANALYZE on the 500,000-row trip_history table: 1 FROM, 500,000 rows read by a table scan; 2 WHERE, 450,000 kept where status is COMPLETED; 3 GROUP BY, 4 groups, one per city in a temporary table; 4 HAVING, 2 groups kept where trips is over 120,000; 5 SELECT, highlighted, where the alias revenue_rupees is born; 6 ORDER BY, a top-1 sort that can use SELECT aliases; 7 LIMIT, 1 row sent, with OFFSET rows read then dropped. Below, a bar shows that WHERE fare_rupees > 300 fails with ERROR 1054 Unknown column while ORDER BY fare_rupees works. A left panel lists ORDER BY id LIMIT 20 OFFSET n: OFFSET 0 examined 20 sent 20, OFFSET 100,000 examined 100,020 sent 20, OFFSET 499,980 examined 500,000 sent 20, and keyset WHERE id > 499980 examined 20 sent 20, with a full orange bar for 240 ms and a hairline green bar for 0.17 ms. A right panel lists what writes really did: ON DUPLICATE KEY UPDATE reports 1 inserted, 2 updated, 0 unchanged; REPLACE is DELETE plus INSERT, rider id 7 became 11 and his devices cascaded away; INSERT IGNORE turned 3 errors into warnings; a DELETE without index or LIMIT locked 501,719 rows to delete 16,991; Connector/J returns found rows unless useAffectedRows is true. A bottom box gives three rules: = NULL is never true and NOT IN with a NULL returns nothing; ORDER BY must end in a unique column or LIMIT pages repeat and skip rows; rewriteBatchedStatements=true sends 100,000 rows in 100 INSERTs.",
          caption: "Written order is SELECT, FROM, WHERE, ...; evaluation order is FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT. Most surprises in this lesson come from the gap between the two.",
        },
        {
          type: "heading",
          text: "The logical order of a SELECT",
        },
        {
          type: "table",
          headers: ["Step", "Clause", "Works on", "Can it see SELECT aliases?"],
          rows: [
            ["1", "`FROM` (and joins)", "Rows of the tables", "No"],
            ["2", "`WHERE`", "One row at a time", "No: error 1054"],
            ["3", "`GROUP BY`", "Rows that passed `WHERE`", "MySQL allows it (an extension)"],
            ["4", "`HAVING`", "Groups", "MySQL allows it (an extension)"],
            ["5", "`SELECT` list, then `DISTINCT`", "Rows or groups", "This is where aliases are defined"],
            ["6", "`ORDER BY`", "The result rows", "Yes"],
            ["7", "`LIMIT` / `OFFSET`", "The sorted result", "Not applicable"],
          ],
        },
        {
          type: "paragraph",
          text: "This is the **logical** order: it defines what the answer means. The optimizer may physically do things differently (read an index that is already in `ORDER BY` order and skip the sort, stop after `LIMIT` rows), but it may never change the answer that the logical order defines.",
        },
        {
          type: "heading",
          text: "The write statements",
        },
        {
          type: "table",
          headers: ["Statement", "On a duplicate key", "Affected rows reported", "Watch out for"],
          rows: [
            ["`INSERT`", "Error 1062, nothing inserted", "Rows inserted", "One statement per row is the slow way"],
            ["`INSERT IGNORE`", "Row skipped, warning 1062", "Rows inserted", "Also turns truncation and `NULL` errors into warnings"],
            ["`INSERT ... ON DUPLICATE KEY UPDATE`", "Existing row updated", "1 inserted, 2 updated, 0 unchanged", "Burns an `AUTO_INCREMENT` value even when it updates"],
            ["`REPLACE`", "Old row deleted, new row inserted", "1 + rows deleted", "New id, `ON DELETE CASCADE` fires, FK errors"],
            ["`UPDATE`", "Error 1062 if a unique column collides", "Changed rows (server); matched rows (Connector/J default)", "No `WHERE` updates every row"],
            ["`DELETE`", "Not applicable", "Rows deleted", "Locks every row it scans, not only those it deletes"],
            ["`TRUNCATE`", "Not applicable", "0", "DDL: implicit commit, no rollback, resets `AUTO_INCREMENT`"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The setup for every example: the six-table schema from the previous lesson, cut down to the columns this lesson needs, plus `trip_history`, 500,000 generated trips (four cities, 20,000 riders, 3,000 drivers, 40 distinct fares, one cancelled trip in ten, one trip every 30 seconds from 1 January 2026) with a secondary index on `(rider_id, requested_at)`. It's 28 MB of data and 19 MB of index, small enough for the buffer pool, so the timings below are CPU, not disk.",
        },
        {
          type: "code",
          language: "sql",
          title: "history.sql",
          code: `CREATE TABLE trip_history (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rider_id     INT UNSIGNED NOT NULL,
  driver_id    INT UNSIGNED NOT NULL,
  city         VARCHAR(30) NOT NULL,
  status       ENUM('COMPLETED','CANCELLED') NOT NULL,
  fare_paise   INT UNSIGNED NOT NULL,
  requested_at DATETIME NOT NULL,
  KEY idx_rider_time (rider_id, requested_at)
) ENGINE=InnoDB;
SET SESSION cte_max_recursion_depth = 1000000;
INSERT INTO trip_history (rider_id, driver_id, city, status, fare_paise, requested_at)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 500000)
SELECT 1 + (n * 7919) % 20000,
       1 + (n * 104729) % 3000,
       ELT(1 + n % 4, 'Kolkata', 'Bengaluru', 'Mumbai', 'Delhi'),
       IF(n % 10 = 0, 'CANCELLED', 'COMPLETED'),
       10000 + (n * 37) % 40 * 1000,
       '2026-01-01' + INTERVAL n * 30 SECOND
FROM seq;`,
        },
        {
          type: "heading",
          text: "The evaluation order, as the executor ran it",
        },
        {
          type: "paragraph",
          text: "`EXPLAIN ANALYZE` (MySQL 8.0.18 and later) runs the query and prints the iterator tree the executor built, with the real row count each iterator produced. Read it from the bottom up: each line pulls rows from the line under it.",
        },
        {
          type: "code",
          language: "sql",
          title: "order.sql",
          code: `EXPLAIN ANALYZE
SELECT city, COUNT(*) AS trips, SUM(fare_paise) / 100 AS revenue_rupees
FROM trip_history
WHERE status = 'COMPLETED'
GROUP BY city
HAVING trips > 120000
ORDER BY revenue_rupees DESC
LIMIT 1;`,
        },
        {
          type: "output",
          text: `-> Limit: 1 row(s)  (actual time=484..484 rows=1 loops=1)
    -> Sort: revenue_rupees DESC  (actual time=484..484 rows=1 loops=1)
        -> Filter: (trips > 120000)  (actual time=484..484 rows=2 loops=1)
            -> Table scan on <temporary>  (actual time=484..484 rows=4 loops=1)
                -> Aggregate using temporary table  (actual time=484..484 rows=4 loops=1)
                    -> Filter: (trip_history.\`status\` = 'COMPLETED')  (cost=51607 rows=249255) (actual time=0.195..235 rows=450000 loops=1)
                        -> Table scan on trip_history  (cost=51607 rows=498510) (actual time=0.193..152 rows=500000 loops=1)

Delhi	125000	38750000.0000`,
        },
        {
          type: "list",
          items: [
            "**Bottom to top is the logical order.** Table scan (`FROM`, 500,000 rows), filter on status (`WHERE`, 450,000 rows), aggregate into a temporary table (`GROUP BY`, 4 groups), filter on `trips` (`HAVING`, 2 groups: Delhi and Bengaluru have 125,000 completed trips each, Kolkata and Mumbai 100,000), sort (`ORDER BY`), limit.",
            "**The `HAVING` filter uses the alias `trips` and the sort uses `revenue_rupees`.** Both run after the `SELECT` list has been computed, so the names exist. (Using an alias in `HAVING` is a MySQL extension; standard SQL wants the expression repeated.)",
            "**The sort produced 1 row, not 2.** With a `LIMIT`, MySQL keeps only the top N while sorting instead of sorting everything. That shortcut matters a lot in the paging section.",
            "`actual time=0.195..235` means 0.195 ms to the first row and 235 ms to the last. The `cost` and `rows=` before it are the optimizer's estimates (it guessed 249,255 completed trips; there were 450,000).",
          ],
        },
        {
          type: "heading",
          text: "Rows examined against rows sent: events_statements_history",
        },
        {
          type: "paragraph",
          text: "Every statement a connection runs is recorded in `performance_schema.events_statements_history` (the last 10 per thread by default). The two columns I use most are `ROWS_EXAMINED` (rows the server read from the storage engine) and `ROWS_SENT` (rows it returned to the client). A big gap between them is the first sign of a query that does wasted work. `PS_CURRENT_THREAD_ID()` (8.0.16 and later) restricts it to my own session:",
        },
        {
          type: "code",
          language: "sql",
          title: "ps.sql",
          code: `SELECT id FROM trip_history WHERE city = 'Delhi' AND rider_id <= 2000 ORDER BY fare_paise LIMIT 20 OFFSET 20;
UPDATE drivers SET status = 'ONLINE' WHERE city IN ('Kolkata', 'Mumbai') AND status <> 'SUSPENDED';
SELECT event_id, LEFT(sql_text, 40) AS sql_text, rows_examined, rows_sent, rows_affected,
       no_index_used, select_scan, sort_rows, sort_scan, created_tmp_tables
FROM performance_schema.events_statements_history
WHERE thread_id = PS_CURRENT_THREAD_ID() AND event_name IN ('statement/sql/select', 'statement/sql/update')
  AND sql_text NOT LIKE '%performance_schema%'
ORDER BY event_id\\G`,
        },
        {
          type: "output",
          text: `*************************** 2. row ***************************
          event_id: 2
          sql_text: SELECT id FROM trip_history WHERE city =
     rows_examined: 50040
         rows_sent: 20
     rows_affected: 0
     no_index_used: 0
       select_scan: 0
         sort_rows: 40
         sort_scan: 1
created_tmp_tables: 0
*************************** 3. row ***************************
          event_id: 4
          sql_text: UPDATE drivers SET status = 'ONLINE' WHE
     rows_examined: 6
         rows_sent: 0
     rows_affected: 0
     no_index_used: 0
       select_scan: 0
         sort_rows: 0
         sort_scan: 0
created_tmp_tables: 0`,
        },
        {
          type: "list",
          items: [
            "**50,040 rows examined for 20 sent.** The query read the 50,000 index entries for `rider_id <= 2000` (`select_scan: 0`, so not a full table scan: it used `idx_rider_time`), checked `city` on each, and sorted. `sort_rows: 40` is the clue to the paging bug later: for `LIMIT 20 OFFSET 20` the sort kept only 40 rows.",
            "**The `UPDATE` examined all 6 drivers and changed none** (`rows_affected: 0`): they were already `ONLINE`. Whether your Java code sees 0 or 4 for that statement depends on a driver flag, covered below.",
            "The first row of this output (`select @@version_comment limit 1`, sent by the `mysql` client on connect) is left out.",
          ],
        },
        {
          type: "heading",
          text: "How the executor called the engine: Handler_read_*",
        },
        {
          type: "paragraph",
          text: "The SQL layer reads rows by calling the storage engine's handler API. Each call type has a session counter. `FLUSH STATUS` resets the session counters, so the numbers after a query belong to it (output trimmed to the counter rows, with a comment line for each query):",
        },
        {
          type: "code",
          language: "sql",
          title: "handler.sql",
          code: `FLUSH STATUS;
SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 100000;
SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_first','Handler_read_key','Handler_read_next','Handler_read_rnd_next');
FLUSH STATUS;
SELECT * FROM trip_history WHERE id > 100000 ORDER BY id LIMIT 20;
SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_first','Handler_read_key','Handler_read_next','Handler_read_rnd_next');
FLUSH STATUS;
SELECT COUNT(*) FROM trip_history WHERE city = 'Delhi' AND fare_paise = 13000;
SHOW SESSION STATUS WHERE Variable_name IN ('Handler_read_first','Handler_read_key','Handler_read_next','Handler_read_rnd_next');`,
        },
        {
          type: "output",
          text: `-- OFFSET 100000
| Handler_read_first    | 1      |
| Handler_read_key      | 1      |
| Handler_read_next     | 100019 |
| Handler_read_rnd_next | 0      |
-- WHERE id > 100000
| Handler_read_first    | 0     |
| Handler_read_key      | 1     |
| Handler_read_next     | 19    |
| Handler_read_rnd_next | 0     |
-- COUNT(*) with a filter on unindexed columns
| Handler_read_first    | 1      |
| Handler_read_key      | 1      |
| Handler_read_next     | 0      |
| Handler_read_rnd_next | 500001 |`,
        },
        {
          type: "list",
          items: [
            "**`Handler_read_first`** means \"position at the first entry of an index\", **`Handler_read_key`** \"position at a key value\", **`Handler_read_next`** \"give me the next entry in index order\", and **`Handler_read_rnd_next`** \"give me the next row of a table scan\".",
            "**The `OFFSET` query started at the first primary-key entry and asked for the next row 100,019 times**: it read all 100,000 skipped rows and threw them away. The keyset query positioned directly on `id > 100000` with one `read_key` and then read 19 more rows. Same 20 rows returned.",
            "**The filter on `city` and `fare_paise`** has no index to use, so it's a full scan: 500,001 `rnd_next` calls for 500,000 rows (the last call returns end of table).",
          ],
        },
        {
          type: "heading",
          text: "How a sort with LIMIT is done: the optimizer trace",
        },
        {
          type: "paragraph",
          text: "When a query has `ORDER BY` and `LIMIT`, the filesort can keep a **priority queue** (a heap) of only `offset + limit` rows instead of sorting the whole input. The optimizer trace records the decision:",
        },
        {
          type: "code",
          language: "sql",
          title: "trace.sql",
          code: `SET optimizer_trace = 'enabled=on';
SELECT id FROM trip_history WHERE city = 'Delhi' AND rider_id <= 2000 ORDER BY fare_paise LIMIT 20 OFFSET 20;
SELECT JSON_PRETTY(JSON_EXTRACT(trace, '$**.filesort_priority_queue_optimization')) AS pq,
       JSON_PRETTY(JSON_EXTRACT(trace, '$**.filesort_summary')) AS summary
FROM information_schema.optimizer_trace\\G`,
        },
        {
          type: "output",
          text: `     pq: [
  {
    "limit": 40,
    "chosen": true
  }
]
summary: [
  {
    "key_size": 8,
    "row_size": 145,
    "sort_mode": "<fixed_sort_key, additional_fields>",
    "num_rows_found": 12500,
    "sort_algorithm": "std::sort",
    "memory_available": 262144,
    "peak_memory_used": 6273,
    "num_rows_estimate": 104068,
    "max_rows_per_buffer": 41,
    "unpacked_addon_fields": "using_priority_queue",
    "num_initial_chunks_spilled_to_disk": 0
  }
]`,
        },
        {
          type: "paragraph",
          text: "12,500 rows matched; the heap held only the best 40 (`\"limit\": 40` is offset 20 plus limit 20), and 6 KB of the 256 KB sort buffer was used. A heap is not a **stable** sort: rows with equal `fare_paise` come out in whatever order the heap leaves them, and that order depends on the heap size, which depends on `OFFSET`. Keep this in mind for the paging section.",
        },
      ],
    },
    {
      title: "SELECT and WHERE: Filtering Rows",
      blocks: [
        {
          type: "paragraph",
          text: "The small tables for the readable examples: 6 riders, 6 drivers (one, Pooja, with no trips, and Deepa with no rating yet) and 10 trips, three of them with no fare (`NULL`) because they were cancelled free, still requested or still ongoing.",
        },
        {
          type: "heading",
          text: "An alias in WHERE",
        },
        {
          type: "code",
          language: "sql",
          title: "alias.sql",
          code: `SELECT id, fare_paise / 100 AS fare_rupees
FROM trips
WHERE fare_rupees > 300;

SELECT id, fare_paise / 100 AS fare_rupees
FROM trips
WHERE fare_paise / 100 > 300
ORDER BY fare_rupees DESC;`,
        },
        {
          type: "output",
          text: `ERROR 1054 (42S22) at line 1: Unknown column 'fare_rupees' in 'where clause'
+----+-------------+
| id | fare_rupees |
+----+-------------+
|  5 |    520.0000 |
|  2 |    412.0000 |
|  9 |    310.0000 |
+----+-------------+`,
        },
        {
          type: "paragraph",
          text: "`WHERE` runs at step 2 and the alias is created at step 5, so the first query fails while the resolver is still matching names, before any row is read. Repeat the expression in `WHERE` (or wrap the query in a derived table); `ORDER BY` runs at step 6 and can use the alias. Also note `fare_paise / 100` returned `520.0000`: integer division with `/` gives a `DECIMAL` with four extra digits (use `DIV` for integer division).",
        },
        {
          type: "heading",
          text: "AND binds tighter than OR",
        },
        {
          type: "code",
          language: "sql",
          title: "precedence.sql",
          code: `-- Intended: Kolkata trips that are COMPLETED or CANCELLED
SELECT id, city, status FROM trips
WHERE city = 'Kolkata' AND status = 'COMPLETED' OR status = 'CANCELLED';

SELECT id, city, status FROM trips
WHERE city = 'Kolkata' AND (status = 'COMPLETED' OR status = 'CANCELLED');

SELECT id, city, status FROM trips
WHERE city = 'Kolkata' AND status IN ('COMPLETED', 'CANCELLED');`,
        },
        {
          type: "output",
          text: `+----+-----------+-----------+
| id | city      | status    |
+----+-----------+-----------+
|  1 | Kolkata   | COMPLETED |
|  3 | Kolkata   | CANCELLED |
|  4 | Kolkata   | COMPLETED |
|  8 | Bengaluru | CANCELLED |
|  9 | Kolkata   | COMPLETED |
| 10 | Kolkata   | COMPLETED |
+----+-----------+-----------+
+----+---------+-----------+
| id | city    | status    |
+----+---------+-----------+
|  1 | Kolkata | COMPLETED |
|  3 | Kolkata | CANCELLED |
|  4 | Kolkata | COMPLETED |
|  9 | Kolkata | COMPLETED |
| 10 | Kolkata | COMPLETED |
+----+---------+-----------+
(the IN version returned the same five rows)`,
        },
        {
          type: "paragraph",
          text: "The first query is read as `(city = 'Kolkata' AND status = 'COMPLETED') OR status = 'CANCELLED'`, so trip 8, a cancelled trip in **Bengaluru**, got into the Kolkata report. With only `AND`s or only `OR`s precedence never matters; the moment you mix them, add parentheses. `IN (...)` is the clearer way to write \"one of these values\" and can't have this bug.",
        },
        {
          type: "heading",
          text: "BETWEEN on a DATETIME",
        },
        {
          type: "code",
          language: "sql",
          title: "between.sql",
          code: `-- "all trips on 1 and 2 November"
SELECT id, requested_at FROM trips
WHERE requested_at BETWEEN '2026-11-01' AND '2026-11-02';

SELECT id, requested_at FROM trips
WHERE requested_at >= '2026-11-01' AND requested_at < '2026-11-03';`,
        },
        {
          type: "output",
          text: `+----+---------------------+
| id | requested_at        |
+----+---------------------+
|  1 | 2026-11-01 08:15:00 |
|  2 | 2026-11-01 09:02:10 |
|  3 | 2026-11-01 23:59:59 |
|  4 | 2026-11-02 00:00:00 |
+----+---------------------+
+----+---------------------+
| id | requested_at        |
+----+---------------------+
|  1 | 2026-11-01 08:15:00 |
|  2 | 2026-11-01 09:02:10 |
|  3 | 2026-11-01 23:59:59 |
|  4 | 2026-11-02 00:00:00 |
|  5 | 2026-11-02 18:30:00 |
|  6 | 2026-11-02 18:31:00 |
|  7 | 2026-11-02 19:00:00 |
+----+---------------------+`,
        },
        {
          type: "list",
          items: [
            "**`BETWEEN a AND b` is inclusive at both ends**, and `'2026-11-02'` compared with a `DATETIME` means `2026-11-02 00:00:00`. So the first query includes the trip at exactly midnight and loses the other three trips on 2 November.",
            "**Use a half-open range for time: `>= start AND < next day`.** It includes everything on the last day, never double-counts a row that sits exactly on a boundary when you report day by day, and works the same for `DATETIME(6)` with microseconds, where `'23:59:59'` as an upper bound would still miss `23:59:59.5`.",
          ],
        },
        {
          type: "heading",
          text: "LIKE: a prefix uses the index, a leading wildcard can't",
        },
        {
          type: "paragraph",
          text: "`LIKE` matches a pattern: `%` is any run of characters (including none) and `_` exactly one character. A B-tree index is sorted by the beginning of the value, so it can find `'9807919%'` by range, but `'%7919000'` could start anywhere. On a 200,000-row `rider_directory` with an index on `phone`:",
        },
        {
          type: "code",
          language: "sql",
          title: "like.sql",
          code: `SELECT id, name, phone FROM rider_directory WHERE phone LIKE '9807919%';
SELECT id, name, phone FROM rider_directory WHERE phone LIKE '%7919000';
SELECT SUBSTRING(sql_text, 1, 72) AS statement, ROUND(timer_wait / 1e9, 2) AS ms, rows_examined, rows_sent
FROM performance_schema.events_statements_history
WHERE thread_id = PS_CURRENT_THREAD_ID() AND sql_text LIKE 'SELECT id, name, phone%' ORDER BY event_id;
EXPLAIN FORMAT=TREE SELECT id, name, phone FROM rider_directory WHERE phone LIKE '9807919%';
EXPLAIN FORMAT=TREE SELECT id, name, phone FROM rider_directory WHERE phone LIKE '%7919000';`,
        },
        {
          type: "output",
          text: `+--------+--------------+------------+
| id     | name         | phone      |
+--------+--------------+------------+
|   1000 | rider-1000   | 9807919000 |
|  89395 | rider-89395  | 9807919005 |
| 177790 | rider-177790 | 9807919010 |
+--------+--------------+------------+
+------+------------+------------+
| id   | name       | phone      |
+------+------------+------------+
| 1000 | rider-1000 | 9807919000 |
+------+------------+------------+
+-------------------------------------------------------------------------+-------+---------------+-----------+
| statement                                                               | ms    | rows_examined | rows_sent |
+-------------------------------------------------------------------------+-------+---------------+-----------+
| SELECT id, name, phone FROM rider_directory WHERE phone LIKE '9807919%' |  1.01 |             3 |         3 |
| SELECT id, name, phone FROM rider_directory WHERE phone LIKE '%7919000' | 66.76 |        200000 |         1 |
+-------------------------------------------------------------------------+-------+---------------+-----------+
-> Index range scan on rider_directory using idx_phone over ('9807919' <= phone <= '9807919????????????????????????????????'), with index condition: (rider_directory.phone like '9807919%')  (cost=1.61 rows=3)
-> Filter: (rider_directory.phone like '%7919000')  (cost=20135 rows=22201)
    -> Table scan on rider_directory  (cost=20135 rows=199831)`,
        },
        {
          type: "list",
          items: [
            "**The prefix search examined 3 rows for 3 results in 1 ms**: the optimizer turned the pattern into an index range from `'9807919'` up to `'9807919'` followed by the highest possible characters (printed as `?` padding).",
            "**The leading wildcard examined all 200,000 rows for 1 result in 67 ms**, a full table scan. It grows linearly with the table. For \"ends with\" searches, store the reversed value in an indexed column and search it by prefix; for word searches use a `FULLTEXT` index.",
            "`_` and `%` in user input are wildcards too. `'a_c' LIKE 'a\\_c'` is 1 and `'abc' LIKE 'a\\_c'` is 0 (I ran both): escape them with a backslash, or a search for `a_c` also matches `abc`.",
          ],
        },
      ],
    },
    {
      title: "NULL and Three-Valued Logic",
      blocks: [
        {
          type: "paragraph",
          text: "`NULL` means \"no value\" (unknown, or not applicable), not zero and not an empty string. Any comparison with `NULL` gives `NULL` (unknown), and `WHERE` keeps a row only when its condition is **true**: unknown counts as not true. That's three-valued logic, and it's the reason for every result below.",
        },
        {
          type: "code",
          language: "sql",
          title: "null.sql",
          code: `SELECT id, fare_paise FROM trips WHERE fare_paise = NULL;
SELECT id, fare_paise FROM trips WHERE fare_paise IS NULL;
SELECT NULL = NULL, NULL <> 1, NULL IS NULL, NULL <=> NULL, 1 <=> NULL;
SELECT COUNT(*) AS all_trips,
       SUM(fare_paise > 20000)       AS fare_over_200,
       SUM(NOT (fare_paise > 20000)) AS fare_not_over_200
FROM trips;`,
        },
        {
          type: "output",
          text: `Empty set (0.00 sec)
+----+------------+
| id | fare_paise |
+----+------------+
|  3 |       NULL |
|  6 |       NULL |
|  7 |       NULL |
+----+------------+
+-------------+-----------+--------------+---------------+------------+
| NULL = NULL | NULL <> 1 | NULL IS NULL | NULL <=> NULL | 1 <=> NULL |
+-------------+-----------+--------------+---------------+------------+
|        NULL |      NULL |            1 |             1 |          0 |
+-------------+-----------+--------------+---------------+------------+
+-----------+---------------+-------------------+
| all_trips | fare_over_200 | fare_not_over_200 |
+-----------+---------------+-------------------+
|        10 |             5 |                 2 |
+-----------+---------------+-------------------+`,
        },
        {
          type: "list",
          items: [
            "**`= NULL` matches nothing**, not even the rows that are `NULL`, because `NULL = NULL` is `NULL`. Use `IS NULL` / `IS NOT NULL`, or MySQL's null-safe equality `<=>`, which returns 1 or 0 and never `NULL` (handy for \"has this column changed?\" comparisons in triggers and syncs).",
            "**5 + 2 is not 10.** \"Fare over 200\" and \"not fare over 200\" look like they cover every trip, but for the three `NULL` fares both are unknown, so those trips are in neither group. A report that splits on a condition and its negation silently loses the `NULL` rows.",
          ],
        },
        {
          type: "heading",
          text: "NOT IN with a NULL returns nothing",
        },
        {
          type: "code",
          language: "sql",
          title: "not-in.sql",
          code: `-- Drivers who have never been assigned a trip
SELECT name FROM drivers WHERE id NOT IN (SELECT driver_id FROM trips);
SELECT name FROM drivers WHERE id NOT IN (SELECT driver_id FROM trips WHERE driver_id IS NOT NULL);
SELECT name FROM drivers d WHERE NOT EXISTS (SELECT 1 FROM trips t WHERE t.driver_id = d.id);
SELECT 2 NOT IN (1, 3), 2 NOT IN (1, 3, NULL), 1 IN (1, NULL);`,
        },
        {
          type: "output",
          text: `Empty set (0.00 sec)
+-------+
| name  |
+-------+
| Pooja |
+-------+
1 row in set (0.00 sec)
+-------+
| name  |
+-------+
| Pooja |
+-------+
1 row in set (0.00 sec)
+-----------------+-----------------------+----------------+
| 2 NOT IN (1, 3) | 2 NOT IN (1, 3, NULL) | 1 IN (1, NULL) |
+-----------------+-----------------------+----------------+
|               1 |                  NULL |              1 |
+-----------------+-----------------------+----------------+`,
        },
        {
          type: "list",
          items: [
            "**One `NULL` in the subquery made the whole answer empty.** Trip 6 is still `REQUESTED` with `driver_id` `NULL`. `x NOT IN (a, b, NULL)` means `x <> a AND x <> b AND x <> NULL`; the last part is unknown, so the whole thing can be false or unknown but never true. Pooja, who really has no trips, disappeared.",
            "**`NOT EXISTS` doesn't have the problem**: it asks whether a matching row exists, and a `NULL` `driver_id` simply never matches. Prefer `NOT EXISTS` (or a `LEFT JOIN ... IS NULL` anti join, next lesson) for \"rows with no match\". `IN` is safe: `1 IN (1, NULL)` is 1.",
            "This bug is data-dependent: the query worked until the first trip without a driver was inserted. That's why it reaches production.",
          ],
        },
        {
          type: "heading",
          text: "COALESCE, aggregates and NULL ordering",
        },
        {
          type: "code",
          language: "sql",
          title: "coalesce.sql",
          code: `SELECT id, status, fare_paise, COALESCE(fare_paise, 0) AS fare_or_zero FROM trips WHERE city = 'Bengaluru';
SELECT AVG(rating), AVG(COALESCE(rating, 0)), COUNT(rating), COUNT(*) FROM drivers;
SELECT name, rating FROM drivers ORDER BY rating;
SELECT name, rating FROM drivers ORDER BY rating DESC;
SELECT name, rating FROM drivers ORDER BY rating IS NULL, rating;`,
        },
        {
          type: "output",
          text: `+----+-----------+------------+--------------+
| id | status    | fare_paise | fare_or_zero |
+----+-----------+------------+--------------+
|  2 | COMPLETED |      41200 |        41200 |
|  6 | REQUESTED |       NULL |            0 |
|  8 | CANCELLED |       5000 |         5000 |
+----+-----------+------------+--------------+
+-------------+--------------------------+---------------+----------+
| AVG(rating) | AVG(COALESCE(rating, 0)) | COUNT(rating) | COUNT(*) |
+-------------+--------------------------+---------------+----------+
|    4.436000 |                 3.696667 |             5 |        6 |
+-------------+--------------------------+---------------+----------+
+--------+--------+        +--------+--------+        +--------+--------+
| name   | rating |        | name   | rating |        | name   | rating |
+--------+--------+        +--------+--------+        +--------+--------+
| Deepa  |   NULL |        | Imran  |   4.91 |        | Karan  |   3.80 |
| Karan  |   3.80 |        | Pooja  |   4.70 |        | Vikram |   4.15 |
| Vikram |   4.15 |        | Sunita |   4.62 |        | Sunita |   4.62 |
| Sunita |   4.62 |        | Vikram |   4.15 |        | Pooja  |   4.70 |
| Pooja  |   4.70 |        | Karan  |   3.80 |        | Imran  |   4.91 |
| Imran  |   4.91 |        | Deepa  |   NULL |        | Deepa  |   NULL |
+--------+--------+        +--------+--------+        +--------+--------+
(the three ORDER BY results printed side by side)`,
        },
        {
          type: "list",
          items: [
            "**`COALESCE(a, b, ...)` returns the first non-`NULL` argument.** It's the right tool for display (\"show 0 for no fare\") and the wrong one inside an average.",
            "**Aggregates skip `NULL`.** `AVG(rating)` is the average of the 5 rated drivers (4.436); `AVG(COALESCE(rating, 0))` pretends Deepa has a rating of zero and drags it to 3.697. `COUNT(rating)` counts non-`NULL` values (5), `COUNT(*)` counts rows (6). Decide which question you're asking.",
            "**MySQL sorts `NULL` as smaller than every value**: first in ascending order, last in descending. PostgreSQL does the opposite by default. MySQL has no `NULLS LAST` clause; `ORDER BY rating IS NULL, rating` sorts on a 0/1 flag first, which puts unrated drivers last while keeping ratings ascending.",
          ],
        },
      ],
    },
    {
      title: "ORDER BY, LIMIT and DISTINCT: Sorting and Paging",
      blocks: [
        {
          type: "heading",
          text: "Collation decides the order, and the ties",
        },
        {
          type: "paragraph",
          text: "Strings sort by the column's **collation** (the previous lesson covered how it's chosen). The default, `utf8mb4_0900_ai_ci`, is accent-insensitive (`ai`) and case-insensitive (`ci`), so some different strings are equal for sorting:",
        },
        {
          type: "code",
          language: "sql",
          title: "collation.sql",
          code: `INSERT INTO promo_codes VALUES ('monsoon', 'lower'), ('Zoom10', 'Z'), ('MONSOON', 'upper'),
                               ('éclair', 'accent'), ('eclair', 'plain'), ('apple', 'a');
SELECT code, note FROM promo_codes ORDER BY code;
SELECT code, note FROM promo_codes ORDER BY code COLLATE utf8mb4_bin;
SELECT COUNT(DISTINCT code), COUNT(DISTINCT code COLLATE utf8mb4_bin) FROM promo_codes;`,
        },
        {
          type: "output",
          text: `+---------+--------+        +---------+--------+
| code    | note   |        | code    | note   |
+---------+--------+        +---------+--------+
| apple   | a      |        | MONSOON | upper  |
| éclair  | accent |        | Zoom10  | Z      |
| eclair  | plain  |        | apple   | a      |
| monsoon | lower  |        | eclair  | plain  |
| MONSOON | upper  |        | monsoon | lower  |
| Zoom10  | Z      |        | éclair  | accent |
+---------+--------+        +---------+--------+
+----------------------+------------------------------------------+
| COUNT(DISTINCT code) | COUNT(DISTINCT code COLLATE utf8mb4_bin) |
+----------------------+------------------------------------------+
|                    4 |                                        6 |
+----------------------+------------------------------------------+`,
        },
        {
          type: "list",
          items: [
            "**Under the default collation `éclair`/`eclair` and `monsoon`/`MONSOON` are ties**, so their order is whatever the sort leaves, and `DISTINCT` counts 4 codes, not 6. `utf8mb4_bin` compares bytes: uppercase before lowercase, `é` after `z`.",
            "A tie is harmless for display and dangerous for paging, which the next part shows. (I ran this with `--default-character-set=utf8mb4` on the client; with the container's default latin1 client, `éclair` was double-encoded and sorted first, the problem the previous lesson measured.)",
          ],
        },
        {
          type: "heading",
          text: "ORDER BY with ties plus LIMIT: page 2 equals page 1",
        },
        {
          type: "paragraph",
          text: "A trip list sorted by fare, 20 per page. There are 12,500 Delhi trips for riders 1 to 2,000 and only 40 distinct fares, so 1,250 trips share the cheapest fare of 13,000 paise. The sorted ids of page 1 and page 2:",
        },
        {
          type: "code",
          language: "sql",
          title: "pages.sql",
          code: `SELECT COUNT(*) AS trips_at_13000 FROM trip_history WHERE city = 'Delhi' AND rider_id <= 2000 AND fare_paise = 13000;
SELECT 'page 1' AS page, COUNT(*) AS n_rows, GROUP_CONCAT(id ORDER BY id) AS ids_sorted
FROM (SELECT id FROM trip_history WHERE city = 'Delhi' AND rider_id <= 2000 ORDER BY fare_paise LIMIT 20) p
UNION ALL
SELECT 'page 2', COUNT(*), GROUP_CONCAT(id ORDER BY id)
FROM (SELECT id FROM trip_history WHERE city = 'Delhi' AND rider_id <= 2000 ORDER BY fare_paise LIMIT 20 OFFSET 20) p;`,
        },
        {
          type: "output",
          text: `+----------------+
| trips_at_13000 |
+----------------+
|           1250 |
+----------------+
+--------+--------+----------------------------------------------------------------------------------------------------------------------------------------+
| page   | n_rows | ids_sorted                                                                                                                             |
+--------+--------+----------------------------------------------------------------------------------------------------------------------------------------+
| page 1 |     20 | 17679,37679,57679,77679,97679,117679,137679,157679,177679,197679,217679,237679,257679,277679,297679,317679,337679,357679,377679,397679 |
| page 2 |     20 | 17679,37679,57679,77679,97679,117679,137679,157679,177679,197679,217679,237679,257679,277679,297679,317679,337679,357679,377679,397679 |
+--------+--------+----------------------------------------------------------------------------------------------------------------------------------------+`,
        },
        {
          type: "paragraph",
          text: "**Page 2 contains exactly the same 20 trips as page 1**, in a different order, in all three runs I did. The plan explains it:",
        },
        {
          type: "output",
          text: `-> Limit/Offset: 20/20 row(s)  (cost=46831 rows=20)
    -> Sort: trip_history.fare_paise, limit input to 40 row(s) per chunk  (cost=46831 rows=104068)
        -> Filter: (trip_history.city = 'Delhi')  (cost=46831 rows=104068)
            -> Index range scan on trip_history using idx_rider_time over (rider_id <= 2000), with index condition: (trip_history.rider_id <= 2000)  (cost=46831 rows=104068)`,
        },
        {
          type: "list",
          items: [
            "Page 1 kept the best 20 rows in a heap; page 2 kept the best **40** and skipped the first 20 of them. All 40 have fare 13,000, so \"the first 20\" of the 40-row heap is an arbitrary choice, and here it happened to be the same 20 trips that page 1 returned. The other 20 trips of the 40 were never shown.",
            "This is allowed. SQL only promises the order you asked for; among rows equal on every `ORDER BY` column, any order is correct, and it may differ between executions with different `LIMIT` or `OFFSET`. The MySQL manual says so explicitly for `ORDER BY` with `LIMIT`.",
          ],
        },
        {
          type: "paragraph",
          text: "Paging through all 625 pages from Java, once sorted by fare alone and once with `id` added as a tie-breaker:",
        },
        {
          type: "code",
          language: "java",
          title: "PageDuplicates.java",
          code: `import java.sql.*;
import java.util.*;

public class PageDuplicates {
    static final String URL = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";

    static void paginate(Connection c, String orderBy) throws SQLException {
        String sql = "SELECT id FROM trip_history WHERE city = 'Delhi' AND rider_id <= 2000 "
                   + "ORDER BY " + orderBy + " LIMIT 20 OFFSET ?";
        Map<Long, Integer> firstPage = new HashMap<>();
        Set<Long> seen = firstPage.keySet();
        String example = null;
        int rows = 0, duplicates = 0, pages = 0;
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            for (int offset = 0; ; offset += 20) {
                ps.setInt(1, offset);
                int onPage = 0;
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        onPage++;
                        rows++;
                        long id = rs.getLong(1);
                        Integer before = firstPage.putIfAbsent(id, offset / 20 + 1);
                        if (before != null) {
                            duplicates++;
                            if (example == null) example = "trip " + id + " on page " + before + " and again on page " + (offset / 20 + 1);
                        }
                    }
                }
                if (onPage == 0) break;
                pages++;
            }
        }
        long total;
        try (Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT COUNT(*) FROM trip_history WHERE city = 'Delhi' AND rider_id <= 2000")) {
            rs.next();
            total = rs.getLong(1);
        }
        System.out.printf("ORDER BY %-16s pages=%d rows returned=%d duplicates=%d never shown=%d (of %d)%n",
                orderBy, pages, rows, duplicates, total - seen.size(), total);
        if (example != null) System.out.println("    first repeat: " + example);
    }

    public static void main(String[] args) throws Exception {
        try (Connection c = DriverManager.getConnection(URL)) {
            paginate(c, "fare_paise");
            paginate(c, "fare_paise, id");
        }
    }
}`,
        },
        {
          type: "output",
          text: `ORDER BY fare_paise       pages=625 rows returned=12500 duplicates=1304 never shown=1304 (of 12500)
    first repeat: trip 217679 on page 2 and again on page 3
ORDER BY fare_paise, id   pages=625 rows returned=12500 duplicates=0 never shown=0 (of 12500)`,
        },
        {
          type: "list",
          items: [
            "**Sorted by fare alone, 1,304 rows came back twice and 1,304 different trips were never shown at all**, out of 12,500. In an earlier run with Connector/J 9.2.0 it was 1,315 and the first repeat was on pages 1 and 2; the exact pages vary, the damage doesn't. A rider scrolling a list sees duplicates; a batch job paging this way silently skips about one row in ten.",
            "**`ORDER BY fare_paise, id`: zero duplicates, zero missing.** Adding a unique column as the last sort key makes the order total, so every `LIMIT`/`OFFSET` combination agrees with every other one. Every paged query should end its `ORDER BY` with the primary key.",
          ],
        },
        {
          type: "heading",
          text: "The cost of a deep OFFSET",
        },
        {
          type: "paragraph",
          text: "`LIMIT 20 OFFSET n` still reads the first `n` rows; it just doesn't send them. With `ORDER BY id` on the clustered primary key the server walks the index from the start:",
        },
        {
          type: "code",
          language: "sql",
          title: "offset.sql",
          code: `SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 0;
SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 10000;
SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 100000;
SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 250000;
SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 499980;
SELECT * FROM trip_history WHERE id > 499980 ORDER BY id LIMIT 20;
SELECT SUBSTRING(sql_text, 1, 70) AS statement,
       ROUND(timer_wait / 1e9, 2) AS ms,
       rows_examined, rows_sent
FROM performance_schema.events_statements_history
WHERE thread_id = PS_CURRENT_THREAD_ID() AND sql_text LIKE 'SELECT * FROM trip_history%'
ORDER BY event_id;`,
        },
        {
          type: "output",
          text: `+-------------------------------------------------------------------+--------+---------------+-----------+
| statement                                                         | ms     | rows_examined | rows_sent |
+-------------------------------------------------------------------+--------+---------------+-----------+
| SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 0          |    0.2 |            20 |        20 |
| SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 10000      |   4.87 |         10020 |        20 |
| SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 100000     |  62.67 |        100020 |        20 |
| SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 250000     | 134.66 |        250020 |        20 |
| SELECT * FROM trip_history ORDER BY id LIMIT 20 OFFSET 499980     | 240.01 |        500000 |        20 |
| SELECT * FROM trip_history WHERE id > 499980 ORDER BY id LIMIT 20 |   0.17 |            20 |        20 |
+-------------------------------------------------------------------+--------+---------------+-----------+`,
        },
        {
          type: "list",
          items: [
            "**Rows examined is exactly `OFFSET + LIMIT`**, and time grows with it: the last page cost 240 ms to send 20 rows. Over four runs the last page took 240 to 461 ms and the keyset query 0.17 to 0.28 ms. On a table 100 times bigger, the deep page is 100 times slower; the keyset page isn't.",
            "**Keyset pagination** (also called seek pagination) remembers the sort key of the last row the client saw and asks for rows after it: `WHERE id > :last ORDER BY id LIMIT 20`. The index positions directly on the key (`Handler_read_key` = 1), so every page costs the same. With a non-unique sort key, the cursor is the sort key plus the primary key (Examples, below).",
            "What keyset gives up: jumping to \"page 37\" directly. For infinite scroll, \"next page\" buttons and batch jobs, that's no loss. If you really need page numbers on a big table, cap them (most search engines stop at page 50 or so) or use a \"deferred join\" that pages over a narrow covering index and joins back for the 20 rows.",
          ],
        },
        {
          type: "heading",
          text: "DISTINCT",
        },
        {
          type: "code",
          language: "sql",
          title: "distinct.sql",
          code: `SELECT DISTINCT city, status FROM trips ORDER BY city, status;
SELECT COUNT(*), COUNT(city), COUNT(DISTINCT city), COUNT(DISTINCT driver_id) FROM trips;
SELECT DISTINCT driver_id FROM trips ORDER BY driver_id;
EXPLAIN FORMAT=TREE SELECT DISTINCT city FROM trip_history;
EXPLAIN FORMAT=TREE SELECT DISTINCT rider_id FROM trip_history;`,
        },
        {
          type: "output",
          text: `+-----------+-----------+
| city      | status    |
+-----------+-----------+
| Bengaluru | REQUESTED |
| Bengaluru | COMPLETED |
| Bengaluru | CANCELLED |
| Kolkata   | ONGOING   |
| Kolkata   | COMPLETED |
| Kolkata   | CANCELLED |
| Mumbai    | COMPLETED |
+-----------+-----------+
+----------+-------------+----------------------+---------------------------+
| COUNT(*) | COUNT(city) | COUNT(DISTINCT city) | COUNT(DISTINCT driver_id) |
+----------+-------------+----------------------+---------------------------+
|       10 |          10 |                    3 |                         5 |
+----------+-------------+----------------------+---------------------------+
+-----------+
| driver_id |
+-----------+
|      NULL |
|         1 |
|         2 |
|         3 |
|         4 |
|         5 |
+-----------+
-> Table scan on <temporary>  (cost=100143..106377 rows=498510)
    -> Temporary table with deduplication  (cost=100143..100143 rows=498510)
        -> Table scan on trip_history  (cost=50292 rows=498510)
-> Covering index skip scan for deduplication on trip_history using idx_rider_time  (cost=7821 rows=19610)`,
        },
        {
          type: "list",
          items: [
            "**`DISTINCT` applies to the whole selected row**, not to the first column: `DISTINCT city, status` gave 7 combinations. Status sorted in `ENUM` declaration order (`REQUESTED` before `COMPLETED`), not alphabetically.",
            "**`DISTINCT` keeps one `NULL`** (all `NULL`s count as one group), but `COUNT(DISTINCT driver_id)` ignores it: 5, not 6.",
            "**How it's done depends on indexes.** With no index on `city`, MySQL scanned all 500,000 rows into a temporary table with a unique key to drop duplicates (281 to 349 ms in my runs). For `rider_id`, the leading column of `idx_rider_time`, it used a **skip scan**: jump from one `rider_id` to the next in the index, reading about one entry per rider (`rows_examined` was 20,000 for 20,000 riders).",
            "`DISTINCT` used to hide a join that multiplies rows is a smell; the joins lesson shows where those duplicates come from.",
          ],
        },
      ],
    },
    {
      title: "INSERT: Single Rows, Multi-Row and JDBC Batches",
      blocks: [
        {
          type: "paragraph",
          text: "Every statement costs a network round trip, a parse, and (with `autocommit` on) a commit, which in InnoDB means a redo log flush to disk (`innodb_flush_log_at_trx_commit=1`) and, with the binary log on, a binlog sync (`sync_binlog=1`). Both are on in this container. A multi-row `INSERT ... VALUES (...), (...), (...)` pays those costs once for many rows. The client prints `Records: 3  Duplicates: 0  Warnings: 0` for one:",
        },
        {
          type: "code",
          language: "sql",
          title: "multi-row.sql",
          code: `INSERT INTO driver_daily_earnings VALUES (1, '2026-11-03', 2, 49000), (2, '2026-11-03', 1, 18000), (3, '2026-11-03', 1, 5000);`,
        },
        {
          type: "output",
          text: `Query OK, 3 rows affected (0.01 sec)
Records: 3  Duplicates: 0  Warnings: 0`,
        },
        {
          type: "paragraph",
          text: "From Java, the question is what JDBC actually sends. Four ways to insert payment rows, each on a fresh connection and a fresh table, counting the `INSERT` statements the server received from `performance_schema.events_statements_summary_by_thread_by_event_name`:",
        },
        {
          type: "code",
          language: "java",
          title: "BatchInsert.java",
          code: `import java.sql.*;

public class BatchInsert {
    static final String BASE = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";
    static final String INSERT = "INSERT INTO payments (trip_id, amount_paise, method) VALUES (?, ?, ?)";

    static void reset(Connection c) throws SQLException {
        try (Statement s = c.createStatement()) {
            s.execute("DROP TABLE IF EXISTS payments");
            s.execute("""
                CREATE TABLE payments (
                  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                  trip_id      BIGINT UNSIGNED NOT NULL,
                  amount_paise INT UNSIGNED NOT NULL,
                  method       VARCHAR(10) NOT NULL,
                  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )""");
        }
    }

    // Statements this connection sent, as the server counted them (performance_schema, per thread)
    static long insertStatements(Connection c) throws SQLException {
        try (Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("""
                 SELECT COUNT_STAR, SUM_ROWS_AFFECTED FROM performance_schema.events_statements_summary_by_thread_by_event_name
                 WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME = 'statement/sql/insert'""")) {
            rs.next();
            return rs.getLong(1);
        }
    }

    static String lastInsertText(Connection c) throws SQLException {
        try (Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("""
                 SELECT LENGTH(SQL_TEXT), LEFT(SQL_TEXT, 90) FROM performance_schema.events_statements_history
                 WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME = 'statement/sql/insert'
                 ORDER BY EVENT_ID DESC LIMIT 1""")) {
            rs.next();
            return rs.getString(2) + "... (" + rs.getInt(1) + " chars shown by performance_schema)";
        }
    }

    static void bind(PreparedStatement ps, int i) throws SQLException {
        ps.setLong(1, 1_000_000L + i);
        ps.setInt(2, 10_000 + i % 40_000);
        ps.setString(3, i % 3 == 0 ? "UPI" : i % 3 == 1 ? "CARD" : "CASH");
    }

    static void run(String label, String urlExtra, int rows, boolean autocommit, int batchSize) throws Exception {
        try (Connection c = DriverManager.getConnection(BASE + urlExtra)) {
            reset(c);
            c.setAutoCommit(autocommit);
            long t0 = System.nanoTime();
            try (PreparedStatement ps = c.prepareStatement(INSERT)) {
                for (int i = 0; i < rows; i++) {
                    bind(ps, i);
                    if (batchSize == 0) {
                        ps.executeUpdate();
                    } else {
                        ps.addBatch();
                        if ((i + 1) % batchSize == 0) ps.executeBatch();
                    }
                }
                if (batchSize > 0) ps.executeBatch();
            }
            if (!autocommit) c.commit();
            long ms = (System.nanoTime() - t0) / 1_000_000;
            c.setAutoCommit(true);
            long inserted = insertStatements(c);
            long count;
            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT COUNT(*) FROM payments")) {
                rs.next();
                count = rs.getLong(1);
            }
            System.out.printf("%-48s rows=%,7d  %,7d ms  %,9.0f rows/s  INSERT statements=%,d%n",
                    label, count, ms, count * 1000.0 / Math.max(ms, 1), inserted);
            System.out.println("    last INSERT: " + lastInsertText(c));
        }
    }

    public static void main(String[] args) throws Exception {
        run("executeUpdate per row, autocommit", "", 10_000, true, 0);
        run("executeUpdate per row, one transaction", "", 100_000, false, 0);
        run("addBatch x1000, rewriteBatchedStatements=false", "", 100_000, false, 1000);
        run("addBatch x1000, rewriteBatchedStatements=true", "&rewriteBatchedStatements=true", 100_000, false, 1000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m -cp mysql-connector-j-9.5.0.jar BatchInsert.java",
        },
        {
          type: "output",
          text: `executeUpdate per row, autocommit                rows= 10,000  237,872 ms         42 rows/s  INSERT statements=10,000
    last INSERT: INSERT INTO payments (trip_id, amount_paise, method) VALUES (1009999, 19999, 'UPI')... (83 chars shown by performance_schema)
executeUpdate per row, one transaction           rows=100,000   38,384 ms      2,605 rows/s  INSERT statements=100,000
    last INSERT: INSERT INTO payments (trip_id, amount_paise, method) VALUES (1099999, 29999, 'UPI')... (83 chars shown by performance_schema)
addBatch x1000, rewriteBatchedStatements=false   rows=100,000   16,909 ms      5,914 rows/s  INSERT statements=100,000
    last INSERT: INSERT INTO payments (trip_id, amount_paise, method) VALUES (1099999, 29999, 'UPI')... (83 chars shown by performance_schema)
addBatch x1000, rewriteBatchedStatements=true    rows=100,000    2,096 ms     47,710 rows/s  INSERT statements=100
    last INSERT: INSERT INTO payments (trip_id, amount_paise, method) VALUES (1099000, 29000, 'UPI'),(10990... (1024 chars shown by performance_schema)`,
        },
        {
          type: "list",
          items: [
            "**One commit per row ran at 42 rows per second** (78 to 109 in earlier runs), so I measured it on 10,000 rows, not 100,000: each row waited for its own redo and binlog flush. On this machine a durable commit cost about 9 to 24 ms because the disk was shared with other containers; on a dedicated SSD it's much less, but it's always the dominant cost.",
            "**One transaction removed the flushes but not the round trips**: 100,000 statements, 2,605 rows per second here (4,677 and 6,455 in earlier runs).",
            "**`addBatch()` without `rewriteBatchedStatements` changed little, and not consistently** (5,205 to 5,914 rows per second over three runs, against 2,605 to 6,455 for plain `executeUpdate`). The server still received 100,000 separate `INSERT` statements: Connector/J sends a batch of a plain `INSERT` one statement at a time unless told otherwise. `executeBatch()` is an API, not a promise of fewer round trips.",
            "**`rewriteBatchedStatements=true` sent 100 statements for 100,000 rows** and ran at 47,710 rows per second (55,157 and 63,939 in earlier runs), 8 to 12 times faster than the plain batch. The driver rewrote each batch of 1,000 into one multi-row `INSERT ... VALUES (...),(...),...`; `performance_schema` shows the start of it, truncated at 1,024 characters by `performance_schema_max_sql_text_length`. Statements are split so none exceeds `max_allowed_packet` (64 MB here).",
            "In Spring Boot that's `spring.datasource.url=jdbc:mysql://.../db?rewriteBatchedStatements=true`. With Hibernate also set `hibernate.jdbc.batch_size`, and know that Hibernate turns insert batching off for entities with `GenerationType.IDENTITY` ids (it needs each generated id back immediately), which is the usual setup on MySQL, so `JdbcTemplate.batchUpdate` is the reliable path for bulk inserts.",
          ],
        },
      ],
    },
    {
      title: "Upserts: ON DUPLICATE KEY UPDATE, INSERT IGNORE and REPLACE",
      blocks: [
        {
          type: "paragraph",
          text: "An **upsert** inserts a row or, if a row with the same primary or unique key already exists, changes that row. MySQL has three statements that act on a duplicate key, and they do very different things. The table is a per-driver, per-day earnings summary keyed on `(driver_id, day)`:",
        },
        {
          type: "heading",
          text: "ON DUPLICATE KEY UPDATE and its 1, 2, 0",
        },
        {
          type: "code",
          language: "sql",
          title: "upsert.sql",
          code: `-- a brand-new key: inserted
INSERT INTO driver_daily_earnings (driver_id, day, trips, earnings_paise) VALUES (5, '2026-11-03', 1, 31000) AS new
ON DUPLICATE KEY UPDATE trips = driver_daily_earnings.trips + new.trips,
                        earnings_paise = driver_daily_earnings.earnings_paise + new.earnings_paise;
-- an existing key: updated
INSERT INTO driver_daily_earnings (driver_id, day, trips, earnings_paise) VALUES (1, '2026-11-03', 1, 24500) AS new
ON DUPLICATE KEY UPDATE trips = driver_daily_earnings.trips + new.trips,
                        earnings_paise = driver_daily_earnings.earnings_paise + new.earnings_paise;
-- an existing key, but the update sets the same values: nothing changed
INSERT INTO driver_daily_earnings (driver_id, day, trips, earnings_paise) VALUES (2, '2026-11-03', 1, 18000) AS new
ON DUPLICATE KEY UPDATE trips = new.trips, earnings_paise = new.earnings_paise;
SELECT * FROM driver_daily_earnings;
-- the deprecated VALUES() form still works in 8.0 but warns
INSERT INTO driver_daily_earnings VALUES (3, '2026-11-03', 1, 5000)
ON DUPLICATE KEY UPDATE trips = VALUES(trips);
SHOW WARNINGS;`,
        },
        {
          type: "output",
          text: `Query OK, 1 row affected (0.01 sec)
Query OK, 2 rows affected (0.00 sec)
Query OK, 0 rows affected (0.00 sec)
+-----------+------------+-------+----------------+
| driver_id | day        | trips | earnings_paise |
+-----------+------------+-------+----------------+
|         1 | 2026-11-03 |     3 |          73500 |
|         2 | 2026-11-03 |     1 |          18000 |
|         3 | 2026-11-03 |     1 |           5000 |
|         5 | 2026-11-03 |     1 |          31000 |
+-----------+------------+-------+----------------+
4 rows in set (0.00 sec)
Query OK, 0 rows affected, 1 warning (0.01 sec)
+---------+------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Level   | Code | Message                                                                                                                                                                                                                   |
+---------+------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Warning | 1287 | 'VALUES function' is deprecated and will be removed in a future release. Please use an alias (INSERT INTO ... VALUES (...) AS alias) and replace VALUES(col) in the ON DUPLICATE KEY UPDATE clause with alias.col instead |
+---------+------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+`,
        },
        {
          type: "list",
          items: [
            "**The affected-rows count encodes what happened: 1 inserted, 2 updated, 0 found but unchanged.** The 2 is not \"two rows\"; it's the server's way of saying \"updated an existing row\" with one number. Code that checks `== 1` for success treats every update as a failure.",
            "**The row alias `AS new`** (8.0.19 and later) names the row you tried to insert. Inside the `UPDATE` part, a bare column name is ambiguous (I first wrote `trips = trips + new.trips` and got `ERROR 1052: Column 'trips' in field list is ambiguous`), so qualify the existing row's columns with the table name.",
            "Driver 1 went from 2 trips to 3 and 49,000 to 73,500 paise: the `+` in the update makes this an accumulating counter, safe to run from many workers at once, because the read and the write happen inside one statement under the row lock. A read-then-`UPDATE` in Java would lose increments under concurrency.",
            "`VALUES(col)` is the pre-8.0.19 way and now warns with 1287. It still works on 8.0; plan for it to fail on a future version.",
          ],
        },
        {
          type: "heading",
          text: "INSERT IGNORE hides more than duplicates",
        },
        {
          type: "code",
          language: "sql",
          title: "ignore.sql",
          code: `INSERT INTO riders (name, phone, city) VALUES ('Kabir', '9800000007', 'Delhi');   -- id 7
INSERT IGNORE INTO riders (name, phone, city) VALUES
  ('Kabir Duplicate', '9800000007', 'Delhi'),
  ('Sanjana Ramaswamy-Venkataraghavan of the Very Long Surname Family', '9800000008', 'Chennai'),
  ('Tara', '9800000009', NULL);
SHOW WARNINGS;
SELECT id, name, phone, CONCAT('[', city, ']') AS city FROM riders WHERE id > 6;
-- the same NULL city without IGNORE, in strict mode
INSERT INTO riders (name, phone, city) VALUES ('Tara Again', '9800000010', NULL);`,
        },
        {
          type: "output",
          text: `Query OK, 2 rows affected, 3 warnings (0.01 sec)
Records: 3  Duplicates: 1  Warnings: 3
+---------+------+-----------------------------------------------------+
| Level   | Code | Message                                             |
+---------+------+-----------------------------------------------------+
| Warning | 1062 | Duplicate entry '9800000007' for key 'riders.phone' |
| Warning | 1265 | Data truncated for column 'name' at row 2           |
| Warning | 1048 | Column 'city' cannot be null                        |
+---------+------+-----------------------------------------------------+
3 rows in set (0.00 sec)
+----+--------------------------------------------------------------+------------+-----------+
| id | name                                                         | phone      | city      |
+----+--------------------------------------------------------------+------------+-----------+
|  7 | Kabir                                                        | 9800000007 | [Delhi]   |
|  8 | Sanjana Ramaswamy-Venkataraghavan of the Very Long Surname F | 9800000008 | [Chennai] |
|  9 | Tara                                                         | 9800000009 | []        |
+----+--------------------------------------------------------------+------------+-----------+
3 rows in set (0.00 sec)
ERROR 1048 (23000) at line 21: Column 'city' cannot be null`,
        },
        {
          type: "list",
          items: [
            "**`IGNORE` downgrades every ignorable error to a warning, not only duplicate keys.** The name was cut to 60 characters and the `NULL` city became an empty string, a value nobody inserted. Without `IGNORE` the same `NULL` is error 1048 and nothing is stored. Strict `sql_mode` doesn't protect you once `IGNORE` is in the statement.",
            "Applications almost never read warnings (JDBC exposes them through `getWarnings()`, which nobody calls), so `INSERT IGNORE` used for \"skip duplicates\" quietly stores damaged rows too. For \"insert if absent\", use `ON DUPLICATE KEY UPDATE id = id`, which affects 0 rows on a duplicate and still fails on bad data.",
          ],
        },
        {
          type: "heading",
          text: "REPLACE deletes, then inserts",
        },
        {
          type: "paragraph",
          text: "Kabir (id 7) has two devices in `rider_devices`, whose foreign key to `riders` has `ON DELETE CASCADE`. He \"updates his name\" through a `REPLACE`:",
        },
        {
          type: "code",
          language: "sql",
          title: "replace.sql",
          code: `SET SESSION information_schema_stats_expiry = 0;      -- show the live AUTO_INCREMENT, not a cached one
SELECT * FROM rider_devices;
SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'riders';
REPLACE INTO riders (name, phone, city) VALUES ('Kabir S', '9800000007', 'Delhi');
SELECT id, name, phone, city FROM riders WHERE phone = '9800000007';
SELECT * FROM rider_devices;
-- REPLACE on a rider who has trips (FK without CASCADE)
REPLACE INTO riders (name, phone, city, promo_code) VALUES ('Asha', '9800000001', 'Kolkata', 'WINTER25');
-- ON DUPLICATE KEY UPDATE keeps the id, but still uses up an AUTO_INCREMENT value
INSERT INTO riders (name, phone, city) VALUES ('Kabir', '9800000007', 'Delhi') AS new
ON DUPLICATE KEY UPDATE name = new.name;
SELECT id, name FROM riders WHERE phone = '9800000007';
SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'riders';`,
        },
        {
          type: "output",
          text: `+----+----------+-----------------+
| id | rider_id | push_token      |
+----+----------+-----------------+
|  1 |        7 | fcm-kabir-pixel |
|  2 |        7 | fcm-kabir-ipad  |
+----+----------+-----------------+
+----------------+
| AUTO_INCREMENT |
+----------------+
|             11 |
+----------------+
Query OK, 2 rows affected (0.01 sec)
+----+---------+------------+-------+
| id | name    | phone      | city  |
+----+---------+------------+-------+
| 11 | Kabir S | 9800000007 | Delhi |
+----+---------+------------+-------+
Empty set (0.00 sec)
ERROR 1451 (23000) at line 28: Cannot delete or update a parent row: a foreign key constraint fails (\`mysql_crud_queries\`.\`trips\`, CONSTRAINT \`fk_trips_rider\` FOREIGN KEY (\`rider_id\`) REFERENCES \`riders\` (\`id\`))
Query OK, 2 rows affected (0.01 sec)
+----+-------+
| id | name  |
+----+-------+
| 11 | Kabir |
+----+-------+
+----------------+
| AUTO_INCREMENT |
+----------------+
|             14 |
+----------------+`,
        },
        {
          type: "list",
          items: [
            "**\"2 rows affected\" from `REPLACE` means one deleted and one inserted.** Kabir is now id 11, not 7: every reference to rider 7 elsewhere (caches, other services, logs, URLs) now points at nothing.",
            "**The delete fired the cascade: both of Kabir's devices are gone**, with no error and no warning. Push notifications to him silently stop.",
            "**For Asha, who has trips, the delete hit a foreign key without `CASCADE`** and the whole `REPLACE` failed with 1451. So `REPLACE` either breaks references or fails, depending on how the child tables were declared.",
            "**`ON DUPLICATE KEY UPDATE` kept id 11**, but `AUTO_INCREMENT` still moved from 12 to 14 across the failed `REPLACE` and the upsert: both reserved a value before discovering the duplicate. That's harmless gaps, not a bug, but a table with a hot upsert can exhaust an `INT` key faster than its row count suggests (the previous lesson measured this burning).",
            "`information_schema.tables` caches statistics for 24 hours by default (`information_schema_stats_expiry = 86400`), so without the `SET` the `AUTO_INCREMENT` column shows a stale number.",
          ],
        },
      ],
    },
    {
      title: "UPDATE and DELETE",
      blocks: [
        {
          type: "heading",
          text: "Matched rows, changed rows, and SET order",
        },
        {
          type: "code",
          language: "sql",
          title: "update.sql",
          code: `UPDATE drivers SET status = 'ONLINE' WHERE city IN ('Kolkata', 'Mumbai') AND status <> 'SUSPENDED';
SELECT ROW_COUNT();
UPDATE drivers SET status = 'ONLINE' WHERE city IN ('Kolkata', 'Mumbai') AND status <> 'SUSPENDED';
-- remove the surge from trip 2 and recompute its fare (fare 41200 at surge 1.50)
UPDATE trips SET surge = 1.00, fare_paise = fare_paise / surge WHERE id = 2;
SELECT id, fare_paise, surge FROM trips WHERE id = 2;`,
        },
        {
          type: "output",
          text: `Query OK, 1 row affected (0.01 sec)
Rows matched: 4  Changed: 1  Warnings: 0
+-------------+
| ROW_COUNT() |
+-------------+
|           1 |
+-------------+
Query OK, 0 rows affected (0.00 sec)
Rows matched: 4  Changed: 0  Warnings: 0
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0
+----+------------+-------+
| id | fare_paise | surge |
+----+------------+-------+
|  2 |      41200 |  1.00 |
+----+------------+-------+`,
        },
        {
          type: "list",
          items: [
            "**The server distinguishes rows matched (found by `WHERE`) from rows changed.** Three of the four matching drivers were already `ONLINE`; InnoDB compares the new row with the old one and doesn't write (or count) a row that wouldn't change. `ROW_COUNT()` and the \"rows affected\" in the protocol are the **changed** count.",
            "**MySQL evaluates single-table `SET` assignments left to right, and later ones see earlier results.** `surge` became 1.00 first, so `fare_paise / surge` divided by 1.00 and the fare stayed 41,200 instead of 27,467. Standard SQL (and PostgreSQL) evaluates every right-hand side against the old row; MySQL's manual documents its different behaviour. Put dependent assignments in the right order, or compute from the old value explicitly.",
          ],
        },
        {
          type: "heading",
          text: "What JDBC reports: found rows unless useAffectedRows=true",
        },
        {
          type: "paragraph",
          text: "Connector/J connects with the `CLIENT_FOUND_ROWS` flag by default, which makes the server report **matched** rows for `UPDATE`. The URL option `useAffectedRows=true` turns the flag off:",
        },
        {
          type: "code",
          language: "java",
          title: "AffectedRows.java",
          code: `import java.sql.*;

public class AffectedRows {
    static final String BASE = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";

    static final String SET_ONLINE =
            "UPDATE drivers SET status = 'ONLINE' WHERE city IN ('Kolkata', 'Mumbai') AND status <> 'SUSPENDED'";
    static final String UPSERT = """
            INSERT INTO driver_daily_earnings (driver_id, day, trips, earnings_paise) VALUES (?, '2026-11-04', ?, ?) AS new
            ON DUPLICATE KEY UPDATE trips = new.trips, earnings_paise = new.earnings_paise""";

    static void run(String urlExtra) throws SQLException {
        System.out.println("URL options: " + (urlExtra.isEmpty() ? "(defaults)" : urlExtra));
        try (Connection c = DriverManager.getConnection(BASE + urlExtra);
             Statement s = c.createStatement()) {
            s.executeUpdate("UPDATE drivers SET status = 'OFFLINE' WHERE id IN (1, 2, 4, 6)");
            s.executeUpdate("DELETE FROM driver_daily_earnings WHERE day = '2026-11-04'");
            System.out.println("  UPDATE, 4 rows match, 4 change:   executeUpdate = " + s.executeUpdate(SET_ONLINE));
            System.out.println("  same UPDATE again, 0 change:     executeUpdate = " + s.executeUpdate(SET_ONLINE));
            try (PreparedStatement ps = c.prepareStatement(UPSERT)) {
                int[][] calls = { {1, 2, 49000}, {1, 3, 73500}, {1, 3, 73500} };
                String[] what = { "upsert, new row:                 ", "upsert, existing row changed:    ", "upsert, existing row unchanged:  " };
                for (int i = 0; i < calls.length; i++) {
                    ps.setInt(1, calls[i][0]);
                    ps.setInt(2, calls[i][1]);
                    ps.setInt(3, calls[i][2]);
                    System.out.println("  " + what[i] + "executeUpdate = " + ps.executeUpdate());
                }
            }
        }
    }

    public static void main(String[] args) throws SQLException {
        run("");
        run("&useAffectedRows=true");
    }
}`,
        },
        {
          type: "output",
          text: `URL options: (defaults)
  UPDATE, 4 rows match, 4 change:   executeUpdate = 4
  same UPDATE again, 0 change:     executeUpdate = 4
  upsert, new row:                 executeUpdate = 1
  upsert, existing row changed:    executeUpdate = 2
  upsert, existing row unchanged:  executeUpdate = 1
URL options: &useAffectedRows=true
  UPDATE, 4 rows match, 4 change:   executeUpdate = 4
  same UPDATE again, 0 change:     executeUpdate = 0
  upsert, new row:                 executeUpdate = 1
  upsert, existing row changed:    executeUpdate = 2
  upsert, existing row unchanged:  executeUpdate = 0`,
        },
        {
          type: "list",
          items: [
            "**By default the repeated `UPDATE` returned 4 although nothing changed**, and the unchanged upsert returned 1 instead of 0. With `useAffectedRows=true` both returned 0, matching the `mysql` client.",
            "Which one you want depends on the question. Optimistic locking (`UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?`) always changes the row it matches, so both settings work. \"Did my idempotent status update actually change anything?\" needs `useAffectedRows=true`. Switching the flag on an existing application changes what every `executeUpdate` returns, including the update counts an ORM checks for optimistic locking, so test before flipping it.",
          ],
        },
        {
          type: "heading",
          text: "Safe updates mode",
        },
        {
          type: "code",
          language: "sql",
          title: "safe-updates.sql",
          code: `SET SESSION sql_safe_updates = 1;
UPDATE drivers SET status = 'OFFLINE' WHERE status = 'ONLINE';
DELETE FROM trips WHERE status = 'CANCELLED';
UPDATE drivers SET status = 'OFFLINE' WHERE id = 2;
UPDATE drivers SET status = 'OFFLINE' WHERE status = 'ONLINE' LIMIT 10;
SET SESSION sql_safe_updates = 0;`,
        },
        {
          type: "output",
          text: `ERROR 1175 (HY000) at line 11: You are using safe update mode and you tried to update a table without a WHERE that uses a KEY column.
ERROR 1175 (HY000) at line 12: You are using safe update mode and you tried to update a table without a WHERE that uses a KEY column.
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0
Query OK, 3 rows affected (0.00 sec)
Rows matched: 3  Changed: 3  Warnings: 0`,
        },
        {
          type: "paragraph",
          text: "With `sql_safe_updates` on, an `UPDATE` or `DELETE` is refused unless its `WHERE` uses an indexed column or it has a `LIMIT`. `status` has no index, so the first two were refused; a primary-key condition or a `LIMIT` passes. The `mysql` client turns it on with `--safe-updates` (alias `--i-am-a-dummy`, really). It's worth having in any session where a human types SQL against production. It doesn't help application code, where a missing `WHERE` usually comes from a bug in building the statement.",
        },
        {
          type: "heading",
          text: "Multi-table UPDATE and DELETE",
        },
        {
          type: "code",
          language: "sql",
          title: "multi-table.sql",
          code: `-- suspend drivers who had a cancelled trip that still charged a fare
UPDATE drivers d
JOIN trips t ON t.driver_id = d.id
SET d.status = 'SUSPENDED'
WHERE t.status = 'CANCELLED' AND t.fare_paise IS NOT NULL;
SELECT id, name, status FROM drivers ORDER BY id;
-- delete earnings rows of suspended drivers: only the table named before FROM loses rows
DELETE e FROM driver_daily_earnings e
JOIN drivers d ON d.id = e.driver_id
WHERE d.status = 'SUSPENDED';
SELECT * FROM driver_daily_earnings;`,
        },
        {
          type: "output",
          text: `Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0
+----+--------+-----------+
| id | name   | status    |
+----+--------+-----------+
|  1 | Imran  | OFFLINE   |
|  2 | Sunita | OFFLINE   |
|  3 | Vikram | SUSPENDED |
|  4 | Deepa  | OFFLINE   |
|  5 | Karan  | SUSPENDED |
|  6 | Pooja  | OFFLINE   |
+----+--------+-----------+
Query OK, 2 rows affected (0.01 sec)
+-----------+------------+-------+----------------+
| driver_id | day        | trips | earnings_paise |
+-----------+------------+-------+----------------+
|         1 | 2026-11-03 |     3 |          73500 |
|         2 | 2026-11-03 |     1 |          18000 |
+-----------+------------+-------+----------------+`,
        },
        {
          type: "list",
          items: [
            "**A join in `UPDATE` updates each target row once**, however many joined rows match it. Vikram (driver 3) had the only cancelled trip with a fare (trip 8, 5,000 paise); Karan was already suspended.",
            "**`DELETE e FROM ... JOIN ...` deletes only from the aliases listed between `DELETE` and `FROM`.** `DELETE e, d FROM ...` would delete the drivers too. This syntax is MySQL-specific, and multi-table forms can't use `ORDER BY` or `LIMIT`.",
            "Before running either for real, run the same `FROM ... JOIN ... WHERE` as a `SELECT` and look at the rows.",
          ],
        },
        {
          type: "heading",
          text: "A big DELETE locks what it scans: batched purges",
        },
        {
          type: "paragraph",
          text: "A nightly job purges cancelled trips older than 1 March. `status` and `requested_at` have no index, so the `DELETE` must scan the table. In `REPEATABLE READ`, InnoDB locks every row it **examines** with a next-key lock (the row plus the gap before it) and keeps the locks until commit, whether or not the row matches. Counted inside a transaction on a 500,000-row copy, `purge_demo`:",
        },
        {
          type: "code",
          language: "sql",
          title: "purge-locks.sql",
          code: `BEGIN;
DELETE FROM purge_demo WHERE status = 'CANCELLED' AND requested_at < '2026-03-01';
SELECT trx_rows_locked, trx_rows_modified, trx_lock_structs FROM information_schema.innodb_trx WHERE trx_mysql_thread_id = CONNECTION_ID();
SELECT index_name, lock_type, lock_mode, COUNT(*) AS locks FROM performance_schema.data_locks
WHERE object_name = 'purge_demo' GROUP BY index_name, lock_type, lock_mode;
ROLLBACK;
BEGIN;
DELETE FROM purge_demo WHERE id > 0 AND id <= 10000 AND status = 'CANCELLED' AND requested_at < '2026-03-01';
-- the same two lock queries
ROLLBACK;`,
        },
        {
          type: "output",
          text: `Query OK, 16991 rows affected (0.58 sec)
+-----------------+-------------------+------------------+
| trx_rows_locked | trx_rows_modified | trx_lock_structs |
+-----------------+-------------------+------------------+
|          501719 |             16991 |             1720 |
+-----------------+-------------------+------------------+
+------------+-----------+-----------+--------+
| index_name | lock_type | lock_mode | locks  |
+------------+-----------+-----------+--------+
| NULL       | TABLE     | IX        |      1 |
| PRIMARY    | RECORD    | X         | 501719 |
+------------+-----------+-----------+--------+
2 rows in set (1.93 sec)

Query OK, 1000 rows affected (0.01 sec)
+-----------------+-------------------+------------------+
| trx_rows_locked | trx_rows_modified | trx_lock_structs |
+-----------------+-------------------+------------------+
|           10034 |              1000 |               36 |
+-----------------+-------------------+------------------+
+------------+-----------+-----------+-------+
| index_name | lock_type | lock_mode | locks |
+------------+-----------+-----------+-------+
| NULL       | TABLE     | IX        |     1 |
| PRIMARY    | RECORD    | X         | 10034 |
+------------+-----------+-----------+-------+`,
        },
        {
          type: "list",
          items: [
            "**Deleting 16,991 rows locked 501,719 records**: every row in the table (plus page boundary records). Lock mode `X` without `REC_NOT_GAP` or `GAP` is a next-key lock. While it's held, no other transaction can update **any** trip, including the 483,000 that weren't being deleted. The lock lesson later in this track takes these lock modes apart; here the point is the count.",
            "**A primary-key range of 10,000 ids locked 10,034 records** for 1,000 deletes. The scan is bounded by the index, so the locks are too.",
          ],
        },
        {
          type: "paragraph",
          text: "Three ways to run that purge while a refund worker keeps updating random old completed trips (which the purge never deletes) every 20 ms, measuring the worker's slowest update and the server's `Innodb_row_lock_waits` and `Innodb_row_lock_time` counters:",
        },
        {
          type: "code",
          language: "java",
          title: "PurgeDemo.java",
          code: `import java.sql.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;

public class PurgeDemo {
    static final String URL = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";
    static final String PURGE_WHERE = "status = 'CANCELLED' AND requested_at < '2026-03-01'";

    static void reset() throws SQLException {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) {
            s.execute("DROP TABLE IF EXISTS purge_demo");
            s.execute("CREATE TABLE purge_demo LIKE trip_history");
            s.execute("INSERT INTO purge_demo SELECT * FROM trip_history");
        }
    }

    static long rowsExamined(Connection c) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("""
                SELECT SUM(SUM_ROWS_EXAMINED) FROM performance_schema.events_statements_summary_by_thread_by_event_name
                WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME = 'statement/sql/delete'""")) {
            rs.next();
            return rs.getLong(1);
        }
    }

    static long[] rowLockWaits(Connection c) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                "SHOW GLOBAL STATUS WHERE Variable_name IN ('Innodb_row_lock_waits', 'Innodb_row_lock_time')")) {
            long[] v = new long[2];
            while (rs.next()) v[rs.getString(1).endsWith("waits") ? 0 : 1] = rs.getLong(2);
            return v;
        }
    }

    interface Purge { long run(Connection c) throws SQLException; }   // returns number of DELETE statements

    static void measure(String label, Purge purge) throws Exception {
        reset();
        AtomicBoolean done = new AtomicBoolean();
        long[] refund = new long[3];                                   // count, slowest ms, waits over 100 ms
        Thread refunds = Thread.ofPlatform().start(() -> {
            try (Connection c = DriverManager.getConnection(URL);
                 PreparedStatement ps = c.prepareStatement("UPDATE purge_demo SET fare_paise = fare_paise - 500 WHERE id = ?")) {
                while (!done.get()) {
                    long id = ThreadLocalRandom.current().nextLong(1, 160_000) / 10 * 10 + 1;   // an old COMPLETED trip
                    long t0 = System.nanoTime();
                    ps.setLong(1, id);
                    ps.executeUpdate();
                    long ms = (System.nanoTime() - t0) / 1_000_000;
                    refund[0]++;
                    refund[1] = Math.max(refund[1], ms);
                    if (ms > 100) refund[2]++;
                    Thread.sleep(20);
                }
            } catch (Exception e) {
                System.out.println("refund thread: " + e.getMessage());
            }
        });
        Thread.sleep(300);
        try (Connection c = DriverManager.getConnection(URL)) {
            long[] waitsBefore = rowLockWaits(c);
            long t0 = System.nanoTime();
            long statements = purge.run(c);
            long ms = (System.nanoTime() - t0) / 1_000_000;
            done.set(true);
            refunds.join();
            long[] waitsAfter = rowLockWaits(c);
            long left;
            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT COUNT(*) FROM purge_demo WHERE " + PURGE_WHERE)) {
                rs.next();
                left = rs.getLong(1);
            }
            System.out.printf("%-30s %,6d ms  DELETE statements=%,4d  rows examined=%,9d  left=%d%n",
                    label, ms, statements, rowsExamined(c), left);
            System.out.printf("%-30s row lock waits=%d (%,d ms in total)%n", "",
                    waitsAfter[0] - waitsBefore[0], waitsAfter[1] - waitsBefore[1]);
            System.out.printf("%-30s refunds=%,d  slowest=%,d ms  over 100 ms=%d%n", "", refund[0], refund[1], refund[2]);
        }
    }

    public static void main(String[] args) throws Exception {
        measure("one DELETE", c -> {
            try (Statement s = c.createStatement()) {
                int n = s.executeUpdate("DELETE FROM purge_demo WHERE " + PURGE_WHERE);
                System.out.println("one DELETE removed " + n + " rows");
            }
            return 1;
        });
        measure("ORDER BY id LIMIT 1000 loop", c -> {
            long statements = 0;
            try (Statement s = c.createStatement()) {
                while (true) {
                    statements++;
                    if (s.executeUpdate("DELETE FROM purge_demo WHERE " + PURGE_WHERE + " ORDER BY id LIMIT 1000") == 0) break;
                }
            }
            return statements;
        });
        measure("id-range chunks of 10,000", c -> {
            long statements = 0;
            try (PreparedStatement ps = c.prepareStatement(
                    "DELETE FROM purge_demo WHERE id > ? AND id <= ? AND " + PURGE_WHERE)) {
                long maxId;
                try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(
                        "SELECT MAX(id) FROM purge_demo WHERE requested_at < '2026-03-01'")) {
                    rs.next();
                    maxId = rs.getLong(1);
                }
                for (long from = 0; from < maxId; from += 10_000) {
                    ps.setLong(1, from);
                    ps.setLong(2, from + 10_000);
                    ps.executeUpdate();
                    statements++;
                }
            }
            return statements;
        });
    }
}`,
        },
        {
          type: "output",
          text: `one DELETE removed 16991 rows
one DELETE                      1,058 ms  DELETE statements=   1  rows examined=  500,000  left=0
                               row lock waits=1 (780 ms in total)
                               refunds=17  slowest=803 ms  over 100 ms=1
ORDER BY id LIMIT 1000 loop     3,725 ms  DELETE statements=  18  rows examined=2,207,009  left=0
                               row lock waits=16 (2,166 ms in total)
                               refunds=49  slowest=601 ms  over 100 ms=6
id-range chunks of 10,000       1,408 ms  DELETE statements=  17  rows examined=  170,000  left=0
                               row lock waits=1 (21 ms in total)
                               refunds=35  slowest=55 ms  over 100 ms=0`,
        },
        {
          type: "list",
          items: [
            "**One `DELETE` blocked a refund for 780 ms** (413 to 3,743 ms over five runs): every refund that arrived after the scan passed its row waited until the statement committed. On this 500,000-row table that's a second or so; the lock time grows with the table, because the scan does.",
            "**The naive `ORDER BY id LIMIT 1000` loop was worse, not better**: 16 lock waits totalling 2.2 s (16 to 25 waits over five runs) and 2,207,009 rows examined, four times the table. Each batch restarted the scan at id 1 and re-locked all the old completed rows in front of the next 1,000 matches. `ORDER BY ... LIMIT` batching only works when an index leads the scan straight to the rows being deleted (for example `ORDER BY requested_at LIMIT 1000` with an index on `requested_at`).",
            "**Id-range chunks examined each row once (170,000 rows) and the slowest refund took 55 ms** (29 to 70 ms over the five runs with lock counters; my very first run, before I added them, had one 1,066 ms refund that I can't attribute to locks or to a disk stall): each chunk locks 10,000 rows for a few milliseconds and commits. The job took about as long in total, but nobody waited for it. With an index on the filter column, `DELETE ... WHERE requested_at < ? ORDER BY requested_at LIMIT 1000` in a loop is the equivalent pattern.",
            "Batches also keep each transaction small: one huge `DELETE` writes all its undo records in one transaction (a long rollback if it fails) and all its binlog events in one event group, which a replica then applies as one long transaction.",
          ],
        },
        {
          type: "heading",
          text: "TRUNCATE is not a fast DELETE",
        },
        {
          type: "code",
          language: "sql",
          title: "truncate.sql",
          code: `DELETE FROM purge_demo;                     -- 500,000 rows
SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'purge_demo';
INSERT INTO purge_demo SELECT * FROM trip_history;
TRUNCATE TABLE purge_demo;
SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'purge_demo';
INSERT INTO purge_demo SELECT * FROM trip_history WHERE id <= 1000;
BEGIN; DELETE FROM purge_demo; ROLLBACK;
SELECT COUNT(*) AS after_delete_rollback FROM purge_demo;
BEGIN; TRUNCATE TABLE purge_demo; ROLLBACK;
SELECT COUNT(*) AS after_truncate_rollback FROM purge_demo;
TRUNCATE TABLE riders;`,
        },
        {
          type: "output",
          text: `Query OK, 500000 rows affected (9.82 sec)
+----------------+
| AUTO_INCREMENT |
+----------------+
|         500001 |
+----------------+
Query OK, 0 rows affected (0.44 sec)
+----------------+
| AUTO_INCREMENT |
+----------------+
|           NULL |
+----------------+
+-----------------------+
| after_delete_rollback |
+-----------------------+
|                  1000 |
+-----------------------+
+-------------------------+
| after_truncate_rollback |
+-------------------------+
|                       0 |
+-------------------------+
ERROR 1701 (42000) at line 19: Cannot truncate a table referenced in a foreign key constraint (\`mysql_crud_queries\`.\`trips\`, CONSTRAINT \`fk_trips_rider\`)`,
        },
        {
          type: "list",
          items: [
            "**`DELETE` of 500,000 rows took 9.8 s; `TRUNCATE` took 0.44 s.** `DELETE` removes row by row, writing undo and redo for each and firing triggers; `TRUNCATE` drops and recreates the table's tablespace.",
            "**`TRUNCATE` resets `AUTO_INCREMENT`** (`NULL` here means no value yet; the next insert got id 1, I checked). `DELETE` keeps it at 500,001.",
            "**`TRUNCATE` is DDL: it commits implicitly and can't be rolled back.** The `ROLLBACK` after it restored nothing. **It refuses a table referenced by a foreign key** (error 1701) even if the child table is empty. Use it for staging and test tables, never as a faster `DELETE` in application code.",
          ],
        },
      ],
    },
    {
      title: "Soft Deletes",
      blocks: [
        {
          type: "paragraph",
          text: "A **soft delete** marks a row as deleted (`deleted_at = NOW()`) instead of removing it, so trip history, payments and audits that point to it stay valid and the row can be restored. The cost is that every query must remember the filter, and unique keys still see the \"deleted\" rows:",
        },
        {
          type: "code",
          language: "sql",
          title: "soft-delete.sql",
          code: `CREATE TABLE rider_accounts (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(60) NOT NULL,
  phone      VARCHAR(15) NOT NULL,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_phone (phone)
);
INSERT INTO rider_accounts (name, phone) VALUES ('Asha', '9800000001'), ('Ravi', '9800000002');
UPDATE rider_accounts SET deleted_at = '2026-11-10 12:00:00' WHERE id = 2;     -- Ravi deletes his account
INSERT INTO rider_accounts (name, phone) VALUES ('Ravi', '9800000002');          -- and signs up again
-- Fix: unique only among live rows. NULLs never collide in a UNIQUE index.
ALTER TABLE rider_accounts
  ADD COLUMN live TINYINT AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL,
  DROP INDEX uq_phone,
  ADD UNIQUE KEY uq_live_phone (phone, live);
INSERT INTO rider_accounts (name, phone) VALUES ('Ravi', '9800000002');
INSERT INTO rider_accounts (name, phone) VALUES ('Ravi Twin', '9800000002');
CREATE VIEW active_rider_accounts AS SELECT id, name, phone FROM rider_accounts WHERE deleted_at IS NULL;
SELECT id, name, phone, deleted_at, live FROM rider_accounts;
SELECT * FROM active_rider_accounts;`,
        },
        {
          type: "output",
          text: `ERROR 1062 (23000) at line 15: Duplicate entry '9800000002' for key 'rider_accounts.uq_phone'
Query OK, 2 rows affected (0.49 sec)
Records: 2  Duplicates: 0  Warnings: 0
Query OK, 1 row affected (0.03 sec)
ERROR 1062 (23000) at line 22: Duplicate entry '9800000002-1' for key 'rider_accounts.uq_live_phone'
+----+------+------------+---------------------+------+
| id | name | phone      | deleted_at          | live |
+----+------+------------+---------------------+------+
|  1 | Asha | 9800000001 | NULL                |    1 |
|  2 | Ravi | 9800000002 | 2026-11-10 12:00:00 | NULL |
|  4 | Ravi | 9800000002 | NULL                |    1 |
+----+------+------------+---------------------+------+
+----+------+------------+
| id | name | phone      |
+----+------+------------+
|  1 | Asha | 9800000001 |
|  4 | Ravi | 9800000002 |
+----+------+------------+`,
        },
        {
          type: "list",
          items: [
            "**A plain `UNIQUE (phone)` blocked re-registration** because the soft-deleted row still holds the phone.",
            "**The generated column `live` is 1 for live rows and `NULL` for deleted ones**, and a unique index allows any number of `NULL`s. So `(phone, live)` is unique among live rows only: Ravi could sign up again, and a second live account with the same phone was still refused (`'9800000002-1'`).",
            "**A view (or a Hibernate `@SQLRestriction(\"deleted_at IS NULL\")`, `@Where` before Hibernate 6.3) keeps the filter in one place**, because a single forgotten `deleted_at IS NULL` shows a deleted rider to support staff or bills him. Indexes that serve live-row queries usually need `deleted_at` (or `live`) in them too.",
            "Soft-deleted rows still count toward table size and still need a real purge eventually (for storage and for privacy laws that require actual erasure), which brings back the batched `DELETE` above.",
          ],
        },
      ],
    },
    {
      title: "SQL Injection and PreparedStatement",
      blocks: [
        {
          type: "paragraph",
          text: "**SQL injection** happens when user input is pasted into the text of a SQL statement, so the input can change the statement's structure. A support tool looks a rider up by phone number:",
        },
        {
          type: "code",
          language: "java",
          title: "InjectionDemo.java",
          code: `import java.sql.*;
import java.util.Map;

public class InjectionDemo {
    static final String BASE = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";

    // What shipped in the support tool: the phone number from the search box is pasted into the SQL
    static void lookupConcat(Connection c, String phone) throws SQLException {
        String sql = "SELECT id, name, promo_code FROM riders WHERE phone = '" + phone + "'";
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            print("concat  ", phone, rs);
        } catch (SQLException e) {
            System.out.printf("concat   %-32s -> %s%n", quote(phone), e.getMessage());
        }
    }

    static void lookupPrepared(Connection c, String phone) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT id, name, promo_code FROM riders WHERE phone = ?")) {
            ps.setString(1, phone);
            try (ResultSet rs = ps.executeQuery()) {
                print("prepared", phone, rs);
            }
        }
    }

    static void print(String how, String input, ResultSet rs) throws SQLException {
        StringBuilder out = new StringBuilder();
        int n = 0;
        while (rs.next()) {
            n++;
            if (n <= 3) out.append(rs.getString("name")).append(' ');
        }
        System.out.printf("%s %-32s -> %d row(s) %s%s%n", how, quote(input), n, out, n > 3 ? "..." : "");
    }

    static String quote(String s) { return "\\"" + s + "\\""; }

    static void lastStatement(Connection c, String label) throws SQLException {
        try (Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("""
                 SELECT EVENT_NAME, SQL_TEXT FROM performance_schema.events_statements_history
                 WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME IN ('statement/sql/select', 'statement/com/Execute')
                 ORDER BY EVENT_ID DESC LIMIT 1""")) {
            rs.next();
            System.out.println("  server saw (" + label + "): " + rs.getString(1) + "  " + rs.getString(2));
        }
    }

    public static void main(String[] args) throws SQLException {
        String[] inputs = { "9800000004", "' OR '1'='1", "x' UNION SELECT id, name, city FROM drivers -- ", "'; DELETE FROM trips; -- " };
        try (Connection c = DriverManager.getConnection(BASE)) {
            for (String in : inputs) lookupConcat(c, in);
            for (String in : inputs) lookupPrepared(c, in);
            lastStatement(c, "default, client-side prepare");
        }
        try (Connection c = DriverManager.getConnection(BASE + "&useServerPrepStmts=true")) {
            lookupPrepared(c, "' OR '1'='1");
            lastStatement(c, "useServerPrepStmts=true");
        }
        // Identifiers can't be parameters: a bound ORDER BY value sorts by a constant string
        try (Connection c = DriverManager.getConnection(BASE);
             PreparedStatement ps = c.prepareStatement("SELECT id, fare_paise FROM trips WHERE fare_paise IS NOT NULL ORDER BY ? DESC LIMIT 3")) {
            ps.setString(1, "fare_paise");
            try (ResultSet rs = ps.executeQuery()) {
                StringBuilder sb = new StringBuilder();
                while (rs.next()) sb.append(rs.getLong(1)).append(':').append(rs.getInt(2)).append(' ');
                System.out.println("ORDER BY ? bound to \\"fare_paise\\" -> " + sb);
            }
            Map<String, String> sortable = Map.of("fare", "fare_paise", "time", "requested_at");
            String column = sortable.getOrDefault("fare", "requested_at");          // whitelist, never raw input
            try (Statement s = c.createStatement();
                 ResultSet rs = s.executeQuery("SELECT id, fare_paise FROM trips WHERE fare_paise IS NOT NULL ORDER BY " + column + " DESC LIMIT 3")) {
                StringBuilder sb = new StringBuilder();
                while (rs.next()) sb.append(rs.getLong(1)).append(':').append(rs.getInt(2)).append(' ');
                System.out.println("ORDER BY whitelisted column       -> " + sb);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `concat   "9800000004"                     -> 1 row(s) Farhan 
concat   "' OR '1'='1"                    -> 6 row(s) Asha Ravi Meera ...
concat   "x' UNION SELECT id, name, city FROM drivers -- " -> 6 row(s) Imran Sunita Vikram ...
concat   "'; DELETE FROM trips; -- "      -> You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'DELETE FROM trips; -- '' at line 1
prepared "9800000004"                     -> 1 row(s) Farhan 
prepared "' OR '1'='1"                    -> 0 row(s) 
prepared "x' UNION SELECT id, name, city FROM drivers -- " -> 0 row(s) 
prepared "'; DELETE FROM trips; -- "      -> 0 row(s) 
  server saw (default, client-side prepare): statement/sql/select  SELECT id, name, promo_code FROM riders WHERE phone = '''; DELETE FROM trips; -- '
prepared "' OR '1'='1"                    -> 0 row(s) 
  server saw (useServerPrepStmts=true): statement/com/Execute  null
ORDER BY ? bound to "fare_paise" -> 1:24500 2:41200 4:18000 
ORDER BY whitelisted column       -> 5:52000 2:41200 9:31000 `,
        },
        {
          type: "list",
          items: [
            "**`' OR '1'='1` returned all 6 riders**: the statement became `WHERE phone = '' OR '1'='1'`. **The `UNION` input returned the drivers table** through a rider search: any table the database user can read is reachable this way.",
            "**The stacked `DELETE` failed only because Connector/J's `allowMultiQueries` is false by default**, so the server refused two statements in one call (error 1064). Turn that option on and the same input deletes every trip.",
            "**`PreparedStatement` returned 0 rows for every attack**, because the input is only ever a value. With the default client-side preparation, `performance_schema` shows what Connector/J sent: the value inlined as a quoted, escaped string literal (`'''; DELETE ...'`, the quote doubled). With `useServerPrepStmts=true`, the server received `COM_STMT_EXECUTE` (`statement/com/Execute`) with no SQL text at all: the statement was parsed once at prepare time and the value travelled separately in the binary protocol.",
            "**Identifiers can't be parameters.** `ORDER BY ?` bound to `\"fare_paise\"` sorted by the constant string `'fare_paise'`, so the rows came back in table order (24500, 41200, 18000), with no error. For user-chosen sort columns, map allowed names to column names in code (a whitelist) and concatenate only the mapped value.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing a trip-history page, `SELECT id, requested_at, fare_paise FROM trip_history WHERE rider_id = ? AND (requested_at < ? OR (requested_at = ? AND id < ?)) ORDER BY requested_at DESC, id DESC LIMIT 5`, from a `PreparedStatement` to the rows, and then the `UPDATE` that follows when the rider disputes a fare:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Client side.** With default settings Connector/J substitutes the four parameters into the SQL text as escaped literals and sends one `COM_QUERY` packet. (With `useServerPrepStmts=true` it would send `COM_STMT_PREPARE` once and then `COM_STMT_EXECUTE` with binary values.) The value can't change the statement's structure either way.",
            "**Parse and resolve.** The connection's thread parses the text and resolves every name against the data dictionary. An unknown column, or an alias used in `WHERE`, fails here with error 1054 before any row is touched.",
            "**Optimize.** The optimizer sees `rider_id = const` plus a range on `requested_at` and `id`, and an `ORDER BY` that matches `idx_rider_time` read backwards (InnoDB secondary indexes carry the primary key, so `(rider_id, requested_at, id)` is the real key order). It picks a reverse index range scan with no sort, and notes it can stop after 5 rows.",
            "**Execute.** The iterator tree pulls rows: the engine positions in the index at the cursor and then walks backwards entry by entry. For each entry the row is looked up in the clustered index by primary key to get `fare_paise`. After 5 rows the `Limit` iterator stops pulling: `EXPLAIN ANALYZE` showed the range scan producing exactly 5 rows, not the rider's whole history.",
            "**Send and record.** Rows go back in the result-set packets; the server records the statement, its timer, rows examined and rows sent in `events_statements_current` and then `events_statements_history`. With `autocommit` on and a plain `SELECT` in `REPEATABLE READ`, the read used a consistent snapshot and took no row locks.",
            "**The fare correction**: `UPDATE trips SET fare_paise = ? WHERE id = ?`. InnoDB finds the row by primary key, takes an exclusive record lock, compares old and new values (an identical row counts as matched but not changed), writes the old version to the undo log, changes the page in the buffer pool and appends redo. The affected-row count goes back to the client: changed rows, or matched rows if the driver set `CLIENT_FOUND_ROWS` (Connector/J's default).",
            "**Commit.** With `innodb_flush_log_at_trx_commit=1` and `sync_binlog=1`, the commit flushes the redo log and binary log to disk before replying. That flush is why one commit per row ran at 42 to 109 rows per second here, and why batching rows into fewer transactions and statements matters so much.",
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
          title: "crud-tour.sql",
          code: `CREATE TABLE surge_zones (
  zone       VARCHAR(20) PRIMARY KEY,
  city       VARCHAR(30) NOT NULL,
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  note       VARCHAR(40) NULL
);
-- INSERT: one row, many rows, upsert
INSERT INTO surge_zones (zone, city) VALUES ('SALT-LAKE', 'Kolkata');
INSERT INTO surge_zones (zone, city, multiplier) VALUES ('NEW-TOWN', 'Kolkata', 1.50), ('KORAMANGALA', 'Bengaluru', 1.25), ('BANDRA', 'Mumbai', 2.00);
INSERT INTO surge_zones (zone, city, multiplier) VALUES ('SALT-LAKE', 'Kolkata', 1.75) AS new
  ON DUPLICATE KEY UPDATE multiplier = new.multiplier;
-- SELECT: filter, null test, sort with a tie-breaker, page
SELECT zone, city, multiplier, COALESCE(note, '-') AS note
FROM surge_zones
WHERE city IN ('Kolkata', 'Bengaluru') AND note IS NULL
ORDER BY multiplier DESC, zone
LIMIT 2;
-- keyset: the rows that sort after ('1.50', 'NEW-TOWN'), any city
SELECT zone, multiplier FROM surge_zones
WHERE multiplier < 1.50 OR (multiplier = 1.50 AND zone > 'NEW-TOWN')
ORDER BY multiplier DESC, zone LIMIT 2;
-- UPDATE and DELETE with a key, and with ORDER BY ... LIMIT
UPDATE surge_zones SET note = 'festival' WHERE zone = 'BANDRA';
UPDATE surge_zones SET multiplier = 1.00 ORDER BY multiplier DESC LIMIT 1;
DELETE FROM surge_zones WHERE city = 'Mumbai' LIMIT 100;
SELECT * FROM surge_zones ORDER BY zone;`,
        },
        {
          type: "output",
          text: `Query OK, 1 row affected (0.03 sec)
Query OK, 3 rows affected (0.03 sec)
Records: 3  Duplicates: 0  Warnings: 0
Query OK, 2 rows affected (0.03 sec)
+-----------+---------+------------+------+
| zone      | city    | multiplier | note |
+-----------+---------+------------+------+
| SALT-LAKE | Kolkata |       1.75 | -    |
| NEW-TOWN  | Kolkata |       1.50 | -    |
+-----------+---------+------------+------+
+-------------+------------+
| zone        | multiplier |
+-------------+------------+
| KORAMANGALA |       1.25 |
+-------------+------------+
Query OK, 1 row affected (0.03 sec)
Rows matched: 1  Changed: 1  Warnings: 0
Query OK, 1 row affected (0.02 sec)
Rows matched: 1  Changed: 1  Warnings: 0
Query OK, 1 row affected (0.02 sec)
+-------------+-----------+------------+------+
| zone        | city      | multiplier | note |
+-------------+-----------+------------+------+
| KORAMANGALA | Bengaluru |       1.25 | NULL |
| NEW-TOWN    | Kolkata   |       1.50 | NULL |
| SALT-LAKE   | Kolkata   |       1.75 | NULL |
+-------------+-----------+------------+------+`,
        },
        {
          type: "paragraph",
          text: "The upsert reported 2 (an existing row updated). The keyset query returned only `KORAMANGALA` because it's the only zone that sorts after `NEW-TOWN`. `UPDATE ... ORDER BY multiplier DESC LIMIT 1` changed the single highest zone (`BANDRA`, 2.00 to 1.00), and the `DELETE ... LIMIT 100` then removed it: `LIMIT` on a write is a cap on rows, which is what batched purges use.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: a rider's trip history API with keyset paging",
        },
        {
          type: "paragraph",
          text: "The rider app shows trips newest first, 5 per screen here (20 in real life). Two trips can share a `requested_at`, so the cursor is `(requested_at, id)` from the last row the app showed. Page 1 ended at trip 404839, requested `2026-05-21 13:39:30`:",
        },
        {
          type: "code",
          language: "sql",
          title: "history-page.sql",
          code: `SELECT id, requested_at, fare_paise FROM trip_history
WHERE rider_id = 42
  AND (requested_at < '2026-05-21 13:39:30'
       OR (requested_at = '2026-05-21 13:39:30' AND id < 404839))
ORDER BY requested_at DESC, id DESC
LIMIT 5;`,
        },
        {
          type: "output",
          text: `+--------+---------------------+------------+
| id     | requested_at        | fare_paise |
+--------+---------------------+------------+
| 384839 | 2026-05-14 14:59:30 |      13000 |
| 364839 | 2026-05-07 16:19:30 |      13000 |
| 344839 | 2026-04-30 17:39:30 |      13000 |
| 324839 | 2026-04-23 18:59:30 |      13000 |
| 304839 | 2026-04-16 20:19:30 |      13000 |
+--------+---------------------+------------+`,
        },
        {
          type: "paragraph",
          text: "The two ways to write the cursor condition, as `EXPLAIN ANALYZE` saw them:",
        },
        {
          type: "output",
          text: `-- expanded: requested_at < ? OR (requested_at = ? AND id < ?)
-> Limit: 5 row(s)  (cost=9.96 rows=5) (actual time=0.102..0.105 rows=5 loops=1)
    -> Index range scan on trip_history using idx_rider_time over (rider_id = 42 AND requested_at < '2026-05-21 13:39:30') OR (rider_id = 42 AND requested_at = '2026-05-21 13:39:30' AND id < 404839) (reverse), with index condition: (...)  (cost=9.96 rows=21) (actual time=0.102..0.103 rows=5 loops=1)

-- row constructor: (requested_at, id) < (?, ?)
-> Limit: 5 row(s)  (cost=8.75 rows=5) (actual time=0.0969..0.0986 rows=5 loops=1)
    -> Filter: ((trip_history.requested_at,trip_history.id) < ('2026-05-21 13:39:30',404839))  (cost=8.75 rows=25) (actual time=0.0962..0.0976 rows=5 loops=1)
        -> Index lookup on trip_history using idx_rider_time (rider_id=42) (reverse)  (cost=8.75 rows=25) (actual time=0.091..0.0935 rows=10 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**The expanded form became an index range that starts at the cursor** and read exactly 5 entries, backwards (`reverse`), with no sort.",
            "**The row constructor `(requested_at, id) < (?, ?)` is shorter but wasn't used to start the range** on 8.0.45: MySQL read the rider's entries from the newest and filtered, 10 entries for 5 rows here. For a rider with 3,000 trips on page 50 that's thousands of entries per page again. Write the expanded `OR` form, and check with `EXPLAIN` on your version.",
            "The index `(rider_id, requested_at)` is what makes both the filter and the order free; the indexing lessons later in the track explain why the primary key at the end of every secondary index lets `id` act as the final tie-breaker.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: a driver earnings rollup with a JDBC batch upsert",
        },
        {
          type: "paragraph",
          text: "Combining two pieces from this lesson: an accumulating `ON DUPLICATE KEY UPDATE` (safe under concurrency because the read and the write happen in one statement under the row lock) sent as a JDBC batch. 2,000 completed trips for 6 drivers on one day, with and without the rewrite:",
        },
        {
          type: "code",
          language: "java",
          title: "EarningsRollup.java",
          code: `import java.sql.*;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.stream.Collectors;

public class EarningsRollup {
    static final String URL = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";

    record CompletedTrip(long driverId, LocalDate day, long farePaise) { }

    static void rollup(String urlExtra) throws SQLException {
        try (Connection conn = DriverManager.getConnection(URL + urlExtra)) {
            try (Statement s = conn.createStatement()) { s.execute("DELETE FROM driver_daily_earnings WHERE day = '2026-11-05'"); }
            String sql = """
                INSERT INTO driver_daily_earnings (driver_id, day, trips, earnings_paise) VALUES (?, ?, 1, ?) AS new
                ON DUPLICATE KEY UPDATE trips = driver_daily_earnings.trips + 1,
                                        earnings_paise = driver_daily_earnings.earnings_paise + new.earnings_paise""";
            conn.setAutoCommit(false);
            int[] counts;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                for (int i = 0; i < 2_000; i++) {                       // 2,000 trips for 6 drivers on one day
                    CompletedTrip t = new CompletedTrip(1 + i % 6, LocalDate.of(2026, 11, 5), 10_000 + i % 40 * 1000);
                    ps.setLong(1, t.driverId());
                    ps.setObject(2, t.day());
                    ps.setLong(3, t.farePaise());
                    ps.addBatch();
                }
                counts = ps.executeBatch();
            }
            conn.commit();
            String summary = Arrays.stream(counts).boxed()
                    .collect(Collectors.groupingBy(c -> c, java.util.TreeMap::new, Collectors.counting())).toString();
            try (Statement s = conn.createStatement();
                 ResultSet rs = s.executeQuery("""
                     SELECT (SELECT COUNT_STAR FROM performance_schema.events_statements_summary_by_thread_by_event_name
                             WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME = 'statement/sql/insert'),
                            SUM(trips), SUM(earnings_paise) FROM driver_daily_earnings WHERE day = '2026-11-05'""")) {
                rs.next();
                System.out.printf("%-34s INSERT statements=%,d  executeBatch counts {value=how many}: %s  trips=%d  paise=%,d%n",
                        urlExtra.isEmpty() ? "(defaults)" : urlExtra, rs.getLong(1), summary, rs.getLong(2), rs.getLong(3));
            }
        }
    }

    public static void main(String[] args) throws SQLException {
        rollup("");
        rollup("&rewriteBatchedStatements=true");
    }
}`,
        },
        {
          type: "output",
          text: `(defaults)                         INSERT statements=2,000  executeBatch counts {value=how many}: {1=6, 2=1994}  trips=2000  paise=59,000,000
&rewriteBatchedStatements=true     INSERT statements=1  executeBatch counts {value=how many}: {-2=2000}  trips=2000  paise=59,000,000`,
        },
        {
          type: "list",
          items: [
            "**The rewrite works for upserts too: 2,000 rows went as 1 statement** instead of 2,000, and the totals were identical (2,000 trips, 59,000,000 paise), so every `+ 1` was applied even when the same driver appeared many times in one multi-row statement.",
            "**Don't read the per-row counts as results.** Without the rewrite they were 1 for each driver's first trip (6 inserts) and 2 for the other 1,994 (updates). With the rewrite every element was `-2`, `Statement.SUCCESS_NO_INFO`: the driver can't split one statement's count back into rows. Code that sums `executeBatch()` to report \"rows inserted\" breaks the day someone adds the URL option. Count from the data if the number matters.",
            "Batch size matters less than batching itself: when I cut `BatchInsert` to batches of 100 with the rewrite on, the server received 1,000 statements for 100,000 rows and the run took 2,285 ms (43,764 rows per second), close to the 1,000-row batches.",
          ],
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
            ["Rows with no value in a column", "`IS NULL` / `IS NOT NULL`, `<=>`", "`= NULL`, `<> NULL`"],
            ["Rows with no match in another table", "`NOT EXISTS` (or an anti join)", "`NOT IN (subquery)` on a nullable column"],
            ["A time window", "`>= start AND < end`", "`BETWEEN` on `DATETIME`"],
            ["Paging a big or growing list", "Keyset: `WHERE (key) after cursor ORDER BY key, id LIMIT n`", "Deep `OFFSET`; `ORDER BY` without a unique last column"],
            ["Bulk insert from Java", "`addBatch` + `rewriteBatchedStatements=true`, one transaction per few thousand rows", "One statement and one commit per row"],
            ["Insert or update by unique key", "`INSERT ... AS new ON DUPLICATE KEY UPDATE`", "`REPLACE` (new id, cascades); read-then-write in Java"],
            ["Insert if absent", "`ON DUPLICATE KEY UPDATE id = id`", "`INSERT IGNORE` (hides truncation and `NULL` errors)"],
            ["Delete many rows from a live table", "Primary-key range chunks, or `ORDER BY indexed_col LIMIT n` loops", "One huge `DELETE`; `ORDER BY id LIMIT` with an unindexed filter"],
            ["Empty a staging table", "`TRUNCATE`", "`TRUNCATE` on anything with foreign keys or in a transaction"],
            ["Keep deleted rows for history", "`deleted_at` + view + unique key on a generated `live` column", "Soft delete with a plain unique key"],
            ["Values from users", "`PreparedStatement` parameters; whitelist identifiers", "String concatenation; `allowMultiQueries=true`"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        { type: "heading", text: "Comparing with NULL using = or <>" },
        {
          type: "paragraph",
          text: "`fare_paise = NULL` returned an empty set even though three fares were `NULL`, and a condition and its negation together covered 7 of 10 trips. Use `IS NULL`, and when you split data by a condition, decide explicitly where `NULL` goes.",
        },
        { type: "heading", text: "NOT IN over a nullable subquery" },
        {
          type: "paragraph",
          text: "One trip without a driver made \"drivers with no trips\" return nobody. It works in testing and breaks when the first `NULL` arrives. Use `NOT EXISTS`.",
        },
        { type: "heading", text: "Mixing AND and OR without parentheses" },
        {
          type: "paragraph",
          text: "`city = 'Kolkata' AND status = 'COMPLETED' OR status = 'CANCELLED'` let a Bengaluru trip into a Kolkata report. Parenthesise every `OR` that sits next to an `AND`, or use `IN`.",
        },
        { type: "heading", text: "BETWEEN with dates on a DATETIME column" },
        {
          type: "paragraph",
          text: "`BETWEEN '2026-11-01' AND '2026-11-02'` stopped at midnight on the 2nd and lost three trips. Use a half-open range.",
        },
        { type: "heading", text: "Paging on a non-unique ORDER BY" },
        {
          type: "paragraph",
          text: "Sorting by fare alone, page 2 repeated page 1 exactly, and 625 pages repeated 1,304 rows and never showed 1,304 others. End every paged `ORDER BY` with the primary key.",
        },
        { type: "heading", text: "Deep OFFSET on large tables" },
        {
          type: "paragraph",
          text: "`OFFSET 499,980` examined 500,000 rows for 20. A job that pages through a table with `OFFSET` does quadratic work and, as the production story shows, skips rows when earlier rows are deleted. Use keyset paging.",
        },
        { type: "heading", text: "Expecting executeBatch to batch" },
        {
          type: "paragraph",
          text: "Without `rewriteBatchedStatements=true`, 100,000 batched rows were still 100,000 statements on the server. Check `performance_schema` statement counts rather than trusting the API name.",
        },
        { type: "heading", text: "Using REPLACE or INSERT IGNORE as an upsert" },
        {
          type: "paragraph",
          text: "`REPLACE` gave Kabir a new id and deleted his devices through a cascade; on a rider with trips it failed. `INSERT IGNORE` stored a truncated name and an empty city with only warnings. Use `ON DUPLICATE KEY UPDATE`.",
        },
        { type: "heading", text: "Checking affected rows without knowing what they mean" },
        {
          type: "paragraph",
          text: "An upsert returns 2 for an update; Connector/J returns matched rows (4) for an `UPDATE` that changed nothing unless `useAffectedRows=true`. Code that treats `!= 1` as failure, or uses the count to decide whether to send a notification, misbehaves silently.",
        },
        { type: "heading", text: "Relying on SET order in a multi-column UPDATE" },
        {
          type: "paragraph",
          text: "`SET surge = 1.00, fare_paise = fare_paise / surge` divided by the new surge in MySQL. Order assignments deliberately or compute from the old values explicitly.",
        },
        { type: "heading", text: "One big DELETE on a live table" },
        {
          type: "paragraph",
          text: "A purge of 16,991 rows locked 501,719 and blocked unrelated refunds until it committed. Chunk by primary key, commit per chunk, and make sure each chunk's scan is bounded by an index.",
        },
        { type: "heading", text: "Building SQL with string concatenation" },
        {
          type: "paragraph",
          text: "`' OR '1'='1` returned every rider and a `UNION` returned the drivers table through a phone search. Bind values with `PreparedStatement`; never concatenate input, and whitelist any identifier (sort column, direction) you must insert.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Name the columns you need instead of `SELECT *`: less data over the wire, and it lets the optimizer use covering indexes (the index lessons measure this).",
            "Write time filters as half-open ranges, and keep the filtered column bare (`requested_at >= ?`, not `DATE(requested_at) = ?`) so an index can be used.",
            "Make every `ORDER BY` that feeds a `LIMIT` deterministic by ending it with the primary key, and page with keyset cursors wherever users or jobs go past the first few pages.",
            "Watch `ROWS_EXAMINED` against `ROWS_SENT` in `performance_schema.events_statements_summary_by_digest` for every endpoint that matters; a ratio in the thousands is a query to fix.",
            "Turn on `rewriteBatchedStatements=true` in the JDBC URL, batch inserts in groups of a few hundred to a few thousand rows, and commit per batch rather than per row or per million rows.",
            "Use `INSERT ... AS new ON DUPLICATE KEY UPDATE` for upserts and accumulate with expressions in the statement instead of read-modify-write in Java.",
            "Decide once, per application, whether you want affected or found rows (`useAffectedRows`), and document it next to the code that reads update counts.",
            "Run destructive statements as a `SELECT` with the same `WHERE` first; use `--safe-updates` in interactive sessions against production.",
            "Purge in primary-key chunks with a pause between chunks, from a job that can stop and resume from the last chunk.",
            "Keep `allowMultiQueries` off, use `PreparedStatement` everywhere, and give the application's database user only the privileges it needs, so an injection can't reach other tables.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The measurements from this lesson in one place. All on one 8-core machine shared with other containers, so absolute times varied between runs (ranges given where I ran more than once); the row counts and statement counts didn't vary.",
        },
        {
          type: "table",
          headers: ["Operation", "Rows examined", "Time", "Notes"],
          rows: [
            ["`LIMIT 20 OFFSET 0`, by id", "20", "0.2 ms", "Primary-key index walk"],
            ["`LIMIT 20 OFFSET 499,980`, by id", "500,000", "240 to 461 ms", "Rows read then discarded"],
            ["Same page by keyset `id > 499980`", "20", "0.17 to 0.28 ms", "One index seek"],
            ["Export of 500,000 rows, 1,000 per page by `OFFSET`", "125,750,001", "32.4 to 49.5 s", "Quadratic"],
            ["Same export by keyset", "500,001", "1.2 to 1.5 s", "Linear"],
            ["`LIKE '9807919%'` on an indexed phone", "3", "1 ms", "Index range"],
            ["`LIKE '%7919000'`", "200,000", "67 ms", "Full scan"],
            ["`DISTINCT city` on 500,000 rows", "500,000", "281 to 349 ms", "Temporary table with a unique key"],
            ["100,000 inserts, one commit each (measured on 10,000)", "-", "42 to 109 rows/s", "Durable commit per row"],
            ["100,000 inserts, one transaction, one statement per row", "-", "2,605 to 6,455 rows/s", "Round trip per row"],
            ["100,000 inserts, `addBatch` without rewrite", "-", "5,205 to 5,914 rows/s", "Still 100,000 statements"],
            ["100,000 inserts, `addBatch` with rewrite", "-", "47,710 to 63,939 rows/s", "100 statements"],
            ["`DELETE` 500,000 rows / `TRUNCATE`", "500,000 / -", "9.8 s / 0.44 s", "`TRUNCATE` is DDL"],
          ],
        },
        {
          type: "paragraph",
          text: "Two rules of thumb fall out of it. Reading a row you then throw away costs about the same as reading a row you keep, so the gap between rows examined and rows sent is the waste to look for. And for writes, the unit of cost is the commit and the statement, not the row: the same 100,000 rows cost anywhere from 2 seconds to (extrapolating from 10,000) around 20 to 40 minutes depending only on how they were grouped.",
        },
      ],
    },
    {
      title: "CRUD Queries in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend pays drivers weekly. A settlement job exports every trip to the payments provider, 1,000 rows per request, and was written the obvious way: `ORDER BY id LIMIT 1000 OFFSET page * 1000`, with the page number stored so the job can resume. It started taking longer every week, which the team put down to growth. Then drivers started reporting missing trips in their payouts, and the missing trips were always from the oldest part of the table. The same night, a separate job purges old cancelled trips. I rebuilt both effects on the 500,000-trip table. First, the cost:",
        },
        {
          type: "code",
          language: "java",
          title: "TripExport.java",
          code: `import java.sql.*;

public class TripExport {
    static final String URL = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";
    static final int PAGE = 1000;

    static long rowsExamined(Connection c) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("""
                SELECT SUM_ROWS_EXAMINED FROM performance_schema.events_statements_summary_by_thread_by_event_name
                WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME = 'statement/sql/select'""")) {
            rs.next();
            return rs.getLong(1);
        }
    }

    // What the settlement export did: page number from the job's cursor, OFFSET = page * size
    static void offsetExport(Connection c) throws SQLException {
        long t0 = System.nanoTime(), exported = 0, sum = 0;
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT id, driver_id, fare_paise FROM trip_history ORDER BY id LIMIT ? OFFSET ?")) {
            for (int page = 0; ; page++) {
                long p0 = System.nanoTime();
                ps.setInt(1, PAGE);
                ps.setInt(2, page * PAGE);
                int n = 0;
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) { n++; sum += rs.getInt(3); }
                }
                if (page == 0 || page == 100 || page == 250 || page == 499)
                    System.out.printf("  OFFSET %,7d  page took %,4d ms%n", page * PAGE, (System.nanoTime() - p0) / 1_000_000);
                if (n == 0) break;
                exported += n;
            }
        }
        System.out.printf("LIMIT/OFFSET export: %,d rows in %,d ms, rows examined %,d (fare sum %,d)%n",
                exported, (System.nanoTime() - t0) / 1_000_000, rowsExamined(c), sum);
    }

    static void keysetExport(Connection c) throws SQLException {
        long t0 = System.nanoTime(), exported = 0, sum = 0, lastId = 0;
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT id, driver_id, fare_paise FROM trip_history WHERE id > ? ORDER BY id LIMIT ?")) {
            for (int page = 0; ; page++) {
                long p0 = System.nanoTime();
                ps.setLong(1, lastId);
                ps.setInt(2, PAGE);
                int n = 0;
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) { n++; lastId = rs.getLong(1); sum += rs.getInt(3); }
                }
                if (page == 0 || page == 100 || page == 250 || page == 499)
                    System.out.printf("  after id %,7d  page took %,4d ms%n", lastId - n, (System.nanoTime() - p0) / 1_000_000);
                if (n == 0) break;
                exported += n;
            }
        }
        System.out.printf("keyset export:       %,d rows in %,d ms, rows examined %,d (fare sum %,d)%n",
                exported, (System.nanoTime() - t0) / 1_000_000, rowsExamined(c), sum);
    }

    public static void main(String[] args) throws SQLException {
        try (Connection c = DriverManager.getConnection(URL)) { offsetExport(c); }
        try (Connection c = DriverManager.getConnection(URL)) { keysetExport(c); }
    }
}`,
        },
        {
          type: "output",
          text: `  OFFSET       0  page took   53 ms
  OFFSET 100,000  page took   40 ms
  OFFSET 250,000  page took   53 ms
  OFFSET 499,000  page took  137 ms
LIMIT/OFFSET export: 500,000 rows in 32,409 ms, rows examined 125,750,001 (fare sum 14,750,000,000)
  after id       0  page took    9 ms
  after id 100,000  page took    2 ms
  after id 250,000  page took    1 ms
  after id 499,000  page took    1 ms
keyset export:       500,000 rows in 1,171 ms, rows examined 500,001 (fare sum 14,750,000,000)`,
        },
        {
          type: "paragraph",
          text: "Then the missing trips: the same export, with the purge of old cancelled trips running when the export reaches page 200, on a fresh copy of the table each time:",
        },
        {
          type: "code",
          language: "java",
          title: "ExportDuringPurge.java",
          code: `import java.sql.*;
import java.util.HashSet;
import java.util.Set;

public class ExportDuringPurge {
    static final String URL = "jdbc:mysql://127.0.0.1:33306/mysql_crud_queries?user=root&password=lesson";

    static void reset() throws SQLException {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) {
            s.execute("DROP TABLE IF EXISTS purge_demo");
            s.execute("CREATE TABLE purge_demo LIKE trip_history");
            s.execute("INSERT INTO purge_demo SELECT * FROM trip_history");
        }
    }

    static void purgeOldCancelled() throws SQLException {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) {
            int n = s.executeUpdate("DELETE FROM purge_demo WHERE status = 'CANCELLED' AND requested_at < '2026-03-01'");
            System.out.println("  (purge job deleted " + n + " old cancelled trips while the export was at page 200)");
        }
    }

    static void export(boolean keyset) throws SQLException {
        reset();
        Set<Long> exported = new HashSet<>();
        String sql = keyset
                ? "SELECT id FROM purge_demo WHERE id > ? ORDER BY id LIMIT 1000"
                : "SELECT id FROM purge_demo ORDER BY id LIMIT 1000 OFFSET ?";
        try (Connection c = DriverManager.getConnection(URL); PreparedStatement ps = c.prepareStatement(sql)) {
            long cursor = 0;
            for (int page = 0; ; page++) {
                if (page == 200) purgeOldCancelled();
                ps.setLong(1, keyset ? cursor : (long) page * 1000);
                int n = 0;
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) { n++; exported.add(rs.getLong(1)); cursor = rs.getLong(1); }
                }
                if (n == 0) break;
            }
            long missed = 0, completedMissed = 0;
            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("SELECT id, status FROM purge_demo")) {
                while (rs.next()) {
                    if (!exported.contains(rs.getLong(1))) {
                        missed++;
                        if (rs.getString(2).equals("COMPLETED")) completedMissed++;
                    }
                }
            }
            System.out.printf("%-14s exported=%,d  trips still in the table but never exported=%,d (COMPLETED: %,d)%n",
                    keyset ? "keyset" : "LIMIT/OFFSET", exported.size(), missed, completedMissed);
        }
    }

    public static void main(String[] args) throws SQLException {
        export(false);
        export(true);
    }
}`,
        },
        {
          type: "output",
          text: `  (purge job deleted 16991 old cancelled trips while the export was at page 200)
LIMIT/OFFSET   exported=483,009  trips still in the table but never exported=16,991 (COMPLETED: 15,292)
  (purge job deleted 16991 old cancelled trips while the export was at page 200)
keyset         exported=500,000  trips still in the table but never exported=0 (COMPLETED: 0)`,
        },
        {
          type: "list",
          items: [
            "**The `OFFSET` export examined 125,750,001 rows to send 500,000**: page `k` reads `k * 1000` rows first, so the total is about n²/2000. It took 32.4 s here (49.5 s in an earlier run) against 1.2 to 1.5 s for keyset, and the gap grows with the square of the table size. That's the \"slower every week\" part, and the deep pages also hold a connection and CPU while the payments API waits.",
            "**16,991 trips were never exported, 15,292 of them completed trips that drivers had to be paid for.** When the purge deleted 16,991 rows **before** the export's position, every later `OFFSET` pointed 16,991 rows further into the table than intended, so that many rows slid past the window unseen. The export didn't fail and didn't log anything; its row count was simply short. Which rows went missing depends on timing, which is why the drivers' reports looked random.",
            "**Keyset paging exported all 500,000** (the 16,991 deleted ones had been exported before they were deleted). The cursor is a value, `id > last`, not a position, so deletions and insertions elsewhere can't shift it. It's also what the job should persist to resume: the last id, not a page number.",
            "**What I'd check first in a similar incident**: compare the exported count with `SELECT COUNT(*)` for the same filter at the same snapshot, look for any other job that deletes or inserts in the exported range, and look at `rows_examined` for the export query in `events_statements_summary_by_digest`: a value that grows with the page number is `OFFSET`.",
            "**What prevents it next time**: keyset pagination by primary key for every batch job, a reconciliation step that compares counts and sums (the fare sum was identical for both methods here only because nothing was deleted in those runs), and a rule that destructive maintenance jobs don't overlap with exports, or that exports read from one consistent snapshot (`START TRANSACTION WITH CONSISTENT SNAPSHOT` on one connection, which the transactions lessons cover).",
          ],
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        { type: "heading", text: "Beginner" },
        {
          type: "qa",
          items: [
            {
              question: "In what order does MySQL logically evaluate the clauses of a SELECT?",
              answer:
                "`FROM` (and joins), `WHERE`, `GROUP BY`, `HAVING`, the `SELECT` list (then `DISTINCT`), `ORDER BY`, `LIMIT`. That's why an alias defined in the `SELECT` list fails in `WHERE` (error 1054, Unknown column) but works in `ORDER BY`. MySQL also allows aliases in `HAVING` and `GROUP BY` as an extension. `EXPLAIN ANALYZE` shows the same order bottom-up: in my run, 500,000 rows scanned, 450,000 kept by `WHERE`, 4 groups, 2 kept by `HAVING`, sorted, 1 returned.",
            },
            {
              question: "Why does WHERE col = NULL return no rows, and what should you write instead?",
              answer:
                "Any comparison with `NULL` is `NULL` (unknown), and `WHERE` keeps only rows where the condition is true. So `= NULL` matches nothing, even rows that are `NULL`. Use `IS NULL` / `IS NOT NULL`, or MySQL's null-safe `<=>`, which returns 1 or 0.",
            },
            {
              question: "What's the difference between DELETE and TRUNCATE?",
              answer:
                "`DELETE` is DML: it removes rows one by one, can have a `WHERE`, writes undo and redo for each row, fires triggers, can be rolled back and keeps `AUTO_INCREMENT`. `TRUNCATE` is DDL: it recreates the table, commits implicitly (my `ROLLBACK` after it restored nothing), resets `AUTO_INCREMENT`, and is refused on a table referenced by a foreign key (error 1701). On 500,000 rows I measured 9.8 s against 0.44 s.",
            },
            {
              question: "Is BETWEEN inclusive? What goes wrong with dates?",
              answer:
                "Inclusive at both ends. On a `DATETIME`, `BETWEEN '2026-11-01' AND '2026-11-02'` means up to `2026-11-02 00:00:00`, so it includes a trip at exactly midnight and misses the rest of the 2nd (three trips in my data). Use `>= '2026-11-01' AND < '2026-11-03'`.",
            },
            {
              question: "Why should you use PreparedStatement instead of building SQL strings?",
              answer:
                "Concatenated input can change the statement: in my demo `' OR '1'='1` returned all riders and a `UNION` returned the drivers table from a phone search. With parameters the input is always a value: every attack returned 0 rows. It also lets the driver or server reuse the parsed statement. Identifiers like a sort column can't be parameters, so whitelist those.",
            },
          ],
        },
        { type: "heading", text: "Intermediate" },
        {
          type: "qa",
          items: [
            {
              question: "Why can NOT IN with a subquery return no rows at all?",
              answer:
                "If the subquery returns a `NULL`, `x NOT IN (a, b, NULL)` is `x <> a AND x <> b AND x <> NULL`, and the last term is unknown, so the result is never true. In my data a single requested trip without a driver made \"drivers with no trips\" empty. `NOT EXISTS` treats the `NULL` as simply not matching and returned the right driver.",
            },
            {
              question: "Why is LIMIT with a large OFFSET slow, and what's the alternative?",
              answer:
                "The server must produce and discard all the skipped rows: `OFFSET 499980 LIMIT 20` examined 500,000 rows (240 to 461 ms) and `Handler_read_next` counted every one. Keyset pagination remembers the last sort key and asks for `WHERE id > :last ORDER BY id LIMIT 20`: 20 rows, 0.17 ms, the same at any depth. With a non-unique sort key, use the key plus the primary key as the cursor and write the condition in expanded `OR` form so it becomes an index range.",
            },
            {
              question: "What do the affected-row values 1, 2 and 0 mean for INSERT ... ON DUPLICATE KEY UPDATE?",
              answer:
                "1: a new row was inserted. 2: an existing row was updated. 0: an existing row was found and the update set the same values. With Connector/J's default `CLIENT_FOUND_ROWS`, the 0 case is reported as 1; with `useAffectedRows=true` it's 0 (I measured both).",
            },
            {
              question: "What does rewriteBatchedStatements do and how much does it matter?",
              answer:
                "It makes Connector/J rewrite a batch of `INSERT`s into multi-row `INSERT ... VALUES (...),(...)` statements. Without it, `executeBatch()` still sent 100,000 statements for 100,000 rows; with it, 100 statements, and throughput went from about 5,200 to 5,900 rows per second to 47,700 to 63,900. The bigger win is relative to one commit per row: 42 to 109 rows per second.",
            },
            {
              question: "How is REPLACE different from INSERT ... ON DUPLICATE KEY UPDATE?",
              answer:
                "`REPLACE` deletes the conflicting row and inserts a new one: the row gets a new `AUTO_INCREMENT` id (rider 7 became 11), `ON DELETE CASCADE` children are deleted (his two devices vanished), and a foreign key without cascade makes it fail (1451). It reports 2 rows. `ON DUPLICATE KEY UPDATE` changes the existing row in place and keeps its id and children.",
            },
            {
              question: "What does INSERT IGNORE ignore?",
              answer:
                "Every error that can be downgraded to a warning, not just duplicate keys. In my run it also truncated a 66-character name to 60 and stored an empty string for a `NULL` city in a `NOT NULL` column, with only three warnings. Strict mode doesn't help once `IGNORE` is used. For \"insert if absent\" use `ON DUPLICATE KEY UPDATE id = id`.",
            },
          ],
        },
        { type: "heading", text: "Advanced" },
        {
          type: "qa",
          items: [
            {
              question: "Why can two pages of ORDER BY ... LIMIT return the same rows?",
              answer:
                "Rows that tie on every `ORDER BY` column have no defined order, and MySQL's filesort with `LIMIT` uses a priority queue of `offset + limit` rows (the optimizer trace showed `\"limit\": 40, \"chosen\": true` for page 2). Different heap sizes leave ties in different orders. In my data page 2 returned exactly page 1's 20 trips, and over 625 pages 1,304 rows repeated and 1,304 were never shown. Ending the `ORDER BY` with the primary key made both zero.",
            },
            {
              question: "How do you see how many rows a query examined versus returned?",
              answer:
                "`performance_schema.events_statements_history` (per statement, `ROWS_EXAMINED`, `ROWS_SENT`, `SORT_ROWS`, `SELECT_SCAN`, `NO_INDEX_USED`, `CREATED_TMP_TABLES`, `TIMER_WAIT`), filtered by `THREAD_ID = PS_CURRENT_THREAD_ID()`; `events_statements_summary_by_digest` for aggregates across all executions; the session `Handler_read_*` counters after `FLUSH STATUS` for how the engine was called (`read_next` for index walks, `read_rnd_next` for table scans); `EXPLAIN ANALYZE` for actual rows per iterator; and the slow query log's `Rows_examined`.",
            },
            {
              question: "Why did a DELETE of 17,000 rows lock 500,000 rows?",
              answer:
                "In `REPEATABLE READ` InnoDB locks every row it examines while searching (next-key locks: the record and the gap before it), not only rows that match, and holds them until commit. With no index on the filter, the `DELETE` scanned the whole clustered index: `trx_rows_locked` was 501,719 and `data_locks` showed 501,719 `X` record locks for 16,991 deletes. A primary-key range of 10,000 ids locked 10,034. Bound the scan with an index and commit in chunks. (`READ COMMITTED` releases locks on non-matching rows early, which the isolation lessons cover.)",
            },
            {
              question: "Why is a batched purge with ORDER BY id LIMIT 1000 sometimes worse than one big DELETE?",
              answer:
                "If the filter isn't indexed, each batch scans from the start of the primary key to find its next 1,000 matches, re-examining and re-locking every surviving row in front of them. My loop examined 2,207,009 rows (four times the table) and caused 16 to 25 lock waits against 1 for the single statement. Batching only helps when the scan for each batch is bounded: primary-key range chunks examined 170,000 rows and the slowest concurrent refund took 29 to 70 ms.",
            },
            {
              question: "In what order are SET assignments applied in a MySQL UPDATE?",
              answer:
                "Left to right for single-table `UPDATE`, and later expressions see the new values of earlier columns. `SET surge = 1.00, fare_paise = fare_paise / surge` divided by 1.00 and left the fare unchanged; swapping the order halved a 2.00-surge fare correctly. Standard SQL evaluates all right-hand sides against the old row; multi-table `UPDATE` in MySQL doesn't guarantee an order at all.",
            },
          ],
        },
        { type: "heading", text: "Scenario-Based" },
        {
          type: "qa",
          items: [
            {
              question: "Users of the trip history screen report seeing the same trip twice while scrolling, and some trips never appear. The endpoint uses ORDER BY fare_paise DESC LIMIT 20 OFFSET ?. What's wrong and how do you fix it?",
              answer:
                "The sort key isn't unique, so ties are returned in an order that can change between page sizes and offsets (the filesort keeps a heap of offset + limit rows). I reproduced page 2 returning exactly page 1, and 1,304 duplicates and 1,304 missing rows over 625 pages. Fix: add the primary key as the last sort column (zero duplicates in my run) and switch to keyset paging with a `(fare_paise, id)` cursor, which also removes the deep-offset cost and the shifting caused by new trips arriving while the user scrolls.",
            },
            {
              question: "A nightly settlement export got slower every week and some drivers' trips are missing from payouts, always old ones. Another job purges old cancelled trips the same night. What happened?",
              answer:
                "The export pages with `LIMIT/OFFSET`. Cost: page `k` reads `k * pageSize` rows, so the total is quadratic (125,750,001 rows examined for 500,000 in my rebuild, 32 s against 1.2 s by keyset). Missing rows: when the purge deleted rows before the export's position, every later offset pointed further into the table, and 16,991 trips (15,292 completed) slid past unseen. Fix: keyset paging on `id`, persist the last id for resume, reconcile counts and sums after the export, and don't run destructive jobs against the range being exported (or export from one consistent snapshot). Then re-export the affected week and pay the drivers.",
            },
            {
              question: "During a data cleanup, the payment-refund API starts timing out with lock wait timeouts, though the cleanup only deletes cancelled trips. How do you diagnose and fix it?",
              answer:
                "Look at `information_schema.innodb_trx` (a transaction with a huge `trx_rows_locked` against a small `trx_rows_modified`), `performance_schema.data_locks` / `data_lock_waits` for who blocks whom, and the cleanup's statement. A `DELETE` whose filter has no index scans and locks the whole table in `REPEATABLE READ`: I counted 501,719 locks for 16,991 deletes, and concurrent refunds on unrelated rows waited up to 3.7 s. Kill or let the statement finish, then rewrite the cleanup as primary-key range chunks committed one by one (slowest refund 29 to 70 ms), or add an index on the filter and use `ORDER BY indexed_col LIMIT n` batches.",
            },
            {
              question: "A bulk import of 2 million rider records through Spring takes hours. Each record goes through repository.save(). What would you change?",
              answer:
                "Per-row statements and probably per-row commits: I measured 42 to 109 rows per second with a commit per row. Wrap chunks in one transaction, use `JdbcTemplate.batchUpdate` (Hibernate doesn't batch inserts for `IDENTITY` ids), and add `rewriteBatchedStatements=true` to the JDBC URL so batches become multi-row inserts: 100,000 rows went from 100,000 statements to 100, at about 48,000 to 64,000 rows per second. Confirm with `performance_schema` statement counts that the rewrite is happening.",
            },
            {
              question: "After a refactor from INSERT ... ON DUPLICATE KEY UPDATE to REPLACE INTO for rider profiles, push notifications stop reaching some riders and a few riders' URLs return 404. Why?",
              answer:
                "`REPLACE` is delete plus insert. The rider row got a new `AUTO_INCREMENT` id (so anything holding the old id, like cached URLs, now points at nothing), and the delete fired `ON DELETE CASCADE` on the devices table, removing push tokens: in my test both of Kabir's devices disappeared with no error. For riders with trips, the foreign key without cascade made `REPLACE` fail entirely. Revert to `ON DUPLICATE KEY UPDATE`, restore devices from backup or re-registration, and add a test that checks the id and child rows survive an upsert.",
            },
            {
              question: "A status-update endpoint sends a \"your trip has started\" push only if executeUpdate() returns 1. Riders get duplicate pushes when the driver app retries. Why?",
              answer:
                "Connector/J reports found (matched) rows by default, so a retried `UPDATE trips SET status = 'ONGOING' WHERE id = ?` that changes nothing still returns 1. In my test the repeated update returned 4 for 4 matched rows with the default and 0 with `useAffectedRows=true`. Either set `useAffectedRows=true` (checking other code that reads counts), or make the transition explicit: `WHERE id = ? AND status = 'ACCEPTED'`, which matches 0 rows on a retry under either setting.",
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
            "Run `SELECT 2 IN (1, NULL), 2 NOT IN (1, NULL), NULL IN (1, 2), NULL IN (NULL);` and predict each result first.",
            "Run `SELECT id FROM trips ORDER BY id FETCH FIRST 2 ROWS ONLY;`, the SQL standard's paging syntax, on MySQL 8.0.",
            "Swap the assignments in the surge fix: `UPDATE trips SET fare_paise = fare_paise / surge, surge = 1.00 WHERE id = 5;` (trip 5: 52,000 paise at surge 2.00).",
            "Re-run `pages.sql` with `ORDER BY fare_paise, id` in both subqueries and compare the two id lists.",
            "Change `BatchInsert` to batches of 100 with `rewriteBatchedStatements=true` and read the `INSERT statements` count.",
            "Run the same `ON DUPLICATE KEY UPDATE` twice in the `mysql` client with identical values, then twice from JDBC with and without `useAffectedRows=true`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `NULL` four times: `2 IN (1, NULL)` isn't false, it's unknown, because 2 might equal the unknown value. Step 2 fails with `ERROR 1064 ... near 'FETCH FIRST 2 ROWS ONLY'`: MySQL only has `LIMIT`. Step 3 gives 26,000 paise and surge 1.00, the intended correction, because the division now sees the old surge. Step 4 gives two disjoint lists in ascending order (page 1 starts `639,879,1119,...`, page 2 starts `8279,8519,9279,...`), because a unique tie-breaker makes the order total. Step 5 reports `INSERT statements=1,000` for 100,000 rows; in my run it took 2,285 ms. Step 6 reports 1 then 0 in the client; from JDBC the second call returns 1 by default and 0 with `useAffectedRows=true`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ORDER      FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY -> LIMIT
           alias in WHERE: ERROR 1054; in ORDER BY/HAVING: fine
           AND binds tighter than OR: parenthesise

NULL       = NULL never true; IS NULL / <=>
           NOT IN (..., NULL) -> nothing; use NOT EXISTS
           aggregates skip NULL; NULL sorts first ASC, last DESC

RANGES     BETWEEN is inclusive; dates: >= start AND < next
           LIKE 'abc%' uses an index; LIKE '%abc' scans

PAGING     ORDER BY must end with the PK (ties + LIMIT = repeats)
           OFFSET n examines n + limit rows; keyset: WHERE key > last

INSERT     rewriteBatchedStatements=true: 100,000 rows in 100 stmts
           ON DUPLICATE KEY UPDATE: 1 insert / 2 update / 0 same
           IGNORE hides truncation + NULLs; REPLACE = DELETE + INSERT

UPDATE     server: changed rows; Connector/J: matched (useAffectedRows)
           SET runs left to right; safe updates needs key or LIMIT

DELETE     locks every row scanned: 501,719 locks for 16,991 deletes
           purge in PK-range chunks; TRUNCATE = DDL, no rollback

SAFETY     PreparedStatement for values; whitelist identifiers`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "The four statements are easy to write and easy to get subtly wrong. Almost every trap in this lesson comes from a rule the syntax doesn't show: the logical evaluation order, three-valued logic, undefined order among ties, `OFFSET` as a position rather than a value, write statements that delete or hide errors, and a scan that locks what it reads. `performance_schema`, the `Handler_read_*` counters, `EXPLAIN ANALYZE` and `data_locks` show each of them directly.",
            "On the Java side, the driver settings decide as much as the SQL: `rewriteBatchedStatements` decided whether 100,000 rows were 100 statements or 100,000, `useAffectedRows` decided what an update count means, and `PreparedStatement` decided whether a phone search could read the drivers table.",
            "Next comes Joins: INNER, LEFT, Self and Anti Joins: combining rows from riders, drivers, trips and payments in one query, how MySQL executes a join (nested loops, hash joins), why a join can multiply rows, and the anti join that replaces the `NOT IN` trap from this lesson.",
          ],
        },
      ],
    },
  ],
};
