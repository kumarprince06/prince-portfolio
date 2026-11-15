import type { Lesson } from "../types";

export const mysqlGroupByAndAggregates: Lesson = {
  slug: "mysql-group-by-and-aggregates",
  date: "2026-11-16",
  title: "GROUP BY, HAVING and Aggregate Functions",
  description:
    "Grouping and aggregation in MySQL 8.0.45, measured on 1,000,000 ride-hailing trips: COUNT(*) against COUNT(col) against COUNT(DISTINCT col), an average tip of 2,500 paise that becomes 1,250 once NULLs count as zero, SUM over no rows returning NULL, WHERE against HAVING for one driver (0.5 ms through an index against 2,169 ms aggregating every row first), error 1055 from ONLY_FULL_GROUP_BY and the pre-5.7 behaviour that returned a fare from a different row than the MAX and changed its answer when an index was added, ANY_VALUE and functional dependence on a primary key, a daily report that splits trips 5/3 by UTC day and 2/6 by Indian day, conditional aggregation for pivot reports, WITH ROLLUP and GROUPING() telling a real NULL from a subtotal, GROUP_CONCAT stopping at 1,024 bytes with only warning 1260 and leaving a fragment that is another fleet's trip ID, a join fan-out that doubled a driver's fares, the greatest-n-per-group problem (a MAX join in 44 ms, ROW_NUMBER in 3.0 s, NOT EXISTS in 33.6 s, and a tie that returned 5,001 rows for 5,000 drivers), the engine underneath (Using temporary with 5 Handler_write and 999,995 Handler_update calls, a 198,712-group table that spilled to an InnoDB disk table at 16 MB and ran in 0.87 s at 64 MB, a loose index scan answering MAX per driver with 10,002 key reads in 50 ms, a non-covering tight index scan the optimizer picked that took 3.2 s until a covering index made it 0.26 s, GROUP BY no longer sorting in 8.0), aggregates mapped to a Java record through JDBC where SUM arrives as BigDecimal and getLong turns NULL into 0, and a payout batch in which GROUP_CONCAT truncation dropped 23,841 of 98,780 trip IDs across 500 fleets.",
  tags: ["MySQL", "SQL", "GROUP BY", "Aggregation", "Query Execution"],
  sections: [
    {
      title: "What GROUP BY and Aggregate Functions Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Joins: INNER, LEFT, Self and Anti Joins, ended with rows from several tables lined up side by side: every trip next to its driver and rider. A backend rarely shows those rows one by one. It shows **numbers about them**: trips per driver today, a driver's earnings this week, the cancellation rate per city, the average tip. Those questions all have the same shape: split the rows into groups, then reduce each group to one row of totals. That's what `GROUP BY` and aggregate functions do.",
        },
        {
          type: "paragraph",
          text: "An **aggregate function** takes many values and returns one: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `GROUP_CONCAT` and a few statistical ones. Without `GROUP BY` the whole result is one group, so `SELECT COUNT(*) FROM trips` returns one row. With `GROUP BY driver_id` there is one group, and one output row, per distinct `driver_id`. `HAVING` is a filter that runs **after** grouping, on the groups, while `WHERE` runs before, on the rows. The difference sounds academic until you measure it: on a million trips, the same answer came back in 0.5 ms with `WHERE` and 2.2 seconds with `HAVING`.",
        },
        {
          type: "paragraph",
          text: "Grouping is also where SQL quietly gives wrong answers. Aggregates skip `NULL`s, so an average can be twice what finance expects. A non-grouped column in `SELECT` used to return a value from an arbitrary row. `GROUP_CONCAT` truncates at 1,024 bytes with nothing but a warning. A join before the `GROUP BY` can multiply sums. Grouping by `DATE(created_at)` groups by the server's day, not the rider's. This lesson runs every one of those on MySQL 8.0, looks at how the server actually executes a `GROUP BY` (temporary tables, index scans, the counters that show which one you got), maps the results into Java, and finishes with a payout batch that lost a quarter of its trip IDs. The next lesson, Subqueries, EXISTS and CTEs, builds on the derived tables and the latest-trip-per-driver query that appear here.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Grouping was in SQL from the start. Donald Chamberlin and Raymond Boyce's SEQUEL paper at IBM (1974) already had `GROUP BY` with built-in functions, because the point of a query language for business data was to answer \"how many\" and \"how much\" without writing a loop. `HAVING` and the five classic aggregates were in the first ANSI standard, SQL-86. Later standards added what reports kept asking for: subtotals (`ROLLUP`) and the rule that a column may appear in `SELECT` if it's functionally determined by the grouping columns.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["SQL-86", "`GROUP BY`, `HAVING`, `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`", "The core of this lesson"],
            ["SQL:1999 (and its OLAP amendment)", "`ROLLUP`, `CUBE`, `GROUPING SETS`, `GROUPING()`; functional dependencies", "Subtotals, and why `SELECT d.name ... GROUP BY d.id` is legal"],
            ["MySQL 3.x to 5.6", "Non-aggregated columns allowed in `SELECT` by default", "Returned a value from some row of the group: the bug factory shown below"],
            ["MySQL 4.1 (2004)", "`GROUP_CONCAT`, `group_concat_max_len` default 1024; `WITH ROLLUP`", "Lists per group, and the truncation in the production story"],
            ["MySQL 5.7.5 (2014)", "`ONLY_FULL_GROUP_BY` on by default, with functional-dependence detection; `ANY_VALUE()`", "Error 1055 instead of a random value"],
            ["MySQL 8.0 (2018)", "`GROUP BY` no longer sorts implicitly; `GROUPING()` (8.0.1); TempTable engine for internal temporary tables; `ASC`/`DESC` after `GROUP BY` removed (8.0.13); `ROLLUP` with `ORDER BY` (8.0.12)", "The execution details measured here"],
            ["MySQL 8.0.16 / 8.0.28", "On-disk internal temporary tables always InnoDB; `tmp_table_size` caps each in-memory TempTable table", "The spill to disk measured in Internal Working"],
          ],
        },
        {
          type: "paragraph",
          text: "Everything in this lesson ran on MySQL 8.0.45 in Docker, with the default `sql_mode` (`ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,...`), `group_concat_max_len = 1024`, `tmp_table_size = 16777216`, `temptable_max_ram = 1073741824` and a 256 MB buffer pool.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "At the end of a shift, the depot cashier sorts the day's trip receipts into envelopes, one envelope per driver, and writes totals on the front.",
        },
        {
          type: "list",
          items: [
            "**`GROUP BY driver_id` is the envelopes.** Every receipt goes into exactly one envelope, chosen by the driver's number.",
            "**Aggregates are what's written on the front**: how many receipts (`COUNT`), the total fare (`SUM`), the biggest fare (`MAX`). The front of the envelope can't show \"the rider\", because an envelope holds many riders: that's what `ONLY_FULL_GROUP_BY` refuses to guess.",
            "**`WHERE` is throwing away cancelled receipts before sorting; `HAVING` is throwing away whole envelopes after totalling.** Both can give the same answer, but one of them makes you sort and total receipts you were going to discard.",
            "**The temporary table is a desk covered in envelopes.** With 5 envelopes (cities) the desk is fine. With 200,000 (riders) the desk overflows and the cashier moves everything to the filing cabinet in the back room (an on-disk table), which is slower.",
            "**An index is receipts that arrive already sorted by driver.** The cashier doesn't need a desk: when the driver number changes, the envelope is done. If she only needs each driver's latest receipt, she can jump straight to the end of each driver's pile: the loose index scan.",
            "**`GROUP_CONCAT` is writing every receipt number on the envelope.** The envelope has room for 1,024 characters; the cashier stops mid-number and says nothing, unless you ask.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a cashier who sees a blank tip field knows it means \"no answer\", and might count it as zero. SQL's aggregates never do; they skip the blank entirely. That one difference is behind the first surprise in this lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/mysql/mysql-group-by-and-aggregates-strategies.svg",
          alt: "A diagram titled One GROUP BY, three ways to execute it, measured on MySQL 8.0.45 with 1,000,000 rows. The top row shows the logical order of a grouped query as boxes: FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT, with a note that WHERE drops rows before grouping while HAVING drops whole groups after aggregation, and that for driver 42 WHERE took 0.5 ms over 222 index rows while HAVING took 2,169 ms over 1,000,000 rows. Below are three cards. Card 1, Temporary table, EXPLAIN shows Using temporary: rows are scanned in any order, each group key is looked up in a hash, a new group is a Handler_write and a seen group a Handler_update; GROUP BY city did 5 writes and 999,995 updates in 0.79 s in TempTable memory; GROUP BY rider_id with 198,712 groups ran in 0.87 s with tmp_table_size 64 MB but spilled to an InnoDB disk table and took 3.85 s at the 16 MB default. Card 2, Tight index scan, shown as Group aggregate over Index scan: rows are read from the index on driver_id and created_at in key order and a group is emitted when the key changes, with no temporary table or sort; COUNT(*) per driver from the covering index took 0.20 s, SUM of fare_paise through the non-covering index took 3.2 s because of a clustered index lookup per row, slower than the temporary table at 0.92 to 1.50 s, and an index on driver_id and fare_paise brought it to 0.26 s. Card 3, Loose index scan, EXPLAIN shows Using index for group-by: for each driver_id the server jumps to the last index entry, reads MAX(created_at) and skips to the next driver; 5,000 groups needed 10,002 Handler_read_key calls and 0.05 s instead of 0.67 s; it only works for MIN or MAX of the key part right after the group columns, and SUM is rejected as not_applicable_aggregate_function. A bottom box lists rules: COUNT(col), SUM, AVG, MIN and MAX skip NULLs while COUNT(*) counts rows and SUM over no rows is NULL; MySQL 8.0 has ONLY_FULL_GROUP_BY on and GROUP BY no longer sorts; an in-memory TempTable larger than tmp_table_size becomes an InnoDB table on disk; GROUP_CONCAT stops at group_concat_max_len of 1024 bytes with only warning 1260.",
          caption: "The same GROUP BY can be a hash table in memory, a hash table on disk, an ordered walk through an index, or a few thousand jumps through one. EXPLAIN tells you which.",
        },
        {
          type: "heading",
          text: "The aggregate functions and NULL",
        },
        {
          type: "table",
          headers: ["Function", "Counts or uses", "NULL inputs", "Over zero rows", "Result type for an INT column"],
          rows: [
            ["`COUNT(*)`", "Rows", "Counted (it counts rows, not values)", "`0`", "`BIGINT`"],
            ["`COUNT(col)`", "Non-NULL values", "Skipped", "`0`", "`BIGINT`"],
            ["`COUNT(DISTINCT col)`", "Distinct non-NULL values", "Skipped", "`0`", "`BIGINT`"],
            ["`SUM(col)`", "Non-NULL values", "Skipped", "`NULL`", "`DECIMAL`"],
            ["`AVG(col)`", "`SUM(col) / COUNT(col)`", "Skipped (so not divided by them either)", "`NULL`", "`DECIMAL` with 4 decimals"],
            ["`MIN` / `MAX`", "Non-NULL values", "Skipped", "`NULL`", "Same as the column"],
            ["`GROUP_CONCAT(col)`", "Non-NULL values joined by `,`", "Skipped", "`NULL`", "`TEXT` or `MEDIUMTEXT`, cut at `group_concat_max_len`"],
          ],
        },
        {
          type: "heading",
          text: "The clauses",
        },
        {
          type: "table",
          headers: ["Clause", "Runs on", "Can use aggregates?", "Can use SELECT aliases?"],
          rows: [
            ["`WHERE`", "Individual rows, before grouping", "No (error 1111)", "No"],
            ["`GROUP BY`", "Defines the groups: columns or expressions", "No", "Yes (MySQL extension)"],
            ["`HAVING`", "Groups, after aggregation", "Yes", "Yes (MySQL extension)"],
            ["`SELECT`", "One output row per group", "Yes; other columns must be grouped or functionally dependent", "n/a"],
            ["`ORDER BY`", "The grouped result", "Yes", "Yes"],
            ["`WITH ROLLUP`", "Adds subtotal rows per level and a grand total", "n/a", "n/a"],
          ],
        },
        {
          type: "heading",
          text: "The lesson's tables",
        },
        {
          type: "paragraph",
          text: "Two data sets in a database called `mysql_group_by_and_aggregates`. A tiny one with eleven trips, so every result can be checked by hand, and a million-row one for timing. Times are stored in UTC (Coordinated Universal Time) in `DATETIME` columns, and money in paise (1 rupee = 100 paise) as integers, as in the earlier lessons.",
        },
        {
          type: "code",
          language: "sql",
          title: "setup.sql",
          code: `CREATE DATABASE mysql_group_by_and_aggregates;
USE mysql_group_by_and_aggregates;

CREATE TABLE drivers (
  id        INT PRIMARY KEY,
  name      VARCHAR(40) NOT NULL,
  city      VARCHAR(20) NOT NULL
);

CREATE TABLE trips (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  driver_id     INT NOT NULL,
  rider_id      INT NOT NULL,
  city          VARCHAR(20) NOT NULL,
  status        ENUM('completed','cancelled') NOT NULL,
  fare_paise    INT NULL,          -- NULL when cancelled before a fare was set
  tip_paise     INT NULL,          -- NULL = rider never answered the tip prompt
  rating        TINYINT NULL,      -- NULL = not rated
  created_at    DATETIME NOT NULL  -- stored in UTC
);

INSERT INTO drivers VALUES
 (1,'Arjun','Kolkata'),(2,'Bina','Kolkata'),(3,'Chetan','Bengaluru'),(4,'Divya','Bengaluru');

INSERT INTO trips (driver_id, rider_id, city, status, fare_paise, tip_paise, rating, created_at) VALUES
 (1, 101, 'Kolkata',   'completed', 24000, 2000, 5,    '2026-11-14 17:40:00'),
 (1, 102, 'Kolkata',   'completed', 18000, NULL, 4,    '2026-11-14 19:05:00'),
 (1, 101, 'Kolkata',   'cancelled', NULL,  NULL, NULL, '2026-11-15 03:15:00'),
 (1, 103, 'Kolkata',   'completed', 31000, 0,    NULL, '2026-11-15 09:30:00'),
 (2, 104, 'Kolkata',   'completed', 15000, NULL, 3,    '2026-11-14 20:10:00'),
 (2, 101, 'Kolkata',   'completed', 22000, 5000, 5,    '2026-11-15 11:00:00'),
 (2, 105, 'Kolkata',   'cancelled', 5000,  NULL, NULL, '2026-11-15 12:45:00'),
 (3, 201, 'Bengaluru', 'completed', 27000, NULL, 4,    '2026-11-14 06:20:00'),
 (3, 202, 'Bengaluru', 'completed', 41000, 3000, 5,    '2026-11-14 18:55:00'),
 (3, 201, 'Bengaluru', 'completed', 12000, NULL, NULL, '2026-11-15 02:10:00'),
 (4, 203, 'Bengaluru', 'cancelled', NULL,  NULL, NULL, '2026-11-15 08:00:00');
-- driver 4 has only a cancelled trip; Bina's cancelled trip carries a 5000 paise cancellation fee
INSERT INTO drivers VALUES (5,'Esha','Bengaluru');   -- a driver with no trips yet`,
        },
        {
          type: "paragraph",
          text: "The big tables are generated with a digits cross join and `CRC32` as a cheap deterministic hash, so each column is independent of the others: 5,000 drivers in 500 fleets of ten, 198,712 distinct riders, 15% cancellations, 60% of completed trips with no tip answer, and timestamps spread over 60 days. No secondary index at first; one is added in Internal Working.",
        },
        {
          type: "code",
          language: "sql",
          title: "big.sql",
          code: `CREATE TABLE digits (d INT PRIMARY KEY);
INSERT INTO digits VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

CREATE TABLE big_drivers (
  id INT PRIMARY KEY, name VARCHAR(40) NOT NULL, city VARCHAR(20) NOT NULL, fleet_id INT NOT NULL
);
INSERT INTO big_drivers
SELECT n + 1, CONCAT('driver-', n + 1), ELT(1 + (n + 1) % 5, 'Kolkata','Bengaluru','Mumbai','Delhi','Pune'), 1 + n DIV 10
FROM (SELECT a.d + 10*b.d + 100*c.d + 1000*e.d AS n FROM digits a, digits b, digits c, digits e) x
WHERE n < 5000;

CREATE TABLE big_trips (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, driver_id INT NOT NULL, rider_id INT NOT NULL,
  city VARCHAR(20) NOT NULL, status ENUM('completed','cancelled') NOT NULL,
  fare_paise INT NULL, tip_paise INT NULL, rating TINYINT NULL, created_at DATETIME NOT NULL
);
INSERT INTO big_trips (driver_id, rider_id, city, status, fare_paise, tip_paise, rating, created_at)
SELECT drv, 1 + CRC32(CONCAT('r', n)) % 200000,
       ELT(1 + drv % 5, 'Kolkata','Bengaluru','Mumbai','Delhi','Pune'),
       IF(cx < 15, 'cancelled', 'completed'),
       IF(cx < 15, IF(cx < 9, NULL, 5000), 8000 + CRC32(CONCAT('f', n)) % 40000),
       IF(cx < 15, NULL, ELT(1 + CRC32(CONCAT('t', n)) % 10, NULL,NULL,NULL,NULL,NULL,NULL,0,1000,2000,5000)),
       IF(CRC32(CONCAT('g', n)) % 4 = 0, NULL, 1 + CRC32(CONCAT('h', n)) % 5),
       '2026-09-17 00:00:00' + INTERVAL (CRC32(CONCAT('c', n)) % (60 * 86400)) SECOND
FROM (SELECT n, 1 + CRC32(CONCAT('d', n)) % 5000 AS drv, CRC32(CONCAT('s', n)) % 100 AS cx FROM
       (SELECT a.d + 10*b.d + 100*c.d + 1000*e.d + 10000*f.d + 100000*g.d AS n
        FROM digits a, digits b, digits c, digits e, digits f, digits g) x) y;
ANALYZE TABLE big_trips, big_drivers;

SELECT status, COUNT(*), COUNT(fare_paise), COUNT(tip_paise), COUNT(rating) FROM big_trips GROUP BY status;`,
        },
        {
          type: "output",
          text: `+-----------+----------+-------------------+------------------+---------------+
| status    | COUNT(*) | COUNT(fare_paise) | COUNT(tip_paise) | COUNT(rating) |
+-----------+----------+-------------------+------------------+---------------+
| completed |   849665 |            849665 |           339966 |        639832 |
| cancelled |   150335 |             60239 |                0 |        110169 |
+-----------+----------+-------------------+------------------+---------------+`,
        },
        {
          type: "paragraph",
          text: "The million-row insert took 16 seconds. The table is 57 MB of data, which fits in the buffer pool, so the timings below are CPU and memory work, not disk reads.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "MySQL has three ways to execute a `GROUP BY`, and the plan says which one it chose. The general one is a **temporary table**: an internal table keyed by the grouping columns, where each incoming row either inserts a new group or updates an existing one. If an index already delivers rows in group order, the server can skip the temporary table and aggregate as it walks the index (a **tight index scan**). And for `MIN`/`MAX` on the right index, it can jump from group to group without reading the rows in between (a **loose index scan**).",
        },
        {
          type: "heading",
          text: "The temporary table, and the counters that show it",
        },
        {
          type: "code",
          language: "sql",
          title: "temp_table.sql",
          code: `EXPLAIN SELECT city, COUNT(*), SUM(fare_paise) FROM big_trips GROUP BY city;
EXPLAIN FORMAT=TREE SELECT city, COUNT(*), SUM(fare_paise) FROM big_trips GROUP BY city;
FLUSH STATUS;
SELECT city, COUNT(*), SUM(fare_paise) FROM big_trips GROUP BY city;
SHOW SESSION STATUS WHERE Variable_name IN ('Created_tmp_tables','Created_tmp_disk_tables',
  'Handler_read_rnd_next','Handler_write','Handler_update','Sort_rows','Sort_merge_passes','Select_scan');
EXPLAIN ANALYZE SELECT city, COUNT(*), SUM(fare_paise) FROM big_trips GROUP BY city;`,
        },
        {
          type: "output",
          text: `+----+-------------+-----------+------------+------+---------------+------+---------+------+--------+----------+-----------------+
| id | select_type | table     | partitions | type | possible_keys | key  | key_len | ref  | rows   | filtered | Extra           |
+----+-------------+-----------+------------+------+---------------+------+---------+------+--------+----------+-----------------+
|  1 | SIMPLE      | big_trips | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 995536 |   100.00 | Using temporary |
+----+-------------+-----------+------------+------+---------------+------+---------+------+--------+----------+-----------------+

-> Table scan on <temporary>
    -> Aggregate using temporary table
        -> Table scan on big_trips  (cost=100459 rows=995536)

+-----------+----------+-----------------+
| city      | COUNT(*) | SUM(fare_paise) |
+-----------+----------+-----------------+
| Bengaluru |   200267 |      4833952265 |
| Kolkata   |   199621 |      4806998296 |
| Pune      |   200248 |      4824497799 |
| Delhi     |   199866 |      4806930552 |
| Mumbai    |   199998 |      4819075075 |
+-----------+----------+-----------------+

+-------------------------+---------+
| Variable_name           | Value   |
+-------------------------+---------+
| Created_tmp_disk_tables | 0       |
| Created_tmp_tables      | 1       |
| Handler_read_rnd_next   | 1000007 |
| Handler_update          | 999995  |
| Handler_write           | 5       |
| Select_scan             | 1       |
| Sort_merge_passes       | 0       |
| Sort_rows               | 0       |
+-------------------------+---------+

-> Table scan on <temporary>  (actual time=787..787 rows=5 loops=1)
    -> Aggregate using temporary table  (actual time=787..787 rows=5 loops=1)
        -> Table scan on big_trips  (cost=100459 rows=995536) (actual time=0.201..264 rows=1e+6 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**`Using temporary` in classic `EXPLAIN` is `Aggregate using temporary table` in the tree format.** Read the tree from the innermost line out: scan `big_trips`, feed every row into the temporary table, then scan the temporary table to produce the output.",
            "**The handler counters show the algorithm.** `Handler_read_rnd_next` 1,000,007 is the full table scan (one call per row, plus end-of-scan calls). `Handler_write` 5 is one insert per new city. `Handler_update` 999,995 is every other row: the city was already there, so its `COUNT` and `SUM` were updated in place. One row in, one lookup, one write or update: that's hash aggregation.",
            "**No sort happened.** `Sort_rows` is 0 and the cities came out as Bengaluru, Kolkata, Pune, Delhi, Mumbai: not alphabetical. Before MySQL 8.0, `GROUP BY` also sorted the result by the grouping columns unless you wrote `ORDER BY NULL`. In 8.0 it doesn't, and code that relied on the old order gets rows in a different order after an upgrade.",
            "**The table scan took 264 ms of the 787 ms**; the rest was the per-row aggregation work in the temporary table. Over several runs this query took 0.79 to 1.30 s, depending on what else the machine was doing.",
          ],
        },
        {
          type: "paragraph",
          text: "Asking for an order brings the sort back, as a separate step on the five result rows:",
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN SELECT city, COUNT(*) FROM big_trips GROUP BY city ORDER BY city;
EXPLAIN FORMAT=TREE SELECT city, COUNT(*) FROM big_trips GROUP BY city ORDER BY city;
SELECT city, COUNT(*) FROM big_trips GROUP BY city DESC;       -- the 5.7 syntax`,
        },
        {
          type: "output",
          text: `+----+-------------+-----------+------------+------+---------------+------+---------+------+--------+----------+---------------------------------+
| id | select_type | table     | partitions | type | possible_keys | key  | key_len | ref  | rows   | filtered | Extra                           |
+----+-------------+-----------+------------+------+---------------+------+---------+------+--------+----------+---------------------------------+
|  1 | SIMPLE      | big_trips | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 996432 |   100.00 | Using temporary; Using filesort |
+----+-------------+-----------+------------+------+---------------+------+---------+------+--------+----------+---------------------------------+

-> Sort: big_trips.city
    -> Table scan on <temporary>
        -> Aggregate using temporary table
            -> Table scan on big_trips  (cost=100555 rows=996432)

ERROR 1064 (42000) at line 3: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'DESC' at line 1`,
        },
        {
          type: "paragraph",
          text: "`Using filesort` appears only because of the `ORDER BY`, and the tree shows the sort sitting on top of the five aggregated rows, not on the million input rows. `GROUP BY city DESC`, which 5.7 accepted as a sort direction, is a syntax error since 8.0.13.",
        },
        {
          type: "heading",
          text: "When the temporary table spills to disk",
        },
        {
          type: "paragraph",
          text: "Internal temporary tables start in memory, in the **TempTable** storage engine (`internal_tmp_mem_storage_engine = TempTable`, the 8.0 default). Since 8.0.28, `tmp_table_size` caps the size of each in-memory TempTable table; when one grows past it, the server converts it into an InnoDB table on disk and carries on. Separately, `temptable_max_ram` (1 GB here) caps all TempTable memory on the server together; past that, TempTable overflows into memory-mapped files or InnoDB. Five city groups never come close. One group per rider does. The query below has a `HAVING` no group satisfies, so it returns nothing and all the time is grouping:",
        },
        {
          type: "code",
          language: "sql",
          title: "spill.sql (run three times with @size = 1 MB, 16 MB, 64 MB)",
          code: `SET SESSION tmp_table_size = @size;
FLUSH STATUS;
SELECT rider_id, COUNT(*), SUM(fare_paise) FROM big_trips GROUP BY rider_id HAVING COUNT(*) > 1000;
SHOW SESSION STATUS WHERE Variable_name IN ('Created_tmp_tables','Created_tmp_disk_tables','Handler_write','Handler_update');`,
        },
        {
          type: "output",
          text: `== tmp_table_size=1048576
Empty set (4.46 sec)
| Created_tmp_disk_tables | 1      |
| Created_tmp_tables      | 1      |
| Handler_update          | 801288 |
| Handler_write           | 208073 |
== tmp_table_size=16777216
Empty set (3.85 sec)
| Created_tmp_disk_tables | 1      |
| Created_tmp_tables      | 1      |
| Handler_update          | 801288 |
| Handler_write           | 347041 |
== tmp_table_size=67108864
Empty set (0.87 sec)
| Created_tmp_disk_tables | 0      |
| Created_tmp_tables      | 1      |
| Handler_update          | 801288 |
| Handler_write           | 198712 |`,
        },
        {
          type: "list",
          items: [
            "**With 64 MB the 198,712 rider groups stayed in memory**: exactly 198,712 writes (one per rider), 801,288 updates (the rest of the million), no disk table, 0.87 s.",
            "**With the default 16 MB the table went to disk** (`Created_tmp_disk_tables = 1`) and the query took 3.85 s, about 4.4 times longer. On an earlier run of the same experiment it was 2.68 s; the ratio, not the exact number, is what repeats.",
            "**The extra writes are the conversion.** At 16 MB there were 347,041 writes, 148,329 more than the 198,712 groups: those are the rows that were already in the in-memory table, copied into the new InnoDB table when it overflowed. At 1 MB only 9,361 rows had fit. Both work out to about 113 bytes per group in memory (16,777,216 / 148,329 and 1,048,576 / 9,361), for a key of one `INT` plus a `COUNT` and a `SUM`.",
            "**`Created_tmp_disk_tables` is the counter to watch in production.** Its ratio to `Created_tmp_tables` in `SHOW GLOBAL STATUS` says how often grouping and sorting fall off memory. A high-cardinality `GROUP BY` (per rider, per trip, per minute) is the usual cause.",
          ],
        },
        {
          type: "paragraph",
          text: "TempTable's memory shows up in `performance_schema`:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT event_name, current_number_of_bytes_used AS current_bytes, high_number_of_bytes_used AS high_water
FROM performance_schema.memory_summary_global_by_event_name WHERE event_name LIKE 'memory/temptable/%';`,
        },
        {
          type: "output",
          text: `+--------------------------------+---------------+------------+
| event_name                     | current_bytes | high_water |
+--------------------------------+---------------+------------+
| memory/temptable/physical_disk |             0 |          0 |
| memory/temptable/physical_ram  |       1048608 |   34603232 |
+--------------------------------+---------------+------------+`,
        },
        {
          type: "paragraph",
          text: "The high-water mark of 34,603,232 bytes (33 MB) is consistent with my 64 MB run, where the whole 198,712-group table lived in RAM; the counter is server-wide, so on a shared server other sessions contribute too. `physical_disk` stayed at 0: TempTable never used its own memory-mapped overflow files, because each table hit the per-table `tmp_table_size` cap first and went straight to InnoDB.",
        },
        {
          type: "heading",
          text: "Grouping through an index: tight and loose scans",
        },
        {
          type: "paragraph",
          text: "An index on `(driver_id, created_at)` stores entries sorted by driver, then time. A `GROUP BY driver_id` can read it in order and finish each group when the driver changes. B-tree indexes get their own lesson later in this track; here we only need the fact that entries are sorted.",
        },
        {
          type: "code",
          language: "sql",
          title: "index_grouping.sql",
          code: `ALTER TABLE big_trips ADD INDEX idx_driver_created (driver_id, created_at);
ANALYZE TABLE big_trips;
EXPLAIN SELECT driver_id, MAX(created_at) FROM big_trips GROUP BY driver_id;
EXPLAIN SELECT driver_id, COUNT(*) FROM big_trips GROUP BY driver_id;
EXPLAIN SELECT driver_id, SUM(fare_paise) FROM big_trips GROUP BY driver_id;`,
        },
        {
          type: "output",
          text: `+----+-------------+-----------+------------+-------+--------------------+--------------------+---------+------+--------+----------+--------------------------+
| id | select_type | table     | partitions | type  | possible_keys      | key                | key_len | ref  | rows   | filtered | Extra                    |
+----+-------------+-----------+------------+-------+--------------------+--------------------+---------+------+--------+----------+--------------------------+
|  1 | SIMPLE      | big_trips | NULL       | range | idx_driver_created | idx_driver_created | 4       | NULL |   4990 |   100.00 | Using index for group-by |
|  1 | SIMPLE      | big_trips | NULL       | index | idx_driver_created | idx_driver_created | 9       | NULL | 996432 |   100.00 | Using index              |
|  1 | SIMPLE      | big_trips | NULL       | index | idx_driver_created | idx_driver_created | 9       | NULL | 996432 |   100.00 | NULL                     |
+----+-------------+-----------+------------+-------+--------------------+--------------------+---------+------+--------+----------+--------------------------+`,
        },
        {
          type: "paragraph",
          text: "(Three `EXPLAIN` outputs, stacked into one table to save space.) None of the three needs a temporary table now. Timed with `EXPLAIN ANALYZE`, next to the same queries forced off the index with `IGNORE INDEX`:",
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN ANALYZE SELECT driver_id, MAX(created_at) FROM big_trips GROUP BY driver_id;
EXPLAIN ANALYZE SELECT driver_id, MAX(created_at) FROM big_trips IGNORE INDEX (idx_driver_created) GROUP BY driver_id;
EXPLAIN ANALYZE SELECT driver_id, COUNT(*) FROM big_trips GROUP BY driver_id;
EXPLAIN ANALYZE SELECT driver_id, SUM(fare_paise) FROM big_trips GROUP BY driver_id;
EXPLAIN ANALYZE SELECT driver_id, SUM(fare_paise) FROM big_trips IGNORE INDEX (idx_driver_created) GROUP BY driver_id;`,
        },
        {
          type: "output",
          text: `-> Covering index skip scan for grouping on big_trips using idx_driver_created  (cost=3814 rows=4990) (actual time=0.0576..49.9 rows=5000 loops=1)

-> Table scan on <temporary>  (actual time=666..666 rows=5000 loops=1)
    -> Aggregate using temporary table  (actual time=666..666 rows=5000 loops=1)
        -> Table scan on big_trips  (cost=100549 rows=996432) (actual time=0.32..308 rows=1e+6 loops=1)

-> Group aggregate: count(0)  (cost=200192 rows=4989) (actual time=1.03..196 rows=5000 loops=1)
    -> Covering index scan on big_trips using idx_driver_created  (cost=100549 rows=996432) (actual time=1.01..156 rows=1e+6 loops=1)

-> Group aggregate: sum(big_trips.fare_paise)  (cost=200192 rows=4989) (actual time=3.55..3238 rows=5000 loops=1)
    -> Index scan on big_trips using idx_driver_created  (cost=100549 rows=996432) (actual time=3.52..3117 rows=1e+6 loops=1)

-> Table scan on <temporary>  (actual time=1499..1500 rows=5000 loops=1)
    -> Aggregate using temporary table  (actual time=1499..1499 rows=5000 loops=1)
        -> Table scan on big_trips  (cost=100549 rows=996432) (actual time=0.383..541 rows=1e+6 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**Loose index scan: 50 ms instead of 666 ms.** `Using index for group-by` (in the tree: `Covering index skip scan for grouping`) means the server never reads most of the index. For each driver it seeks to the end of that driver's entries, reads `MAX(created_at)`, and seeks to the next driver. Its counters below confirm it: 10,002 key reads for 5,000 groups.",
            "**Tight index scan with a covering index: 196 ms.** `Group aggregate` over a `Covering index scan` reads every index entry in order (no temporary table, no sort) and emits a group whenever `driver_id` changes. **Covering** means every column the query needs is in the index, so the row itself is never fetched.",
            "**Tight index scan without a covering index: 3.2 seconds, the slowest plan on this page.** `SUM(fare_paise)` needs a column that isn't in the index, so for each of the million index entries InnoDB looked up the full row in the clustered index (the primary-key B-tree where rows actually live). The rows for one driver are scattered across the table, so these are a million random lookups. The optimizer picked this plan anyway, because it saves the temporary table, and it measured 3.2 to 3.4 s over three runs against 0.92 to 1.50 s over two runs for the temporary-table plan it rejected.",
            "**The fix for the last case is a covering index, not a hint.** I added `INDEX (driver_id, fare_paise)` and the same query ran in 253 to 263 ms as a `Covering index scan`. An index is a write cost on every insert, so that's a trade-off for a report that runs often, not a reflex.",
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `FLUSH STATUS;
SELECT COUNT(*) FROM (SELECT driver_id, MAX(created_at) FROM big_trips GROUP BY driver_id) x;
SHOW SESSION STATUS WHERE Variable_name LIKE 'Handler_read%' AND Value > 0;`,
        },
        {
          type: "output",
          text: `+----------+
| COUNT(*) |
+----------+
|     5000 |
+----------+
+-----------------------+-------+
| Variable_name         | Value |
+-----------------------+-------+
| Handler_read_first    | 1     |
| Handler_read_key      | 10002 |
| Handler_read_last     | 1     |
| Handler_read_rnd_next | 5001  |
+-----------------------+-------+`,
        },
        {
          type: "paragraph",
          text: "Two index seeks per driver (one to find the next group, one to land on its maximum), `Handler_read_first` and `Handler_read_last` to find the ends of the index, and 5,001 `rnd_next` calls that are the outer `COUNT(*)` reading the 5,000-row derived table. No `Handler_read_next`: the million entries in between were never touched.",
        },
        {
          type: "heading",
          text: "Why SUM can't use the loose scan: the optimizer trace",
        },
        {
          type: "paragraph",
          text: "The optimizer trace records every alternative the optimizer considered. The loose scan is called a **group index range** in it:",
        },
        {
          type: "code",
          language: "sql",
          code: `SET optimizer_trace = 'enabled=on';
SELECT driver_id, MAX(created_at) FROM big_trips GROUP BY driver_id LIMIT 1;
SELECT JSON_PRETTY(JSON_EXTRACT(trace, '$**.group_index_range')) AS gir,
       JSON_PRETTY(JSON_EXTRACT(trace, '$**.best_group_range_summary')) AS best
FROM information_schema.optimizer_trace\\G
SELECT driver_id, SUM(fare_paise) FROM big_trips GROUP BY driver_id LIMIT 1;
SELECT JSON_PRETTY(JSON_EXTRACT(trace, '$**.group_index_range')) AS gir,
       JSON_PRETTY(JSON_EXTRACT(trace, '$**.reconsidering_access_paths_for_index_ordering')) AS reorder
FROM information_schema.optimizer_trace\\G`,
        },
        {
          type: "output",
          text: `*************************** 1. row ***************************
 gir: [
  {
    "potential_group_range_indexes": [
      {
        "cost": 3314.38,
        "rows": 4990,
        "index": "idx_driver_created",
        "covering": true
      }
    ]
  }
]
best: [
  {
    "cost": 3314.38,
    "rows": 4990,
    "type": "index_group",
    "index": "idx_driver_created",
    "chosen": true,
    "ranges": [],
    "max_aggregate": true,
    "min_aggregate": false,
    "group_attribute": "created_at",
    "distinct_aggregate": false,
    "key_parts_used_for_access": [
      "driver_id"
    ]
  }
]
*************************** 1. row ***************************
    gir: [
  {
    "cause": "not_applicable_aggregate_function",
    "chosen": false
  },
  {
    "cause": "not_applicable_aggregate_function",
    "chosen": false
  }
]
reorder: [
  {
    "steps": [],
    "clause": "GROUP BY",
    "index_order_summary": {
      "index": "idx_driver_created",
      "table": "\`big_trips\`",
      "access_type": "index",
      "plan_changed": true,
      "order_direction": "asc",
      "index_provides_order": true
    }
  }
]`,
        },
        {
          type: "list",
          items: [
            "**`type: index_group` with `max_aggregate: true` and `group_attribute: created_at`** is the loose scan: group on the index's first part, and the aggregated column is the very next key part, so the answer for each group sits at one end of its range.",
            "**`SUM` is `not_applicable_aggregate_function`.** A loose scan can only answer something that one or two index entries per group determine: `MIN`, `MAX`, or `DISTINCT` of the group columns (and `COUNT(DISTINCT)`/`SUM(DISTINCT)` of key columns, as a scanning variant). A sum needs every row.",
            "**`reconsidering_access_paths_for_index_ordering` with `plan_changed: true`** is where the optimizer switched the `SUM` query from a table scan to the index because `index_provides_order` for the `GROUP BY`. That's the decision that cost 3.2 seconds above: the cost model counted the saved temporary table but underestimated a million random clustered-index lookups.",
          ],
        },
      ],
    },
    {
      title: "COUNT, SUM and AVG with NULLs",
      blocks: [
        {
          type: "paragraph",
          text: "Every aggregate except `COUNT(*)` ignores `NULL`. That's a rule worth seeing on data small enough to check by hand. In the small table there are 11 trips, 9 with a fare (two cancellations never got one), 4 with a tip answer (2000, 0, 5000, 3000) and 6 with a rating.",
        },
        {
          type: "code",
          language: "sql",
          title: "nulls.sql",
          code: `SELECT COUNT(*), COUNT(fare_paise), COUNT(tip_paise), COUNT(rating),
       COUNT(DISTINCT rider_id), COUNT(DISTINCT tip_paise)
FROM trips;

SELECT SUM(tip_paise), AVG(tip_paise), SUM(tip_paise)/COUNT(*) AS avg_as_zero,
       AVG(COALESCE(tip_paise,0)) AS avg_coalesce, MIN(tip_paise), MAX(tip_paise)
FROM trips WHERE status='completed';

SELECT AVG(rating), MIN(rating), MAX(rating), SUM(rating) FROM trips WHERE driver_id = 4;

SELECT COUNT(*), SUM(fare_paise), AVG(fare_paise), MAX(created_at) FROM trips WHERE driver_id = 99;

SELECT COUNT(*), SUM(fare_paise) FROM trips WHERE driver_id = 99 GROUP BY driver_id;`,
        },
        {
          type: "output",
          text: `+----------+-------------------+------------------+---------------+--------------------------+---------------------------+
| COUNT(*) | COUNT(fare_paise) | COUNT(tip_paise) | COUNT(rating) | COUNT(DISTINCT rider_id) | COUNT(DISTINCT tip_paise) |
+----------+-------------------+------------------+---------------+--------------------------+---------------------------+
|       11 |                 9 |                4 |             6 |                        8 |                         4 |
+----------+-------------------+------------------+---------------+--------------------------+---------------------------+
+----------------+----------------+-------------+--------------+----------------+----------------+
| SUM(tip_paise) | AVG(tip_paise) | avg_as_zero | avg_coalesce | MIN(tip_paise) | MAX(tip_paise) |
+----------------+----------------+-------------+--------------+----------------+----------------+
|          10000 |      2500.0000 |   1250.0000 |    1250.0000 |              0 |           5000 |
+----------------+----------------+-------------+--------------+----------------+----------------+
+-------------+-------------+-------------+-------------+
| AVG(rating) | MIN(rating) | MAX(rating) | SUM(rating) |
+-------------+-------------+-------------+-------------+
|        NULL |        NULL |        NULL |        NULL |
+-------------+-------------+-------------+-------------+
+----------+-----------------+-----------------+-----------------+
| COUNT(*) | SUM(fare_paise) | AVG(fare_paise) | MAX(created_at) |
+----------+-----------------+-----------------+-----------------+
|        0 |            NULL |            NULL | NULL            |
+----------+-----------------+-----------------+-----------------+
Empty set (0.00 sec)`,
        },
        {
          type: "list",
          items: [
            "**`COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values.** 11 trips, 9 fares, 4 tips, 6 ratings. `COUNT(DISTINCT tip_paise)` is 4, not 5: the distinct values are 0, 2000, 3000, 5000, and `NULL` isn't a value. `COUNT(1)` is the same as `COUNT(*)`; neither reads a column.",
            "**`AVG` divides by the count of non-NULL values.** The average tip is 10,000 / 4 = 2,500 paise. If finance means \"average tip per completed trip\", where no answer means no tip, the right number is 10,000 / 8 = 1,250, and you have to say so: `AVG(COALESCE(tip_paise, 0))` or `SUM(tip_paise) / COUNT(*)`. Neither is wrong; they answer different questions. A dashboard showing 2,500 when someone expected 1,250 is a 2x error with no bug in the code.",
            "**`MIN` is 0, not `NULL`.** Zero is a real tip (the rider answered \"no tip\"); `NULL` is no answer. Keeping that difference in the data is what lets you choose the right average later.",
            "**Driver 4's only trip has no rating, so every aggregate over it is `NULL`.** `SUM` of nothing is `NULL`, not 0. Wrap it in `COALESCE(SUM(...), 0)` when the consumer expects a number.",
            "**Without `GROUP BY`, aggregates over zero rows still return one row** (`COUNT` 0, the rest `NULL`). **With `GROUP BY`, zero rows means zero groups and an empty result.** Code that does `rs.next()` and reads a total must handle both shapes; a \"driver earnings\" query with `GROUP BY driver_id` for a driver with no trips returns nothing at all.",
          ],
        },
        {
          type: "paragraph",
          text: "On a million rows the counts cost about the same. `COUNT(*)` on InnoDB has its own plan (`-> Count rows in big_trips`) that walks the smallest index it has:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT COUNT(*) FROM big_trips;
SELECT COUNT(1) FROM big_trips;
SELECT COUNT(tip_paise) FROM big_trips;
SELECT COUNT(DISTINCT rider_id) FROM big_trips;`,
        },
        {
          type: "output",
          text: `+----------+
| COUNT(*) |
+----------+
|  1000000 |
+----------+
1 row in set (0.14 sec)
+----------+
| COUNT(1) |
+----------+
|  1000000 |
+----------+
1 row in set (0.14 sec)
+------------------+
| COUNT(tip_paise) |
+------------------+
|           339966 |
+------------------+
1 row in set (0.19 sec)
+--------------------------+
| COUNT(DISTINCT rider_id) |
+--------------------------+
|                   198712 |
+--------------------------+
1 row in set (0.68 sec)`,
        },
        {
          type: "paragraph",
          text: "`COUNT(*)` and `COUNT(1)` took the same 0.14 s. `COUNT(tip_paise)` has to look at the column, 0.19 s. `COUNT(DISTINCT rider_id)` needs to remember every rider it has seen (a temporary structure with 198,712 entries) and took 0.68 s. InnoDB doesn't keep an exact row count anywhere, because with MVCC different transactions can see different numbers of rows, so every `COUNT(*)` is a real scan; the Transactions lessons later in the track explain why.",
        },
      ],
    },
    {
      title: "GROUP BY Several Columns, WHERE and HAVING",
      blocks: [
        {
          type: "code",
          language: "sql",
          title: "having.sql",
          code: `SELECT driver_id, COUNT(*) AS trips, SUM(fare_paise) AS fares
FROM trips GROUP BY driver_id;

SELECT city, status, COUNT(*) AS trips, SUM(fare_paise) AS fares
FROM trips GROUP BY city, status ORDER BY city, status;

-- WHERE filters rows before grouping, HAVING filters groups after
SELECT driver_id, COUNT(*) AS completed, SUM(fare_paise) AS fares
FROM trips WHERE status = 'completed'
GROUP BY driver_id HAVING SUM(fare_paise) > 50000;

SELECT driver_id, COUNT(*) AS trips
FROM trips GROUP BY driver_id HAVING driver_id IN (1,2);

SELECT driver_id, COUNT(*) AS trips FROM trips GROUP BY driver_id HAVING trips >= 3;

SELECT driver_id, COUNT(*) AS trips FROM trips WHERE COUNT(*) > 2 GROUP BY driver_id;`,
        },
        {
          type: "output",
          text: `+-----------+-------+-------+
| driver_id | trips | fares |
+-----------+-------+-------+
|         1 |     4 | 73000 |
|         2 |     3 | 42000 |
|         3 |     3 | 80000 |
|         4 |     1 |  NULL |
+-----------+-------+-------+
4 rows in set (0.00 sec)
+-----------+-----------+-------+--------+
| city      | status    | trips | fares  |
+-----------+-----------+-------+--------+
| Bengaluru | completed |     3 |  80000 |
| Bengaluru | cancelled |     1 |   NULL |
| Kolkata   | completed |     5 | 110000 |
| Kolkata   | cancelled |     2 |   5000 |
+-----------+-----------+-------+--------+
4 rows in set (0.00 sec)
+-----------+-----------+-------+
| driver_id | completed | fares |
+-----------+-----------+-------+
|         1 |         3 | 73000 |
|         3 |         3 | 80000 |
+-----------+-----------+-------+
2 rows in set (0.00 sec)
+-----------+-------+
| driver_id | trips |
+-----------+-------+
|         1 |     4 |
|         2 |     3 |
+-----------+-------+
2 rows in set (0.00 sec)
+-----------+-------+
| driver_id | trips |
+-----------+-------+
|         1 |     4 |
|         2 |     3 |
|         3 |     3 |
+-----------+-------+
3 rows in set (0.00 sec)
ERROR 1111 (HY000) at line 12: Invalid use of group function`,
        },
        {
          type: "list",
          items: [
            "**Esha (driver 5) isn't in the first result**: `GROUP BY` only makes groups out of rows that exist. To list every driver, including those with zero trips, start from `drivers` and `LEFT JOIN trips` (the previous lesson), and count `t.id`, not `*`; that query appears in the next section.",
            "**`GROUP BY city, status` makes one group per combination that occurs**: four here. Note the order: `completed` sorts before `cancelled`, because `ORDER BY` on an `ENUM` uses its position in the definition, not the text.",
            "**Bina's 42,000 includes a 5,000 paise cancellation fee.** Whether that counts as \"fares\" is a business rule; the conditional aggregation section splits it out.",
            "**`HAVING trips >= 3` uses a `SELECT` alias**, a MySQL extension that the standard doesn't allow. `WHERE COUNT(*) > 2` fails with error 1111 because `WHERE` runs before any group exists.",
          ],
        },
        {
          type: "heading",
          text: "The cost of filtering in the wrong place",
        },
        {
          type: "paragraph",
          text: "`HAVING driver_id IN (1,2)` gave the right answer. But a condition on a grouping column in `HAVING` means: group everything, then throw most groups away. On a million rows with the index on `(driver_id, created_at)`:",
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN ANALYZE
SELECT driver_id, COUNT(*), SUM(fare_paise) FROM big_trips
WHERE driver_id = 42 GROUP BY driver_id;

EXPLAIN ANALYZE
SELECT driver_id, COUNT(*), SUM(fare_paise) FROM big_trips
GROUP BY driver_id HAVING driver_id = 42;

EXPLAIN ANALYZE
SELECT city, COUNT(*), SUM(fare_paise) FROM big_trips
WHERE status = 'completed' GROUP BY city;

EXPLAIN ANALYZE
SELECT city, status, COUNT(*), SUM(fare_paise) FROM big_trips
GROUP BY city, status HAVING status = 'completed';`,
        },
        {
          type: "output",
          text: `-> Group aggregate: count(0), sum(big_trips.fare_paise)  (cost=99.9 rows=222) (actual time=0.498..0.498 rows=1 loops=1)
    -> Index lookup on big_trips using idx_driver_created (driver_id=42)  (cost=77.7 rows=222) (actual time=0.101..0.481 rows=222 loops=1)

-> Filter: (big_trips.driver_id = 42)  (cost=200192 rows=4989) (actual time=18.9..2169 rows=1 loops=1)
    -> Group aggregate: count(0), sum(big_trips.fare_paise)  (cost=200192 rows=4989) (actual time=2.62..2168 rows=5000 loops=1)
        -> Index scan on big_trips using idx_driver_created  (cost=100549 rows=996432) (actual time=2.59..2082 rows=1e+6 loops=1)

-> Table scan on <temporary>  (actual time=832..832 rows=5 loops=1)
    -> Aggregate using temporary table  (actual time=832..832 rows=5 loops=1)
        -> Filter: (big_trips.\`status\` = 'completed')  (cost=100549 rows=498216) (actual time=0.288..418 rows=849665 loops=1)
            -> Table scan on big_trips  (cost=100549 rows=996432) (actual time=0.286..268 rows=1e+6 loops=1)

-> Filter: (big_trips.\`status\` = 'completed')  (actual time=1145..1145 rows=5 loops=1)
    -> Table scan on <temporary>  (actual time=1145..1145 rows=10 loops=1)
        -> Aggregate using temporary table  (actual time=1145..1145 rows=10 loops=1)
            -> Table scan on big_trips  (cost=100549 rows=996432) (actual time=0.255..268 rows=1e+6 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**`WHERE driver_id = 42`: 0.5 ms.** An index lookup found driver 42's 222 trips and aggregated them.",
            "**`HAVING driver_id = 42`: 2,169 ms, about 4,000 times slower, for the same one row.** The plan aggregated all 5,000 drivers (through the slow non-covering index walk from Internal Working) and then filtered. MySQL 8.0 does **not** move a `HAVING` condition on a grouping column into `WHERE` for you.",
            "**On a column with no index the gap is smaller but still there**: 832 ms with `WHERE status = 'completed'` against 1,145 ms with `HAVING`. The `WHERE` version fed 849,665 rows into 5 groups; the `HAVING` version fed all 1,000,000 rows into 10 groups and threw 5 away.",
            "**The rule:** conditions on individual rows (and on grouping columns) go in `WHERE`. Only conditions on aggregates (`HAVING COUNT(*) > 100`, `HAVING SUM(fare_paise) > 50000`) belong in `HAVING`.",
          ],
        },
      ],
    },
    {
      title: "ONLY_FULL_GROUP_BY, ANY_VALUE and Functional Dependence",
      blocks: [
        {
          type: "paragraph",
          text: "Once rows are grouped, each output row stands for many input rows. A column that isn't grouped or aggregated has many values in the group, so which one should `SELECT` show? Since 5.7.5 MySQL refuses to guess:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT driver_id, rider_id, MAX(created_at) FROM trips GROUP BY driver_id;`,
        },
        {
          type: "output",
          text: `ERROR 1055 (42000) at line 1: Expression #2 of SELECT list is not in GROUP BY clause and contains nonaggregated column 'mysql_group_by_and_aggregates.trips.rider_id' which is not functionally dependent on columns in GROUP BY clause; this is incompatible with sql_mode=only_full_group_by`,
        },
        {
          type: "paragraph",
          text: "The intent of that query is obvious to a human: \"the rider of each driver's latest trip\". Turning the mode off shows what MySQL 5.6 and earlier did with it:",
        },
        {
          type: "code",
          language: "sql",
          title: "old_behaviour.sql",
          code: `SET SESSION sql_mode = REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', '');
ALTER TABLE trips ADD INDEX idx_driver_fare (driver_id, fare_paise, rider_id);
SELECT driver_id, rider_id, fare_paise, MAX(created_at) AS latest FROM trips IGNORE INDEX (idx_driver_fare) GROUP BY driver_id;
SELECT driver_id, rider_id, fare_paise, MAX(created_at) AS latest FROM trips FORCE INDEX (idx_driver_fare) GROUP BY driver_id;
ALTER TABLE trips DROP INDEX idx_driver_fare;`,
        },
        {
          type: "output",
          text: `+-----------+----------+------------+---------------------+
| driver_id | rider_id | fare_paise | latest              |
+-----------+----------+------------+---------------------+
|         1 |      101 |      24000 | 2026-11-15 09:30:00 |
|         2 |      104 |      15000 | 2026-11-15 12:45:00 |
|         3 |      201 |      27000 | 2026-11-15 02:10:00 |
|         4 |      203 |       NULL | 2026-11-15 08:00:00 |
+-----------+----------+------------+---------------------+
+-----------+----------+------------+---------------------+
| driver_id | rider_id | fare_paise | latest              |
+-----------+----------+------------+---------------------+
|         1 |      101 |       NULL | 2026-11-15 09:30:00 |
|         2 |      105 |       5000 | 2026-11-15 12:45:00 |
|         3 |      201 |      12000 | 2026-11-15 02:10:00 |
|         4 |      203 |       NULL | 2026-11-15 08:00:00 |
+-----------+----------+------------+---------------------+`,
        },
        {
          type: "list",
          items: [
            "**The values don't come from the `MAX` row.** Arjun's latest trip (09:30) was rider 103 for 31,000 paise. The query said rider 101 and 24,000: his **first** trip, simply the first row of the group in primary-key order. `MAX(created_at)` and the other columns are computed independently.",
            "**Adding an index changed the answer.** Reading the same table through a different index made different rows come first in each group: Arjun's \"fare\" became `NULL` (his cancelled trip), Bina's rider became 105. Nothing in the data changed. This is what \"non-deterministic\" means in practice: an `ALTER TABLE ... ADD INDEX` or a new optimizer plan after an upgrade silently changes report output.",
            "**That's why the mode is on by default.** Error 1055 is the database telling you the query has no single correct answer. The fix is not to switch the mode off, which many old Stack Overflow answers suggest; it's to say which row you want (the greatest-n-per-group section below).",
          ],
        },
        {
          type: "heading",
          text: "ANY_VALUE and functional dependence",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT driver_id, ANY_VALUE(rider_id) AS some_rider, MAX(created_at) AS latest FROM trips GROUP BY driver_id;

-- d.id is the primary key, so d.name and d.city are determined by it
SELECT d.id, d.name, d.city, COUNT(t.id) AS trips
FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id
GROUP BY d.id;

SELECT d.name, d.city, COUNT(t.id) AS trips
FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id
GROUP BY d.name;`,
        },
        {
          type: "output",
          text: `+-----------+------------+---------------------+
| driver_id | some_rider | latest              |
+-----------+------------+---------------------+
|         1 |        101 | 2026-11-15 09:30:00 |
|         2 |        104 | 2026-11-15 12:45:00 |
|         3 |        201 | 2026-11-15 02:10:00 |
|         4 |        203 | 2026-11-15 08:00:00 |
+-----------+------------+---------------------+
+----+--------+-----------+-------+
| id | name   | city      | trips |
+----+--------+-----------+-------+
|  1 | Arjun  | Kolkata   |     4 |
|  2 | Bina   | Kolkata   |     3 |
|  3 | Chetan | Bengaluru |     3 |
|  4 | Divya  | Bengaluru |     1 |
|  5 | Esha   | Bengaluru |     0 |
+----+--------+-----------+-------+
ERROR 1055 (42000) at line 1: Expression #2 of SELECT list is not in GROUP BY clause and contains nonaggregated column 'mysql_group_by_and_aggregates.d.city' which is not functionally dependent on columns in GROUP BY clause; this is incompatible with sql_mode=only_full_group_by`,
        },
        {
          type: "list",
          items: [
            "**`ANY_VALUE(col)` is the old behaviour, made explicit.** It returns some value from the group, with no promise which, and it tells the reader of the query that the author knows that. Use it only for columns that really are the same in every row of the group but MySQL can't prove it (a denormalised `city` copied onto every trip of a driver, say). It returned the same arbitrary riders as the non-strict run above.",
            "**Grouping by a primary key makes the rest of that table's columns legal.** `GROUP BY d.id` lets `SELECT` show `d.name` and `d.city` without aggregating them, because one `id` has exactly one name and city. That's **functional dependence**, which the SQL:1999 standard defines and MySQL detects for primary keys, `UNIQUE NOT NULL` keys, and equalities in `WHERE`/`ON`.",
            "**`GROUP BY d.name` is rejected** even though names happen to be unique in this table: `name` has no unique constraint, so two drivers could share it. Group by the key, and display the name.",
            "**`COUNT(t.id)`, not `COUNT(*)`, after a `LEFT JOIN`.** Esha has no trips; the join gave her one row with `t.id` `NULL`. `COUNT(*)` would say 1. `COUNT(t.id)` says 0.",
          ],
        },
      ],
    },
    {
      title: "Grouping by Expressions: Days, Hours and Time Zones",
      blocks: [
        {
          type: "paragraph",
          text: "Reports group by time far more often than by raw columns: trips per day, per hour, per week. `GROUP BY DATE(created_at)` works, but the timestamps are in UTC and the business runs on IST (Indian Standard Time, UTC+05:30). A trip at 19:05 UTC on 14 November happened at 00:35 on the 15th in Kolkata.",
        },
        {
          type: "code",
          language: "sql",
          title: "days.sql",
          code: `SELECT DATE(created_at) AS utc_day, COUNT(*) AS trips, SUM(fare_paise) AS fares
FROM trips WHERE status='completed' GROUP BY DATE(created_at) ORDER BY utc_day;

SELECT DATE(CONVERT_TZ(created_at, '+00:00', '+05:30')) AS ist_day, COUNT(*) AS trips, SUM(fare_paise) AS fares
FROM trips WHERE status='completed' GROUP BY ist_day ORDER BY ist_day;

SELECT CONVERT_TZ('2026-11-14 19:05:00', '+00:00', 'Asia/Kolkata') AS named,
       CONVERT_TZ('2026-11-14 19:05:00', '+00:00', 'Asia/Kolkatta') AS typo,
       CONVERT_TZ('2026-11-14 19:05:00', '+00:00', '+05:30') AS offset;

SELECT HOUR(CONVERT_TZ(created_at, '+00:00', '+05:30')) AS ist_hour, COUNT(*) AS trips
FROM trips GROUP BY ist_hour ORDER BY ist_hour;`,
        },
        {
          type: "output",
          text: `+------------+-------+--------+
| utc_day    | trips | fares  |
+------------+-------+--------+
| 2026-11-14 |     5 | 125000 |
| 2026-11-15 |     3 |  65000 |
+------------+-------+--------+
+------------+-------+--------+
| ist_day    | trips | fares  |
+------------+-------+--------+
| 2026-11-14 |     2 |  51000 |
| 2026-11-15 |     6 | 139000 |
+------------+-------+--------+
+---------------------+------+---------------------+
| named               | typo | offset              |
+---------------------+------+---------------------+
| 2026-11-15 00:35:00 | NULL | 2026-11-15 00:35:00 |
+---------------------+------+---------------------+
+----------+-------+
| ist_hour | trips |
+----------+-------+
|        0 |     2 |
|        1 |     1 |
|        7 |     1 |
|        8 |     1 |
|       11 |     1 |
|       13 |     1 |
|       15 |     1 |
|       16 |     1 |
|       18 |     1 |
|       23 |     1 |
+----------+-------+`,
        },
        {
          type: "list",
          items: [
            "**The same eight completed trips split 5/3 by UTC day and 2/6 by IST day.** Every trip between 18:30 and 23:59 UTC belongs to the next Indian day. A driver's \"earnings on the 14th\" were 125,000 paise by the server's calendar and 51,000 by the driver's.",
            "**`CONVERT_TZ` with a name needs the time zone tables loaded** (this server has them: `mysql.time_zone_name` has 1,795 rows). A misspelt name returns `NULL`, not an error, and `GROUP BY` then puts every row into one `NULL` group. A fixed offset like `'+05:30'` always works and is right for India, which has no daylight saving; for zones with daylight saving, use the name.",
            "**`GROUP BY ist_hour` groups by an expression through its alias**, another MySQL extension. Hours with no trips simply don't appear; a report that needs all 24 rows has to join against a list of hours.",
          ],
        },
        {
          type: "paragraph",
          text: "`SET time_zone` doesn't fix this for `DATETIME` columns. A `DATETIME` is stored and returned as written; only `TIMESTAMP` columns are converted to the session time zone:",
        },
        {
          type: "code",
          language: "sql",
          code: `SET SESSION time_zone = '+05:30';
SELECT DATE(created_at) AS still_utc_day, COUNT(*) FROM trips GROUP BY still_utc_day;`,
        },
        {
          type: "output",
          text: `+---------------+----------+
| still_utc_day | COUNT(*) |
+---------------+----------+
| 2026-11-14    |        5 |
| 2026-11-15    |        6 |
+---------------+----------+`,
        },
        {
          type: "heading",
          text: "What an expression costs on a million rows",
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN ANALYZE SELECT DATE(created_at) AS utc_day, COUNT(*) FROM big_trips GROUP BY utc_day;
EXPLAIN ANALYZE SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:00') AS hour_bucket, COUNT(*) FROM big_trips GROUP BY hour_bucket;

ALTER TABLE big_trips ADD INDEX idx_ist_day ((DATE(created_at + INTERVAL 330 MINUTE)));
ANALYZE TABLE big_trips;
EXPLAIN ANALYZE SELECT DATE(created_at + INTERVAL 330 MINUTE) AS ist_day, COUNT(*) FROM big_trips GROUP BY ist_day;
EXPLAIN ANALYZE SELECT DATE(created_at + INTERVAL 330 MINUTE) AS ist_day, COUNT(*) FROM big_trips
WHERE DATE(created_at + INTERVAL 330 MINUTE) = '2026-11-14' GROUP BY ist_day;
ALTER TABLE big_trips DROP INDEX idx_ist_day;`,
        },
        {
          type: "output",
          text: `-> Table scan on <temporary>  (actual time=546..546 rows=60 loops=1)
    -> Aggregate using temporary table  (actual time=546..546 rows=60 loops=1)
        -> Covering index scan on big_trips using idx_driver_created  (cost=100459 rows=995536) (actual time=0.22..234 rows=1e+6 loops=1)

-> Table scan on <temporary>  (actual time=856..856 rows=1440 loops=1)
    -> Aggregate using temporary table  (actual time=856..856 rows=1440 loops=1)
        -> Covering index scan on big_trips using idx_driver_created  (cost=100459 rows=995536) (actual time=0.263..221 rows=1e+6 loops=1)

-> Group aggregate: count(0)  (cost=200299 rows=998) (actual time=61.8..2988 rows=61 loops=1)
    -> Index scan on big_trips using idx_ist_day  (cost=100602 rows=996969) (actual time=6.3..2927 rows=1e+6 loops=1)

-> Group aggregate: count(0)  (cost=8999 rows=177) (actual time=32.7..32.7 rows=1 loops=1)
    -> Index lookup on big_trips using idx_ist_day (cast((created_at + interval 330 minute) as date)='2026-11-14')  (cost=5858 rows=31412) (actual time=1.94..32.1 rows=16664 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**Grouping by an expression needs a temporary table**: 60 UTC days in 546 ms, 1,440 hour buckets in 856 ms. The server read `created_at` from the smaller `idx_driver_created` index (it contains `created_at`, and every secondary index carries the primary key), computed the expression per row and hashed it.",
            "**A functional index on the IST day made the full report slower, 2,988 ms.** The optimizer walked the new index in order to skip the temporary table, but the index wasn't covering for this query, so every entry cost a row lookup: the same trap as the `SUM` plan in Internal Working. 61 IST days appear because the first and last UTC days spill across an IST midnight.",
            "**The same index made one day's report fast: 33 ms** for 16,664 trips through an index lookup. An expression index helps `WHERE` on that expression far more than it helps grouping everything.",
            "**Filter by a range on the raw column** when you can: `WHERE created_at >= '2026-11-13 18:30' AND created_at < '2026-11-14 18:30'` is the IST day 14 November in UTC, and any index on `created_at` can use it.",
          ],
        },
      ],
    },
    {
      title: "Conditional Aggregation for Pivot Reports",
      blocks: [
        {
          type: "paragraph",
          text: "An aggregate can count or sum only the rows that match a condition, by feeding it an expression that is `NULL` (or 0) for the rest. That turns one `GROUP BY` into a report with many columns, and it's how SQL does a **pivot**: values from rows become columns.",
        },
        {
          type: "code",
          language: "sql",
          title: "pivot.sql",
          code: `SELECT driver_id,
       COUNT(*)                                              AS requested,
       SUM(status = 'completed')                              AS completed,
       COUNT(IF(status = 'cancelled', 1, NULL))               AS cancelled,
       SUM(CASE WHEN status = 'completed' THEN fare_paise ELSE 0 END) AS earned,
       ROUND(100 * AVG(status = 'cancelled'), 1)              AS cancel_pct,
       SUM(CASE WHEN tip_paise > 0 THEN 1 ELSE 0 END)         AS tipped
FROM trips GROUP BY driver_id;

SELECT city,
       SUM(CASE WHEN DATE(CONVERT_TZ(created_at,'+00:00','+05:30')) = '2026-11-14' THEN fare_paise END) AS \`14 Nov\`,
       SUM(CASE WHEN DATE(CONVERT_TZ(created_at,'+00:00','+05:30')) = '2026-11-15' THEN fare_paise END) AS \`15 Nov\`
FROM trips WHERE status='completed' GROUP BY city;`,
        },
        {
          type: "output",
          text: `+-----------+-----------+-----------+-----------+--------+------------+--------+
| driver_id | requested | completed | cancelled | earned | cancel_pct | tipped |
+-----------+-----------+-----------+-----------+--------+------------+--------+
|         1 |         4 |         3 |         1 |  73000 |       25.0 |      1 |
|         2 |         3 |         2 |         1 |  37000 |       33.3 |      1 |
|         3 |         3 |         3 |         0 |  80000 |        0.0 |      1 |
|         4 |         1 |         0 |         1 |      0 |      100.0 |      0 |
+-----------+-----------+-----------+-----------+--------+------------+--------+
+-----------+--------+--------+
| city      | 14 Nov | 15 Nov |
+-----------+--------+--------+
| Kolkata   |  24000 |  86000 |
| Bengaluru |  27000 |  53000 |
+-----------+--------+--------+`,
        },
        {
          type: "list",
          items: [
            "**In MySQL a comparison is a number**: `status = 'completed'` is 1 or 0 (or `NULL`). So `SUM(cond)` counts matches and `AVG(cond)` is the fraction that match: Bina cancelled 1 of 3, 33.3%.",
            "**`COUNT(IF(cond, 1, NULL))` counts matches** because `COUNT` skips the `NULL`s. `COUNT(IF(cond, 1, 0))` would count every row, a classic slip.",
            "**`earned` is now 37,000 for Bina**, not the 42,000 from the plain `SUM`: the `CASE` excludes her cancellation fee. `ELSE 0` made driver 4's earnings 0 instead of `NULL`; leaving `ELSE` out (as in the pivot) keeps `NULL` for \"no rows matched\".",
            "**`CASE` is the portable form**; `IF()` and summing booleans are MySQL shortcuts. PostgreSQL has its own `FILTER (WHERE ...)` clause for this, covered in that track.",
            "**One pass over the data for all the columns.** The alternative, one query per column joined together, reads the table once per column.",
          ],
        },
      ],
    },
    {
      title: "WITH ROLLUP and GROUPING()",
      blocks: [
        {
          type: "paragraph",
          text: "`WITH ROLLUP` adds a subtotal row each time a grouping column changes, and a grand total at the end, in the same query.",
        },
        {
          type: "code",
          language: "sql",
          title: "rollup.sql",
          code: `SELECT city, driver_id, COUNT(*) AS trips, SUM(fare_paise) AS fares
FROM trips GROUP BY city, driver_id WITH ROLLUP;

SELECT IF(GROUPING(city), 'ALL CITIES', city) AS city,
       IF(GROUPING(driver_id), 'all drivers', driver_id) AS driver,
       GROUPING(city, driver_id) AS level, COUNT(*) AS trips, SUM(fare_paise) AS fares
FROM trips GROUP BY city, driver_id WITH ROLLUP
HAVING GROUPING(driver_id) = 1 OR SUM(fare_paise) IS NOT NULL;

SELECT city, driver_id, COUNT(*) FROM trips GROUP BY city, driver_id WITH ROLLUP ORDER BY COUNT(*) DESC LIMIT 3;`,
        },
        {
          type: "output",
          text: `+-----------+-----------+-------+--------+
| city      | driver_id | trips | fares  |
+-----------+-----------+-------+--------+
| Bengaluru |         3 |     3 |  80000 |
| Bengaluru |         4 |     1 |   NULL |
| Bengaluru |      NULL |     4 |  80000 |
| Kolkata   |         1 |     4 |  73000 |
| Kolkata   |         2 |     3 |  42000 |
| Kolkata   |      NULL |     7 | 115000 |
| NULL      |      NULL |    11 | 195000 |
+-----------+-----------+-------+--------+
+------------+-------------+-------+-------+--------+
| city       | driver      | level | trips | fares  |
+------------+-------------+-------+-------+--------+
| Bengaluru  | 3           |     0 |     3 |  80000 |
| Bengaluru  | all drivers |     1 |     4 |  80000 |
| Kolkata    | 1           |     0 |     4 |  73000 |
| Kolkata    | 2           |     0 |     3 |  42000 |
| Kolkata    | all drivers |     1 |     7 | 115000 |
| ALL CITIES | all drivers |     3 |    11 | 195000 |
+------------+-------------+-------+-------+--------+
+-----------+-----------+----------+
| city      | driver_id | COUNT(*) |
+-----------+-----------+----------+
| NULL      |      NULL |       11 |
| Kolkata   |      NULL |        7 |
| Bengaluru |      NULL |        4 |
+-----------+-----------+----------+`,
        },
        {
          type: "list",
          items: [
            "**Subtotal rows show `NULL` in the rolled-up columns**: `Bengaluru, NULL` is all Bengaluru drivers, `NULL, NULL` is everything. The subtotals are computed from the detail rows, not added up afterwards: `COUNT` 4 for Bengaluru, `SUM` 80,000 because driver 4's `NULL` is skipped.",
            "**`GROUPING(col)` is 1 on a row where `col` was rolled up.** With several arguments it returns a bit mask: `GROUPING(city, driver_id)` is 0 for detail rows, 1 for city subtotals, 3 for the grand total. `HAVING` can use it, here to hide driver 4's detail row while keeping all subtotals.",
            "**Since 8.0.12 `ROLLUP` works with `ORDER BY`**, and the subtotal rows sort like any other: the top three by count are the total and the two city subtotals.",
          ],
        },
        {
          type: "paragraph",
          text: "`GROUPING()` matters most when the grouped column itself can be `NULL`. Grouping completed trips by rating:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT rating, COUNT(*) AS trips FROM trips WHERE status = 'completed' GROUP BY rating WITH ROLLUP;

SELECT IF(GROUPING(rating), 'TOTAL', IFNULL(rating, 'not rated')) AS rating, COUNT(*) AS trips
FROM trips WHERE status = 'completed' GROUP BY rating WITH ROLLUP;`,
        },
        {
          type: "output",
          text: `+--------+-------+
| rating | trips |
+--------+-------+
|   NULL |     2 |
|      3 |     1 |
|      4 |     2 |
|      5 |     3 |
|   NULL |     8 |
+--------+-------+
+-----------+-------+
| rating    | trips |
+-----------+-------+
| not rated |     2 |
| 3         |     1 |
| 4         |     2 |
| 5         |     3 |
| TOTAL     |     8 |
+-----------+-------+`,
        },
        {
          type: "paragraph",
          text: "Two rows say `NULL`: the first is the group of unrated trips, the last is the total. Code that looks for \"the row where rating is null\" to find the total picks the wrong one half the time. `GROUPING(rating)` tells them apart; before 8.0.1 there was no clean way to.",
        },
      ],
    },
    {
      title: "GROUP_CONCAT and Silent Truncation",
      blocks: [
        {
          type: "paragraph",
          text: "`GROUP_CONCAT` joins a group's values into one string, with its own `ORDER BY`, `DISTINCT` and `SEPARATOR`:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT driver_id, GROUP_CONCAT(id ORDER BY id) AS trip_ids,
       GROUP_CONCAT(DISTINCT rider_id ORDER BY rider_id SEPARATOR '|') AS riders
FROM trips WHERE status='completed' GROUP BY driver_id;`,
        },
        {
          type: "output",
          text: `+-----------+----------+-------------+
| driver_id | trip_ids | riders      |
+-----------+----------+-------------+
|         1 | 1,2,4    | 101|102|103 |
|         2 | 5,6      | 101|104     |
|         3 | 8,9,10   | 201|202     |
+-----------+----------+-------------+`,
        },
        {
          type: "paragraph",
          text: "The result is limited to `group_concat_max_len` bytes, default 1,024. Past that, MySQL cuts the string and raises a **warning**, not an error. A fleet of ten drivers completes about 200 trips a week, and six-digit trip IDs plus commas need about 1,400 bytes:",
        },
        {
          type: "code",
          language: "sql",
          title: "truncation.sql",
          code: `SELECT d.fleet_id, COUNT(*) AS trips, LENGTH(GROUP_CONCAT(t.id ORDER BY t.id)) AS list_bytes,
       RIGHT(GROUP_CONCAT(t.id ORDER BY t.id), 24) AS list_tail, MAX(t.id) AS last_trip_id
FROM big_trips t JOIN big_drivers d ON d.id = t.driver_id
WHERE t.status = 'completed' AND t.created_at >= '2026-11-09' AND t.created_at < '2026-11-16' AND d.fleet_id = 7
GROUP BY d.fleet_id;
SHOW WARNINGS;
SELECT t.id, d.fleet_id, t.driver_id, t.status, t.created_at FROM big_trips t JOIN big_drivers d ON d.id = t.driver_id WHERE t.id = 798;

SET SESSION group_concat_max_len = 1024 * 1024;
-- the same SELECT again
SELECT d.fleet_id, COUNT(*) AS trips, LENGTH(GROUP_CONCAT(t.id ORDER BY t.id)) AS list_bytes,
       RIGHT(GROUP_CONCAT(t.id ORDER BY t.id), 24) AS list_tail, MAX(t.id) AS last_trip_id
FROM big_trips t JOIN big_drivers d ON d.id = t.driver_id
WHERE t.status = 'completed' AND t.created_at >= '2026-11-09' AND t.created_at < '2026-11-16' AND d.fleet_id = 7
GROUP BY d.fleet_id;`,
        },
        {
          type: "output",
          text: `+----------+-------+------------+--------------------------+--------------+
| fleet_id | trips | list_bytes | list_tail                | last_trip_id |
+----------+-------+------------+--------------------------+--------------+
|        7 |   197 |       1024 | 791111,797064,798153,798 |       999461 |
+----------+-------+------------+--------------------------+--------------+
1 row in set, 2 warnings (0.00 sec)

+---------+------+-----------------------------------+
| Level   | Code | Message                           |
+---------+------+-----------------------------------+
| Warning | 1260 | Row 150 was cut by GROUP_CONCAT() |
| Warning | 1260 | Row 150 was cut by GROUP_CONCAT() |
+---------+------+-----------------------------------+

+-----+----------+-----------+-----------+---------------------+
| id  | fleet_id | driver_id | status    | created_at          |
+-----+----------+-----------+-----------+---------------------+
| 798 |       95 |       949 | completed | 2026-11-06 08:13:00 |
+-----+----------+-----------+-----------+---------------------+

+----------+-------+------------+--------------------------+--------------+
| fleet_id | trips | list_bytes | list_tail                | last_trip_id |
+----------+-------+------------+--------------------------+--------------+
|        7 |   197 |       1356 | 994,988776,994714,999461 |       999461 |
+----------+-------+------------+--------------------------+--------------+
1 row in set (0.01 sec)`,
        },
        {
          type: "list",
          items: [
            "**The list stopped at exactly 1,024 bytes, in the middle of a number.** `COUNT(*)` says 197 trips; the list holds 149 complete IDs and then `798`, the first three digits of the 150th ID (warning 1260: \"Row 150 was cut\"). The list should end with 999461 (`MAX(t.id)`).",
            "**The fragment is a real trip ID.** Trip 798 exists: a different fleet's trip from 6 November. Code that splits this string and acts on each ID would act on someone else's trip.",
            "**The only signal is `1 row in set, 2 warnings`.** No error, no exception. In JDBC the warnings sit on the `Statement` or `ResultSet` until someone calls `getWarnings()`, which almost nobody does.",
            "**Raising `group_concat_max_len` fixed it**: 1,356 bytes, ending in 999461. The value can go up to `max_allowed_packet`; it's per session, so a connection pool needs it in every connection (the JDBC URL option in the production story).",
          ],
        },
        {
          type: "paragraph",
          text: "The limit also decides the column type when the result is stored:",
        },
        {
          type: "code",
          language: "sql",
          code: `SET SESSION group_concat_max_len = 1024;
CREATE TEMPORARY TABLE gc AS SELECT GROUP_CONCAT(id) AS ids FROM trips;
SHOW CREATE TABLE gc;
SET SESSION group_concat_max_len = 1024*1024;
CREATE TEMPORARY TABLE gc2 AS SELECT GROUP_CONCAT(id) AS ids FROM trips;
SHOW CREATE TABLE gc2;`,
        },
        {
          type: "output",
          text: `| gc    | CREATE TEMPORARY TABLE \`gc\` (
  \`ids\` text CHARACTER SET latin1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci |

| gc2   | CREATE TEMPORARY TABLE \`gc2\` (
  \`ids\` mediumtext CHARACTER SET latin1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci |`,
        },
        {
          type: "paragraph",
          text: "`TEXT` at 1,024, `MEDIUMTEXT` at 1 MB. Treat `GROUP_CONCAT` as a display helper (a comma-separated list of rider names in an admin screen), not as a way to move data between a query and code. If code needs the IDs, select the rows.",
        },
      ],
    },
    {
      title: "Aggregating After a Join Fan-out",
      blocks: [
        {
          type: "paragraph",
          text: "A join from one parent to two unrelated children produces every combination of child rows: 3 trips and 2 bonuses for a driver become 6 joined rows. Any `SUM` over that is multiplied. This is the **fan-out** problem, and it's the most common reason a report total doesn't match the ledger.",
        },
        {
          type: "code",
          language: "sql",
          title: "fanout.sql",
          code: `CREATE TABLE bonuses (
  id INT PRIMARY KEY AUTO_INCREMENT, driver_id INT NOT NULL, reason VARCHAR(30) NOT NULL, amount_paise INT NOT NULL
);
INSERT INTO bonuses (driver_id, reason, amount_paise) VALUES
 (1, 'peak-hour streak', 10000), (1, 'airport queue', 5000), (3, 'referral', 20000);

-- the naive report
SELECT d.name, SUM(t.fare_paise) AS fares, SUM(b.amount_paise) AS bonuses, COUNT(*) AS joined_rows
FROM drivers d
LEFT JOIN trips   t ON t.driver_id = d.id AND t.status = 'completed'
LEFT JOIN bonuses b ON b.driver_id = d.id
GROUP BY d.id ORDER BY d.id;

-- COUNT(DISTINCT) fixes counts, not sums
SELECT d.name, COUNT(DISTINCT t.id) AS trips, SUM(DISTINCT t.fare_paise) AS fares_distinct
FROM drivers d
LEFT JOIN trips   t ON t.driver_id = d.id AND t.status = 'completed'
LEFT JOIN bonuses b ON b.driver_id = d.id
GROUP BY d.id ORDER BY d.id;

-- pre-aggregate each child, then join one row per driver
SELECT d.name, COALESCE(t.fares, 0) AS fares, COALESCE(b.bonuses, 0) AS bonuses
FROM drivers d
LEFT JOIN (SELECT driver_id, SUM(fare_paise) AS fares FROM trips WHERE status = 'completed' GROUP BY driver_id) t ON t.driver_id = d.id
LEFT JOIN (SELECT driver_id, SUM(amount_paise) AS bonuses FROM bonuses GROUP BY driver_id) b ON b.driver_id = d.id
ORDER BY d.id;`,
        },
        {
          type: "output",
          text: `+--------+--------+---------+-------------+
| name   | fares  | bonuses | joined_rows |
+--------+--------+---------+-------------+
| Arjun  | 146000 |   45000 |           6 |
| Bina   |  37000 |    NULL |           2 |
| Chetan |  80000 |   60000 |           3 |
| Divya  |   NULL |    NULL |           1 |
| Esha   |   NULL |    NULL |           1 |
+--------+--------+---------+-------------+
+--------+-------+----------------+
| name   | trips | fares_distinct |
+--------+-------+----------------+
| Arjun  |     3 |          73000 |
| Bina   |     2 |          37000 |
| Chetan |     3 |          80000 |
| Divya  |     0 |           NULL |
| Esha   |     0 |           NULL |
+--------+-------+----------------+
+--------+-------+---------+
| name   | fares | bonuses |
+--------+-------+---------+
| Arjun  | 73000 |   15000 |
| Bina   | 37000 |       0 |
| Chetan | 80000 |   20000 |
| Divya  |     0 |       0 |
| Esha   |     0 |       0 |
+--------+-------+---------+`,
        },
        {
          type: "list",
          items: [
            "**Arjun's fares doubled (146,000 instead of 73,000) and his bonuses tripled (45,000 instead of 15,000)**: 3 trips times 2 bonuses is 6 joined rows, so each fare was counted twice and each bonus three times. Chetan's one bonus was counted once per trip: 60,000 instead of 20,000. Bina's numbers were right only because she has no bonus.",
            "**`COUNT(DISTINCT t.id)` gives the right trip counts**, because trip IDs are unique. **`SUM(DISTINCT t.fare_paise)` only looked right** because these fares happen to differ. It sums distinct **values**, and two trips with the same fare count once.",
            "**Pre-aggregating each child in a derived table gives one row per driver per child**, so the outer join can't multiply anything. The `COALESCE` turns \"no rows\" into 0 for the report.",
          ],
        },
        {
          type: "paragraph",
          text: "How wrong `SUM(DISTINCT)` gets on real volumes:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT COUNT(*) AS trips, COUNT(DISTINCT fare_paise) AS distinct_fares, SUM(fare_paise), SUM(DISTINCT fare_paise)
FROM big_trips WHERE city = 'Kolkata' AND status = 'completed';`,
        },
        {
          type: "output",
          text: `+--------+----------------+-----------------+--------------------------+
| trips  | distinct_fares | SUM(fare_paise) | SUM(DISTINCT fare_paise) |
+--------+----------------+-----------------+--------------------------+
| 169545 |          39444 |      4746193296 |               1104479148 |
+--------+----------------+-----------------+--------------------------+`,
        },
        {
          type: "paragraph",
          text: "169,545 trips have only 39,444 distinct fares, so `SUM(DISTINCT)` reported 23% of the real total. It's never a fix for fan-out.",
        },
      ],
    },
    {
      title: "Greatest-N-Per-Group: the Latest Trip per Driver",
      blocks: [
        {
          type: "paragraph",
          text: "\"For each driver, the whole row of their latest trip\" is the question `ONLY_FULL_GROUP_BY` refused to guess. `GROUP BY` alone can't answer it, because aggregates return values, not rows. Three standard answers: join the rows back to the per-group `MAX`, number the rows per group with a window function and keep number 1, or keep the rows for which no later row exists (an anti-join, from the previous lesson).",
        },
        {
          type: "code",
          language: "sql",
          title: "latest.sql",
          code: `SELECT t.driver_id, t.id, t.rider_id, t.fare_paise, t.created_at
FROM trips t
JOIN (SELECT driver_id, MAX(created_at) AS latest FROM trips GROUP BY driver_id) m
  ON m.driver_id = t.driver_id AND m.latest = t.created_at
ORDER BY t.driver_id;

SELECT driver_id, id, rider_id, fare_paise, created_at
FROM (SELECT t.*, ROW_NUMBER() OVER (PARTITION BY driver_id ORDER BY created_at DESC, id DESC) AS rn FROM trips t) x
WHERE rn = 1 ORDER BY driver_id;`,
        },
        {
          type: "output",
          text: `+-----------+----+----------+------------+---------------------+
| driver_id | id | rider_id | fare_paise | created_at          |
+-----------+----+----------+------------+---------------------+
|         1 |  4 |      103 |      31000 | 2026-11-15 09:30:00 |
|         2 |  7 |      105 |       5000 | 2026-11-15 12:45:00 |
|         3 | 10 |      201 |      12000 | 2026-11-15 02:10:00 |
|         4 | 11 |      203 |       NULL | 2026-11-15 08:00:00 |
+-----------+----+----------+------------+---------------------+
+-----------+----+----------+------------+---------------------+
| driver_id | id | rider_id | fare_paise | created_at          |
+-----------+----+----------+------------+---------------------+
|         1 |  4 |      103 |      31000 | 2026-11-15 09:30:00 |
|         2 |  7 |      105 |       5000 | 2026-11-15 12:45:00 |
|         3 | 10 |      201 |      12000 | 2026-11-15 02:10:00 |
|         4 | 11 |      203 |       NULL | 2026-11-15 08:00:00 |
+-----------+----+----------+------------+---------------------+`,
        },
        {
          type: "paragraph",
          text: "Now Arjun's latest trip is the right one: trip 4, rider 103, 31,000 paise. Both queries agree here. They don't agree when two trips share the latest timestamp. I added a second trip for driver 3 at the same second:",
        },
        {
          type: "code",
          language: "sql",
          code: `INSERT INTO trips (driver_id, rider_id, city, status, fare_paise, tip_paise, rating, created_at)
VALUES (3, 204, 'Bengaluru', 'completed', 9000, NULL, 5, '2026-11-15 02:10:00');
SELECT t.driver_id, t.id, t.fare_paise, t.created_at
FROM trips t
JOIN (SELECT driver_id, MAX(created_at) AS latest FROM trips GROUP BY driver_id) m
  ON m.driver_id = t.driver_id AND m.latest = t.created_at
ORDER BY t.driver_id, t.id;
DELETE FROM trips WHERE rider_id = 204;`,
        },
        {
          type: "output",
          text: `+-----------+----+------------+---------------------+
| driver_id | id | fare_paise | created_at          |
+-----------+----+------------+---------------------+
|         1 |  4 |      31000 | 2026-11-15 09:30:00 |
|         2 |  7 |       5000 | 2026-11-15 12:45:00 |
|         3 | 10 |      12000 | 2026-11-15 02:10:00 |
|         3 | 12 |       9000 | 2026-11-15 02:10:00 |
|         4 | 11 |       NULL | 2026-11-15 08:00:00 |
+-----------+----+------------+---------------------+`,
        },
        {
          type: "paragraph",
          text: "The `MAX` join returns **both** tied rows, so \"one row per driver\" became two for driver 3. `ROW_NUMBER() ... ORDER BY created_at DESC, id DESC` always returns exactly one, because the `id` breaks the tie. Ties at one-second resolution aren't rare: on the million-row table, driver 4931 has two trips at 22:20:04, and the timings below show it.",
        },
        {
          type: "heading",
          text: "The three approaches on a million trips",
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN ANALYZE
SELECT COUNT(*), SUM(t.fare_paise) FROM big_trips t
JOIN (SELECT driver_id, MAX(created_at) AS latest FROM big_trips GROUP BY driver_id) m
  ON m.driver_id = t.driver_id AND m.latest = t.created_at;

EXPLAIN ANALYZE
SELECT COUNT(*), SUM(fare_paise) FROM
 (SELECT fare_paise, ROW_NUMBER() OVER (PARTITION BY driver_id ORDER BY created_at DESC, id DESC) AS rn FROM big_trips) x
WHERE rn = 1;

EXPLAIN ANALYZE
SELECT COUNT(*), SUM(t.fare_paise) FROM big_trips t
WHERE NOT EXISTS (SELECT 1 FROM big_trips n WHERE n.driver_id = t.driver_id AND n.created_at > t.created_at);`,
        },
        {
          type: "output",
          text: `-> Aggregate: count(0), sum(t.fare_paise)  (cost=2809 rows=1) (actual time=44..44 rows=1 loops=1)
    -> Nested loop inner join  (cost=2310 rows=4990) (actual time=20.1..43.6 rows=5001 loops=1)
        -> Filter: (m.latest is not null)  (cost=4312..564 rows=4990) (actual time=20.1..20.8 rows=5000 loops=1)
            -> Table scan on m  (cost=4312..4377 rows=4990) (actual time=20.1..20.6 rows=5000 loops=1)
                -> Materialize  (cost=4312..4312 rows=4990) (actual time=20.1..20.1 rows=5000 loops=1)
                    -> Covering index skip scan for grouping on big_trips using idx_driver_created  (cost=3813 rows=4990) (actual time=0.0291..18.5 rows=5000 loops=1)
        -> Index lookup on t using idx_driver_created (driver_id=m.driver_id, created_at=m.latest)  (cost=0.25 rows=1) (actual time=0.00407..0.00441 rows=1 loops=5000)

-> Aggregate: count(0), sum(x.fare_paise)  (cost=3.5..3.5 rows=1) (actual time=3027..3027 rows=1 loops=1)
    -> Index lookup on x using <auto_key0> (rn=1)  (cost=0.35..3.5 rows=10) (actual time=3016..3027 rows=5000 loops=1)
        -> Materialize  (cost=0..0 rows=0) (actual time=3016..3016 rows=1e+6 loops=1)
            -> Window aggregate: row_number() OVER (PARTITION BY big_trips.driver_id ORDER BY big_trips.created_at desc,big_trips.id desc )   (actual time=726..1015 rows=1e+6 loops=1)
                -> Sort: big_trips.driver_id, big_trips.created_at DESC, big_trips.id DESC  (cost=100549 rows=996432) (actual time=726..776 rows=1e+6 loops=1)
                    -> Table scan on big_trips  (cost=100549 rows=996432) (actual time=0.197..246 rows=1e+6 loops=1)

-> Aggregate: count(0), sum(t.fare_paise)  (cost=41.3e+6 rows=1) (actual time=33645..33645 rows=1 loops=1)
    -> Nested loop antijoin  (cost=21.4e+6 rows=199e+6) (actual time=1.79..33638 rows=5001 loops=1)
        -> Table scan on t  (cost=100549 rows=996432) (actual time=0.206..337 rows=1e+6 loops=1)
        -> Filter: (n.created_at > t.created_at)  (cost=282 rows=200) (actual time=0.0332..0.0332 rows=0.995 loops=1e+6)
            -> Covering index lookup on n using idx_driver_created (driver_id=t.driver_id)  (cost=282 rows=200) (actual time=0.00656..0.0272 rows=102 loops=1e+6)`,
        },
        {
          type: "list",
          items: [
            "**The `MAX` join: 44 ms.** The derived table is the loose index scan from Internal Working (5,000 groups in 18.5 ms), and each `(driver_id, latest)` pair is then one index lookup. It returned **5,001** rows for 5,000 drivers: driver 4931's tie.",
            "**`ROW_NUMBER()`: 3.0 seconds, exactly 5,000 rows.** It sorted all million rows by driver and time, numbered them, **materialised all million numbered rows** into a temporary table, and then picked the 5,000 with `rn = 1`. MySQL 8.0 doesn't stop numbering after the first row per partition.",
            "**`NOT EXISTS`: 33.6 seconds.** For each of the million trips, it probed the index for a later trip of the same driver: on average it read 102 index entries before deciding. Correct (5,001 rows, same tie), but quadratic in trips per driver.",
            "**Choosing:** with an index on `(group column, ordering column)`, the `MAX` join is fastest and needs a tiebreaker if ties matter (join on `MAX(id)` among the tied rows, or make the ordering key unique). `ROW_NUMBER()` is the clearest and handles ties and \"top 3 per driver\" naturally, at the cost of processing every row. The next phase's Window Functions lesson goes into `ROW_NUMBER`, `RANK` and frames properly.",
          ],
        },
      ],
    },
    {
      title: "Aggregates in Java: JDBC and Records",
      blocks: [
        {
          type: "paragraph",
          text: "On the Java side, an aggregate query maps naturally to a `record`: one component per output column. The details that bite are the types MySQL returns for aggregates and what `getLong` does with `NULL`.",
        },
        {
          type: "code",
          language: "java",
          title: "DriverEarningsDao.java",
          code: `import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class DriverEarningsDao {
    static final String URL = "jdbc:mysql://localhost:33306/mysql_group_by_and_aggregates?user=root&password=lesson";

    // One row per driver per IST day; nullable aggregates stay nullable
    record DriverDay(int driverId, LocalDate istDay, long trips, long completed,
                     long earnedPaise, BigDecimal avgTipPaise, Double avgRating) { }

    static final String SQL = """
        SELECT driver_id,
               DATE(CONVERT_TZ(created_at, '+00:00', '+05:30'))          AS ist_day,
               COUNT(*)                                                  AS trips,
               SUM(status = 'completed')                                 AS completed,
               COALESCE(SUM(CASE WHEN status = 'completed' THEN fare_paise END), 0) AS earned,
               AVG(tip_paise)                                            AS avg_tip,
               AVG(rating)                                               AS avg_rating
        FROM trips
        GROUP BY driver_id, ist_day
        ORDER BY driver_id, ist_day""";

    public static void main(String[] args) throws Exception {
        try (Connection c = DriverManager.getConnection(URL);
             PreparedStatement ps = c.prepareStatement(SQL);
             ResultSet rs = ps.executeQuery()) {
            ResultSetMetaData md = rs.getMetaData();
            for (int i = 1; i <= md.getColumnCount(); i++) {
                System.out.printf("%-10s %-9s -> %s%n", md.getColumnLabel(i), md.getColumnTypeName(i), md.getColumnClassName(i));
            }
            List<DriverDay> days = new ArrayList<>();
            while (rs.next()) {
                long rawTip = rs.getLong("avg_tip");               // the trap: NULL becomes 0
                boolean tipWasNull = rs.wasNull();
                days.add(new DriverDay(
                        rs.getInt("driver_id"),
                        rs.getObject("ist_day", LocalDate.class),
                        rs.getLong("trips"),
                        rs.getLong("completed"),
                        rs.getLong("earned"),
                        rs.getBigDecimal("avg_tip"),               // null stays null
                        rs.getObject("avg_rating", Double.class)));
                if (tipWasNull) System.out.println("getLong(avg_tip) returned " + rawTip + " for a NULL average");
            }
            days.forEach(System.out::println);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -cp mysql-connector-j-9.2.0.jar DriverEarningsDao.java",
        },
        {
          type: "output",
          text: `driver_id  INT       -> java.lang.Integer
ist_day    DATE      -> java.sql.Date
trips      BIGINT    -> java.lang.Long
completed  DECIMAL   -> java.math.BigDecimal
earned     DECIMAL   -> java.math.BigDecimal
avg_tip    DECIMAL   -> java.math.BigDecimal
avg_rating DECIMAL   -> java.math.BigDecimal
getLong(avg_tip) returned 0 for a NULL average
getLong(avg_tip) returned 0 for a NULL average
DriverDay[driverId=1, istDay=2026-11-14, trips=1, completed=1, earnedPaise=24000, avgTipPaise=2000.0000, avgRating=5.0]
DriverDay[driverId=1, istDay=2026-11-15, trips=3, completed=2, earnedPaise=49000, avgTipPaise=0.0000, avgRating=4.0]
DriverDay[driverId=2, istDay=2026-11-15, trips=3, completed=2, earnedPaise=37000, avgTipPaise=5000.0000, avgRating=4.0]
DriverDay[driverId=3, istDay=2026-11-14, trips=1, completed=1, earnedPaise=27000, avgTipPaise=null, avgRating=4.0]
DriverDay[driverId=3, istDay=2026-11-15, trips=2, completed=2, earnedPaise=53000, avgTipPaise=3000.0000, avgRating=5.0]
DriverDay[driverId=4, istDay=2026-11-15, trips=1, completed=0, earnedPaise=0, avgTipPaise=null, avgRating=null]`,
        },
        {
          type: "list",
          items: [
            "**`COUNT` is `BIGINT` (a `Long`); `SUM` and `AVG` of an `INT` column are `DECIMAL` (a `BigDecimal`).** `SUM` is widened so a sum of many `INT`s can't overflow, and `AVG` has 4 decimal places (from `div_precision_increment`). Even `SUM(status = 'completed')` is a `DECIMAL`. Mapping `SUM` with `rs.getInt` works until a total passes 2,147,483,647, which in paise is about 2.1 crore rupees; Kolkata's two months in the big table already sum to 4.7 billion paise.",
            "**`getLong` on `NULL` returns 0** and you only find out by calling `wasNull()` afterwards. Driver 3 on the 14th and driver 4 had no tip answers, so `AVG(tip_paise)` was `NULL`, and `getLong` would have reported an average tip of 0. Use `getObject(col, Long.class)`, `getBigDecimal`, or a boxed type, and keep the record component nullable, for any aggregate that can be `NULL`.",
            "**Decide `NULL` vs 0 in SQL, once.** `earned` uses `COALESCE(..., 0)` because \"no completed trips\" really means zero earnings; `avg_tip` stays `NULL` because \"no tip answers\" is not \"average tip 0\". The record's types (`long` against `BigDecimal`/`Double`) document that choice.",
            "**The IST grouping happened in SQL**, so the record's `LocalDate` is the driver's day. Grouping by UTC in SQL and converting in Java can't fix it: the groups are already wrong by then.",
            "With Spring's `JdbcTemplate` the same mapping is `jdbcTemplate.query(SQL, (rs, n) -> new DriverDay(...))`, and Spring Data JPA can project an aggregate query into a record with a constructor expression; the type and `NULL` rules are the same because both sit on this driver.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `SELECT city, COUNT(*), SUM(fare_paise) FROM big_trips WHERE status = 'completed' GROUP BY city HAVING COUNT(*) > 1000 ORDER BY city` through MySQL 8.0:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parse and resolve.** Names are bound to columns. With `ONLY_FULL_GROUP_BY` on, every `SELECT`, `HAVING` and `ORDER BY` expression is checked: grouped, aggregated, or functionally dependent on the grouping columns, otherwise error 1055. Aliases in `GROUP BY`/`HAVING` are resolved here (a name that is both an alias and a column resolves to the column in `GROUP BY`, with warning 1052).",
            "**Optimise.** The optimizer looks for an index whose leading columns are the `GROUP BY` columns. If the aggregates are only `MIN`/`MAX` of the next key part, it costs a loose index scan (`index_group` in the trace). If an index provides the order, it costs a tight scan. Otherwise it plans a temporary table. Here no index starts with `city`, so: temporary table.",
            "**Create the internal temporary table** in TempTable memory, with a unique hash index on `city` and columns for the running `COUNT` and `SUM` (`Created_tmp_tables` + 1).",
            "**Read rows** (`Handler_read_rnd_next` per row for a table scan) and apply `WHERE`. A cancelled trip is discarded here and never reaches a group.",
            "**Aggregate each surviving row.** Look up its `city` in the temporary table: not there, insert a new group (`Handler_write`); there, update the group's `COUNT` and `SUM` in place (`Handler_update`). `NULL` inputs to `SUM` are skipped; `COUNT(*)` still counts the row.",
            "**If the table outgrows `tmp_table_size`**, convert it to an InnoDB table on disk, copying the groups so far (`Created_tmp_disk_tables` + 1, extra `Handler_write`s), and continue there.",
            "**Read the groups back** (`Table scan on <temporary>`) and apply `HAVING` to each: groups with 1,000 or fewer trips are dropped now, after all their rows were aggregated.",
            "**Compute the `SELECT` list** for each surviving group: aggregates are final, `ROLLUP` rows (if any) are added at each level change.",
            "**Sort for `ORDER BY`** (`Using filesort`) on the few group rows; `GROUP BY` itself no longer guarantees any order in 8.0. Then apply `LIMIT`, send the rows, and drop the temporary table.",
            "**With the right index instead**, steps 3 to 6 disappear: rows arrive in group order, the current group's totals live in a few variables, and a group is emitted when the key changes (tight scan), or the server seeks straight from one group's boundary to the next (loose scan).",
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
          title: "group_by_cheatsheet.sql",
          code: `-- counts
COUNT(*)                    -- rows
COUNT(col)                  -- non-NULL values
COUNT(DISTINCT col)         -- distinct non-NULL values
COUNT(IF(cond, 1, NULL))    -- rows matching cond
SUM(cond)                   -- rows matching cond (MySQL: true = 1)

-- totals and averages (NULLs skipped; no rows -> NULL)
SUM(col), AVG(col), MIN(col), MAX(col)
COALESCE(SUM(col), 0)       -- 0 instead of NULL
AVG(COALESCE(col, 0))       -- treat missing as zero
SUM(CASE WHEN cond THEN col END)       -- conditional total
ROUND(100 * AVG(cond), 1)               -- percentage matching cond

-- grouping
GROUP BY a, b                           -- one group per (a, b) present
GROUP BY DATE(created_at + INTERVAL 330 MINUTE)   -- by IST day
GROUP BY a, b WITH ROLLUP               -- + subtotals per a + grand total
GROUPING(b)                             -- 1 on rows where b was rolled up
GROUP BY pk_col                         -- other columns of that table allowed

-- filtering
WHERE  row_condition                    -- before grouping (can use indexes)
HAVING COUNT(*) > 10                    -- after grouping (aggregates only)

-- non-grouped columns
ANY_VALUE(col)                          -- "any row's value, I know"

-- lists
GROUP_CONCAT(DISTINCT col ORDER BY col SEPARATOR '|')
SET SESSION group_concat_max_len = 1048576;        -- default 1024 bytes!

-- one row per group: latest trip per driver
SELECT t.* FROM trips t
JOIN (SELECT driver_id, MAX(created_at) AS latest FROM trips GROUP BY driver_id) m
  ON m.driver_id = t.driver_id AND m.latest = t.created_at;

-- what did the server do?
EXPLAIN FORMAT=TREE ...      -- Aggregate using temporary table / Group aggregate / skip scan for grouping
SHOW SESSION STATUS LIKE 'Created_tmp%';`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: a daily city report with subtotals, in Indian days",
        },
        {
          type: "paragraph",
          text: "The operations dashboard wants, for the last two IST days, each city's requested trips, completed trips, cancellation rate and gross fares, with a subtotal per day and a grand total. The `WHERE` selects the two IST days as a UTC range on the raw column; the derived table computes the IST day once; conditional aggregation makes the columns; `ROLLUP` and `GROUPING()` make the totals. My first version named the output columns `ist_day` and `city`:",
        },
        {
          type: "code",
          language: "sql",
          title: "city_report.sql (first version)",
          code: `SELECT IF(GROUPING(ist_day), 'ALL DAYS', ist_day)           AS ist_day,
       IF(GROUPING(city), 'all cities', city)               AS city,
       COUNT(*)                                             AS requested,
       SUM(status = 'completed')                            AS completed,
       ROUND(100 * AVG(status = 'cancelled'), 1)            AS cancel_pct,
       SUM(CASE WHEN status = 'completed' THEN fare_paise END) DIV 100 AS gross_rupees
FROM (SELECT t.*, DATE(created_at + INTERVAL 330 MINUTE) AS ist_day
      FROM big_trips t
      WHERE created_at >= '2026-11-13 18:30:00' AND created_at < '2026-11-15 18:30:00') x
GROUP BY ist_day, city WITH ROLLUP;
SHOW WARNINGS;`,
        },
        {
          type: "output",
          text: `13 rows in set, 2 warnings (0.65 sec)

+---------+------+--------------------------------------------------+
| Level   | Code | Message                                          |
+---------+------+--------------------------------------------------+
| Warning | 1052 | Column 'ist_day' in group statement is ambiguous |
| Warning | 1052 | Column 'city' in group statement is ambiguous    |
+---------+------+--------------------------------------------------+`,
        },
        {
          type: "paragraph",
          text: "`GROUP BY ist_day` could mean the derived table's column or the `SELECT` alias of the same name. MySQL chose the column (the right one here) and warned. If the alias had won, the query would have grouped by the label expression. Giving the outputs their own names removes the ambiguity:",
        },
        {
          type: "code",
          language: "sql",
          title: "city_report.sql",
          code: `SELECT IF(GROUPING(ist_day), 'ALL DAYS', ist_day)           AS day_label,
       IF(GROUPING(city), 'all cities', city)               AS city_label,
       COUNT(*)                                             AS requested,
       SUM(status = 'completed')                            AS completed,
       ROUND(100 * AVG(status = 'cancelled'), 1)            AS cancel_pct,
       SUM(CASE WHEN status = 'completed' THEN fare_paise END) DIV 100 AS gross_rupees
FROM (SELECT t.*, DATE(created_at + INTERVAL 330 MINUTE) AS ist_day
      FROM big_trips t
      WHERE created_at >= '2026-11-13 18:30:00' AND created_at < '2026-11-15 18:30:00') x
GROUP BY ist_day, city WITH ROLLUP;`,
        },
        {
          type: "output",
          text: `+------------+------------+-----------+-----------+------------+--------------+
| day_label  | city_label | requested | completed | cancel_pct | gross_rupees |
+------------+------------+-----------+-----------+------------+--------------+
| 2026-11-14 | Bengaluru  |      3422 |      2872 |       16.1 |       801688 |
| 2026-11-14 | Delhi      |      3369 |      2815 |       16.4 |       789427 |
| 2026-11-14 | Kolkata    |      3358 |      2797 |       16.7 |       778443 |
| 2026-11-14 | Mumbai     |      3246 |      2691 |       17.1 |       749822 |
| 2026-11-14 | Pune       |      3269 |      2765 |       15.4 |       768820 |
| 2026-11-14 | all cities |     16664 |     13940 |       16.3 |      3888202 |
| 2026-11-15 | Bengaluru  |      3396 |      2897 |       14.7 |       807725 |
| 2026-11-15 | Delhi      |      3402 |      2864 |       15.8 |       793367 |
| 2026-11-15 | Kolkata    |      3325 |      2830 |       14.9 |       797060 |
| 2026-11-15 | Mumbai     |      3311 |      2810 |       15.1 |       791374 |
| 2026-11-15 | Pune       |      3301 |      2816 |       14.7 |       785241 |
| 2026-11-15 | all cities |     16735 |     14217 |       15.0 |      3974770 |
| ALL DAYS   | all cities |     33399 |     28157 |       15.7 |      7862973 |
+------------+------------+-----------+-----------+------------+--------------+
13 rows in set (0.35 sec)`,
        },
        {
          type: "paragraph",
          text: "16,664 trips on the IST 14th, the same number the functional-index lookup found earlier, so both ways of computing the Indian day agree. The cancellation rates average out to 15.7%, near the 15% the generator used. `DIV 100` converts paise to whole rupees with integer division after summing; dividing each fare first would accumulate rounding.",
        },
        {
          type: "heading",
          text: "Example 2: making a per-driver earnings report fast",
        },
        {
          type: "paragraph",
          text: "In Internal Working, `SUM(fare_paise)` per driver took 3.2 s because the optimizer walked a non-covering index. Adding an index whose columns are exactly the grouping column and the summed column:",
        },
        {
          type: "code",
          language: "sql",
          code: `ALTER TABLE big_trips ADD INDEX idx_driver_fare (driver_id, fare_paise);
ANALYZE TABLE big_trips;
EXPLAIN ANALYZE SELECT driver_id, SUM(fare_paise) FROM big_trips GROUP BY driver_id;
SELECT index_name, stat_value * @@innodb_page_size / 1024 / 1024 AS size_mb FROM mysql.innodb_index_stats
WHERE database_name = DATABASE() AND table_name = 'big_trips' AND stat_name = 'size';`,
        },
        {
          type: "output",
          text: `-> Group aggregate: sum(big_trips.fare_paise)  (cost=200013 rows=4920) (actual time=0.209..263 rows=5000 loops=1)
    -> Covering index scan on big_trips using idx_driver_fare  (cost=100459 rows=995536) (actual time=0.151..196 rows=1e+6 loops=1)

| index_name         | size_mb     |
| PRIMARY            | 56.59375000 |
| idx_driver_created | 25.56250000 |
| idx_driver_fare    | 24.56250000 |`,
        },
        {
          type: "paragraph",
          text: "263 ms (253 ms on a second run) instead of 3.2 s: a tight index scan that never touches the table. The price is a 24.6 MB index, maintained on every insert. For a report that runs on every dashboard refresh, that's worth it; for a monthly export, the temporary-table plan at about a second is fine. (I dropped this index afterwards so the rest of the lesson's plans stay as shown.)",
        },
      ],
    },
    {
      title: "When to Use What",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["Number of rows", "`COUNT(*)`", "`COUNT(col)` unless you mean non-NULL values"],
            ["Average where missing means zero", "`AVG(COALESCE(col, 0))` or `SUM(col) / COUNT(*)`", "`AVG(col)`, which divides by answered rows only"],
            ["Filter rows or grouping columns", "`WHERE`", "`HAVING driver_id = 42` (2,169 ms vs 0.5 ms)"],
            ["Filter on an aggregate", "`HAVING`", "A wrapper query when `HAVING` does it"],
            ["Show a column of the grouped table", "`GROUP BY` its primary key", "Turning off `ONLY_FULL_GROUP_BY`"],
            ["A column that's genuinely constant per group", "`ANY_VALUE(col)`", "`MAX(col)` as a disguise; it hides intent"],
            ["Several counts or totals in one report", "Conditional aggregation (`SUM(CASE ...)`)", "One query per column"],
            ["Subtotals and a grand total", "`WITH ROLLUP` plus `GROUPING()`", "Testing subtotal rows with `IS NULL`"],
            ["Report by local day or hour", "Group by the converted expression; filter by a UTC range", "`DATE(created_at)` on UTC data"],
            ["Totals from two child tables", "Pre-aggregate each in a derived table, then join", "Join both, then `SUM` (fan-out)"],
            ["The whole latest row per group", "`MAX` join with an index (and a tiebreaker), or `ROW_NUMBER()`", "Non-grouped columns next to `MAX()`"],
            ["IDs per group for code to process", "Select the rows, ordered by group", "`GROUP_CONCAT` (1,024-byte cut)"],
            ["A readable list in an admin screen", "`GROUP_CONCAT` with a raised `group_concat_max_len`", "Building the list in a loop of queries"],
            ["Fast per-group `MIN`/`MAX`", "Index on (group col, aggregated col): loose index scan", "A temporary table over all rows"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Averaging a column with NULLs and expecting zeros",
        },
        {
          type: "paragraph",
          text: "`AVG(tip_paise)` was 2,500; the average over all completed trips, counting no answer as no tip, was 1,250. Decide what `NULL` means for the metric and write it into the query (`COALESCE`), with the definition next to the dashboard.",
        },
        {
          type: "heading",
          text: "Expecting SUM over nothing to be 0",
        },
        {
          type: "paragraph",
          text: "`SUM` over zero rows (or only `NULL`s) is `NULL`, and with `GROUP BY` there may be no row at all. Driver 4's earnings were `NULL` until `ELSE 0`/`COALESCE` made them 0. In Java, `getLong` then quietly turns `NULL` into 0 anyway, which hides the difference in both directions.",
        },
        {
          type: "heading",
          text: "Putting row filters in HAVING",
        },
        {
          type: "paragraph",
          text: "`HAVING driver_id = 42` aggregated all 5,000 drivers to keep one: 2,169 ms against 0.5 ms with `WHERE`. MySQL doesn't move it for you.",
        },
        {
          type: "heading",
          text: "Turning off ONLY_FULL_GROUP_BY to make an error go away",
        },
        {
          type: "paragraph",
          text: "The query then returns values from arbitrary rows: the \"latest trip\" query reported Arjun's first fare, and a new index changed it again. Write the query that says which row you want, or use `ANY_VALUE` for a column that really is constant per group.",
        },
        {
          type: "heading",
          text: "Relying on GROUP BY to sort",
        },
        {
          type: "paragraph",
          text: "Before 8.0 it did; in 8.0 the cities came out as Bengaluru, Kolkata, Pune, Delhi, Mumbai. Code that paginated or diffed a grouped result without `ORDER BY` changes behaviour after an upgrade. `GROUP BY col DESC` is now a syntax error.",
        },
        {
          type: "heading",
          text: "Counting rows after a LEFT JOIN with COUNT(*)",
        },
        {
          type: "paragraph",
          text: "A driver with no trips still has one joined row, so `COUNT(*)` says 1. `COUNT(t.id)` said 0 for Esha.",
        },
        {
          type: "heading",
          text: "Summing across a join fan-out",
        },
        {
          type: "paragraph",
          text: "Arjun's fares doubled and his bonuses tripled when trips and bonuses were joined in one query. `SUM(DISTINCT)` doesn't fix it: it reported 23% of Kolkata's real total. Pre-aggregate each child.",
        },
        {
          type: "heading",
          text: "Grouping UTC timestamps by DATE()",
        },
        {
          type: "paragraph",
          text: "Five trips on the 14th by UTC were two by IST. `SET time_zone` doesn't help for `DATETIME` columns. And a misspelt zone name in `CONVERT_TZ` returns `NULL` silently.",
        },
        {
          type: "heading",
          text: "Using GROUP_CONCAT to pass data to code",
        },
        {
          type: "paragraph",
          text: "At the default 1,024 bytes the list stops mid-number, and the fragment can be a valid ID of something else (trip 798, another fleet's). The only signal is a warning. Select rows instead; if you must, raise `group_concat_max_len` on every connection and check the count.",
        },
        {
          type: "heading",
          text: "Leaving the MAX join without a tiebreaker",
        },
        {
          type: "paragraph",
          text: "Two trips at the same second gave driver 3 two \"latest\" trips in the small table, and driver 4931 two in the big one (5,001 rows for 5,000 drivers). Add a unique tiebreaker or use `ROW_NUMBER()` with one.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Keep `ONLY_FULL_GROUP_BY` on in every environment, including developer laptops and old servers being migrated.",
            "Group by keys (`d.id`), display names; never group by a non-unique display column.",
            "Write row conditions in `WHERE` and aggregate conditions in `HAVING`; check with `EXPLAIN` that the `WHERE` reaches an index.",
            "Decide and document `NULL` handling per metric: `COALESCE(SUM(x), 0)` for money totals, nullable averages when \"no data\" must stay visible.",
            "Store timestamps in UTC, and group by the business's local day explicitly (`CONVERT_TZ` with a named zone where daylight saving exists, or a fixed offset for IST). Filter with a UTC range on the raw column.",
            "Use conditional aggregation for multi-column reports, and `ROLLUP` with `GROUPING()` for totals; never detect subtotal rows with `IS NULL`.",
            "Pre-aggregate before joining when more than one child table feeds the totals.",
            "Treat `GROUP_CONCAT` as display-only. If a session needs it longer, set `group_concat_max_len` in the connection settings (`sessionVariables` in the MySQL JDBC URL) so every pooled connection has it.",
            "For reports that run constantly, give the `GROUP BY` an index that covers it: (group columns, aggregated columns). Check `EXPLAIN` for `Using index for group-by` or `Covering index scan`, and be suspicious of a plain `Index scan` under a `Group aggregate`.",
            "Watch `Created_tmp_disk_tables` against `Created_tmp_tables` in `SHOW GLOBAL STATUS`; raise `tmp_table_size` for sessions that run known big groupings rather than globally.",
            "In JDBC, read `SUM`/`AVG` as `BigDecimal` or `long` deliberately, read nullable aggregates with `getObject(col, Type.class)`, and map each row to a `record` whose types say which aggregates can be `NULL`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Everything measured on the million-row `big_trips` table, MySQL 8.0.45 in Docker, 256 MB buffer pool with the table fully cached. `EXPLAIN ANALYZE` times are single runs on a busy 8-core laptop; where I repeated a query, the range is given.",
        },
        {
          type: "table",
          headers: ["Query", "Plan", "Time"],
          rows: [
            ["`MAX(created_at)` per driver (5,000 groups)", "Loose index scan (`Using index for group-by`)", "50 ms"],
            ["Same, `IGNORE INDEX`", "Temporary table", "666 ms"],
            ["`COUNT(*)` per driver", "Tight scan, covering index", "196 ms"],
            ["`SUM(fare_paise)` per driver", "Tight scan, non-covering index (optimizer's choice)", "3.2 to 3.4 s"],
            ["Same, `IGNORE INDEX`", "Temporary table", "0.92 to 1.50 s"],
            ["Same, index on `(driver_id, fare_paise)`", "Tight scan, covering", "253 to 263 ms"],
            ["`GROUP BY city` (5 groups)", "Temporary table in memory", "0.79 to 1.30 s"],
            ["`GROUP BY rider_id` (198,712 groups), `tmp_table_size` 64 MB", "Temporary table in memory", "0.87 s"],
            ["Same, 16 MB (default)", "Temporary table spilled to InnoDB", "3.85 s (2.68 s on another run)"],
            ["Same, 1 MB", "Spilled early", "4.46 s"],
            ["One driver, `WHERE driver_id = 42`", "Index lookup, 222 rows", "0.5 ms"],
            ["One driver, `HAVING driver_id = 42`", "Aggregate all, then filter", "2,169 ms"],
            ["Latest trip per driver, `MAX` join", "Loose scan + 5,000 lookups", "44 ms"],
            ["Latest trip per driver, `ROW_NUMBER()`", "Sort 1M, materialise 1M", "3.0 s"],
            ["Latest trip per driver, `NOT EXISTS`", "1M index probes", "33.6 s"],
            ["`COUNT(*)` / `COUNT(1)` whole table", "Count rows", "0.14 s"],
            ["`COUNT(DISTINCT rider_id)`", "Distinct set of 198,712", "0.68 to 0.80 s"],
            ["Group by IST day, functional index", "Non-covering index scan", "2,988 ms (vs 546 ms by UTC day with a temp table)"],
            ["One IST day, functional index", "Index lookup", "33 ms"],
          ],
        },
        {
          type: "list",
          items: [
            "**The biggest wins are avoiding work, not making grouping faster**: filtering in `WHERE` (4,000x), a loose scan (13x), the right join shape for greatest-n-per-group (760x between the best and worst).",
            "**A temporary table is not the enemy.** It was faster than the index plan the optimizer preferred for `SUM`, and faster than a functional index for the full daily report. What hurts is a temporary table that spills (4.4x slower at 198,712 groups) or a non-covering index walk.",
            "**Read the plan before adding an index.** `Group aggregate` over `Index scan` (not `Covering index scan`) means a row lookup per index entry. That's the plan to fix with a covering index.",
            "Rows per group matter too. The spill experiment's in-memory groups took about 113 bytes each, so 16 MB holds about 148,000 groups of that shape; wider grouping keys or more aggregates hold fewer.",
          ],
        },
      ],
    },
    {
      title: "GROUP BY in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend pays fleet operators weekly. A batch job runs one query per week: per fleet, the number of completed trips, the gross fare, and the list of trip IDs (built with `GROUP_CONCAT`). It transfers the gross amount, then marks every listed trip as paid. A reconciliation job later finds completed trips not marked paid and pays them as \"late trips\". After a few weeks, finance noticed that late-trip payouts were roughly a quarter of all payouts, and a fleet complained that trips from three weeks earlier showed as paid in a week they hadn't driven. I rebuilt the batch against the million-trip table, for the week of 9 to 15 November:",
        },
        {
          type: "code",
          language: "java",
          title: "PayoutBatch.java",
          code: `import java.sql.*;
import java.util.*;

public class PayoutBatch {
    static final String BASE = "jdbc:mysql://localhost:33306/mysql_group_by_and_aggregates?user=root&password=lesson";

    // What shipped: one row per fleet, trip IDs packed into a string, COUNT(*) for the amount check
    static final String BATCH_SQL = """
        SELECT d.fleet_id, COUNT(*) AS trips, SUM(t.fare_paise) AS gross_paise,
               GROUP_CONCAT(t.id ORDER BY t.id) AS trip_ids
        FROM big_trips t JOIN big_drivers d ON d.id = t.driver_id
        WHERE t.status = 'completed'
          AND t.created_at >= '2026-11-09' AND t.created_at < '2026-11-16'
        GROUP BY d.fleet_id""";

    static void run(String label, String url) throws SQLException {
        try (Connection c = DriverManager.getConnection(url);
             Statement st = c.createStatement();
             ResultSet rs = st.executeQuery(BATCH_SQL)) {
            int fleets = 0, shortFleets = 0;
            long expected = 0, markedPaid = 0, foreign = 0;
            List<long[]> rows = new ArrayList<>();
            while (rs.next()) {
                fleets++;
                long trips = rs.getLong("trips");
                String[] ids = rs.getString("trip_ids").split(",");
                expected += trips;
                markedPaid += ids.length;
                if (ids.length != trips) shortFleets++;
                for (String id : ids) rows.add(new long[] {rs.getInt("fleet_id"), Long.parseLong(id)});
            }
            int warnings = 0;
            for (SQLWarning w = rs.getWarnings() == null ? st.getWarnings() : rs.getWarnings(); w != null; w = w.getNextWarning()) {
                if (warnings++ == 0) System.out.println("  first warning: " + w.getErrorCode() + " " + w.getMessage());
            }
            // which of the IDs we are about to mark paid don't belong to that fleet's week at all?
            try (PreparedStatement ps = c.prepareStatement("""
                    SELECT COUNT(*) FROM big_trips t JOIN big_drivers d ON d.id = t.driver_id
                    WHERE t.id = ? AND d.fleet_id = ? AND t.status = 'completed'
                      AND t.created_at >= '2026-11-09' AND t.created_at < '2026-11-16'""")) {
                for (long[] r : rows) {
                    ps.setLong(1, r[1]);
                    ps.setLong(2, r[0]);
                    try (ResultSet one = ps.executeQuery()) {
                        one.next();
                        if (one.getLong(1) == 0) foreign++;
                    }
                }
            }
            System.out.printf("%s fleets=%d  trips by COUNT(*)=%,d  IDs in the lists=%,d  fleets short=%d  warnings=%d  IDs that are not this fleet's trips=%d%n",
                    label, fleets, expected, markedPaid, shortFleets, warnings, foreign);
        }
    }

    public static void main(String[] args) throws SQLException {
        run("default 1024:", BASE);
        run("sessionVariables=group_concat_max_len=1048576:", BASE + "&sessionVariables=group_concat_max_len=1048576");
    }
}`,
        },
        {
          type: "output",
          text: `  first warning: 1260 Row 151 was cut by GROUP_CONCAT()
default 1024: fleets=500  trips by COUNT(*)=98,780  IDs in the lists=74,939  fleets short=500  warnings=500  IDs that are not this fleet's trips=344
sessionVariables=group_concat_max_len=1048576: fleets=500  trips by COUNT(*)=98,780  IDs in the lists=98,780  fleets short=0  warnings=0  IDs that are not this fleet's trips=0`,
        },
        {
          type: "list",
          items: [
            "**Every one of the 500 fleets had its list cut**, because a fleet's week (about 200 trips of 6-digit IDs) needs about 1,400 bytes. 23,841 of 98,780 trips (24%) never made it into a list, so they were never marked paid, and the reconciliation job paid them again as late trips: the quarter of payouts finance saw, and real double payments.",
            "**344 IDs in the lists were fragments that named another trip**, like the `798` in the SQL run: some other fleet's trip from another week, marked paid in this batch. When that fleet's own batch ran, its trip was already \"paid\", so it was skipped: the fleet that complained.",
            "**The amounts transferred were right**, because `SUM(fare_paise)` isn't affected by the list. That's why weekly totals reconciled and nobody looked at the IDs for weeks.",
            "**The driver did report it**: 500 `SQLWarning`s with code 1260, sitting on the `ResultSet` until something called `getWarnings()`. The job never did.",
            "**The immediate fix** was setting `group_concat_max_len` for the job's connections (`sessionVariables=group_concat_max_len=1048576` in the JDBC URL): 98,780 IDs, no warnings, no foreign IDs. **The real fix** was to stop packing IDs into a string: select `(fleet_id, trip_id)` rows ordered by fleet and mark them paid in batches, so there's no length limit to hit. A guard was added as well: the number of IDs marked paid must equal `COUNT(*)` for the fleet, or the batch stops.",
            "**What I'd check first in a similar incident**: any `GROUP_CONCAT` whose output is parsed by code (grep for `split(\",\")` near a query that uses it), then `SHOW WARNINGS` after running it by hand. Finally, the cleanup: find trips marked paid by a batch for a fleet they don't belong to, and late payouts whose trips were already in a batch.",
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
              question: "What's the difference between COUNT(*), COUNT(col) and COUNT(DISTINCT col)?",
              answer:
                "`COUNT(*)` counts rows. `COUNT(col)` counts rows where `col` is not `NULL`. `COUNT(DISTINCT col)` counts distinct non-NULL values. On my 11-trip table they were 11, 4 and 4 for the tip column: 7 trips had no tip answer, and the 4 answers were all different. `COUNT(1)` is the same as `COUNT(*)`, and both took 0.14 s on a million rows.",
            },
            {
              question: "How do SUM and AVG treat NULL?",
              answer:
                "They skip it. `AVG(col)` is `SUM(col) / COUNT(col)`, so `NULL`s are neither added nor counted. My average tip was 2,500 paise over 4 answers, but 1,250 over all 8 completed trips if no answer means no tip (`AVG(COALESCE(tip, 0))`). Over zero rows, `SUM` and `AVG` return `NULL`, not 0.",
            },
            {
              question: "What's the difference between WHERE and HAVING?",
              answer:
                "`WHERE` filters rows before grouping and can't use aggregates (`WHERE COUNT(*) > 2` is error 1111). `HAVING` filters groups after aggregation and is meant for conditions on aggregates. A condition on a grouping column works in both, but in `HAVING` every row is aggregated first: 2,169 ms against 0.5 ms for one driver in my test.",
            },
            {
              question: "Why does MySQL reject SELECT driver_id, rider_id, MAX(created_at) FROM trips GROUP BY driver_id?",
              answer:
                "Because `rider_id` isn't grouped, aggregated, or determined by `driver_id`, so a group has many possible values. With `ONLY_FULL_GROUP_BY` (default since 5.7.5) that's error 1055. Without it, MySQL returns a value from an arbitrary row, which in my test was the driver's first trip, not the latest. To get the latest trip's rider, join back to the `MAX` or use `ROW_NUMBER()`.",
            },
            {
              question: "What does WITH ROLLUP do?",
              answer:
                "Adds subtotal rows for each level of the `GROUP BY` and a grand total, with `NULL` in the rolled-up columns. `GROUP BY city, driver_id WITH ROLLUP` gave per-driver rows, a row per city, and a total of 11 trips. `GROUPING(col)` returns 1 on the rows where `col` was rolled up, which you need when the column itself can be `NULL`.",
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
              question: "What is functional dependence, and how does it relate to ONLY_FULL_GROUP_BY?",
              answer:
                "Column B is functionally dependent on A if each value of A determines one value of B, for example every column of a table on its primary key. MySQL allows a non-aggregated column in `SELECT` if it's dependent on the `GROUP BY` columns: `GROUP BY d.id` lets you select `d.name` and `d.city`. It detects primary keys, `UNIQUE NOT NULL` keys and equalities; `GROUP BY d.name` with `d.city` was rejected because `name` isn't unique.",
            },
            {
              question: "When would you use ANY_VALUE?",
              answer:
                "When a column is the same for every row of the group but MySQL can't prove it, for example a denormalised `city` on each trip when grouping by driver. It returns some row's value and documents that the author accepts that. It's not a fix for wanting \"the value from the latest row\": that needs a greatest-n-per-group query.",
            },
            {
              question: "What's a join fan-out and how do you aggregate correctly across one?",
              answer:
                "Joining a parent to two independent children produces every combination, so sums are multiplied: Arjun's fares doubled and his bonuses tripled with 3 trips and 2 bonuses. `COUNT(DISTINCT id)` fixes counts but `SUM(DISTINCT)` sums distinct values, not rows (23% of the real Kolkata total). Pre-aggregate each child in its own derived table grouped by the parent key, then join one row per parent.",
            },
            {
              question: "How do you build a pivot report in MySQL?",
              answer:
                "Conditional aggregation: `SUM(CASE WHEN status = 'completed' THEN fare END)`, `COUNT(IF(status = 'cancelled', 1, NULL))`, `AVG(status = 'cancelled')` for a rate. One `GROUP BY`, one pass over the data, a column per condition. Watch the `COUNT(IF(cond, 1, 0))` slip, which counts every row, and decide whether \"no rows\" is `NULL` or 0 with `ELSE`.",
            },
            {
              question: "How would you group trips by local day when timestamps are stored in UTC?",
              answer:
                "Group by the converted expression, `DATE(CONVERT_TZ(created_at, '+00:00', 'Asia/Kolkata'))` or a fixed `+05:30` offset, and filter the range in UTC on the raw column so an index can be used. In my small table the same trips split 5/3 by UTC day and 2/6 by IST day. `SET time_zone` doesn't change `DATETIME` values, and a misspelt zone name returns `NULL`.",
            },
            {
              question: "Why does GROUP_CONCAT sometimes return incomplete lists?",
              answer:
                "Its result is cut at `group_concat_max_len` bytes, default 1,024, with only warning 1260. The cut can land mid-number: my fleet list ended in `798`, a valid ID of another fleet's trip. Raise the variable per session (up to `max_allowed_packet`), check warnings, or better, select rows instead of parsing a string.",
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
              question: "How does MySQL execute a GROUP BY internally?",
              answer:
                "Three ways. Without a usable index, an internal temporary table keyed by the group columns: each row inserts a group (`Handler_write`) or updates one (`Handler_update`); `GROUP BY city` on a million rows was 5 writes and 999,995 updates (`Using temporary`). With an index whose prefix is the group columns, a tight index scan aggregates in index order without a temporary table (`Group aggregate`). For `MIN`/`MAX` of the next key part, a loose index scan seeks from group to group (`Using index for group-by`): 10,002 key reads and 50 ms for 5,000 drivers.",
            },
            {
              question: "What's the TempTable engine and when does a GROUP BY go to disk?",
              answer:
                "TempTable is the in-memory engine for internal temporary tables since 8.0. Each in-memory table is limited by `tmp_table_size` (since 8.0.28); past that it's converted to an InnoDB on-disk table, counted in `Created_tmp_disk_tables`. All TempTable memory together is limited by `temptable_max_ram`, with overflow to mmap files or InnoDB. My 198,712-group query stayed in RAM with 64 MB (0.87 s) and spilled at the 16 MB default (3.85 s); the extra `Handler_write`s showed the 148,329 groups copied at conversion.",
            },
            {
              question: "Can an index make a GROUP BY slower?",
              answer:
                "Yes. If the optimizer walks a non-covering index to get group order, each entry costs a clustered-index lookup. `SUM(fare_paise)` per driver through `(driver_id, created_at)` took 3.2 s; the temporary-table plan it rejected took about 1 s, and a covering `(driver_id, fare_paise)` index took 0.26 s. In `EXPLAIN FORMAT=TREE`, a `Group aggregate` over `Index scan` rather than `Covering index scan` is the warning sign. A functional index on the IST day did the same to a full-table daily report (3.0 s against 0.55 s).",
            },
            {
              question: "Why can't a loose index scan compute SUM?",
              answer:
                "A loose scan reads only one or two entries per group, so it can answer only what those entries determine: `MIN` or `MAX` of the key part right after the group columns, or `DISTINCT` group values. A sum needs every row. The optimizer trace records it as `not_applicable_aggregate_function` under `group_index_range`, while the `MAX` query shows `type: index_group` with `group_attribute: created_at`.",
            },
            {
              question: "Compare ways to get the latest row per group.",
              answer:
                "Join to a `MAX` per group: with an index on `(driver_id, created_at)` it was 44 ms, because the `MAX` is a loose scan and each match one lookup; but ties return several rows (5,001 for 5,000 drivers). `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY created_at DESC, id DESC)`: exactly one row, handles top-N, but MySQL 8.0 sorted and materialised all million numbered rows (3.0 s). `NOT EXISTS` a later row: correct but 33.6 s, because it probes about 100 index entries per trip. Choose by data size, ties and whether you need top-N.",
            },
            {
              question: "What changed about GROUP BY ordering in MySQL 8.0?",
              answer:
                "`GROUP BY` no longer sorts its output. In 5.7 it sorted implicitly unless you wrote `ORDER BY NULL`, and `GROUP BY col DESC` set the direction; in 8.0 the result comes out in whatever order the temporary table or index produced (my cities came out unsorted), and `GROUP BY ... DESC` is a syntax error since 8.0.13. `ORDER BY` adds an explicit sort, shown as `Using filesort`, on the grouped rows only.",
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
              question: "After a migration from MySQL 5.6 to 8.0, several report queries fail with error 1055. A colleague proposes removing ONLY_FULL_GROUP_BY from sql_mode. What do you do?",
              answer:
                "Not that. Each failing query has a column whose value was being picked from an arbitrary row; on 5.6 the reports were already potentially wrong, and the value could change with a new index or plan (I saw it change by forcing a different index). For each one, decide what the column should be: grouped (add it), dependent on a key (group by the key), constant per group (`ANY_VALUE`), or \"from the latest row\" (rewrite as a `MAX` join or `ROW_NUMBER()`). Also check reports that depended on 5.7's implicit `GROUP BY` sort and add `ORDER BY`.",
            },
            {
              question: "Drivers say their 'today's earnings' screen shows yesterday's late-evening trips, and that earnings reset at 5:30 in the morning. What's wrong?",
              answer:
                "The query groups or filters by `DATE(created_at)` on UTC timestamps, so the day boundary is midnight UTC, which is 05:30 IST. Trips from 00:00 to 05:29 IST land on the previous UTC day. In my data, the same eight trips split 5/3 by UTC and 2/6 by IST. Fix: compute the IST day boundaries in UTC and filter `created_at >= '...18:30' AND created_at < '...18:30'`, and group by `DATE(CONVERT_TZ(created_at, '+00:00', '+05:30'))`. Check every daily report and payout cutoff for the same mistake.",
            },
            {
              question: "A dashboard's 'average tip' is double what finance computes from the ledger, but both are 'correct'. Explain.",
              answer:
                "`AVG(tip_paise)` divides by the trips where a tip was recorded; `NULL` (rider didn't answer) is skipped. Finance divides by all completed trips, treating no answer as zero. My data gave 2,500 vs 1,250. Neither is a bug; they're different metrics. Agree on the definition, implement it explicitly (`AVG(COALESCE(tip_paise, 0))` or `SUM(tip) / COUNT(*)`), and name the metric so the difference is visible.",
            },
            {
              question: "The weekly payout batch transfers the correct amounts, but reconciliation finds about a quarter of trips 'unpaid' and pays them again, and some fleets see trips marked paid that aren't theirs. Where do you look?",
              answer:
                "At how the batch gets the trip IDs. If it parses a `GROUP_CONCAT`, the lists are being cut at `group_concat_max_len` (1,024 bytes by default) with only warning 1260; the cut leaves a numeric fragment that can be another trip's ID. My rebuild dropped 23,841 of 98,780 IDs and produced 344 foreign IDs, while `SUM` amounts stayed right. Confirm by running the query by hand and `SHOW WARNINGS`. Fix: select rows instead of a string, assert the ID count equals `COUNT(*)`, and as a stopgap set `group_concat_max_len` in the connection's session variables. Then repair the double payments and wrongly marked trips.",
            },
            {
              question: "A per-driver earnings report got slower after someone added an index on (driver_id, created_at), from about 1 second to over 3. Why, and what would you do?",
              answer:
                "`EXPLAIN FORMAT=TREE` will show `Group aggregate` over `Index scan` on the new index: the optimizer now walks it to get rows in driver order and avoid a temporary table, but `fare_paise` isn't in the index, so each of the million entries needs a clustered-index lookup. I measured 3.2 s for that plan against about 1 s for the temporary table. Options: a covering index `(driver_id, fare_paise)` (0.26 s), or `IGNORE INDEX` for that query if the extra index isn't worth its write cost. Keep the new index if other queries (latest trip per driver, 50 ms) need it.",
            },
            {
              question: "A nightly query grouping a billion-row trips table by rider has become slow, and Created_tmp_disk_tables rises by one every night at that time. What's happening and what are the options?",
              answer:
                "The grouping temporary table, one row per rider, outgrows `tmp_table_size` and is converted to an InnoDB on-disk table mid-query, with the rows so far copied over. My 198,712-rider version ran 4.4 times slower after spilling. Options: raise `tmp_table_size` for that session only (`SET SESSION`), within `temptable_max_ram`; give the query a covering index on `(rider_id, ...)` so it can use a tight index scan and needs no temporary table; reduce the input (`WHERE` on a date range, incremental daily aggregates in a summary table); or move the job to a replica. I'd check memory headroom before raising limits, since every concurrent session can use that much.",
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
            "On the small table, run `SELECT AVG(tip_paise), AVG(COALESCE(tip_paise, 0)) FROM trips WHERE status = 'completed'`. Before running it, predict both numbers.",
            "Run `SET SESSION group_concat_max_len = 4; SELECT GROUP_CONCAT(id) FROM trips; SHOW WARNINGS;`. What comes back, and which row does the warning name?",
            "Run `SELECT city, COUNT(*) FROM big_trips GROUP BY city DESC`.",
            "With the index on `(driver_id, created_at)`, run `EXPLAIN` for: `MIN(created_at)` per driver; `MIN` and `MAX` per driver with `WHERE created_at >= '2026-11-15'`; `COUNT(DISTINCT created_at)` per driver. Compare the `Extra` column.",
            "Turn off `ONLY_FULL_GROUP_BY` for your session and run `SELECT driver_id, rider_id, fare_paise, MAX(created_at) FROM trips GROUP BY driver_id`. Is driver 1's fare the fare of his latest trip?",
            "Set `tmp_table_size` to 1 MB and run the `GROUP BY rider_id ... HAVING COUNT(*) > 1000` query with `FLUSH STATUS` before and `SHOW SESSION STATUS LIKE 'Created_tmp%'` after.",
            "Run `SELECT rating, COUNT(*) FROM trips WHERE status = 'completed' GROUP BY rating WITH ROLLUP` and find the total.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 returns 2500.0000 and 1250.0000: four answered tips averaging 2,500, or 10,000 paise over eight trips. Step 2 returns `1,2,` (four bytes, cut after the comma) and `Warning 1260 Row 3 was cut by GROUP_CONCAT()`. Step 3 fails with `ERROR 1064 (42000)` near `'DESC'`, because 8.0.13 removed sort directions on `GROUP BY`. Step 4 shows `Using index for group-by` for the first, `Using where; Using index for group-by` for the second (the range condition is applied inside the loose scan), and `Using index for group-by (scanning)` for the third, a variant that reads through each group instead of jumping. Step 5 shows 24000, from Arjun's first trip, not 31000 from his latest. Step 6 shows `Created_tmp_disk_tables` 1 and `Created_tmp_tables` 1, and takes several seconds. Step 7 shows two rows with `NULL` in `rating`: the first (2 trips) is the unrated group, the last (8 trips) is the total.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ORDER      FROM -> WHERE (rows) -> GROUP BY -> HAVING (groups) -> SELECT -> ORDER BY -> LIMIT
           filter rows in WHERE: driver 42 in 0.5 ms vs 2,169 ms in HAVING

NULLS      COUNT(*) counts rows; COUNT(col), SUM, AVG, MIN, MAX skip NULL
           AVG(tip) 2,500 vs AVG(COALESCE(tip,0)) 1,250
           no rows: SUM -> NULL; with GROUP BY -> no row at all

STRICT     ONLY_FULL_GROUP_BY (5.7.5+): error 1055 instead of a random row
           GROUP BY pk -> other columns OK; ANY_VALUE(col) when constant

REPORTS    SUM(CASE WHEN .. THEN x END), COUNT(IF(c,1,NULL)), AVG(cond)
           WITH ROLLUP + GROUPING(col) (a real NULL vs a subtotal)
           local day: DATE(CONVERT_TZ(utc, '+00:00', '+05:30')), UTC range in WHERE

TRAPS      join fan-out multiplies SUM -> pre-aggregate children
           GROUP_CONCAT cut at 1024 bytes, warning 1260 only
           MAX join returns ties (5,001 rows for 5,000 drivers)
           8.0: GROUP BY doesn't sort; GROUP BY col DESC is an error

ENGINE     Using temporary: hash in TempTable; Handler_write per group
           > tmp_table_size -> InnoDB on disk (Created_tmp_disk_tables)
           tight index scan: Group aggregate, needs a COVERING index
           loose index scan: Using index for group-by, MIN/MAX only

JDBC       COUNT -> Long, SUM/AVG of INT -> BigDecimal
           getLong(NULL) == 0: use getObject(col, Long.class) / wasNull()`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`GROUP BY` turns many rows into one per group, and every aggregate except `COUNT(*)` skips `NULL`. Most wrong reports come from four places: `NULL` handling, non-grouped columns, join fan-out, and time zones. `ONLY_FULL_GROUP_BY`, `COALESCE`, pre-aggregation and explicit local-day expressions handle them, and `GROUP_CONCAT` should never feed code.",
            "Underneath, MySQL groups with a temporary table (which spills to disk past `tmp_table_size`), a tight index scan (fast only when the index covers the query), or a loose index scan (for `MIN`/`MAX`). `EXPLAIN FORMAT=TREE` and the `Created_tmp_*` and `Handler_*` counters tell you which one ran.",
            "Next comes Subqueries, EXISTS and CTEs: the derived tables used here for pre-aggregation and the latest trip per driver, correlated subqueries and why the `NOT EXISTS` version took 33 seconds, `IN` versus `EXISTS`, semi-join strategies in the optimizer, and `WITH` (including recursive CTEs) for queries that are too tangled for one `GROUP BY`.",
          ],
        },
      ],
    },
  ],
};
