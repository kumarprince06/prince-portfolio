import type { Lesson } from "../types";

export const mysqlJoins: Lesson = {
  slug: "mysql-joins",
  date: "2026-11-16",
  title: "Joins: INNER, LEFT, Self and Anti Joins",
  description:
    "Joins in MySQL 8.0.45, run and measured on a ride-hailing schema: a join as a filtered Cartesian product (6 riders times 8 trips is 48 rows, 8 survive the ON condition), INNER versus LEFT versus RIGHT on the same 5 drivers and 8 trips, the right-table filter in WHERE that silently turned a LEFT JOIN into an inner join (3 drivers instead of 5, 16,200 instead of 20,000, and EXPLAIN printing Nested loop inner join), FULL OUTER JOIN failing with ERROR 1064 while drivers FULL JOIN trips ran as an inner join with FULL as a table alias, the UNION emulation, CROSS JOIN, self joins for rider referrals and back-to-back trips, the anti join three ways (LEFT JOIN IS NULL and NOT EXISTS both became a Nested loop antijoin in 87 to 100 ms, NOT IN returned an empty set because one trip had a NULL driver), semi joins with FirstMatch, join fan-out that turned 100,000 paise of fares into 149,000 and 12.59 billion into 15.11 billion, SUM(DISTINCT) undercounting by 92 percent, USING versus ON versus NATURAL JOIN (0 rows), a VARCHAR driver id and a collation mismatch that took indexes away (125 ms against 34 ms, and ERROR 1267), nested loop with eq_ref and ref lookups (78 to 255 ms) against 490,000 primary key lookups without an index (790 to 1,124 ms) against an Inner hash join (173 to 284 ms), a pure nested loop at 1,902 ms against 164 ms for hashing, the optimizer trace pruning a join order by cost, STRAIGHT_JOIN forcing the slow order, a hash join spilling 1,344 chunk-file operations at the default 256 KB join_buffer_size, a JDBC one-to-many mapper against N+1 queries (1 query against 1,668), and a weekly driver payout that overpaid 7,856 drivers by 234,165,221 paise because trips were joined to payments.",
  tags: ["MySQL", "SQL", "Joins", "Query Optimisation"],
  sections: [
    {
      title: "What Joins Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, SELECT, WHERE, ORDER BY, INSERT, UPDATE and DELETE, worked on one table at a time. Real questions never stay inside one table. \"Which driver did this trip?\" needs `trips` and `drivers`. \"How much did we actually collect for it?\" needs `payments` too. \"Which drivers had no trips this week?\" needs a row that **isn't** there. A **join** combines rows from two or more tables into one result, row by row, using a condition that says which rows belong together.",
        },
        {
          type: "paragraph",
          text: "The mental model that makes every join type easy: take every row of the left table paired with every row of the right table (the **Cartesian product**), then keep only the pairs where the `ON` condition is true. That's an **inner join**. An **outer join** (`LEFT` or `RIGHT`) also keeps the rows from one side that found no partner, padding the other side's columns with `NULL`. A **self join** is a table joined to itself under two aliases. A **semi join** asks \"does at least one partner exist?\" and returns each left row at most once, and an **anti join** asks \"does no partner exist?\". MySQL doesn't build the Cartesian product, of course; it uses an index lookup per row or a hash table, and this lesson measures both.",
        },
        {
          type: "paragraph",
          text: "Most join bugs aren't syntax errors: they're queries that run and return the wrong number of rows. A filter in the wrong clause drops the drivers you wanted to see. A one-to-many join repeats a fare once per payment and `SUM` adds it twice. `NOT IN` meets a `NULL` and returns nothing. Every one of those is measured here with real row counts, then the engine side: `eq_ref` and `ref` in `EXPLAIN`, hash join since 8.0.18, join order and `STRAIGHT_JOIN`, `join_buffer_size`, and `EXPLAIN ANALYZE` timings on 500,000 trips with and without an index on the join column. The next lesson, GROUP BY, HAVING and Aggregate Functions, builds on the fan-out problem from here, because most aggregation bugs start as join bugs.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Edgar Codd's 1970 paper on the relational model defined the join as an operation of relational algebra: a product of two relations restricted by a condition. Early SQL had no `JOIN` keyword at all; you listed tables with commas in `FROM` and wrote the condition in `WHERE`, which is why that style is still called a comma join or theta join. Outer joins existed only as vendor extensions (Oracle's `(+)`, Sybase's `*=`) until SQL-92 standardised the explicit syntax used today.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Codd, 1970", "Join defined in relational algebra", "A join is a filtered Cartesian product"],
            ["SQL-86 / SQL-89", "Comma joins: `FROM a, b WHERE a.x = b.y`", "Still valid; easy to forget the condition and get a product"],
            ["SQL-92", "`INNER`, `LEFT`/`RIGHT`/`FULL OUTER`, `CROSS`, `NATURAL`, `USING`", "The syntax in this lesson; `ON` and `WHERE` became different places"],
            ["MySQL 3.23 to 5.x", "`LEFT`/`RIGHT JOIN`, `STRAIGHT_JOIN`; joins run as nested loops", "No `FULL OUTER JOIN`, then and now"],
            ["MySQL 5.6 (2013)", "Block Nested Loop and Batched Key Access join buffers; semi join strategies (FirstMatch, LooseScan, Materialization, DuplicateWeedout)", "`IN`/`EXISTS` subqueries stopped being slow by default"],
            ["MySQL 8.0.16 / 8.0.17", "Semi join for `EXISTS`; `NOT EXISTS` and `NOT IN` turned into anti joins", "`Nested loop antijoin` in the plans below"],
            ["MySQL 8.0.18 (2019)", "Hash join for inner equi-joins; `EXPLAIN ANALYZE`; `EXPLAIN FORMAT=TREE` shows `Inner hash join`", "The second join algorithm"],
            ["MySQL 8.0.20 (2020)", "Hash join also for outer, semi and anti joins; Block Nested Loop removed", "`Using join buffer (hash join)` replaces `(Block Nested Loop)`"],
            ["MySQL 8.0.45", "The server used in this lesson", "Every output below came from it"],
          ],
        },
        {
          type: "paragraph",
          text: "Two things in that table matter more than the rest. Hash join made joins without a usable index far less painful, which changes the advice \"always index join columns\" from \"or the query will never finish\" to \"or it will scan the whole table every time\". And MySQL still has no `FULL OUTER JOIN` in 8.0 (I only ran 8.0.45, where it's a syntax error); the workaround is a `UNION`, shown below.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A dispatch office at the end of a day, with a box of driver cards and a pile of trip sheets.",
        },
        {
          type: "list",
          items: [
            "**An inner join is stapling each trip sheet to its driver's card.** Sheets with no driver (a trip nobody accepted) and cards with no sheets (a driver who sat idle) end up in neither pile of stapled pairs.",
            "**A left join is a roll call.** Every driver card goes on the table, with whatever sheets belong to it, or an empty slot if there are none. Nobody is missing from the roll call just because they had no trips.",
            "**A nested loop with an index is the index tabs on the sheet box.** For each driver card, flip straight to that driver's tab. Fast when there are a few cards; slow when you do it 490,000 times.",
            "**A hash join is sorting the cards into pigeonholes first.** Put every driver card into a pigeonhole by driver number, then walk through the trip sheets once and drop each one into its pigeonhole. One pass over each pile, no tabs needed.",
            "**Fan-out is photocopying.** If a trip was paid in two parts, the payments clerk staples two receipts to it, and someone who later adds up \"the fare on every stapled bundle\" counts that fare twice.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: a person would notice a duplicated trip sheet. A database never does. A join returns exactly the pairs the condition allows, and if that's 149,000 paise of \"fares\" from 100,000 paise of trips, that's the answer you get, with no warning.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/mysql/mysql-joins-algorithms.svg",
          alt: "Three columns compare how MySQL 8.0.45 executed drivers JOIN trips for the 1,667 Pune sedan drivers out of 20,000 drivers and 500,000 trips. Column one, nested loop with index lookup: scan and filter drivers to 1,667 rows, then for each one look up idx_driver on trips, about 25 trips each; EXPLAIN type ref; 78 to 255 ms. Column two, nested loop without an index on trips.driver_id: the optimizer scans all 490,000 trips with a driver and does a primary key lookup on drivers for each, then throws away 91.5 percent; EXPLAIN type eq_ref; 790 to 1,124 ms. Column three, hash join: build a hash table from the 1,667 filtered drivers and probe it with one scan of the 500,000 trips; Extra says Using join buffer (hash join) and the tree says Inner hash join; 173 to 284 ms. Below, three boxes about correctness on the small data set of 5 drivers, 8 trips and 7 payments: a right-table filter in WHERE returns 3 drivers and hides Neha and Imran, while the same filter in ON returns 5 drivers; summing fares from trips gives 100,000 paise but after joining payments gives 149,000 paise; LEFT JOIN IS NULL and NOT EXISTS both find Neha, while NOT IN returns an empty set because one trip has a NULL driver.",
          caption: "The algorithm decides how long a join takes; the clauses decide whether its answer is right. Both are measured in this lesson.",
        },
        {
          type: "heading",
          text: "The demo schema",
        },
        {
          type: "paragraph",
          text: "A small database, `mysql_joins`, holds the ride-hailing tables with a handful of rows so every result fits on screen. The rows are chosen to contain the awkward cases: a rider nobody referred, riders with no trips (Priya, Kabir), a driver with no trips (Neha), a driver with only a cancelled trip (Imran), a trip with no driver (106, cancelled before anyone accepted), a trip paid in two parts (102: wallet plus card) and a trip whose first card payment failed (103).",
        },
        {
          type: "code",
          language: "sql",
          title: "schema.sql",
          code: `CREATE DATABASE mysql_joins;
USE mysql_joins;
CREATE TABLE riders (
  id INT PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  city VARCHAR(30) NOT NULL,
  referred_by INT NULL,                 -- another rider's id
  KEY idx_referred_by (referred_by)
);
CREATE TABLE drivers (
  id INT PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  city VARCHAR(30) NOT NULL,
  vehicle VARCHAR(12) NOT NULL
);
CREATE TABLE trips (
  id INT PRIMARY KEY,
  rider_id INT NOT NULL,
  driver_id INT NULL,                   -- NULL until a driver accepts
  status VARCHAR(12) NOT NULL,
  requested_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  fare_paise INT NOT NULL,
  KEY idx_rider (rider_id),
  KEY idx_driver (driver_id)
);
CREATE TABLE payments (
  id INT PRIMARY KEY,
  trip_id INT NOT NULL,
  method VARCHAR(10) NOT NULL,
  amount_paise INT NOT NULL,
  status VARCHAR(10) NOT NULL,
  KEY idx_trip (trip_id)
);
CREATE TABLE surge_zones (id INT PRIMARY KEY, name VARCHAR(20), city VARCHAR(30));
CREATE TABLE vehicle_classes (code VARCHAR(12) PRIMARY KEY, base_paise INT);

INSERT INTO riders VALUES
 (1,'Asha','Kolkata',NULL),(2,'Ravi','Kolkata',1),(3,'Meera','Bengaluru',1),
 (4,'Farhan','Bengaluru',3),(5,'Priya','Kolkata',NULL),(6,'Kabir','Pune',2);
INSERT INTO drivers VALUES
 (1,'Vikram','Kolkata','sedan'),(2,'Sunita','Kolkata','hatchback'),(3,'Arjun','Bengaluru','auto'),
 (4,'Neha','Bengaluru','sedan'),(5,'Imran','Pune','bike');
INSERT INTO trips VALUES
 (101,1,1,'completed','2026-11-02 08:00:00','2026-11-02 08:25:00',24000),
 (102,2,1,'completed','2026-11-02 08:31:00','2026-11-02 08:50:00',18000),
 (103,1,2,'completed','2026-11-02 09:10:00','2026-11-02 09:40:00',31000),
 (104,3,3,'completed','2026-11-02 10:00:00','2026-11-02 10:20:00',15000),
 (105,4,3,'cancelled','2026-11-02 10:30:00',NULL,0),
 (106,2,NULL,'cancelled','2026-11-02 11:00:00',NULL,0),
 (107,3,3,'completed','2026-11-02 10:26:00','2026-11-02 10:45:00',12000),
 (108,4,5,'cancelled','2026-11-02 12:00:00',NULL,0);
INSERT INTO payments VALUES
 (1,101,'card',24000,'captured'),
 (2,102,'wallet',10000,'captured'), (3,102,'card',8000,'captured'),    -- split payment
 (4,103,'card',31000,'failed'),     (5,103,'card',31000,'captured'),  -- retry after a failure
 (6,104,'upi',15000,'captured'),
 (7,107,'upi',12000,'captured');
INSERT INTO surge_zones VALUES (1,'SALT-LAKE','Kolkata'),(2,'NEW-TOWN','Kolkata'),(3,'KORAMANGALA','Bengaluru');
INSERT INTO vehicle_classes VALUES ('auto',3000),('hatchback',5000),('sedan',8000);`,
        },
        {
          type: "code",
          language: "bash",
          code: `docker exec -i lesson-mysql mysql -uroot -plesson --default-character-set=utf8mb4 < schema.sql
docker exec -i lesson-mysql mysql -uroot -plesson --default-character-set=utf8mb4 -t -vvv mysql_joins < query.sql`,
        },
        {
          type: "paragraph",
          text: "The server is MySQL 8.0.45 in Docker, set up as in How MySQL Runs a Query: Setup, Tables and Data Types. In the outputs below I've removed the client's echo of each statement and kept the result table and its `rows in set` line.",
        },
        {
          type: "heading",
          text: "The join types",
        },
        {
          type: "table",
          headers: ["Join", "Returns", "Unmatched left rows", "Unmatched right rows", "In MySQL 8.0"],
          rows: [
            ["`[INNER] JOIN ... ON`", "Pairs where the condition is true", "Dropped", "Dropped", "Yes; `JOIN` alone means inner"],
            ["`LEFT [OUTER] JOIN`", "Inner pairs plus every unmatched left row", "Kept, right columns `NULL`", "Dropped", "Yes"],
            ["`RIGHT [OUTER] JOIN`", "Inner pairs plus every unmatched right row", "Dropped", "Kept, left columns `NULL`", "Yes; rewritten internally as a `LEFT JOIN`"],
            ["`FULL OUTER JOIN`", "Both kinds of unmatched rows", "Kept", "Kept", "**No**; emulate with `UNION`"],
            ["`CROSS JOIN`", "Every pair (the Cartesian product)", "n/a", "n/a", "Yes; in MySQL, `CROSS JOIN` and `JOIN` are interchangeable"],
            ["Self join", "A table joined to itself under two aliases", "Depends on inner/outer", "Depends", "Yes"],
            ["Semi join (`EXISTS`, `IN`)", "Left rows with at least one match, once each", "Dropped", "Never returned", "Yes; FirstMatch, LooseScan, Materialization, DuplicateWeedout"],
            ["Anti join (`NOT EXISTS`, `LEFT ... IS NULL`)", "Left rows with no match", "The only rows returned", "Never returned", "Yes; `Nested loop antijoin` since 8.0.17"],
          ],
        },
        {
          type: "heading",
          text: "What EXPLAIN says about each joined table",
        },
        {
          type: "table",
          headers: ["`type` in EXPLAIN", "Meaning for a joined table", "Tree format says", "Typical cause"],
          rows: [
            ["`eq_ref`", "At most one row per row of the previous table, via a unique index", "`Single-row index lookup on d using PRIMARY`", "Joining to a primary key or unique `NOT NULL` key"],
            ["`ref`", "Possibly several rows per previous row, via a non-unique index", "`Index lookup on t using idx_driver`", "Joining to an indexed foreign key"],
            ["`ALL` + `Using join buffer (hash join)`", "Scan this table once, match through a hash table", "`Inner hash join`, `Left hash join`", "No usable index on the join column"],
            ["`ALL` without a join buffer", "Scan this table once per previous row", "`Nested loop` over `Table scan`", "Hash join disabled (`NO_BNL`); a join with only a non-equality condition still gets `Inner hash join (no condition)` plus a filter"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "MySQL 8.0 executes every join as a pipeline of iterators, and `EXPLAIN FORMAT=TREE` prints that pipeline directly. There are two join algorithms. A **nested loop join** reads a row from the outer (first) table and, for each one, finds matching rows in the inner table, ideally through an index (`eq_ref` or `ref`). A **hash join** reads one input completely into an in-memory hash table keyed by the join column (the **build** side), then scans the other input once and looks each row up in the hash table (the **probe** side). The optimizer chooses the join order and the access method for each table by estimated cost. To see real differences, I needed more than eight trips.",
        },
        {
          type: "heading",
          text: "A bigger data set: 500,000 trips",
        },
        {
          type: "paragraph",
          text: "A second database, `mysql_joins_big`, has the same tables with generated rows: 20,000 drivers, 100,000 riders, 500,000 trips and about 540,000 payments. Drivers 18,001 to 20,000 never get a trip, every 50th trip has no driver, every 10th is cancelled, and about one completed trip in ten is split across two payments (one in ten has a failed attempt before the captured one). `trips` starts with **no index on `driver_id`**.",
        },
        {
          type: "code",
          language: "sql",
          title: "big.sql",
          code: `CREATE DATABASE mysql_joins_big;
USE mysql_joins_big;
CREATE TABLE digits (d INT PRIMARY KEY);
INSERT INTO digits VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);
CREATE TABLE seq (n INT PRIMARY KEY);                      -- 1 .. 1,000,000
INSERT INTO seq
SELECT 1 + a.d + 10*b.d + 100*c.d + 1000*e.d + 10000*f.d + 100000*g.d
FROM digits a, digits b, digits c, digits e, digits f, digits g;

CREATE TABLE drivers (id INT PRIMARY KEY, name VARCHAR(40) NOT NULL, city VARCHAR(30) NOT NULL, vehicle VARCHAR(12) NOT NULL);
INSERT INTO drivers
SELECT n, CONCAT('driver-', n), ELT(1 + n % 4, 'Kolkata','Bengaluru','Pune','Delhi'), ELT(1 + n % 3, 'auto','hatchback','sedan')
FROM seq WHERE n <= 20000;

CREATE TABLE riders (id INT PRIMARY KEY, name VARCHAR(40) NOT NULL, city VARCHAR(30) NOT NULL, referred_by INT NULL);
INSERT INTO riders
SELECT n, CONCAT('rider-', n), ELT(1 + n % 4, 'Kolkata','Bengaluru','Pune','Delhi'),
       CASE WHEN n % 3 = 0 AND n > 10 THEN 1 + (n * 13) % (n - 1) END
FROM seq WHERE n <= 100000;

CREATE TABLE trips (id INT PRIMARY KEY, rider_id INT NOT NULL, driver_id INT NULL, status VARCHAR(12) NOT NULL,
                    requested_at DATETIME NOT NULL, completed_at DATETIME NULL, fare_paise INT NOT NULL);
INSERT INTO trips
SELECT n, 1 + (n * 7919) % 100000,
       CASE WHEN n % 50 = 0 THEN NULL ELSE 1 + (n * 104729) % 18000 END,
       CASE WHEN n % 10 = 0 THEN 'cancelled' ELSE 'completed' END,
       '2026-11-01' + INTERVAL ((n * 37) % 43200) MINUTE,
       CASE WHEN n % 10 = 0 THEN NULL ELSE '2026-11-01' + INTERVAL ((n * 37) % 43200) + 20 MINUTE END,
       CASE WHEN n % 10 = 0 THEN 0 ELSE 8000 + (n * 31) % 40000 END
FROM seq WHERE n <= 500000;

CREATE TABLE payments (id INT AUTO_INCREMENT PRIMARY KEY, trip_id INT NOT NULL, method VARCHAR(10) NOT NULL,
                       amount_paise INT NOT NULL, status VARCHAR(10) NOT NULL);
INSERT INTO payments (trip_id, method, amount_paise, status)          -- one captured payment per completed trip,
SELECT id, IF(CRC32(id) % 10 = 3, 'wallet', 'card'),                  -- about 1 in 10 split wallet + card
       IF(CRC32(id) % 10 = 3, fare_paise - 5000, fare_paise), 'captured'
FROM trips WHERE status = 'completed';
INSERT INTO payments (trip_id, method, amount_paise, status)
SELECT id, 'card', 5000, 'captured' FROM trips WHERE status = 'completed' AND CRC32(id) % 10 = 3;
INSERT INTO payments (trip_id, method, amount_paise, status)          -- about 1 in 10 failed once first
SELECT id, 'card', fare_paise, 'failed' FROM trips WHERE status = 'completed' AND CRC32(id) % 10 = 7;
ANALYZE TABLE drivers, riders, trips, payments;`,
        },
        {
          type: "output",
          text: `+---------+--------+--------+----------+-----------------+
| drivers | riders | trips  | payments | trips_no_driver |
+---------+--------+--------+----------+-----------------+
|   20000 | 100000 | 500000 |   540026 |           10000 |
+---------+--------+--------+----------+-----------------+`,
        },
        {
          type: "paragraph",
          text: "Loading took about a minute in the container. (Row estimates such as `rows=20347` and `rows=19885` for `drivers` differ slightly between outputs below, because statistics were refreshed by `ANALYZE TABLE` as I added indexes and tables during the session.) The test query throughout this section is a per-driver summary for one slice of the fleet, Pune sedans: 1,667 of the 20,000 drivers, 1,500 of whom have trips.",
        },
        {
          type: "heading",
          text: "Nested loop with an index lookup: eq_ref and ref",
        },
        {
          type: "code",
          language: "sql",
          title: "ea4.sql (after ALTER TABLE trips ADD INDEX idx_driver (driver_id))",
          code: `EXPLAIN
SELECT d.id, COUNT(*) AS trips, SUM(t.fare_paise) AS fares
FROM drivers d JOIN trips t ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan'
GROUP BY d.id;

EXPLAIN ANALYZE
SELECT d.id, COUNT(*) AS trips, SUM(t.fare_paise) AS fares
FROM drivers d JOIN trips t ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan'
GROUP BY d.id;`,
        },
        {
          type: "output",
          text: `+----+-------------+-------+------------+-------+---------------+------------+---------+----------------------+-------+----------+-------------+
| id | select_type | table | partitions | type  | possible_keys | key        | key_len | ref                  | rows  | filtered | Extra       |
+----+-------------+-------+------------+-------+---------------+------------+---------+----------------------+-------+----------+-------------+
|  1 | SIMPLE      | d     | NULL       | index | PRIMARY       | PRIMARY    | 4       | NULL                 | 20347 |     1.00 | Using where |
|  1 | SIMPLE      | t     | NULL       | ref   | idx_driver    | idx_driver | 5       | mysql_joins_big.d.id |    28 |   100.00 | NULL        |
+----+-------------+-------+------------+-------+---------------+------------+---------+----------------------+-------+----------+-------------+

-> Group aggregate: count(0), sum(t.fare_paise)  (cost=4609 rows=5603) (actual time=0.217..90.6 rows=1500 loops=1)
    -> Nested loop inner join  (cost=4049 rows=5603) (actual time=0.148..85.2 rows=41667 loops=1)
        -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=2088 rows=199) (actual time=0.0863..9.67 rows=1667 loops=1)
            -> Index scan on d using PRIMARY  (cost=2088 rows=19885) (actual time=0.0821..6.54 rows=20000 loops=1)
        -> Index lookup on t using idx_driver (driver_id=d.id)  (cost=7.06 rows=28.2) (actual time=0.0411..0.0439 rows=25 loops=1667)`,
        },
        {
          type: "list",
          items: [
            "**Read the tree from the inside out.** The outer input is `drivers`, scanned in primary key order and filtered to 1,667 rows. For each, `Index lookup on t using idx_driver` dives into the B-tree for that `driver_id` (`loops=1667`) and returns about 25 trips (`rows=25`). That's a `ref` access: a non-unique index, possibly many rows per lookup.",
            "**`actual time=0.0411..0.0439` is per loop**: first row after 0.041 ms, all rows after 0.044 ms, averaged over 1,667 loops. Multiply by `loops` to get the total. The whole query took 90.6 ms in this run; across nine warm runs it took 78 to 255 ms (the machine was shared with other work, so treat the range as noise).",
            "**`Group aggregate` with no temporary table**: because drivers arrive in primary key order, rows for one driver are adjacent, so MySQL can aggregate in a stream. Keep that in mind for the next plan.",
          ],
        },
        {
          type: "heading",
          text: "Nested loop without an index on the join column",
        },
        {
          type: "code",
          language: "sql",
          title: "ea5.sql",
          code: `EXPLAIN ANALYZE
SELECT d.id, COUNT(*) AS trips, SUM(t.fare_paise) AS fares
FROM drivers d JOIN trips t IGNORE INDEX (idx_driver) ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan'
GROUP BY d.id;`,
        },
        {
          type: "output",
          text: `-> Table scan on <temporary>  (actual time=820..820 rows=1500 loops=1)
    -> Aggregate using temporary table  (actual time=820..820 rows=1500 loops=1)
        -> Nested loop inner join  (cost=408851 rows=24923) (actual time=0.26..796 rows=41667 loops=1)
            -> Filter: (t.driver_id is not null)  (cost=50303 rows=498456) (actual time=0.242..166 rows=490000 loops=1)
                -> Table scan on t  (cost=50303 rows=498456) (actual time=0.242..136 rows=500000 loops=1)
            -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=0.619 rows=0.05) (actual time=0.00119..0.0012 rows=0.085 loops=490000)
                -> Single-row index lookup on d using PRIMARY (id=t.driver_id)  (cost=0.619 rows=1) (actual time=941e-6..961e-6 rows=1 loops=490000)`,
        },
        {
          type: "list",
          items: [
            "**The optimizer flipped the join order.** With no index on `trips.driver_id`, driving from `drivers` would mean scanning `trips` once per driver. So it drives from `trips` instead and looks each driver up by primary key: `Single-row index lookup`, which is `eq_ref` in the traditional format. That's 490,000 lookups (every trip with a driver), and the filter after it keeps 8.5% of them (`rows=0.085`).",
            "**It also added `t.driver_id is not null` on its own**: a `NULL` can never equal anything, so those 10,000 trips are skipped before any lookup.",
            "**The rows now arrive in trip order, not driver order**, so the plan needs `Aggregate using temporary table`. Join order changes more than the join.",
            "**820 ms here; 790 to 1,124 ms over seven runs**, against 78 to 255 ms with the index. Each lookup is about a microsecond (`941e-6` ms), but 490,000 of them add up.",
          ],
        },
        {
          type: "heading",
          text: "Hash join: Inner hash join and Using join buffer (hash join)",
        },
        {
          type: "paragraph",
          text: "To see a hash join, take away the index on both sides of the join column. That's what happens in production when the join condition can't use any index (an expression, a type mismatch, or a table nobody indexed):",
        },
        {
          type: "code",
          language: "sql",
          title: "ea6.sql",
          code: `EXPLAIN
SELECT d.id, COUNT(*) FROM drivers d IGNORE INDEX (PRIMARY) JOIN trips t IGNORE INDEX (idx_driver) ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan' GROUP BY d.id;

EXPLAIN ANALYZE
SELECT d.id, COUNT(*) AS trips, SUM(t.fare_paise) AS fares
FROM drivers d IGNORE INDEX (PRIMARY) JOIN trips t IGNORE INDEX (idx_driver) ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan'
GROUP BY d.id;`,
        },
        {
          type: "output",
          text: `+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+--------------------------------------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows   | filtered | Extra                                      |
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+--------------------------------------------+
|  1 | SIMPLE      | d     | NULL       | ALL  | NULL          | NULL | NULL    | NULL |  20347 |     1.00 | Using where; Using temporary               |
|  1 | SIMPLE      | t     | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 498456 |     0.01 | Using where; Using join buffer (hash join) |
+----+-------------+-------+------------+------+---------------+------+---------+------+--------+----------+--------------------------------------------+

-> Table scan on <temporary>  (actual time=185..185 rows=1500 loops=1)
    -> Aggregate using temporary table  (actual time=185..185 rows=1500 loops=1)
        -> Inner hash join (t.driver_id = d.id)  (cost=9.91e+6 rows=5603) (actual time=7.81..169 rows=41667 loops=1)
            -> Table scan on t  (cost=2.62 rows=498456) (actual time=0.237..115 rows=500000 loops=1)
            -> Hash
                -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=2088 rows=199) (actual time=0.115..7.31 rows=1667 loops=1)
                    -> Table scan on d  (cost=2088 rows=19885) (actual time=0.111..5.05 rows=20000 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**The child under `-> Hash` is the build side**: the 1,667 filtered drivers went into a hash table on `d.id` in 7.31 ms. Then `trips` was scanned once (`loops=1`), and each of the 500,000 rows was probed against the hash table. The first joined row came out at 7.81 ms, right after the build finished.",
            "**185 ms here; 173 to 284 ms over seven runs.** Faster than the 490,000 primary key lookups (790 to 1,124 ms), slower than the indexed nested loop (78 to 255 ms), because it still reads all 500,000 trips.",
            "**The optimizer didn't choose this plan when it had the choice.** In `ea5.sql`, the primary key on `drivers` was available, so it costed 490,000 lookups as cheaper than a hash join, and was wrong by about four times on this machine. Cost models are estimates; `EXPLAIN ANALYZE` is how you find out.",
            "**In the traditional format, the hash join is `Using join buffer (hash join)`** on the second table. Before 8.0.20 the same column could say `Using join buffer (Block Nested Loop)`; that algorithm was removed in 8.0.20, and on 8.0.45 I never saw it.",
          ],
        },
        {
          type: "heading",
          text: "What hash join replaced: a pure nested loop",
        },
        {
          type: "paragraph",
          text: "The optimizer hint `NO_BNL` (the name survives from Block Nested Loop; since 8.0.20 `BNL` and `NO_BNL` switch hash joins on and off) forces a plain nested loop: scan `trips` once **per driver**. On all 1,667 drivers that's 833 million row reads, so I limited it to the 10 drivers with `id <= 120`:",
        },
        {
          type: "code",
          language: "sql",
          title: "nobnl.sql",
          code: `EXPLAIN ANALYZE
SELECT /*+ NO_BNL(d, t) */ d.id, COUNT(*) FROM drivers d IGNORE INDEX (PRIMARY) JOIN trips t IGNORE INDEX (idx_driver) ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan' AND d.id <= 120 GROUP BY d.id;

EXPLAIN ANALYZE
SELECT d.id, COUNT(*) FROM drivers d IGNORE INDEX (PRIMARY) JOIN trips t IGNORE INDEX (idx_driver) ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan' AND d.id <= 120 GROUP BY d.id;`,
        },
        {
          type: "output",
          text: `-> Table scan on <temporary>  (actual time=1902..1902 rows=10 loops=1)
    -> Aggregate using temporary table  (actual time=1902..1902 rows=10 loops=1)
        -> Nested loop inner join  (cost=3.51e+6 rows=1911) (actual time=6.4..1901 rows=277 loops=1)
            -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune') and (d.id <= 120))  (cost=2131 rows=67.8) (actual time=0.464..51.2 rows=10 loops=1)
                -> Table scan on d  (cost=2131 rows=20347) (actual time=0.461..48.6 rows=20000 loops=1)
            -> Filter: (t.driver_id = d.id)  (cost=1827 rows=28.2) (actual time=3.77..185 rows=27.7 loops=10)
                -> Table scan on t  (cost=1827 rows=498456) (actual time=1.66..154 rows=500000 loops=10)

-> Table scan on <temporary>  (actual time=164..164 rows=10 loops=1)
    -> Aggregate using temporary table  (actual time=164..164 rows=10 loops=1)
        -> Inner hash join (t.driver_id = d.id)  (cost=3.38e+6 rows=1911) (actual time=10.4..163 rows=277 loops=1)
            -> Table scan on t  (cost=7.08 rows=498456) (actual time=1.47..112 rows=500000 loops=1)
            -> Hash
                -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune') and (d.id <= 120))  (cost=2059 rows=67.8) (actual time=0.0841..8.6 rows=10 loops=1)
                    -> Table scan on d  (cost=2059 rows=20347) (actual time=0.0813..5.86 rows=20000 loops=1)`,
        },
        {
          type: "paragraph",
          text: "`Table scan on t ... rows=500000 loops=10`: five million row reads, 1,902 ms, for 10 drivers. The hash join read `trips` once and took 164 ms. A pure nested loop costs outer rows times inner rows; a hash join costs outer plus inner. That difference is why MySQL had Block Nested Loop (which read the outer rows into a buffer and scanned the inner table once per buffer-full) and why it now has hash join.",
        },
        {
          type: "heading",
          text: "Hash joins and join_buffer_size: spilling to disk",
        },
        {
          type: "paragraph",
          text: "The hash table lives in memory bounded by `join_buffer_size` (default 256 KB). When the build side doesn't fit, MySQL partitions both inputs into **chunk files** on disk by hash value and joins them chunk by chunk. `performance_schema` exposes both the memory (`memory/sql/hash_join`) and the file I/O (`wait/io/file/sql/hash_join`) per thread. A join of all 500,000 trips to their 494,919 captured payments, with indexes ignored:",
        },
        {
          type: "code",
          language: "sql",
          title: "joinbuf.sql",
          code: `SET SESSION join_buffer_size = 256 * 1024;          -- the default; second run: 64 * 1024 * 1024
SELECT COUNT(*), SUM(p.amount_paise) FROM trips t IGNORE INDEX (PRIMARY)
JOIN payments p IGNORE INDEX (idx_trip) ON p.trip_id = t.id WHERE p.status = 'captured';
SELECT @@join_buffer_size AS join_buffer_size,
  (SELECT HIGH_NUMBER_OF_BYTES_USED FROM performance_schema.memory_summary_by_thread_by_event_name
    WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME = 'memory/sql/hash_join') AS hash_mem_peak,
  (SELECT COUNT_STAR FROM performance_schema.events_waits_summary_by_thread_by_event_name
    WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND EVENT_NAME = 'wait/io/file/sql/hash_join') AS chunk_file_io;`,
        },
        {
          type: "output",
          text: `+----------+---------------------+
| COUNT(*) | SUM(p.amount_paise) |
+----------+---------------------+
|   494919 |         12594000000 |
+----------+---------------------+
+------------------+---------------+---------------+
| join_buffer_size | hash_mem_peak | chunk_file_io |
+------------------+---------------+---------------+
|           262144 |        133616 |          1344 |
+------------------+---------------+---------------+

+----------+---------------------+
| COUNT(*) | SUM(p.amount_paise) |
+----------+---------------------+
|   494919 |         12594000000 |
+----------+---------------------+
+------------------+---------------+---------------+
| join_buffer_size | hash_mem_peak | chunk_file_io |
+------------------+---------------+---------------+
|         67108864 |      14316872 |             0 |
+------------------+---------------+---------------+`,
        },
        {
          type: "paragraph",
          text: "The plan of that join, from `EXPLAIN ANALYZE` with the 64 MB buffer:",
        },
        {
          type: "output",
          text: `-> Aggregate: count(0), sum(p.amount_paise)  (cost=2.68e+9 rows=1) (actual time=627..627 rows=1 loops=1)
    -> Inner hash join (t.id = p.trip_id)  (cost=2.68e+9 rows=53812) (actual time=331..590 rows=494919 loops=1)
        -> Covering index scan on t using idx_driver  (cost=0.00883 rows=498456) (actual time=1.91..73.7 rows=500000 loops=1)
        -> Hash
            -> Filter: (p.\`status\` = 'captured')  (cost=54220 rows=53812) (actual time=0.238..213 rows=494919 loops=1)
                -> Table scan on p  (cost=54220 rows=538117) (actual time=0.235..135 rows=540026 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**With the default 256 KB, the hash join peaked at 133,616 bytes of memory and did 1,344 file operations**: the build side (494,919 payment rows) didn't fit, so it went to chunk files. With 64 MB, it used 14.3 MB of memory and touched no files.",
            "**The answer is identical either way.** Spilling changes speed, not results: the hash join node finished at 704 to 804 ms with spilling and 577 to 625 ms in memory, over three runs each. The files were on a fast SSD with plenty of page cache, so the penalty here is mild; on busy disks it's larger.",
            "**The build side was `payments`**, the input the optimizer estimated as smaller (`rows=53812`, a badly wrong estimate of the 494,919 that passed the filter, because `status` has no statistics). `trips` was read through `idx_driver`, the smallest index that contains `id` (a covering index scan, since every secondary index also stores the primary key).",
            "**Raise `join_buffer_size` per session, not globally**: it's allocated per join per connection, so a large global value multiplied by hundreds of connections is real memory. Better still, give the join an index.",
          ],
        },
        {
          type: "heading",
          text: "Join order: the optimizer trace",
        },
        {
          type: "paragraph",
          text: "For an inner join, the order you write the tables in doesn't matter: the optimizer considers the possible orders (greedily for many tables, governed by `optimizer_search_depth`) and costs each. The optimizer trace shows the search. Here the query names `trips` first (the trace below is trimmed to its join-order part, with short objects folded onto one line):",
        },
        {
          type: "code",
          language: "sql",
          title: "trace.sql",
          code: `SET optimizer_trace = 'enabled=on';
SET optimizer_trace_max_mem_size = 1048576;
SELECT d.id, COUNT(*) AS trips, SUM(t.fare_paise) AS fares
FROM trips t JOIN drivers d ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan'
GROUP BY d.id LIMIT 1;
SELECT TRACE FROM information_schema.OPTIMIZER_TRACE;`,
        },
        {
          type: "output",
          text: `"considered_execution_plans": [
 {
  "plan_prefix": [],
  "table": "\`drivers\` \`d\`",
  "best_access_path": {
   "considered_access_paths": [
    { "access_type": "ref", "index": "PRIMARY", "usable": false, "chosen": false },
    { "rows_to_scan": 20347, "final_filtering_effect": 0.01, "access_type": "scan",
      "resulting_rows": 203.47, "cost": 2058.95, "chosen": true }
   ]
  },
  "rows_for_plan": 203.47,
  "cost_for_plan": 2058.95,
  "rest_of_plan": [
   {
    "plan_prefix": [ "\`drivers\` \`d\`" ],
    "table": "\`trips\` \`t\`",
    "best_access_path": {
     "considered_access_paths": [
      { "access_type": "ref", "index": "idx_driver", "rows": 28.1757, "cost": 2006.52, "chosen": true },
      { "rows_to_scan": 498456, "access_type": "scan", "using_join_cache": true,
        "resulting_rows": 498456, "cost": 10142600.0, "chosen": false }
     ]
    },
    "rows_for_plan": 5732.91,
    "cost_for_plan": 4065.47,
    "chosen": true
   }
  ]
 },
 {
  "plan_prefix": [],
  "table": "\`trips\` \`t\`",
  "best_access_path": {
   "considered_access_paths": [
    { "access_type": "ref", "index": "idx_driver", "usable": false, "chosen": false },
    { "rows_to_scan": 498456, "access_type": "scan", "resulting_rows": 498456,
      "cost": 50302.6, "chosen": true }
   ]
  },
  "rows_for_plan": 498456,
  "cost_for_plan": 50302.6,
  "pruned_by_cost": true
 }
]`,
        },
        {
          type: "list",
          items: [
            "**Two orders were considered.** `drivers` first: scan drivers (cost 2,058.95, about 203 rows after the city and vehicle filters), then `ref` on `idx_driver` for each, total 4,065.47. The alternative for the second table, a scan with a join buffer (`using_join_cache`, the hash join), cost 10,142,600 and lost.",
            "**`trips` first was abandoned at cost 50,302.6** (`pruned_by_cost`): just scanning `trips` already cost more than the whole best plan, so the optimizer didn't even cost the second table. That's the greedy search cutting branches.",
            "**The filter estimate was off by eight times**: `final_filtering_effect: 0.01` guessed 203 Pune sedans; there are 1,667. With no index or histogram on `city` and `vehicle`, MySQL assumes fixed selectivities. The right join order survived the bad estimate here; with a closer race it might not have.",
          ],
        },
        {
          type: "heading",
          text: "STRAIGHT_JOIN and JOIN_ORDER: overriding the order",
        },
        {
          type: "code",
          language: "sql",
          title: "sj.sql",
          code: `EXPLAIN ANALYZE
SELECT STRAIGHT_JOIN d.id, COUNT(*) AS trips, SUM(t.fare_paise) AS fares   -- tables joined in FROM order
FROM trips t JOIN drivers d ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan'
GROUP BY d.id;

EXPLAIN ANALYZE
SELECT /*+ JOIN_ORDER(d, t) */ d.id, COUNT(*) AS trips, SUM(t.fare_paise) AS fares
FROM trips t JOIN drivers d ON t.driver_id = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan'
GROUP BY d.id;`,
        },
        {
          type: "output",
          text: `-> Table scan on <temporary>  (actual time=624..624 rows=1500 loops=1)
    -> Aggregate using temporary table  (actual time=624..624 rows=1500 loops=1)
        -> Nested loop inner join  (cost=224762 rows=24923) (actual time=0.466..604 rows=41667 loops=1)
            -> Filter: (t.driver_id is not null)  (cost=50303 rows=498456) (actual time=0.435..146 rows=490000 loops=1)
                -> Table scan on t  (cost=50303 rows=498456) (actual time=0.434..122 rows=500000 loops=1)
            -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=0.25 rows=0.05) (actual time=864e-6..868e-6 rows=0.085 loops=490000)
                -> Single-row index lookup on d using PRIMARY (id=t.driver_id)  (cost=0.25 rows=1) (actual time=665e-6..682e-6 rows=1 loops=490000)

-> Group aggregate: count(0), sum(t.fare_paise)  (cost=4639 rows=5733) (actual time=0.246..255 rows=1500 loops=1)
    -> Nested loop inner join  (cost=4065 rows=5733) (actual time=0.157..252 rows=41667 loops=1)
        -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=2059 rows=203) (actual time=0.0641..8.09 rows=1667 loops=1)
            -> Index scan on d using PRIMARY  (cost=2059 rows=20347) (actual time=0.0625..5.64 rows=20000 loops=1)
        -> Index lookup on t using idx_driver (driver_id=d.id)  (cost=7.06 rows=28.2) (actual time=0.142..0.145 rows=25 loops=1667)`,
        },
        {
          type: "list",
          items: [
            "**`STRAIGHT_JOIN` forced the written order**, `trips` then `drivers`, even though `idx_driver` existed: 490,000 primary key lookups, 624 ms (763 ms on a second run). The optimizer's own order took 255 ms here and 78 ms on the second run.",
            "**`STRAIGHT_JOIN` can be a `SELECT` modifier (all tables in `FROM` order) or a join operator (`a STRAIGHT_JOIN b`, just that pair).** The 8.0 optimizer hints `JOIN_ORDER`, `JOIN_PREFIX`, `JOIN_SUFFIX` and `JOIN_FIXED_ORDER` do the same with more precision, and live in a comment so other databases ignore them.",
            "**Use them only after `EXPLAIN ANALYZE` proves the optimizer wrong**, and leave a comment why. A forced order is frozen: when the data changes, the optimizer can't adapt.",
          ],
        },
        {
          type: "heading",
          text: "The missing index on the many side",
        },
        {
          type: "paragraph",
          text: "A four-table join from the trip receipts screen: trips in one half hour, with rider, driver and payments. `payments.trip_id` had no index yet:",
        },
        {
          type: "code",
          language: "sql",
          title: "ex3a.sql",
          code: `EXPLAIN ANALYZE
SELECT t.id, r.name, d.name, p.amount_paise
FROM trips t
JOIN riders r   ON r.id = t.rider_id
JOIN drivers d  ON d.id = t.driver_id
JOIN payments p ON p.trip_id = t.id
WHERE t.requested_at >= '2026-11-02' AND t.requested_at < '2026-11-02 00:30:00';`,
        },
        {
          type: "output",
          text: `-> Nested loop inner join  (cost=353021 rows=59928) (actual time=1.33..1016 rows=375 loops=1)
    -> Nested loop inner join  (cost=287255 rows=59928) (actual time=0.971..953 rows=375 loops=1)
        -> Nested loop inner join  (cost=244148 rows=59928) (actual time=0.966..951 rows=375 loops=1)
            -> Table scan on p  (cost=55336 rows=539462) (actual time=0.874..160 rows=540026 loops=1)
            -> Filter: ((t.requested_at >= TIMESTAMP'2026-11-02 00:00:00') and (t.requested_at < TIMESTAMP'2026-11-02 00:30:00') and (t.driver_id is not null))  (cost=0.25 rows=0.111) (actual time=0.00139..0.00139 rows=694e-6 loops=540026)
                -> Single-row index lookup on t using PRIMARY (id=p.trip_id)  (cost=0.25 rows=1) (actual time=0.00119..0.00121 rows=1 loops=540026)
        -> Single-row index lookup on d using PRIMARY (id=t.driver_id)  (cost=0.619 rows=1) (actual time=0.00502..0.00504 rows=1 loops=375)
    -> Single-row index lookup on r using PRIMARY (id=t.rider_id)  (cost=0.997 rows=1) (actual time=0.167..0.167 rows=1 loops=375)`,
        },
        {
          type: "code",
          language: "sql",
          code: `ALTER TABLE payments ADD INDEX idx_trip (trip_id);
ANALYZE TABLE payments;
-- same EXPLAIN ANALYZE again`,
        },
        {
          type: "output",
          text: `-> Nested loop inner join  (cost=150869 rows=66231) (actual time=0.429..206 rows=375 loops=1)
    -> Nested loop inner join  (cost=127688 rows=55373) (actual time=0.393..202 rows=335 loops=1)
        -> Nested loop inner join  (cost=99572 rows=55373) (actual time=0.386..200 rows=335 loops=1)
            -> Filter: ((t.requested_at >= TIMESTAMP'2026-11-02 00:00:00') and (t.requested_at < TIMESTAMP'2026-11-02 00:30:00') and (t.driver_id is not null))  (cost=50303 rows=55373) (actual time=0.376..199 rows=335 loops=1)
                -> Table scan on t  (cost=50303 rows=498456) (actual time=0.366..146 rows=500000 loops=1)
            -> Single-row index lookup on d using PRIMARY (id=t.driver_id)  (cost=0.79 rows=1) (actual time=0.00437..0.00439 rows=1 loops=335)
        -> Single-row index lookup on r using PRIMARY (id=t.rider_id)  (cost=0.408 rows=1) (actual time=0.00526..0.00528 rows=1 loops=335)
    -> Index lookup on p using idx_trip (trip_id=t.id)  (cost=0.299 rows=1.2) (actual time=0.0107..0.0112 rows=1.12 loops=335)`,
        },
        {
          type: "list",
          items: [
            "**Without `idx_trip`, MySQL started from `payments`**, the only table it could reach the others from by primary key: 540,026 rows scanned and 540,026 lookups into `trips`, to find 375 rows. 1,016 ms (928 ms on a second run).",
            "**With `idx_trip`, it started from `trips`**, filtered to 335 trips, and did 335 lookups each into `drivers`, `riders` and `payments` (`ref`, `rows=1.12` because some trips have two payments). 206 ms (220 ms on a second run). Most of what's left is the scan of `trips`, because `requested_at` has no index; that's the subject of B-Tree Indexes and the InnoDB Clustered Index.",
            "**InnoDB doesn't index foreign key columns unless you declare a `FOREIGN KEY`** (which creates an index if none exists). These tables have no declared foreign keys, like many high-write schemas, so the index is your job.",
          ],
        },
      ],
    },
    {
      title: "INNER, LEFT and RIGHT Joins",
      blocks: [
        {
          type: "heading",
          text: "A join is a filtered Cartesian product",
        },
        {
          type: "code",
          language: "sql",
          title: "basics.sql",
          code: `SELECT COUNT(*) AS cartesian FROM riders, trips;
SELECT COUNT(*) AS matched FROM riders, trips WHERE trips.rider_id = riders.id;`,
        },
        {
          type: "output",
          text: `+-----------+
| cartesian |
+-----------+
|        48 |
+-----------+
1 row in set (0.00 sec)

+---------+
| matched |
+---------+
|       8 |
+---------+
1 row in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "Six riders times eight trips is 48 pairs; the condition keeps 8, one per trip, because every trip has exactly one rider. The comma syntax with the condition in `WHERE` is the old SQL-86 form of an inner join. It still works, but it puts join conditions and filters in the same clause, which is exactly where the bugs later in this lesson come from. Forget the condition and you get all 48 rows.",
        },
        {
          type: "heading",
          text: "INNER JOIN: only matched pairs",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT t.id AS trip, r.name AS rider, d.name AS driver, t.status, t.fare_paise
FROM trips t
JOIN riders  r ON r.id = t.rider_id
JOIN drivers d ON d.id = t.driver_id
ORDER BY t.id;`,
        },
        {
          type: "output",
          text: `+------+--------+--------+-----------+------------+
| trip | rider  | driver | status    | fare_paise |
+------+--------+--------+-----------+------------+
|  101 | Asha   | Vikram | completed |      24000 |
|  102 | Ravi   | Vikram | completed |      18000 |
|  103 | Asha   | Sunita | completed |      31000 |
|  104 | Meera  | Arjun  | completed |      15000 |
|  105 | Farhan | Arjun  | cancelled |          0 |
|  107 | Meera  | Arjun  | completed |      12000 |
|  108 | Farhan | Imran  | cancelled |          0 |
+------+--------+--------+-----------+------------+
7 rows in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "Eight trips went in, seven came out. Trip 106 has `driver_id = NULL`, and `d.id = NULL` is never true, so the inner join to `drivers` dropped it. Nothing warned me. On a trips screen that's a missing row; in a cancellation report it's a missing cancellation.",
        },
        {
          type: "heading",
          text: "LEFT JOIN: keep every row on the left",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT t.id AS trip, r.name AS rider, d.name AS driver, t.status
FROM trips t
JOIN riders r ON r.id = t.rider_id
LEFT JOIN drivers d ON d.id = t.driver_id
ORDER BY t.id;

SELECT d.name AS driver, t.id AS trip, t.status
FROM drivers d
LEFT JOIN trips t ON t.driver_id = d.id
ORDER BY d.id, t.id;`,
        },
        {
          type: "output",
          text: `+------+--------+--------+-----------+
| trip | rider  | driver | status    |
+------+--------+--------+-----------+
|  101 | Asha   | Vikram | completed |
|  102 | Ravi   | Vikram | completed |
|  103 | Asha   | Sunita | completed |
|  104 | Meera  | Arjun  | completed |
|  105 | Farhan | Arjun  | cancelled |
|  106 | Ravi   | NULL   | cancelled |
|  107 | Meera  | Arjun  | completed |
|  108 | Farhan | Imran  | cancelled |
+------+--------+--------+-----------+
8 rows in set (0.00 sec)

+--------+------+-----------+
| driver | trip | status    |
+--------+------+-----------+
| Vikram |  101 | completed |
| Vikram |  102 | completed |
| Sunita |  103 | completed |
| Arjun  |  104 | completed |
| Arjun  |  105 | cancelled |
| Arjun  |  107 | completed |
| Neha   | NULL | NULL      |
| Imran  |  108 | cancelled |
+--------+------+-----------+
8 rows in set (0.00 sec)`,
        },
        {
          type: "list",
          items: [
            "**Trip 106 is back**, with `NULL` in the driver column: a `LEFT JOIN` keeps every row of the left table and fills the right table's columns with `NULL` when nothing matched.",
            "**From the drivers side, Neha appears once with `NULL` trip columns.** Vikram appears twice and Arjun three times: a left join still repeats the left row once per match. \"Every left row at least once\" isn't \"every left row once\".",
            "**Which table is \"left\" is the whole meaning of the query.** `trips LEFT JOIN drivers` answers \"every trip, with its driver if any\"; `drivers LEFT JOIN trips` answers \"every driver, with their trips if any\". They're different questions.",
          ],
        },
        {
          type: "heading",
          text: "RIGHT JOIN: the same thing, mirrored",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT d.name AS driver, t.id AS trip, t.status
FROM drivers d
RIGHT JOIN trips t ON t.driver_id = d.id
ORDER BY t.id;`,
        },
        {
          type: "output",
          text: `+--------+------+-----------+
| driver | trip | status    |
+--------+------+-----------+
| Vikram |  101 | completed |
| Vikram |  102 | completed |
| Sunita |  103 | completed |
| Arjun  |  104 | completed |
| Arjun  |  105 | cancelled |
| NULL   |  106 | cancelled |
| Arjun  |  107 | completed |
| Imran  |  108 | cancelled |
+--------+------+-----------+
8 rows in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "`drivers RIGHT JOIN trips` is `trips LEFT JOIN drivers` with the tables swapped: every trip, Neha gone. MySQL converts right joins to left joins internally. Most teams write only `LEFT JOIN`, with the table whose rows must all appear first, because a query that mixes left and right joins is hard to read.",
        },
      ],
    },
    {
      title: "WHERE vs ON: The LEFT JOIN That Became INNER",
      blocks: [
        {
          type: "paragraph",
          text: "The most common join bug in production. The question: \"how many completed trips did each driver do?\", and every driver must be listed, including those with zero. The natural first draft puts the status filter in `WHERE`:",
        },
        {
          type: "code",
          language: "sql",
          title: "whereon.sql",
          code: `-- filter on the right table in WHERE
SELECT d.name AS driver, COUNT(t.id) AS completed_trips
FROM drivers d
LEFT JOIN trips t ON t.driver_id = d.id
WHERE t.status = 'completed'
GROUP BY d.id, d.name
ORDER BY d.id;

-- the same filter in ON
SELECT d.name AS driver, COUNT(t.id) AS completed_trips
FROM drivers d
LEFT JOIN trips t ON t.driver_id = d.id AND t.status = 'completed'
GROUP BY d.id, d.name
ORDER BY d.id;`,
        },
        {
          type: "output",
          text: `+--------+-----------------+
| driver | completed_trips |
+--------+-----------------+
| Vikram |               2 |
| Sunita |               1 |
| Arjun  |               2 |
+--------+-----------------+
3 rows in set (0.00 sec)

+--------+-----------------+
| driver | completed_trips |
+--------+-----------------+
| Vikram |               2 |
| Sunita |               1 |
| Arjun  |               2 |
| Neha   |               0 |
| Imran  |               0 |
+--------+-----------------+
5 rows in set (0.00 sec)`,
        },
        {
          type: "list",
          items: [
            "**`WHERE` lost Neha and Imran.** Logically, `ON` decides which pairs match and `WHERE` filters the joined result afterwards. Neha's padded row has `t.status = NULL`, and `NULL = 'completed'` isn't true, so `WHERE` removed the very rows the `LEFT JOIN` had kept. Imran's only trip was cancelled, so his row went too.",
            "**`ON` kept them**: the status test became part of the matching. Neha and Imran matched nothing, so they were kept with `NULL`s, and `COUNT(t.id)` (which counts non-null values) gave 0.",
            "**On the 20,000-driver data set**, the same two queries returned 16,200 drivers and 20,000 drivers. 3,800 drivers silently disappeared from a report that was supposed to list everyone.",
          ],
        },
        {
          type: "heading",
          text: "The optimizer tells you: it rewrote the LEFT JOIN as an inner join",
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN SELECT d.name, t.id FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id WHERE t.status = 'completed';
SHOW WARNINGS;
EXPLAIN FORMAT=TREE
SELECT d.name, t.id FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id WHERE t.status = 'completed';
EXPLAIN FORMAT=TREE
SELECT d.name, t.id FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id AND t.status = 'completed';`,
        },
        {
          type: "output",
          text: `+----+-------------+-------+------------+--------+---------------+---------+---------+-------------------------+------+----------+-------------+
| id | select_type | table | partitions | type   | possible_keys | key     | key_len | ref                     | rows | filtered | Extra       |
+----+-------------+-------+------------+--------+---------------+---------+---------+-------------------------+------+----------+-------------+
|  1 | SIMPLE      | t     | NULL       | ALL    | idx_driver    | NULL    | NULL    | NULL                    |    8 |    12.50 | Using where |
|  1 | SIMPLE      | d     | NULL       | eq_ref | PRIMARY       | PRIMARY | 4       | mysql_joins.t.driver_id |    1 |   100.00 | NULL        |
+----+-------------+-------+------------+--------+---------------+---------+---------+-------------------------+------+----------+-------------+
+-------+------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Level | Code | Message                                                                                                                                                                                                                                                                 |
+-------+------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Note  | 1003 | /* select#1 */ select \`mysql_joins\`.\`d\`.\`name\` AS \`name\`,\`mysql_joins\`.\`t\`.\`id\` AS \`id\` from \`mysql_joins\`.\`drivers\` \`d\` join \`mysql_joins\`.\`trips\` \`t\` where ((\`mysql_joins\`.\`d\`.\`id\` = \`mysql_joins\`.\`t\`.\`driver_id\`) and (\`mysql_joins\`.\`t\`.\`status\` = 'completed')) |
+-------+------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

-> Nested loop inner join  (cost=1.4 rows=1)
    -> Filter: ((t.\`status\` = 'completed') and (t.driver_id is not null))  (cost=1.05 rows=1)
        -> Table scan on t  (cost=1.05 rows=8)
    -> Single-row index lookup on d using PRIMARY (id=t.driver_id)  (cost=0.35 rows=1)

-> Nested loop left join  (cost=3.55 rows=8)
    -> Table scan on d  (cost=0.75 rows=5)
    -> Filter: (t.\`status\` = 'completed')  (cost=0.432 rows=1.6)
        -> Index lookup on t using idx_driver (driver_id=d.id)  (cost=0.432 rows=1.6)`,
        },
        {
          type: "list",
          items: [
            "**`SHOW WARNINGS` after `EXPLAIN` prints the query as the optimizer rewrote it**, and the rewritten text says `from drivers d join trips t`: no `left`. MySQL proved that `t.status = 'completed'` rejects every `NULL`-padded row (a **null-rejecting** condition), so an outer join and an inner join give the same rows, and it converted the join to the cheaper inner form. That's **outer join simplification**.",
            "**The tree confirms it**: `Nested loop inner join`, now free to start from `trips`. With the filter in `ON`, it stayed `Nested loop left join`, driving from `drivers` as it must.",
            "**A quick review rule**: in `a LEFT JOIN b`, any `WHERE` condition on a column of `b` that isn't `b.col IS NULL` turns the left join into an inner join. Either the `LEFT` is wrong, or the condition belongs in `ON`.",
          ],
        },
        {
          type: "heading",
          text: "The reverse mistake: a left-table filter in ON",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT d.name AS driver, d.city, t.id AS trip
FROM drivers d
LEFT JOIN trips t ON t.driver_id = d.id AND d.city = 'Kolkata'
ORDER BY d.id, t.id;`,
        },
        {
          type: "output",
          text: `+--------+-----------+------+
| driver | city      | trip |
+--------+-----------+------+
| Vikram | Kolkata   |  101 |
| Vikram | Kolkata   |  102 |
| Sunita | Kolkata   |  103 |
| Arjun  | Bengaluru | NULL |
| Neha   | Bengaluru | NULL |
| Imran  | Pune      | NULL |
+--------+-----------+------+
6 rows in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "Someone wanted \"Kolkata drivers and their trips\" and put the city in `ON`. A condition in `ON` only decides whether a pair matches; it can't remove a left row from a left join. So every driver came back, and the non-Kolkata ones just lost their trips (Arjun has three). The rule, both ways: **conditions on the optional (right) table go in `ON`; conditions on the preserved (left) table go in `WHERE`.** For an inner join it makes no difference where either goes.",
        },
      ],
    },
    {
      title: "FULL OUTER JOIN and CROSS JOIN",
      blocks: [
        {
          type: "heading",
          text: "MySQL has no FULL OUTER JOIN",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT d.name AS driver, t.id AS trip FROM drivers d FULL OUTER JOIN trips t ON t.driver_id = d.id;
SELECT d.name AS driver, t.id AS trip FROM drivers d FULL JOIN trips t ON t.driver_id = d.id;`,
        },
        {
          type: "output",
          text: `ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'FULL OUTER JOIN trips t ON t.driver_id = d.id' at line 1
ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'FULL JOIN trips t ON t.driver_id = d.id' at line 1`,
        },
        {
          type: "paragraph",
          text: "A syntax error is the good outcome. Without table aliases, `FULL` isn't a reserved word in MySQL, so it's parsed as an **alias** for the table before it, and the rest is a plain inner join:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT COUNT(*) AS rows_returned FROM drivers FULL JOIN trips ON trips.driver_id = FULL.id;
SHOW WARNINGS;`,
        },
        {
          type: "output",
          text: `+---------------+
| rows_returned |
+---------------+
|             7 |
+---------------+
1 row in set, 1 warning (0.00 sec)

+---------+------+----------------------------------------------------------------------------------------------+
| Level   | Code | Message                                                                                      |
+---------+------+----------------------------------------------------------------------------------------------+
| Warning | 4119 | Using FULL as unquoted identifier is deprecated, please use quotes or rename the identifier. |
+---------+------+----------------------------------------------------------------------------------------------+
1 row in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "Seven rows: the inner join, with neither Neha nor trip 106. (I had to write `FULL.id` rather than `drivers.id`, because the table is now called `FULL`; aliases are case-sensitive on Linux. Code ported from PostgreSQL that uses `ON trips.driver_id = drivers.id` fails with an unknown-column error instead, which is luckier.) The only hint is warning 4119, which most clients never show.",
        },
        {
          type: "heading",
          text: "Emulating FULL OUTER JOIN with UNION",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT d.name AS driver, t.id AS trip, t.status
FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id
UNION ALL
SELECT d.name, t.id, t.status
FROM drivers d RIGHT JOIN trips t ON t.driver_id = d.id
WHERE d.id IS NULL                   -- only the trips the first half couldn't return
ORDER BY trip IS NULL, trip;`,
        },
        {
          type: "output",
          text: `+--------+------+-----------+
| driver | trip | status    |
+--------+------+-----------+
| Vikram |  101 | completed |
| Vikram |  102 | completed |
| Sunita |  103 | completed |
| Arjun  |  104 | completed |
| Arjun  |  105 | cancelled |
| NULL   |  106 | cancelled |
| Arjun  |  107 | completed |
| Imran  |  108 | cancelled |
| Neha   | NULL | NULL      |
+--------+------+-----------+
9 rows in set (0.00 sec)`,
        },
        {
          type: "list",
          items: [
            "**Nine rows: seven matched pairs, Neha with no trip, trip 106 with no driver.** That's a full outer join.",
            "**`UNION ALL` plus `WHERE d.id IS NULL` in the second half** is the exact form: the first half returns all matches and unmatched drivers, the second adds only unmatched trips. The commonly posted version, `LEFT JOIN ... UNION RIGHT JOIN ...`, also gave 9 rows here, but plain `UNION` removes duplicates across the **whole result**, so two genuinely identical rows (two trips with the same displayed values) would collapse into one. It also costs a deduplication pass.",
          ],
        },
        {
          type: "heading",
          text: "CROSS JOIN: every pair on purpose",
        },
        {
          type: "code",
          language: "sql",
          title: "cross.sql",
          code: `-- the base fare grid: every surge zone with every vehicle class
SELECT z.name AS zone, v.code AS vehicle, v.base_paise
FROM surge_zones z CROSS JOIN vehicle_classes v
ORDER BY z.id, v.base_paise;
SELECT COUNT(*) AS pairs FROM surge_zones z JOIN vehicle_classes v;
SELECT COUNT(*) AS pairs FROM surge_zones z INNER JOIN vehicle_classes v ON 1 = 1;`,
        },
        {
          type: "output",
          text: `+-------------+-----------+------------+
| zone        | vehicle   | base_paise |
+-------------+-----------+------------+
| SALT-LAKE   | auto      |       3000 |
| SALT-LAKE   | hatchback |       5000 |
| SALT-LAKE   | sedan     |       8000 |
| NEW-TOWN    | auto      |       3000 |
| NEW-TOWN    | hatchback |       5000 |
| NEW-TOWN    | sedan     |       8000 |
| KORAMANGALA | auto      |       3000 |
| KORAMANGALA | hatchback |       5000 |
| KORAMANGALA | sedan     |       8000 |
+-------------+-----------+------------+
9 rows in set (0.00 sec)

+-------+
| pairs |
+-------+
|     9 |
+-------+
+-------+
| pairs |
+-------+
|     9 |
+-------+`,
        },
        {
          type: "paragraph",
          text: "Three zones times three classes is nine rows. Legitimate uses: a grid to fill in (zones by hour slots, so that hours with zero trips still appear when you `LEFT JOIN` the facts onto it), or a one-row settings table joined to everything. In MySQL, `JOIN` without `ON` is also a cross join (standard SQL would reject it), which is how an accidental product sneaks in: a missing `ON` isn't an error.",
        },
      ],
    },
    {
      title: "Self Joins: Referrals and Back-to-Back Trips",
      blocks: [
        {
          type: "paragraph",
          text: "A self join is a table joined to itself. The two aliases are two independent copies as far as the query is concerned, so the only new idea is choosing aliases that say which role each copy plays.",
        },
        {
          type: "heading",
          text: "Who referred whom",
        },
        {
          type: "code",
          language: "sql",
          title: "self.sql",
          code: `SELECT r.name AS rider, ref.name AS referred_by
FROM riders r
LEFT JOIN riders ref ON ref.id = r.referred_by
ORDER BY r.id;

SELECT ref.name AS referrer, COUNT(r.id) AS referrals,
       GROUP_CONCAT(r.name ORDER BY r.id) AS who
FROM riders ref
JOIN riders r ON r.referred_by = ref.id
GROUP BY ref.id, ref.name
ORDER BY ref.id;`,
        },
        {
          type: "output",
          text: `+--------+-------------+
| rider  | referred_by |
+--------+-------------+
| Asha   | NULL        |
| Ravi   | Asha        |
| Meera  | Asha        |
| Farhan | Meera       |
| Priya  | NULL        |
| Kabir  | Ravi        |
+--------+-------------+
6 rows in set (0.01 sec)

+----------+-----------+------------+
| referrer | referrals | who        |
+----------+-----------+------------+
| Asha     |         2 | Ravi,Meera |
| Ravi     |         1 | Kabir      |
| Meera    |         1 | Farhan     |
+----------+-----------+------------+
3 rows in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "The first query reads \"for each rider, find the rider whose id is my `referred_by`\"; it's a `LEFT JOIN` so that Asha and Priya, who signed up on their own, still appear. The second turns it around: for each referrer, the riders pointing at them. This handles one level of a hierarchy. A referral chain of unknown depth (Asha referred Meera, who referred Farhan) needs a recursive CTE, which comes in Subqueries, EXISTS and CTEs.",
        },
        {
          type: "heading",
          text: "Back-to-back trips by the same driver",
        },
        {
          type: "paragraph",
          text: "Operations wants trips where the driver's next request came in less than 10 minutes after the previous drop-off (a sign of good dispatching). Each row pairs a trip `a` with a later trip `b` by the same driver:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT d.name AS driver, a.id AS trip, a.completed_at AS dropped_at,
       b.id AS next_trip, b.requested_at AS next_requested,
       TIMESTAMPDIFF(MINUTE, a.completed_at, b.requested_at) AS gap_min
FROM trips a
JOIN trips b   ON b.driver_id = a.driver_id
              AND b.id <> a.id
              AND b.requested_at >= a.completed_at
              AND b.requested_at <  a.completed_at + INTERVAL 10 MINUTE
JOIN drivers d ON d.id = a.driver_id
ORDER BY a.id;`,
        },
        {
          type: "output",
          text: `+--------+------+---------------------+-----------+---------------------+---------+
| driver | trip | dropped_at          | next_trip | next_requested      | gap_min |
+--------+------+---------------------+-----------+---------------------+---------+
| Vikram |  101 | 2026-11-02 08:25:00 |       102 | 2026-11-02 08:31:00 |       6 |
| Arjun  |  104 | 2026-11-02 10:20:00 |       107 | 2026-11-02 10:26:00 |       6 |
+--------+------+---------------------+-----------+---------------------+---------+
2 rows in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "Only the equality `b.driver_id = a.driver_id` can drive an index lookup; the time window is a range condition checked on each candidate. A self join on the driver alone is the dangerous part, because it pairs every trip of a driver with every other trip of the same driver:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT COUNT(*) AS pairs_same_driver FROM trips a JOIN trips b ON b.driver_id = a.driver_id;
SELECT COUNT(*) AS pairs_same_driver_distinct FROM trips a JOIN trips b ON b.driver_id = a.driver_id AND b.id <> a.id;
SELECT COUNT(*) AS pairs_unordered FROM trips a JOIN trips b ON b.driver_id = a.driver_id AND b.id > a.id;`,
        },
        {
          type: "output",
          text: `+-------------------+
| pairs_same_driver |
+-------------------+
|                15 |
+-------------------+
+----------------------------+
| pairs_same_driver_distinct |
+----------------------------+
|                          8 |
+----------------------------+
+-----------------+
| pairs_unordered |
+-----------------+
|               4 |
+-----------------+`,
        },
        {
          type: "list",
          items: [
            "**15 = 2² + 1² + 3² + 1²** (Vikram 2 trips, Sunita 1, Arjun 3, Imran 1): each driver with n trips contributes n² pairs, including each trip paired with itself. Trip 106 contributes nothing: its `NULL` driver doesn't even equal itself.",
            "**`b.id <> a.id` removes the self-pairs (8 left); `b.id > a.id` also removes the mirror images (4 left).** Use `>` when the pair is unordered (\"which trips share a driver\"), `<>` when direction matters.",
            "**The n² growth is why self joins on a low-selectivity column are dangerous**: a driver with 1,000 trips in the window contributes a million pairs before the time filter. For \"the next trip\", `LAG`/`LEAD` window functions read each row once; they're in Window Functions: ROW_NUMBER, RANK, LAG and Running Totals.",
          ],
        },
      ],
    },
    {
      title: "Anti Joins Three Ways and the NOT IN Trap",
      blocks: [
        {
          type: "paragraph",
          text: "An anti join returns the rows of one table that have **no** match in another: drivers with no trips, riders who never paid, trips with no rating. SQL has three common spellings, and one of them is wrong in a way that only shows up when a `NULL` arrives.",
        },
        {
          type: "code",
          language: "sql",
          title: "anti.sql",
          code: `-- 1. LEFT JOIN ... IS NULL
SELECT d.id, d.name FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id WHERE t.id IS NULL;
-- 2. NOT EXISTS
SELECT d.id, d.name FROM drivers d WHERE NOT EXISTS (SELECT 1 FROM trips t WHERE t.driver_id = d.id);
-- 3. NOT IN
SELECT d.id, d.name FROM drivers d WHERE d.id NOT IN (SELECT t.driver_id FROM trips t);
-- 3b. NOT IN with the NULLs filtered out
SELECT d.id, d.name FROM drivers d WHERE d.id NOT IN (SELECT t.driver_id FROM trips t WHERE t.driver_id IS NOT NULL);`,
        },
        {
          type: "output",
          text: `+----+------+
| id | name |
+----+------+
|  4 | Neha |
+----+------+
1 row in set (0.00 sec)

+----+------+
| id | name |
+----+------+
|  4 | Neha |
+----+------+
1 row in set (0.00 sec)

Empty set (0.00 sec)

+----+------+
| id | name |
+----+------+
|  4 | Neha |
+----+------+
1 row in set (0.00 sec)`,
        },
        {
          type: "heading",
          text: "Why NOT IN returned nothing",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT 4 NOT IN (1, 2, 3, NULL) AS four_not_in_list, 4 IN (1, 2, 3, NULL) AS four_in_list, 1 NOT IN (1, NULL) AS one_not_in;`,
        },
        {
          type: "output",
          text: `+------------------+--------------+------------+
| four_not_in_list | four_in_list | one_not_in |
+------------------+--------------+------------+
|             NULL |         NULL |          0 |
+------------------+--------------+------------+
1 row in set (0.00 sec)`,
        },
        {
          type: "list",
          items: [
            "**`x NOT IN (list)` means `x <> a AND x <> b AND ...`.** With a `NULL` in the list, one of the terms is `4 <> NULL`, which is `NULL` (unknown). `TRUE AND NULL` is `NULL`, and `WHERE` keeps only `TRUE` rows. So no driver can ever pass: the subquery returned trip 106's `NULL` driver, and that one value emptied the result.",
            "**It can still return `FALSE`** (`1 NOT IN (1, NULL)` is 0), so the query isn't broken for every row; it's broken exactly for the rows you wanted.",
            "**`NOT EXISTS` and `LEFT JOIN ... IS NULL` don't have this problem.** They ask \"is there a row where `t.driver_id = d.id` is true?\", and a `NULL` comparison is simply not a match.",
            "**Fixing `NOT IN` needs a `WHERE ... IS NOT NULL` in the subquery** (3b), or a `NOT NULL` column. Riders were safe: `NOT IN (SELECT rider_id FROM trips)` returned Priya and Kabir correctly, because `trips.rider_id` is `NOT NULL`. That's what makes this bug intermittent across a code base.",
          ],
        },
        {
          type: "heading",
          text: "How MySQL executes each one",
        },
        {
          type: "paragraph",
          text: "On the big data set, with `idx_driver` on `trips`. Drivers with no trips at all: 2,360 of 20,000.",
        },
        {
          type: "code",
          language: "sql",
          title: "antibig.sql",
          code: `EXPLAIN ANALYZE SELECT COUNT(*) FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id WHERE t.id IS NULL;
EXPLAIN ANALYZE SELECT COUNT(*) FROM drivers d WHERE NOT EXISTS (SELECT 1 FROM trips t WHERE t.driver_id = d.id);
EXPLAIN ANALYZE SELECT COUNT(*) FROM drivers d WHERE d.id NOT IN (SELECT t.driver_id FROM trips t);
EXPLAIN ANALYZE SELECT COUNT(*) FROM drivers d WHERE d.id NOT IN (SELECT t.driver_id FROM trips t WHERE t.driver_id IS NOT NULL);`,
        },
        {
          type: "output",
          text: `-> Aggregate: count(0)  (cost=653597 rows=1) (actual time=99.8..99.8 rows=1 loops=1)
    -> Filter: (t.id is null)  (cost=596268 rows=573291) (actual time=0.201..99.7 rows=2360 loops=1)
        -> Nested loop antijoin  (cost=596268 rows=573291) (actual time=0.201..99.5 rows=2360 loops=1)
            -> Covering index scan on d using PRIMARY  (cost=2059 rows=20347) (actual time=0.186..3.96 rows=20000 loops=1)
            -> Covering index lookup on t using idx_driver (driver_id=d.id)  (cost=1.03 rows=28.2) (actual time=0.0047..0.0047 rows=0.882 loops=20000)

-> Aggregate: count(0)  (cost=137636 rows=1) (actual time=87..87 rows=1 loops=1)
    -> Nested loop antijoin  (cost=80307 rows=573291) (actual time=0.211..86.9 rows=2360 loops=1)
        -> Covering index scan on d using PRIMARY  (cost=2059 rows=20347) (actual time=0.199..3.87 rows=20000 loops=1)
        -> Covering index lookup on t using idx_driver (driver_id=d.id)  (cost=29 rows=28.2) (actual time=0.00407..0.00407 rows=0.882 loops=20000)

-> Aggregate: count(0)  (cost=4094 rows=1) (actual time=152..152 rows=1 loops=1)
    -> Filter: <in_optimizer>(d.id,d.id in (select #2) is false)  (cost=2059 rows=20347) (actual time=152..152 rows=0 loops=1)
        -> Covering index scan on d using PRIMARY  (cost=2059 rows=20347) (actual time=0.183..3.02 rows=20000 loops=1)
        -> Select #2 (subquery in condition; run only once)
            -> Filter: ((d.id = \`<materialized_subquery>\`.driver_id))  (cost=100148..100148 rows=1) (actual time=0.00733..0.00733 rows=0.882 loops=20001)
                -> Limit: 1 row(s)  (cost=100148..100148 rows=1) (actual time=0.00723..0.00723 rows=0.882 loops=20001)
                    -> Index lookup on <materialized_subquery> using <auto_distinct_key> (driver_id=d.id)  (actual time=0.00715..0.00715 rows=0.882 loops=20001)
                        -> Materialize with deduplication  (cost=100148..100148 rows=498456) (actual time=137..137 rows=17641 loops=1)
                            -> Covering index scan on t using idx_driver  (cost=50303 rows=498456) (actual time=0.687..67.6 rows=500000 loops=1)

-> Aggregate: count(0)  (cost=4094 rows=1) (actual time=182..182 rows=1 loops=1)
    -> Filter: <in_optimizer>(d.id,d.id in (select #2) is false)  (cost=2059 rows=20347) (actual time=166..182 rows=2360 loops=1)
        -> Covering index scan on d using PRIMARY  (cost=2059 rows=20347) (actual time=0.184..2.98 rows=20000 loops=1)
        -> Select #2 (subquery in condition; run only once)
            -> Filter: ((d.id = \`<materialized_subquery>\`.driver_id))  (cost=75043..75043 rows=1) (actual time=0.00879..0.00879 rows=0.882 loops=20001)
                -> Limit: 1 row(s)  (cost=75043..75043 rows=1) (actual time=0.00869..0.00869 rows=0.882 loops=20001)
                    -> Index lookup on <materialized_subquery> using <auto_distinct_key> (driver_id=d.id)  (actual time=0.00861..0.00861 rows=0.882 loops=20001)
                        -> Materialize with deduplication  (cost=75043..75043 rows=249228) (actual time=166..166 rows=17640 loops=1)
                            -> Filter: (t.driver_id is not null)  (cost=50120 rows=249228) (actual time=0.713..97.3 rows=490000 loops=1)
                                -> Covering index range scan on t using idx_driver over (NULL < driver_id)  (cost=50120 rows=249228) (actual time=0.713..73.9 rows=490000 loops=1)`,
        },
        {
          type: "list",
          items: [
            "**`LEFT JOIN ... IS NULL` and `NOT EXISTS` became the same plan: `Nested loop antijoin`** (99.8 ms and 87 ms). For each driver, one lookup in `idx_driver`; the lookup stops at the first match (`rows=0.882` is the fraction of drivers that had one) and a driver is emitted only when there's none. Both lookups are **covering**: `idx_driver` alone answers the question, without touching the trip rows.",
            "**`NOT IN` was not turned into an anti join**, because `trips.driver_id` is nullable and an anti join can't express the `NULL` semantics above. Instead, MySQL materialised the distinct driver ids (17,641 values: 17,640 drivers plus `NULL`) into a temporary table with a unique key, probed it once per driver, and returned 0 rows in 152 ms.",
            "**Even with `WHERE t.driver_id IS NOT NULL`, MySQL kept the materialisation plan** (182 ms, 2,360 rows, correct). The transformation to an anti join needs both sides to be `NOT NULL` columns; a filter isn't enough.",
            "**What I'd write**: `NOT EXISTS`. It's correct with `NULL`s, it says what it means, and it got the antijoin plan. `LEFT JOIN ... IS NULL` is equivalent when the `IS NULL` test is on a `NOT NULL` column of the right table (its primary key is the safe choice); testing a nullable column like `t.completed_at` instead returned Arjun and Imran next to Neha on the small set, because their cancelled trips have a `NULL` `completed_at`.",
          ],
        },
      ],
    },
    {
      title: "Semi Joins: EXISTS and IN",
      blocks: [
        {
          type: "paragraph",
          text: "A semi join is the opposite question: rows that have **at least one** match. Writing it as a plain join gives the wrong row count, because the join repeats the left row per match:",
        },
        {
          type: "code",
          language: "sql",
          title: "semi.sql",
          code: `SELECT d.name FROM drivers d JOIN trips t ON t.driver_id = d.id WHERE t.status = 'completed' ORDER BY d.id;
SELECT d.name FROM drivers d WHERE EXISTS (SELECT 1 FROM trips t WHERE t.driver_id = d.id AND t.status = 'completed') ORDER BY d.id;
SELECT d.name FROM drivers d WHERE d.id IN (SELECT t.driver_id FROM trips t WHERE t.status = 'completed') ORDER BY d.id;`,
        },
        {
          type: "output",
          text: `+--------+
| name   |
+--------+
| Vikram |
| Vikram |
| Sunita |
| Arjun  |
| Arjun  |
+--------+
5 rows in set (0.00 sec)

+--------+
| name   |
+--------+
| Vikram |
| Sunita |
| Arjun  |
+--------+
3 rows in set (0.00 sec)

+--------+
| name   |
+--------+
| Vikram |
| Sunita |
| Arjun  |
+--------+
3 rows in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "The join answered \"driver per completed trip\" (5 rows); `EXISTS` and `IN` answered \"drivers who completed a trip\" (3). `IN` has none of `NOT IN`'s `NULL` trouble: `x IN (..., NULL)` is still true when `x` matches something. On the big data set, Kolkata drivers with at least one completed trip:",
        },
        {
          type: "code",
          language: "sql",
          title: "semibig.sql",
          code: `EXPLAIN ANALYZE SELECT COUNT(*) FROM drivers d WHERE d.city = 'Kolkata'
  AND EXISTS (SELECT 1 FROM trips t WHERE t.driver_id = d.id AND t.status = 'completed');
EXPLAIN ANALYZE SELECT COUNT(DISTINCT d.id) FROM drivers d JOIN trips t ON t.driver_id = d.id
  WHERE d.city = 'Kolkata' AND t.status = 'completed';`,
        },
        {
          type: "output",
          text: `-> Aggregate: count(0)  (cost=22697 rows=1) (actual time=277..277 rows=1 loops=1)
    -> Nested loop semijoin  (cost=22124 rows=5733) (actual time=0.191..277 rows=4500 loops=1)
        -> Filter: (d.city = 'Kolkata')  (cost=2059 rows=2035) (actual time=0.114..12.5 rows=5000 loops=1)
            -> Table scan on d  (cost=2059 rows=20347) (actual time=0.11..8.67 rows=20000 loops=1)
        -> Filter: (t.\`status\` = 'completed')  (cost=19.8 rows=2.82) (actual time=0.0526..0.0526 rows=0.9 loops=5000)
            -> Index lookup on t using idx_driver (driver_id=d.id)  (cost=19.8 rows=28.2) (actual time=0.0521..0.0521 rows=0.9 loops=5000)

-> Aggregate: count(distinct d.id)  (cost=22697 rows=1) (actual time=378..378 rows=1 loops=1)
    -> Nested loop inner join  (cost=22124 rows=5733) (actual time=0.207..332 rows=125000 loops=1)
        -> Filter: (d.city = 'Kolkata')  (cost=2059 rows=2035) (actual time=0.11..12.9 rows=5000 loops=1)
            -> Table scan on d  (cost=2059 rows=20347) (actual time=0.107..8.73 rows=20000 loops=1)
        -> Filter: (t.\`status\` = 'completed')  (cost=7.04 rows=2.82) (actual time=0.0516..0.0618 rows=25 loops=5000)
            -> Index lookup on t using idx_driver (driver_id=d.id)  (cost=7.04 rows=28.2) (actual time=0.0511..0.0549 rows=25 loops=5000)`,
        },
        {
          type: "list",
          items: [
            "**`Nested loop semijoin` in the tree, and `Using where; FirstMatch(d)` in the `Extra` column of the traditional `EXPLAIN` for `t`**: for each Kolkata driver, read that driver's trips until the first completed one, then move on. `rows=0.9` per lookup: one row for the 4,500 drivers with a match, none for the 500 without.",
            "**The join with `COUNT(DISTINCT)` produced 125,000 joined rows to count 4,500 drivers**, then deduplicated them: 378 ms against 277 ms for the semi join. The answer is the same; the work isn't.",
            "**FirstMatch is one of four semi join strategies** in MySQL 8.0; the others are LooseScan (read an index in order and skip duplicates), Materialization (build a deduplicated temporary table of the subquery, like the `NOT IN` plan above) and DuplicateWeedout (run it as a join, then remove duplicates with a temporary table keyed on the outer row id). The optimizer costs them and picks one; `optimizer_switch` can turn each off for testing.",
          ],
        },
        {
          type: "paragraph",
          text: "The choice isn't fixed. When I re-ran the same `EXPLAIN` near the end of the session, after other tables had been added and analysed and while other work was loading the machine, the optimizer had switched strategy:",
        },
        {
          type: "output",
          text: `+----+--------------+-------------+------------+--------+---------------------+---------------------+---------+----------------------+--------+----------+-------------+
| id | select_type  | table       | partitions | type   | possible_keys       | key                 | key_len | ref                  | rows   | filtered | Extra       |
+----+--------------+-------------+------------+--------+---------------------+---------------------+---------+----------------------+--------+----------+-------------+
|  1 | SIMPLE       | d           | NULL       | ALL    | PRIMARY             | NULL                | NULL    | NULL                 |  19885 |    10.00 | Using where |
|  1 | SIMPLE       | <subquery2> | NULL       | eq_ref | <auto_distinct_key> | <auto_distinct_key> | 5       | mysql_joins_big.d.id |      1 |   100.00 | NULL        |
|  2 | MATERIALIZED | t           | NULL       | ALL    | idx_driver          | NULL                | NULL    | NULL                 | 498456 |    10.00 | Using where |
+----+--------------+-------------+------------+--------+---------------------+---------------------+---------+----------------------+--------+----------+-------------+`,
        },
        {
          type: "paragraph",
          text: "That's the Materialization strategy: scan `trips` once, keep the distinct `driver_id`s of completed trips in a temporary table with a unique key (`<auto_distinct_key>`), and probe it with an `eq_ref` lookup per driver. Two consecutive `EXPLAIN ANALYZE` runs at that point even picked different strategies (Materialization, then FirstMatch), both taking seconds because the machine was busy. The 8.0 cost model includes an estimate of how much of each table is already in the buffer pool, so when two strategies cost about the same, the winner can change from run to run. Another reason to read `EXPLAIN ANALYZE` on the real system rather than trust a plan you saw once.",
        },
      ],
    },
    {
      title: "Join Fan-out: When SUM Lies",
      blocks: [
        {
          type: "paragraph",
          text: "Fan-out is what a one-to-many join does to the \"one\" side: each trip row is repeated once per payment row. Counting or listing payments is fine. Summing a trip-level column after the join is not.",
        },
        {
          type: "code",
          language: "sql",
          title: "fan.sql",
          code: `SELECT t.id AS trip, t.fare_paise, p.id AS payment, p.method, p.amount_paise, p.status
FROM trips t JOIN payments p ON p.trip_id = t.id
WHERE t.driver_id = 1 OR t.id = 103
ORDER BY t.id, p.id;

SELECT SUM(fare_paise) AS fares_from_trips FROM trips WHERE status = 'completed';
SELECT SUM(t.fare_paise) AS fares_after_join, COUNT(*) AS joined_rows
FROM trips t JOIN payments p ON p.trip_id = t.id
WHERE t.status = 'completed';
SELECT SUM(t.fare_paise) AS fares_captured_only
FROM trips t JOIN payments p ON p.trip_id = t.id
WHERE t.status = 'completed' AND p.status = 'captured';`,
        },
        {
          type: "output",
          text: `+------+------------+---------+--------+--------------+----------+
| trip | fare_paise | payment | method | amount_paise | status   |
+------+------------+---------+--------+--------------+----------+
|  101 |      24000 |       1 | card   |        24000 | captured |
|  102 |      18000 |       2 | wallet |        10000 | captured |
|  102 |      18000 |       3 | card   |         8000 | captured |
|  103 |      31000 |       4 | card   |        31000 | failed   |
|  103 |      31000 |       5 | card   |        31000 | captured |
+------+------------+---------+--------+--------------+----------+
5 rows in set (0.00 sec)

+------------------+
| fares_from_trips |
+------------------+
|           100000 |
+------------------+
1 row in set (0.00 sec)

+------------------+-------------+
| fares_after_join | joined_rows |
+------------------+-------------+
|           149000 |           7 |
+------------------+-------------+
1 row in set (0.00 sec)

+---------------------+
| fares_captured_only |
+---------------------+
|              118000 |
+---------------------+
1 row in set (0.00 sec)`,
        },
        {
          type: "list",
          items: [
            "**The fare of trip 102 appears twice** (18,000 next to each half of the split payment) and trip 103's 31,000 appears next to both the failed and the captured attempt. Five completed trips worth 100,000 paise became 149,000 after the join.",
            "**Filtering to captured payments fixed trip 103 but not trip 102**: 118,000. Each payment row is legitimate; the bug is summing a trip column at payment granularity.",
            "**The **grain** of a result is what one row represents.** Before the join: one row per trip. After it: one row per payment. Every aggregate must be computed at the grain where its column lives.",
          ],
        },
        {
          type: "heading",
          text: "Three fixes, one wrong fix",
        },
        {
          type: "code",
          language: "sql",
          code: `-- 1. aggregate the many side first, then join one row per trip
SELECT SUM(t.fare_paise) AS fares, SUM(pp.paid) AS paid
FROM trips t
JOIN (SELECT trip_id, SUM(amount_paise) AS paid FROM payments WHERE status = 'captured' GROUP BY trip_id) pp
  ON pp.trip_id = t.id
WHERE t.status = 'completed';
-- 2. if you only need "has a captured payment", don't join at all: EXISTS (see the payout fix below)
-- 3. the wrong fix: SUM(DISTINCT) (big data set)
SELECT SUM(DISTINCT t.fare_paise) AS sum_distinct_fares
FROM trips t JOIN payments p ON p.trip_id = t.id AND p.status = 'captured' WHERE t.status = 'completed';`,
        },
        {
          type: "output",
          text: `+--------+--------+
| fares  | paid   |
+--------+--------+
| 100000 | 100000 |
+--------+--------+
1 row in set (0.00 sec)

+--------------------+
| sum_distinct_fares |
+--------------------+
|         1008000000 |
+--------------------+`,
        },
        {
          type: "paragraph",
          text: "Pre-aggregating gave 100,000 and 100,000: the derived table `pp` has exactly one row per trip, so the join can't fan out. `SUM(DISTINCT)` deduplicates **values**, not trips: two different trips with the same fare count once. On the big data set, where many trips share the same fare, it returned 1,008,000,000 against a true total of 12,594,000,000, an undercount of 92%. It hides fan-out on toy data and destroys real data.",
        },
        {
          type: "heading",
          text: "The same bug at 500,000 trips",
        },
        {
          type: "code",
          language: "sql",
          title: "fanbig.sql",
          code: `SELECT COUNT(*) AS completed_trips, SUM(fare_paise) AS true_fares FROM trips WHERE status = 'completed';
SELECT COUNT(*) AS joined_rows, SUM(t.fare_paise) AS fares_after_join
FROM trips t JOIN payments p ON p.trip_id = t.id WHERE t.status = 'completed';
SELECT COUNT(*) AS joined_rows, SUM(t.fare_paise) AS fares_captured_join
FROM trips t JOIN payments p ON p.trip_id = t.id AND p.status = 'captured' WHERE t.status = 'completed';
SELECT COUNT(*) AS trips_that_fan_out, SUM(n) AS payment_rows_for_them
FROM (SELECT trip_id, COUNT(*) n FROM payments GROUP BY trip_id HAVING COUNT(*) > 1) x;`,
        },
        {
          type: "output",
          text: `+-----------------+-------------+
| completed_trips | true_fares  |
+-----------------+-------------+
|          450000 | 12594000000 |
+-----------------+-------------+
+-------------+------------------+
| joined_rows | fares_after_join |
+-------------+------------------+
|      540026 |      15113258757 |
+-------------+------------------+
+-------------+---------------------+
| joined_rows | fares_captured_join |
+-------------+---------------------+
|      494919 |         13850395407 |
+-------------+---------------------+
+--------------------+-----------------------+
| trips_that_fan_out | payment_rows_for_them |
+--------------------+-----------------------+
|              90026 |                180052 |
+--------------------+-----------------------+`,
        },
        {
          type: "paragraph",
          text: "20% of completed trips had two payment rows, and the joined sum was 20.0% too high (15.11 billion paise against 12.59 billion); with only captured payments it was still 10.0% too high. The last query is the check I'd run before trusting any join to a child table: if the \"many\" side really has many rows per parent for some parents, any parent-level `SUM` after the join is suspect.",
        },
      ],
    },
    {
      title: "USING, ON and NATURAL JOIN",
      blocks: [
        {
          type: "paragraph",
          text: "`USING (col)` is shorthand for `ON a.col = b.col` when both tables name the column the same. It differs in one visible way: the output has **one** merged column instead of two. A small `trip_ratings` table shows it:",
        },
        {
          type: "code",
          language: "sql",
          code: `CREATE TEMPORARY TABLE trip_ratings (trip_id INT PRIMARY KEY, stars TINYINT);
INSERT INTO trip_ratings VALUES (101,5),(102,4),(104,3);
SELECT * FROM payments p JOIN trip_ratings r ON r.trip_id = p.trip_id WHERE p.trip_id = 102;
SELECT * FROM payments p JOIN trip_ratings r USING (trip_id) WHERE trip_id = 102;
SELECT * FROM payments p LEFT JOIN trip_ratings r USING (trip_id) WHERE p.id IN (5,6,7);
SELECT COUNT(*) AS natural_rows FROM trips NATURAL JOIN payments;`,
        },
        {
          type: "output",
          text: `+----+---------+--------+--------------+----------+---------+-------+
| id | trip_id | method | amount_paise | status   | trip_id | stars |
+----+---------+--------+--------------+----------+---------+-------+
|  2 |     102 | wallet |        10000 | captured |     102 |     4 |
|  3 |     102 | card   |         8000 | captured |     102 |     4 |
+----+---------+--------+--------------+----------+---------+-------+
2 rows in set (0.00 sec)

+---------+----+--------+--------------+----------+-------+
| trip_id | id | method | amount_paise | status   | stars |
+---------+----+--------+--------------+----------+-------+
|     102 |  2 | wallet |        10000 | captured |     4 |
|     102 |  3 | card   |         8000 | captured |     4 |
+---------+----+--------+--------------+----------+-------+
2 rows in set (0.00 sec)

+---------+----+--------+--------------+----------+-------+
| trip_id | id | method | amount_paise | status   | stars |
+---------+----+--------+--------------+----------+-------+
|     103 |  5 | card   |        31000 | captured |  NULL |
|     104 |  6 | upi    |        15000 | captured |     3 |
|     107 |  7 | upi    |        12000 | captured |  NULL |
+---------+----+--------+--------------+----------+-------+
3 rows in set (0.00 sec)

+--------------+
| natural_rows |
+--------------+
|            0 |
+--------------+`,
        },
        {
          type: "list",
          items: [
            "**`ON` returned two `trip_id` columns; `USING` returned one, moved to the front**, and the unqualified `trip_id` in `WHERE` was legal because there's only one. With `ON`, an unqualified `trip_id` would be ambiguous (error 1052).",
            "**With an outer join, the `USING` column is `COALESCE(left.col, right.col)`**: in the `LEFT JOIN`, trips 103 and 107 have no rating, yet `trip_id` is filled from `payments`. With `ON` and `SELECT r.trip_id`, those rows would show `NULL`.",
            "**`NATURAL JOIN` joins on every column with the same name**, here `id` and `status`. It matched `trips.id` (101 to 108) against `payments.id` (1 to 7), and `status` against `status`, and returned nothing. Worse, it changes meaning silently when someone adds a column like `created_at` to both tables. Don't use it in application code.",
            "`USING` is fine when the schema names keys consistently (`trip_id` everywhere). With the common `id`/`trip_id` naming, `ON` is the only option, and being explicit is never wrong.",
          ],
        },
      ],
    },
    {
      title: "Mismatched Types and Collations",
      blocks: [
        {
          type: "paragraph",
          text: "A join condition can use an index on a column only if MySQL can compare values **in that column's own type and collation**. When the two sides differ, one side gets converted, and the index on the converted side becomes useless. I added three tables to the big data set, the kind that accumulate in a long-lived schema:",
        },
        {
          type: "code",
          language: "sql",
          title: "mism.sql",
          code: `-- from an old admin tool: driver ids stored as strings (9 documents per driver)
CREATE TABLE driver_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_ref VARCHAR(12) NOT NULL,
  doc_type VARCHAR(20) NOT NULL,
  KEY idx_driver_ref (driver_ref)
);
INSERT INTO driver_documents (driver_ref, doc_type)
SELECT CAST(d.id AS CHAR), ELT(1 + s.n, 'licence','rc','insurance','permit','pan','aadhaar','police','photo','fitness','puc')
FROM drivers d JOIN seq s ON s.n < 10;                       -- 180,000 rows

-- licence numbers in three tables with different character sets / collations
ALTER TABLE drivers ADD COLUMN licence_no VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
                    ADD KEY idx_licence (licence_no);
UPDATE drivers SET licence_no = CONCAT('WB', LPAD(id, 10, '0'));
CREATE TABLE licence_checks_latin1 (id INT AUTO_INCREMENT PRIMARY KEY,
  licence_no VARCHAR(20) CHARACTER SET latin1 NOT NULL, result VARCHAR(10) NOT NULL, KEY idx_licence (licence_no));
INSERT INTO licence_checks_latin1 (licence_no, result) SELECT licence_no, 'clear' FROM drivers;
CREATE TABLE licence_checks_general (id INT AUTO_INCREMENT PRIMARY KEY,
  licence_no VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL, result VARCHAR(10) NOT NULL,
  KEY idx_licence (licence_no));
INSERT INTO licence_checks_general (licence_no, result) SELECT licence_no, 'clear' FROM drivers;
ANALYZE TABLE driver_documents, drivers, licence_checks_latin1, licence_checks_general;`,
        },
        {
          type: "heading",
          text: "INT joined to VARCHAR",
        },
        {
          type: "code",
          language: "sql",
          title: "mism3.sql",
          code: `EXPLAIN ANALYZE
SELECT d.id, x.doc_type FROM drivers d JOIN driver_documents x ON x.driver_ref = d.id
WHERE d.city = 'Pune' AND d.vehicle = 'sedan';

EXPLAIN ANALYZE
SELECT d.id, x.doc_type FROM drivers d JOIN driver_documents x ON x.driver_ref = CAST(d.id AS CHAR)
WHERE d.city = 'Pune' AND d.vehicle = 'sedan';`,
        },
        {
          type: "output",
          text: `-> Nested loop inner join  (cost=147764 rows=9011) (actual time=0.153..125 rows=15003 loops=1)
    -> Table scan on x  (cost=18127 rows=180223) (actual time=0.134..41.2 rows=180000 loops=1)
    -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune') and (cast(x.driver_ref as double) = cast(d.id as double)))  (cost=0.619 rows=0.05) (actual time=388e-6..392e-6 rows=0.0833 loops=180000)
        -> Single-row index lookup on d using PRIMARY (id=x.driver_ref)  (cost=0.619 rows=1) (actual time=189e-6..207e-6 rows=1 loops=180000)

-> Nested loop inner join  (cost=2751 rows=1894) (actual time=0.193..33.8 rows=15003 loops=1)
    -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=2088 rows=199) (actual time=0.0689..7.63 rows=1667 loops=1)
        -> Table scan on d  (cost=2088 rows=19885) (actual time=0.0668..5.31 rows=20000 loops=1)
    -> Index lookup on x using idx_driver_ref (driver_ref=cast(d.id as char charset utf8mb4)), with index condition: (x.driver_ref = cast(d.id as char charset utf8mb4))  (cost=2.39 rows=9.52) (actual time=0.0141..0.0152 rows=9 loops=1667)`,
        },
        {
          type: "list",
          items: [
            "**Comparing a string column with an integer compares both as `DOUBLE`**: the plan literally says `cast(x.driver_ref as double) = cast(d.id as double)`. A B-tree on `driver_ref` is sorted as strings ('10' before '9'), so it can't serve a numeric lookup. MySQL could only drive from `driver_documents`, scanning all 180,000 rows and looking each up in `drivers`: 125 ms in both runs.",
            "**Casting the integer side to the column's type gave the index back**: `Index lookup on x using idx_driver_ref`, 1,667 lookups of 9 rows each, 33.6 to 33.8 ms. Convert the side **without** the index, never the indexed column.",
            "**The numeric comparison is also wrong, not just slow.** `SELECT '0042' = 42, '42abc' = 42, ' 42' = 42` returned 1, 1 and 1 (with warning 1292, `Truncated incorrect DOUBLE value: '42abc'`). A string column joined to an integer can match rows it shouldn't.",
            "The real fix is a migration to `INT`. Until then, compare in the column's type.",
          ],
        },
        {
          type: "heading",
          text: "Different character sets and collations",
        },
        {
          type: "code",
          language: "sql",
          code: `-- latin1 column = utf8mb4 column
EXPLAIN ANALYZE
SELECT d.id, c.result FROM drivers d JOIN licence_checks_latin1 c ON c.licence_no = d.licence_no
WHERE d.city = 'Pune' AND d.vehicle = 'sedan';
-- utf8mb4_general_ci column = utf8mb4_0900_ai_ci column
SELECT d.id, c.result FROM drivers d JOIN licence_checks_general c ON c.licence_no = d.licence_no
WHERE d.city = 'Pune' AND d.vehicle = 'sedan';`,
        },
        {
          type: "output",
          text: `-> Nested loop inner join  (cost=15633 rows=953) (actual time=0.288..129 rows=1667 loops=1)
    -> Table scan on c  (cost=1929 rows=19051) (actual time=0.262..4.43 rows=20000 loops=1)
    -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=0.619 rows=0.05) (actual time=0.00605..0.0061 rows=0.0833 loops=20000)
        -> Index lookup on d using idx_licence (licence_no=c.licence_no), with index condition: (c.licence_no = d.licence_no)  (cost=0.619 rows=1) (actual time=0.00536..0.00588 rows=1 loops=20000)

ERROR 1267 (HY000) at line 10: Illegal mix of collations (utf8mb4_general_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,IMPLICIT) for operation '='`,
        },
        {
          type: "list",
          items: [
            "**latin1 against utf8mb4 ran, but only one way round.** MySQL converts the smaller character set (latin1) up to utf8mb4, so `c.licence_no` is converted and its index is unusable; only `idx_licence` on `drivers` can be used. The optimizer had to scan all 20,000 checks and probe `drivers` 20,000 times to keep 1,667 rows: 128 to 129 ms.",
            "**Two utf8mb4 collations of equal strength didn't run at all**: error 1267. Each column has an implicit collation, and MySQL refuses to pick one. This typically appears after a table was created on 5.7 (default `utf8mb4_general_ci`) and joined to one created on 8.0 (default `utf8mb4_0900_ai_ci`).",
          ],
        },
        {
          type: "code",
          language: "sql",
          code: `EXPLAIN ANALYZE   -- COLLATE on the side without the index we want
SELECT d.id, c.result FROM drivers d JOIN licence_checks_general c ON c.licence_no = d.licence_no COLLATE utf8mb4_general_ci
WHERE d.city = 'Pune' AND d.vehicle = 'sedan';
EXPLAIN ANALYZE   -- COLLATE on the column whose index we wanted
SELECT d.id, c.result FROM drivers d JOIN licence_checks_general c ON c.licence_no COLLATE utf8mb4_0900_ai_ci = d.licence_no
WHERE d.city = 'Pune' AND d.vehicle = 'sedan';`,
        },
        {
          type: "output",
          text: `-> Nested loop inner join  (cost=2158 rows=199) (actual time=0.12..23.4 rows=1667 loops=1)
    -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=2088 rows=199) (actual time=0.0827..8.29 rows=1667 loops=1)
        -> Table scan on d  (cost=2088 rows=19885) (actual time=0.0803..6.08 rows=20000 loops=1)
    -> Index lookup on c using idx_licence (licence_no=(d.licence_no collate utf8mb4_general_ci)), with index condition: (c.licence_no = (d.licence_no collate utf8mb4_general_ci))  (cost=0.251 rows=1) (actual time=0.00845..0.00889 rows=1 loops=1667)

-> Nested loop inner join  (cost=15633 rows=953) (actual time=0.179..128 rows=1667 loops=1)
    -> Table scan on c  (cost=1929 rows=19051) (actual time=0.139..4.56 rows=20000 loops=1)
    -> Filter: ((d.vehicle = 'sedan') and (d.city = 'Pune'))  (cost=0.619 rows=0.05) (actual time=0.006..0.00605 rows=0.0833 loops=20000)
        -> Index lookup on d using idx_licence (licence_no=(c.licence_no collate utf8mb4_0900_ai_ci)), with index condition: ((c.licence_no collate utf8mb4_0900_ai_ci) = d.licence_no)  (cost=0.619 rows=1) (actual time=0.0053..0.00581 rows=1 loops=20000)`,
        },
        {
          type: "paragraph",
          text: "Same rule as for types: `COLLATE` (or `CONVERT`) the side you're **probing from**, and the index on the other side stays usable: 14.2 to 23.4 ms over two runs. Put the `COLLATE` on the column you wanted to look up, and you're back to scanning it: 125 to 128 ms. Note that the two collations don't sort and compare every string the same way, so a `COLLATE` changes the meaning of `=` slightly for accented and special characters. The lasting fix is `ALTER TABLE ... CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci` on the odd table out.",
        },
      ],
    },
    {
      title: "Mapping a One-to-Many Join in JDBC",
      blocks: [
        {
          type: "paragraph",
          text: "On the Java side, a one-to-many join arrives as a flat `ResultSet`: the driver's columns repeated on each of their trip rows, or once with `NULL` trip columns. Turning that back into objects (a `Driver` with a `List<Trip>`) is a loop that groups rows by the parent key. The program below does that, and compares it with the N+1 pattern (one query for the drivers, then one query per driver) that ORMs produce by default with lazy collections.",
        },
        {
          type: "code",
          language: "java",
          title: "DriverTrips.java",
          code: `import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DriverTrips {
    record Trip(int id, String status, int farePaise) { }
    record Driver(int id, String name, List<Trip> trips) { }

    static final String URL = "jdbc:mysql://127.0.0.1:33306/%s?user=root&password=lesson";

    // One query: the LEFT JOIN returns one row per (driver, trip), or one row with NULL trip columns
    static final String JOIN_SQL = """
            SELECT d.id AS driver_id, d.name, t.id AS trip_id, t.status, t.fare_paise
            FROM drivers d
            LEFT JOIN trips t ON t.driver_id = d.id
            WHERE d.city = ? AND d.vehicle = ?
            ORDER BY d.id, t.id""";

    static List<Driver> loadWithJoin(Connection c, String city, String vehicle) throws SQLException {
        Map<Integer, Driver> byId = new LinkedHashMap<>();
        try (PreparedStatement ps = c.prepareStatement(JOIN_SQL)) {
            ps.setString(1, city);
            ps.setString(2, vehicle);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int driverId = rs.getInt("driver_id");
                    Driver d = byId.get(driverId);
                    if (d == null) {                                  // first row for this driver
                        d = new Driver(driverId, rs.getString("name"), new ArrayList<>());
                        byId.put(driverId, d);
                    }
                    int tripId = rs.getInt("trip_id");
                    if (!rs.wasNull()) {                              // NULL trip_id: a driver with no trips
                        d.trips().add(new Trip(tripId, rs.getString("status"), rs.getInt("fare_paise")));
                    }
                }
            }
        }
        return new ArrayList<>(byId.values());
    }

    // The N+1 version: one query for the drivers, then one query per driver
    static int queries;
    static List<Driver> loadNPlusOne(Connection c, String city, String vehicle) throws SQLException {
        List<Driver> drivers = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT id, name FROM drivers WHERE city = ? AND vehicle = ? ORDER BY id")) {
            ps.setString(1, city);
            ps.setString(2, vehicle);
            queries++;
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) drivers.add(new Driver(rs.getInt(1), rs.getString(2), new ArrayList<>()));
            }
        }
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT id, status, fare_paise FROM trips WHERE driver_id = ? ORDER BY id")) {
            for (Driver d : drivers) {
                ps.setInt(1, d.id());
                queries++;
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) d.trips().add(new Trip(rs.getInt(1), rs.getString(2), rs.getInt(3)));
                }
            }
        }
        return drivers;
    }

    public static void main(String[] args) throws Exception {
        try (Connection c = DriverManager.getConnection(URL.formatted("mysql_joins"))) {
            for (Driver d : loadWithJoin(c, "Bengaluru", "sedan")) System.out.println(d);
            for (Driver d : loadWithJoin(c, "Bengaluru", "auto")) System.out.println(d);
        }
        try (Connection c = DriverManager.getConnection(URL.formatted("mysql_joins_big"))) {
            for (int round = 1; round <= 3; round++) {
                long t0 = System.nanoTime();
                List<Driver> a = loadWithJoin(c, "Pune", "sedan");
                long t1 = System.nanoTime();
                queries = 0;
                List<Driver> b = loadNPlusOne(c, "Pune", "sedan");
                long t2 = System.nanoTime();
                int tripsA = a.stream().mapToInt(d -> d.trips().size()).sum();
                int tripsB = b.stream().mapToInt(d -> d.trips().size()).sum();
                long empty = a.stream().filter(d -> d.trips().isEmpty()).count();
                System.out.printf("round %d  join: 1 query, %d drivers (%d with no trips), %d trips, %d ms   "
                        + "N+1: %d queries, %d drivers, %d trips, %d ms%n", round, a.size(), empty, tripsA,
                        (t1 - t0) / 1_000_000, queries, b.size(), tripsB, (t2 - t1) / 1_000_000);
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx256m -cp ~/.m2/repository/com/mysql/mysql-connector-j/9.5.0/mysql-connector-j-9.5.0.jar DriverTrips.java",
        },
        {
          type: "output",
          text: `Driver[id=4, name=Neha, trips=[]]
Driver[id=3, name=Arjun, trips=[Trip[id=104, status=completed, farePaise=15000], Trip[id=105, status=cancelled, farePaise=0], Trip[id=107, status=completed, farePaise=12000]]]
round 1  join: 1 query, 1667 drivers (167 with no trips), 41667 trips, 653 ms   N+1: 1668 queries, 1667 drivers, 41667 trips, 1239 ms
round 2  join: 1 query, 1667 drivers (167 with no trips), 41667 trips, 372 ms   N+1: 1668 queries, 1667 drivers, 41667 trips, 894 ms
round 3  join: 1 query, 1667 drivers (167 with no trips), 41667 trips, 241 ms   N+1: 1668 queries, 1667 drivers, 41667 trips, 913 ms`,
        },
        {
          type: "list",
          items: [
            "**Neha came back with an empty list**, not missing and not with a phantom trip. Two details make that work: the `LEFT JOIN`, and `rs.wasNull()` after `getInt(\"trip_id\")`. `getInt` returns `0` for SQL `NULL`, so without the check every trip-less driver would get a `Trip[id=0, status=null, farePaise=0]`. (`rs.getObject(\"trip_id\", Integer.class)` returning `null` is the other way to write it.)",
            "**`ORDER BY d.id, t.id` plus a `LinkedHashMap`** keeps drivers in query order and each driver's trips in trip order. The map also makes the loop correct even if rows for one driver weren't adjacent.",
            "**Same objects, 1 query against 1,668.** The join took 241 to 653 ms (the first round includes JIT warm-up and the driver's first-use costs), the N+1 version 894 to 1,239 ms. Over a real network, each of the 1,667 extra round trips adds latency that this localhost test barely shows.",
            "**The cost of the join is duplication**: each driver's name travelled once per trip (41,667 times instead of 1,667). For wide parent rows or several child collections at once (trips **and** payments **and** ratings), the fan-out multiplies, and two queries (parents, then all children with `WHERE driver_id IN (...)`) can beat one join. That's what Hibernate's batch fetching and `@BatchSize` do; `JOIN FETCH` of two collections at once is the fan-out bug from the previous section, which Hibernate refuses with `MultipleBagFetchException` for lists.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `drivers d LEFT JOIN trips t ON t.driver_id = d.id AND t.status = 'completed'` from the moment the statement arrives:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parse and resolve.** The parser builds a tree with a left join node whose condition is the whole `ON` clause. Names are resolved: `d.id` to `drivers.id`, `t.status` to `trips.status`. A bare `FULL` after a table name would be resolved here as an alias.",
            "**Simplify outer joins.** The optimizer checks the `WHERE` clause for a null-rejecting condition on `t`. There's none (the status test is in `ON`), so the join stays a left join. With `WHERE t.status = 'completed'` it would become an inner join here, which `SHOW WARNINGS` reveals.",
            "**Transform subqueries.** `EXISTS`/`IN` become semi joins and `NOT EXISTS` an anti join where the rules allow (`NOT IN` over a nullable column doesn't qualify).",
            "**Choose the join order.** For inner joins, every order is a candidate; a left join fixes `drivers` before `trips`. Each prefix is costed from row estimates and the access paths available, and expensive prefixes are pruned (`pruned_by_cost` in the trace).",
            "**Choose the access path per table.** For `trips`, with `drivers` already read: `ref` on `idx_driver` if it exists, otherwise a scan with a hash join. `eq_ref` is chosen when the lookup is on a unique key.",
            "**Build the iterator tree.** `Nested loop left join` with `Table scan on d` as the outer child and `Filter: (t.status = 'completed')` over `Index lookup on t using idx_driver` as the inner child. This is what `EXPLAIN FORMAT=TREE` prints.",
            "**Execute, nested loop.** Read a driver. Look up its trips. For each trip that passes the `ON` filter, emit the joined row. If none passed, emit the driver once with `NULL`s for every `t` column. Repeat for the next driver.",
            "**Execute, hash join instead.** Read the build input (the smaller one, by estimate) completely into a hash table keyed on the join column; if it outgrows `join_buffer_size`, write both inputs to chunk files by hash and process them chunk by chunk. Then read the probe input once and look up each row. For a left hash join, unmatched rows of the preserved side are emitted with `NULL`s.",
            "**Apply `WHERE`, then grouping, `HAVING`, `ORDER BY` and `LIMIT`** on the joined rows. A `WHERE` condition on `t` sees the `NULL`-padded rows here, which is why it removes them.",
            "**Send rows to the client.** The client receives a flat table. Turning it back into a driver with a list of trips is the application's job.",
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
          title: "tour.sql (the small data set: 5 drivers, 8 trips, 7 payments)",
          code: `SELECT 'inner'            AS kind, COUNT(*) AS n FROM drivers d JOIN trips t ON t.driver_id = d.id
UNION ALL SELECT 'left',            COUNT(*) FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id
UNION ALL SELECT 'right',           COUNT(*) FROM drivers d RIGHT JOIN trips t ON t.driver_id = d.id
UNION ALL SELECT 'full (emulated)', COUNT(*) FROM (
            SELECT d.id AS d_id, t.id AS t_id FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id
            UNION ALL
            SELECT d.id, t.id FROM drivers d RIGHT JOIN trips t ON t.driver_id = d.id WHERE d.id IS NULL) f
UNION ALL SELECT 'cross',           COUNT(*) FROM drivers d CROSS JOIN trips t
UNION ALL SELECT 'self (pairs)',    COUNT(*) FROM trips a JOIN trips b ON b.driver_id = a.driver_id AND b.id > a.id
UNION ALL SELECT 'semi (EXISTS)',   COUNT(*) FROM drivers d WHERE EXISTS (SELECT 1 FROM trips t WHERE t.driver_id = d.id)
UNION ALL SELECT 'anti (NOT EXISTS)', COUNT(*) FROM drivers d WHERE NOT EXISTS (SELECT 1 FROM trips t WHERE t.driver_id = d.id)
UNION ALL SELECT 'trips x payments', COUNT(*) FROM payments p JOIN trips t ON t.id = p.trip_id
UNION ALL SELECT 'comma + WHERE',   COUNT(*) FROM drivers d, trips t WHERE t.driver_id = d.id
UNION ALL SELECT 'straight_join',   COUNT(*) FROM drivers d STRAIGHT_JOIN trips t ON t.driver_id = d.id;`,
        },
        {
          type: "output",
          text: `+-------------------+----+
| kind              | n  |
+-------------------+----+
| inner             |  7 |
| left              |  8 |
| right             |  8 |
| full (emulated)   |  9 |
| cross             | 40 |
| self (pairs)      |  4 |
| semi (EXISTS)     |  4 |
| anti (NOT EXISTS) |  1 |
| trips x payments  |  7 |
| comma + WHERE     |  7 |
| straight_join     |  7 |
+-------------------+----+`,
        },
        {
          type: "list",
          items: [
            "**inner 7**: trips with a driver. **left 8**: those plus Neha. **right 8**: those plus trip 106. **full 9**: both. **cross 40**: 5 times 8.",
            "**semi 4** (Vikram, Sunita, Arjun, Imran: any trip at all) and **anti 1** (Neha) always add up to the number of drivers: 5.",
            "**comma + WHERE** and **STRAIGHT_JOIN** are inner joins with different syntax; same 7 rows.",
          ],
        },
        {
          type: "table",
          headers: ["Need", "Syntax"],
          rows: [
            ["Matching rows only", "`a JOIN b ON b.a_id = a.id`"],
            ["Every row of `a`", "`a LEFT JOIN b ON b.a_id = a.id AND <conditions on b>`"],
            ["Rows of `a` with a match", "`WHERE EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id)`"],
            ["Rows of `a` without a match", "`WHERE NOT EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id)`"],
            ["Both sides' unmatched rows", "`a LEFT JOIN b ... UNION ALL a RIGHT JOIN b ... WHERE a.id IS NULL`"],
            ["Every combination", "`a CROSS JOIN b`"],
            ["Same column name on both sides", "`a JOIN b USING (col)` (one merged column)"],
            ["Hierarchy one level up", "`t AS child JOIN t AS parent ON parent.id = child.parent_id`"],
            ["Force an order", "`SELECT STRAIGHT_JOIN ...` or `/*+ JOIN_ORDER(a, b) */`"],
            ["Turn hash join off or on", "`/*+ NO_BNL(t) */`, `/*+ BNL(t) */`"],
            ["See the plan", "`EXPLAIN`, `EXPLAIN FORMAT=TREE`, `EXPLAIN ANALYZE`"],
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: a driver earnings statement",
        },
        {
          type: "paragraph",
          text: "Every driver, their completed trips on 2 November, fares, and money actually captured. Three join decisions in one query: `LEFT JOIN` so idle drivers appear, the trip filters in `ON` so they stay, and payments pre-aggregated to one row per trip so nothing fans out.",
        },
        {
          type: "code",
          language: "sql",
          title: "ex.sql",
          code: `SELECT d.name AS driver,
       COUNT(t.id) AS completed_trips,
       COALESCE(SUM(t.fare_paise), 0) AS fares_paise,
       COALESCE(SUM(pp.captured_paise), 0) AS captured_paise
FROM drivers d
LEFT JOIN trips t
       ON t.driver_id = d.id
      AND t.status = 'completed'
      AND t.requested_at >= '2026-11-02' AND t.requested_at < '2026-11-03'
LEFT JOIN (SELECT trip_id, SUM(amount_paise) AS captured_paise
           FROM payments WHERE status = 'captured' GROUP BY trip_id) pp
       ON pp.trip_id = t.id
GROUP BY d.id, d.name
ORDER BY d.id;`,
        },
        {
          type: "output",
          text: `+--------+-----------------+-------------+----------------+
| driver | completed_trips | fares_paise | captured_paise |
+--------+-----------------+-------------+----------------+
| Vikram |               2 |       42000 |          42000 |
| Sunita |               1 |       31000 |          31000 |
| Arjun  |               2 |       27000 |          27000 |
| Neha   |               0 |           0 |              0 |
| Imran  |               0 |           0 |              0 |
+--------+-----------------+-------------+----------------+
5 rows in set (0.01 sec)`,
        },
        {
          type: "paragraph",
          text: "Vikram's 42,000 includes trip 102's split payment counted once (10,000 + 8,000 summed inside `pp` before the join), and Sunita's 31,000 ignores the failed attempt. `COALESCE` turns the `NULL` sums of drivers with no rows into 0. The second `LEFT JOIN` joins to `t.id`, which is `NULL` for Neha and Imran; that's fine, it just doesn't match.",
        },
        {
          type: "heading",
          text: "Example 2: referred riders who never rode",
        },
        {
          type: "paragraph",
          text: "Growth wants to nudge riders who signed up through a referral but never took a trip, and tell the referrer. A self join plus an anti join:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT r.name AS rider, ref.name AS referred_by
FROM riders r
JOIN riders ref ON ref.id = r.referred_by
WHERE NOT EXISTS (SELECT 1 FROM trips t WHERE t.rider_id = r.id)
ORDER BY r.id;`,
        },
        {
          type: "output",
          text: `+-------+-------------+
| rider | referred_by |
+-------+-------------+
| Kabir | Ravi        |
+-------+-------------+
1 row in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "Priya has no trips either, but nobody referred her, and the inner self join (`JOIN`, not `LEFT JOIN`) excluded her, which is what this campaign wants.",
        },
        {
          type: "heading",
          text: "Example 3: find the trips that will fan out",
        },
        {
          type: "paragraph",
          text: "Before writing any report that joins trips to payments, check what the \"many\" side looks like:",
        },
        {
          type: "code",
          language: "sql",
          code: `SELECT p.trip_id, COUNT(*) AS payment_rows, GROUP_CONCAT(p.method, ':', p.status ORDER BY p.id) AS rows_seen
FROM payments p
GROUP BY p.trip_id
HAVING COUNT(*) > 1;`,
        },
        {
          type: "output",
          text: `+---------+--------------+-------------------------------+
| trip_id | payment_rows | rows_seen                     |
+---------+--------------+-------------------------------+
|     102 |            2 | wallet:captured,card:captured |
|     103 |            2 | card:failed,card:captured     |
+---------+--------------+-------------------------------+
2 rows in set (0.00 sec)`,
        },
        {
          type: "paragraph",
          text: "Two different reasons for two rows: a split payment (both captured) and a retry (one failed). A filter on `status` handles the second but not the first, which is exactly what the payout incident below got wrong.",
        },
      ],
    },
    {
      title: "When to Use Which Join",
      blocks: [
        {
          type: "table",
          headers: ["Question", "Use", "Avoid"],
          rows: [
            ["Rows that have a partner, with the partner's columns", "`INNER JOIN`", "Comma joins (a forgotten condition is a silent product)"],
            ["Every parent, even without children", "`LEFT JOIN`, child filters in `ON`", "Child filters in `WHERE`"],
            ["Parents that have at least one child", "`EXISTS` (or `IN`)", "`JOIN` + `DISTINCT` (fans out, then dedupes)"],
            ["Parents with no child", "`NOT EXISTS`", "`NOT IN` over a nullable column"],
            ["Parent totals plus child totals", "Aggregate children in a derived table, then join", "`SUM(parent.col)` after a one-to-many join; `SUM(DISTINCT)`"],
            ["Unmatched rows from both sides", "`LEFT JOIN ... UNION ALL ... RIGHT JOIN ... WHERE left.id IS NULL`", "`FULL JOIN` (an alias in MySQL)"],
            ["Every combination (grid, calendar)", "`CROSS JOIN`", "A `JOIN` with a missing `ON` by accident"],
            ["Rows related to rows of the same table", "Self join with role-named aliases and `b.id > a.id`", "Self join on a low-selectivity column alone"],
            ["Next or previous row per group", "`LAG`/`LEAD` (window functions)", "A self join with a range condition on big tables"],
            ["A parent with its children in Java", "One `LEFT JOIN` grouped in a map, or two queries with `IN (...)`", "N+1 queries; joining several child collections at once"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Filtering the right table of a LEFT JOIN in WHERE",
        },
        {
          type: "paragraph",
          text: "It turns the left join into an inner join, and the optimizer says so (`Nested loop inner join`, and `join` in `SHOW WARNINGS`). The per-driver report lost Neha and Imran on the small set, and 3,800 of 20,000 drivers on the big one. Move the condition to `ON`, or keep it in `WHERE` only as `... OR t.id IS NULL` when that's really the meaning.",
        },
        {
          type: "heading",
          text: "Summing a parent column after a one-to-many join",
        },
        {
          type: "paragraph",
          text: "Fares went from 100,000 to 149,000 paise after joining payments, and from 12.59 to 15.11 billion on the big set. Aggregate the child table to one row per parent first, or use `EXISTS` when you only need to know a child exists.",
        },
        {
          type: "heading",
          text: "Using SUM(DISTINCT) or DISTINCT to hide fan-out",
        },
        {
          type: "paragraph",
          text: "`DISTINCT` removes equal values, not repeated parents. `SUM(DISTINCT fare_paise)` returned 8% of the true total. If you catch yourself adding `DISTINCT` to make a join's numbers look right, the join is wrong.",
        },
        {
          type: "heading",
          text: "NOT IN over a column that can be NULL",
        },
        {
          type: "paragraph",
          text: "One `NULL` in the subquery's result makes `NOT IN` unknown for every row: drivers without trips came back as an empty set. MySQL also can't run it as an anti join. Use `NOT EXISTS`.",
        },
        {
          type: "heading",
          text: "Testing a nullable column in LEFT JOIN ... IS NULL",
        },
        {
          type: "paragraph",
          text: "`WHERE t.completed_at IS NULL` also matches real trips that happen to have a `NULL` there (cancelled ones), so Arjun and Imran appeared as \"drivers without trips\". Test the right table's primary key, or the join column.",
        },
        {
          type: "heading",
          text: "Putting a filter on the preserved table in ON",
        },
        {
          type: "paragraph",
          text: "`LEFT JOIN trips t ON ... AND d.city = 'Kolkata'` doesn't remove drivers from other cities; it removes their trips. Filters on the left table go in `WHERE`.",
        },
        {
          type: "heading",
          text: "Writing FULL JOIN in MySQL",
        },
        {
          type: "paragraph",
          text: "With aliases it's a syntax error; without them, `drivers FULL JOIN trips` makes `FULL` an alias and runs an inner join (7 rows instead of 9), with only warning 4119. Use the `UNION ALL` form.",
        },
        {
          type: "heading",
          text: "Joining columns of different types or collations",
        },
        {
          type: "paragraph",
          text: "A `VARCHAR` id joined to an `INT` compares as `DOUBLE`, can't use the string column's index (125 ms against 33.6 ms), and matches `'0042'` and `'42abc'` to 42. Mixed collations either fail with error 1267 or lose the index on the converted side. Convert the non-indexed side, and fix the schema.",
        },
        {
          type: "heading",
          text: "Leaving foreign key columns unindexed",
        },
        {
          type: "paragraph",
          text: "Without `idx_driver`, the optimizer ran 490,000 primary key lookups (790 to 1,124 ms) instead of 1,667 index lookups (78 to 255 ms); without `idx_trip`, the receipts query scanned 540,026 payments (928 to 1,016 ms against 206 to 220 ms). InnoDB indexes a column automatically only when you declare a foreign key on it.",
        },
        {
          type: "heading",
          text: "NATURAL JOIN and accidental CROSS JOIN",
        },
        {
          type: "paragraph",
          text: "`trips NATURAL JOIN payments` joined on `id` and `status` and returned 0 rows. A `JOIN` with no `ON` in MySQL is a cross join, not an error. Spell out every join condition.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Write explicit `JOIN ... ON`, never comma joins, so join conditions and filters live in different clauses.",
            "Put the table whose rows must all appear first, and use `LEFT JOIN` only; avoid `RIGHT JOIN` in the same query.",
            "For each `LEFT JOIN`, check every `WHERE` condition: does it mention a column of the optional table? Move it to `ON` unless it's `IS NULL`.",
            "Decide the grain of the result (one row per what?) before writing the query, and aggregate child tables to that grain in a derived table or CTE before joining.",
            "Use `EXISTS` / `NOT EXISTS` for \"has any\" and \"has none\"; never `NOT IN` over a nullable column.",
            "Index every column used to join to another table (`trips.driver_id`, `payments.trip_id`), and make the join columns the same type, character set and collation on both sides.",
            "Read `EXPLAIN ANALYZE` for important joins: look for `Inner hash join` over a big table where you expected an index lookup, `loops=` in the hundreds of thousands, and `Aggregate using temporary table` after a join order flip.",
            "Prefer fixing statistics or indexes over hints. When a hint (`JOIN_ORDER`, `STRAIGHT_JOIN`, `NO_BNL`) is the right answer, comment why and re-check it after data growth.",
            "Raise `join_buffer_size` per session for a known large hash join, not globally.",
            "In Java, map one-to-many joins with a `LinkedHashMap` keyed on the parent id and `wasNull()` checks; for several child collections, use separate queries with `IN (...)` instead of one wide join.",
            "Before trusting a join-based report, compare its totals with the same totals computed from the parent table alone. The payout bug below fails that check instantly.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "All measured with `EXPLAIN ANALYZE` (or wall-clock time from JDBC) on MySQL 8.0.45 in Docker, on a shared 8-core machine with other work running, so treat the ranges as rough; the ordering was the same in every run.",
        },
        {
          type: "table",
          headers: ["Query (500,000 trips, 20,000 drivers)", "Plan", "Time"],
          rows: [
            ["Per-driver totals, 1,667 drivers, `idx_driver` on trips", "Nested loop, `ref` lookups", "78 to 255 ms (9 runs)"],
            ["Same, no index on `trips.driver_id`", "Nested loop from trips, 490,000 `eq_ref` lookups", "790 to 1,124 ms (7 runs)"],
            ["Same, no usable index on either side", "Inner hash join", "173 to 284 ms (7 runs)"],
            ["Same, forced written order with `STRAIGHT_JOIN`", "490,000 `eq_ref` lookups", "624 to 763 ms (2 runs)"],
            ["10 drivers, hash join disabled with `NO_BNL`", "Nested loop, `trips` scanned 10 times", "1,902 ms"],
            ["10 drivers, hash join", "Inner hash join", "164 ms"],
            ["All trips to captured payments, default 256 KB join buffer", "Hash join spilling to chunk files (1,344 file ops)", "704 to 804 ms"],
            ["Same, 64 MB join buffer", "Hash join in memory (14.3 MB)", "577 to 625 ms"],
            ["Four-table receipts join, no index on `payments.trip_id`", "Scan 540,026 payments first", "928 to 1,016 ms"],
            ["Same with `idx_trip`", "Scan trips, `ref` into payments", "206 to 220 ms"],
            ["Drivers without trips: `NOT EXISTS` / `LEFT JOIN IS NULL`", "Nested loop antijoin, covering lookups", "87 ms / 99.8 ms"],
            ["Drivers without trips: `NOT IN` (nullable)", "Materialized subquery", "152 ms, wrong answer (0 rows)"],
            ["Kolkata drivers with a completed trip: `EXISTS`", "Nested loop semijoin (FirstMatch)", "277 ms"],
            ["Same with `JOIN` + `COUNT(DISTINCT)`", "125,000 joined rows, then dedupe", "378 ms"],
            ["`VARCHAR` id joined to `INT`", "Scan 180,000 documents, cast to `DOUBLE`", "125 ms"],
            ["Same with `CAST(d.id AS CHAR)`", "`ref` on `idx_driver_ref`", "33.6 to 33.8 ms"],
            ["JDBC, 1,667 drivers with 41,667 trips: one `LEFT JOIN`", "1 query", "241 to 653 ms"],
            ["Same with N+1 queries", "1,668 queries", "894 to 1,239 ms"],
          ],
        },
        {
          type: "list",
          items: [
            "**An index lookup per outer row is the fastest join when the outer side is small.** 1,667 lookups beat both a full scan with hashing and 490,000 primary key lookups.",
            "**Hash join cost grows with the sum of both inputs; nested loop without an index grows with their product.** That's the 1,902 ms against 164 ms for just 10 drivers.",
            "**The optimizer can pick the slower plan.** With only the primary key available, it chose 490,000 lookups (790 to 1,124 ms) over a hash join that ran in 173 to 284 ms when I forced it. Its filter estimate for `city` and `vehicle` was off by eight times.",
            "**Correctness bugs often look like performance bugs**: the fan-out join read 540,026 rows to sum 450,000 trips, and the `JOIN` + `DISTINCT` semi join built 125,000 rows to count 4,500 drivers.",
          ],
        },
      ],
    },
    {
      title: "Joins in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend pays drivers weekly: 80% of the fare of every completed trip that was actually paid for. The payout job's query joined trips to payments and kept only captured payments, because \"a trip with a failed payment must not be paid out\", and that filter was the code review's whole discussion. Split payments (wallet plus card) had launched a month earlier. Finance noticed the payout total was about 10% higher than 80% of collected fares and asked engineering to explain. I rebuilt the week on the big data set:",
        },
        {
          type: "code",
          language: "sql",
          title: "payout.sql",
          code: `-- shipped: pay drivers 80% of the fare of every completed, paid trip in the week
CREATE TEMPORARY TABLE payout_buggy AS
SELECT t.driver_id, COUNT(*) AS trips, SUM(t.fare_paise) * 80 DIV 100 AS payout_paise
FROM trips t
JOIN payments p ON p.trip_id = t.id AND p.status = 'captured'
WHERE t.status = 'completed'
  AND t.requested_at >= '2026-11-02' AND t.requested_at < '2026-11-09'
GROUP BY t.driver_id;

-- fixed: a semi join; "has a captured payment" is a yes/no question
CREATE TEMPORARY TABLE payout_fixed AS
SELECT t.driver_id, COUNT(*) AS trips, SUM(t.fare_paise) * 80 DIV 100 AS payout_paise
FROM trips t
WHERE t.status = 'completed'
  AND t.requested_at >= '2026-11-02' AND t.requested_at < '2026-11-09'
  AND EXISTS (SELECT 1 FROM payments p WHERE p.trip_id = t.id AND p.status = 'captured')
GROUP BY t.driver_id;

SELECT 'buggy' AS report, COUNT(*) AS drivers, SUM(trips) AS trips_counted, SUM(payout_paise) AS total_payout_paise FROM payout_buggy
UNION ALL
SELECT 'fixed', COUNT(*), SUM(trips), SUM(payout_paise) FROM payout_fixed;

SELECT COUNT(*) AS drivers_overpaid, SUM(b.payout_paise - f.payout_paise) AS overpaid_paise,
       MAX(b.payout_paise - f.payout_paise) AS worst_single_driver_paise
FROM payout_buggy b JOIN payout_fixed f USING (driver_id)
WHERE b.payout_paise <> f.payout_paise;

SELECT b.driver_id, f.trips AS real_trips, b.trips AS counted_trips, f.payout_paise AS correct, b.payout_paise AS paid
FROM payout_buggy b JOIN payout_fixed f USING (driver_id)
ORDER BY b.payout_paise - f.payout_paise DESC, b.driver_id LIMIT 3;`,
        },
        {
          type: "output",
          text: `+--------+---------+---------------+--------------------+
| report | drivers | trips_counted | total_payout_paise |
+--------+---------+---------------+--------------------+
| buggy  |   16200 |        115600 |         2592789715 |
| fixed  |   16200 |        105159 |         2358624494 |
+--------+---------+---------------+--------------------+
+------------------+----------------+---------------------------+
| drivers_overpaid | overpaid_paise | worst_single_driver_paise |
+------------------+----------------+---------------------------+
|             7856 |      234165221 |                    153136 |
+------------------+----------------+---------------------------+
+-----------+------------+---------------+---------+--------+
| driver_id | real_trips | counted_trips | correct | paid   |
+-----------+------------+---------------+---------+--------+
|      1957 |          7 |            12 |  181430 | 334566 |
|     15759 |          7 |            11 |  195467 | 311505 |
|      4618 |          7 |            11 |  160032 | 273194 |
+-----------+------------+---------------+---------+--------+`,
        },
        {
          type: "list",
          items: [
            "**The week's payout was 234,165,221 paise (about ₹23.4 lakh) too high, 9.9% over**, spread across 7,856 of the 16,200 drivers paid. The query \"counted\" 115,600 trips when there were 105,159: every split-payment trip was paid twice. The worst-hit driver in this data was paid 334,566 paise for 181,430 paise of work, because five of their seven trips were split.",
            "**The `status = 'captured'` filter is why review missed it.** It fixed the failed-then-retried case (one captured row per trip), which was the case everyone had in mind, and left the split case (two captured rows per trip) untouched. Example 3 above shows both cases side by side.",
            "**Nothing errored, and the driver count was right.** 16,200 drivers in both versions; only the sums moved. A dashboard that checked \"every active driver got a payout\" stayed green.",
            "**What I'd check first in production**: the grain. `SELECT trip_id, COUNT(*) FROM payments WHERE status = 'captured' GROUP BY trip_id HAVING COUNT(*) > 1` over the payout window, then compare `SUM(fare_paise)` from `trips` alone against the report's total. The difference is the overpayment.",
            "**The fix is the semi join.** \"Was this trip paid?\" is a yes/no question, so it belongs in `EXISTS`, which can't multiply rows. If the payout must use money actually captured rather than the fare, aggregate payments per trip in a derived table first (Example 1). After the fix, 105,159 trips and 2,358,624,494 paise.",
            "**What prevents it next time**: a reconciliation check in the job itself (payout total must equal 80% of the fares of the trips it paid, computed without the join), a test fixture with a split payment and a retried payment (the two rows that broke and didn't break the query), and a rule in review that any `SUM` over a joined child table names its grain. Recovering the overpayment was a business decision; preventing the next one was an engineering one.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The sibling incident: drivers who vanished",
          text: "The same team's \"drivers with low activity\" report used `drivers LEFT JOIN trips ... WHERE t.status = 'completed'`, so drivers with **no** completed trips, the very ones the report was for, were never in it. On the big data set that was 3,800 of 20,000 drivers. The fix was moving the status test into `ON`; the giveaway was `Nested loop inner join` in `EXPLAIN`.",
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
              question: "What's the difference between INNER JOIN and LEFT JOIN?",
              answer:
                "An inner join returns only pairs of rows where the `ON` condition is true; rows without a partner on either side are dropped. A left join returns those pairs plus every row of the left table that found no partner, with the right table's columns set to `NULL`. On my small data set, `drivers JOIN trips` returned 7 rows and `drivers LEFT JOIN trips` returned 8: the extra one is Neha, who has no trips, with `NULL` trip columns.",
            },
            {
              question: "What is a Cartesian product, and how do you get one by accident?",
              answer:
                "Every row of one table paired with every row of the other: 6 riders and 8 trips give 48 rows. A join is conceptually a Cartesian product filtered by the `ON` condition. You get an accidental one by forgetting the condition: a comma join without the `WHERE`, or in MySQL a `JOIN` with no `ON`, which is accepted as a cross join instead of being rejected.",
            },
            {
              question: "Does MySQL support FULL OUTER JOIN?",
              answer:
                "No, not in 8.0 (on 8.0.45 it's a syntax error, ERROR 1064). Emulate it with a `LEFT JOIN` for all matches plus unmatched left rows, `UNION ALL` a `RIGHT JOIN` with `WHERE left.id IS NULL` for the unmatched right rows. Beware: without aliases, `a FULL JOIN b` parses `FULL` as an alias for `a` and runs an inner join; mine returned 7 rows instead of 9 with only a deprecation warning.",
            },
            {
              question: "What is a self join? Give an example.",
              answer:
                "A table joined to itself under two aliases, each playing a different role. `riders r LEFT JOIN riders ref ON ref.id = r.referred_by` lists each rider with the rider who referred them. Another is pairing a driver's trip with their next trip: `trips a JOIN trips b ON b.driver_id = a.driver_id AND b.requested_at` within 10 minutes of `a.completed_at`.",
            },
            {
              question: "What's the difference between USING and ON?",
              answer:
                "`USING (col)` is shorthand for `ON a.col = b.col` when the column has the same name in both tables, and it returns a single merged column (`COALESCE` of both sides for outer joins), so you can refer to it unqualified. `ON` takes any condition and keeps both columns. `NATURAL JOIN` is `USING` on every same-named column, which in my schema meant `id` and `status`, and returned 0 rows.",
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
              question: "Why does a condition on the right table in WHERE turn a LEFT JOIN into an INNER JOIN?",
              answer:
                "`ON` decides which pairs match; `WHERE` filters the joined rows afterwards, including the `NULL`-padded ones. `WHERE t.status = 'completed'` is false-or-unknown for a padded row, so it removes every left row that had no match, which is exactly what the left join was for. MySQL detects such null-rejecting conditions and rewrites the join as inner: `EXPLAIN FORMAT=TREE` showed `Nested loop inner join` and `SHOW WARNINGS` showed `join` with no `left`. Put the condition in `ON` (5 drivers instead of 3 in my test).",
            },
            {
              question: "Compare NOT IN, NOT EXISTS and LEFT JOIN ... IS NULL for finding rows without a match.",
              answer:
                "`NOT EXISTS` and `LEFT JOIN ... WHERE right.pk IS NULL` are equivalent and both became a `Nested loop antijoin` in MySQL 8.0 (87 and 99.8 ms for 20,000 drivers). `NOT IN (SELECT col ...)` returns no rows at all if the subquery produces a `NULL`, because `x NOT IN (..., NULL)` is unknown, never true; mine returned an empty set because one trip had no driver. MySQL also can't convert `NOT IN` over a nullable column to an anti join, so it materialised the subquery instead. I use `NOT EXISTS`.",
            },
            {
              question: "What is join fan-out and how does it break aggregates?",
              answer:
                "Joining a parent to a child table repeats the parent row once per child, so the result's grain becomes the child. Summing a parent column then counts it once per child: fares of 100,000 paise became 149,000 after joining payments (a split payment and a retry), and on 450,000 trips the sum was 20% too high. Fix it by aggregating the child to one row per parent before the join, or by using `EXISTS` when you only need to know a child exists. `SUM(DISTINCT)` isn't a fix: it removes equal values, and undercounted by 92%.",
            },
            {
              question: "What do eq_ref and ref mean in EXPLAIN for a joined table?",
              answer:
                "Both mean MySQL looks up matching rows through an index for each row of the previous table. `eq_ref` means at most one row, through a primary key or unique `NOT NULL` index (`Single-row index lookup` in the tree format), as in `trips JOIN drivers ON d.id = t.driver_id`. `ref` means possibly several, through a non-unique index (`Index lookup`), as in `drivers JOIN trips` via `idx_driver`, about 25 trips per driver in my data. `ALL` with `Using join buffer (hash join)` means no index was used and a hash join was.",
            },
            {
              question: "How do you map a one-to-many join result to objects in JDBC?",
              answer:
                "Order by the parent key, keep a `LinkedHashMap<parentId, Parent>`, create the parent on its first row, and add a child for each row whose child key isn't `NULL`. Check `rs.wasNull()` after `getInt` (or use `getObject(col, Integer.class)`), because `getInt` returns 0 for `NULL`: without the check, my driver with no trips got a phantom `Trip[id=0, status=null, farePaise=0]`. It replaces N+1 queries (1,668 queries against 1, in my test) at the cost of repeating parent columns per child.",
            },
            {
              question: "What's a semi join and why prefer EXISTS over JOIN + DISTINCT?",
              answer:
                "A semi join returns each left row that has at least one match, once. `EXISTS` or `IN` express it directly, and MySQL runs them with semi join strategies such as FirstMatch (stop reading a driver's trips at the first completed one). `JOIN` + `DISTINCT` produces every pair and then removes duplicates: 125,000 joined rows to count 4,500 drivers, 378 ms against 277 ms. It's also fragile: forget the `DISTINCT` and you have fan-out.",
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
              question: "Which join algorithms does MySQL 8.0 have, and when does it use each?",
              answer:
                "Nested loop, where each row of the outer table drives a lookup into the inner table, ideally through an index (`eq_ref`/`ref`); and hash join, added in 8.0.18 for inner equi-joins and extended in 8.0.20 to outer, semi and anti joins, when the inner side has no usable index. Block Nested Loop was removed in 8.0.20. In my measurements: 1,667 index lookups took 78 to 255 ms, a hash join over 500,000 trips 173 to 284 ms, and 490,000 primary key lookups 790 to 1,124 ms. A pure nested loop without an index (forced with `NO_BNL`) took 1,902 ms for only 10 drivers, against 164 ms hashed.",
            },
            {
              question: "How does a hash join work in MySQL, and what does join_buffer_size have to do with it?",
              answer:
                "It reads the build input (the smaller by estimate) into an in-memory hash table on the join key, then reads the probe input once and looks up each row. The hash table is bounded by `join_buffer_size` (256 KB default). If the build input doesn't fit, both inputs are partitioned into chunk files on disk by hash and joined chunk by chunk. `performance_schema` showed it: 1,344 operations on `wait/io/file/sql/hash_join` with 256 KB, none with 64 MB (14.3 MB peak memory), and 704 to 804 ms against 577 to 625 ms. Raise it per session for a known big join; globally it's allocated per join per connection.",
            },
            {
              question: "How does MySQL choose a join order, and how can you override it?",
              answer:
                "The optimizer costs join orders (exhaustively for few tables, greedily for many, controlled by `optimizer_search_depth`), pruning any prefix that already costs more than the best complete plan. The optimizer trace shows it: in mine, `drivers` then `trips` cost 4,065.47, and `trips` first was `pruned_by_cost` at 50,302.6. Outer joins constrain the order. To override: `STRAIGHT_JOIN` (all tables in `FROM` order, or one pair), or hints `JOIN_ORDER`, `JOIN_PREFIX`, `JOIN_SUFFIX`, `JOIN_FIXED_ORDER`. Forcing `trips` first took 624 to 763 ms against 78 to 255 ms. Use them only when `EXPLAIN ANALYZE` proves the optimizer wrong.",
            },
            {
              question: "Why can a join on mismatched types or collations stop using an index?",
              answer:
                "An index is sorted by its column's type and collation, so it can only serve comparisons made in those terms. `VARCHAR = INT` compares both as `DOUBLE` (the plan shows `cast(x.driver_ref as double)`), so the string column's index is useless; MySQL scanned 180,000 rows in 125 ms, while casting the integer side to `CHAR` restored `ref` access at 33.6 ms. latin1 against utf8mb4 converts the latin1 side, losing its index; two utf8mb4 collations of equal coercibility fail with ERROR 1267. Convert or `COLLATE` the side you probe from, and fix the schema.",
            },
            {
              question: "Why didn't MySQL turn NOT IN into an anti join even with WHERE col IS NOT NULL in the subquery?",
              answer:
                "The anti join transformation requires that `NULL` can't appear on either side, which MySQL establishes from column definitions (`NOT NULL`), not from filters in the subquery. With `trips.driver_id` nullable, it materialised the subquery's distinct values into a temporary table with `<auto_distinct_key>` and probed it per driver (182 ms, correct result). `NOT EXISTS` gets the `Nested loop antijoin` regardless, because its semantics don't depend on `NULL`s.",
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
              question: "Finance reports that last week's driver payouts were about 10% higher than 80% of collected fares. The payout query joins trips to payments with p.status = 'captured'. What happened, and what do you do?",
              answer:
                "Join fan-out: some trips have more than one captured payment row (split wallet-plus-card payments), so the trip's fare is summed once per row. The `captured` filter handled retries (one failed, one captured) but not splits. My rebuild overpaid 7,856 of 16,200 drivers by 234,165,221 paise (9.9%), counting 115,600 trips instead of 105,159.\n\nI'd confirm with `SELECT trip_id, COUNT(*) FROM payments WHERE status = 'captured' GROUP BY trip_id HAVING COUNT(*) > 1` over the window, and compare `SUM(fare_paise)` from `trips` alone with the report. Fix with `EXISTS (... status = 'captured')` or a per-trip payment aggregate, add a reconciliation check to the job, and a test fixture with a split payment.",
            },
            {
              question: "An inactive-drivers report should list drivers with few or no completed trips, but drivers with zero never appear. The query is drivers LEFT JOIN trips ... WHERE t.status = 'completed'. Why?",
              answer:
                "The `WHERE` condition on the right table removes the `NULL`-padded rows, so the left join behaves as an inner join; MySQL even rewrites it (`Nested loop inner join` in `EXPLAIN`, `join` in `SHOW WARNINGS`). Drivers with no completed trips are exactly the padded rows. Move `t.status = 'completed'` into the `ON` clause and count `t.id` (not `*`). On my data the report went from 3 drivers to 5, and from 16,200 to 20,000 on the big set.",
            },
            {
              question: "A cleanup job deletes drivers who never took a trip, using DELETE ... WHERE id NOT IN (SELECT driver_id FROM trips). It ran for months, then suddenly deleted nothing. What changed?",
              answer:
                "Someone started storing trips with a `NULL` `driver_id` (for example requests cancelled before a driver accepted). One `NULL` in the subquery makes `id NOT IN (...)` unknown for every driver, so nothing matches; my query returned an empty set for that reason while `NOT EXISTS` returned Neha. It failed safe here, but the same pattern in a \"select riders to notify\" query silently notifies nobody. Rewrite with `NOT EXISTS`, and treat nullable columns in `NOT IN` as a review red flag.",
            },
            {
              question: "After a release, a trip-receipts endpoint went from 200 ms to over a second. EXPLAIN shows a full scan of payments as the first table and eq_ref lookups into trips. What would you check?",
              answer:
                "Whether `payments.trip_id` still has an index (dropped in a migration, or never created on a new table) and whether the join columns' types and collations match. Without an index on the many side, the optimizer starts from `payments` and looks up `trips` by primary key for every payment row: in my test 540,026 lookups, 928 to 1,016 ms. Adding `idx_trip` flipped the order to drive from `trips` and took 206 to 220 ms. Then I'd check `EXPLAIN ANALYZE` again for the remaining scan (an index on `requested_at`).",
            },
            {
              question: "A join between a new orders service table and the legacy drivers table fails with ERROR 1267 Illegal mix of collations. A teammate wants to add COLLATE to make it work. What do you advise?",
              answer:
                "The two columns have different collations (typically `utf8mb4_general_ci` from a 5.7-era table and `utf8mb4_0900_ai_ci` from 8.0). `COLLATE` works as a stopgap, but on which side matters: applied to the side you probe from, the other side's index still works (14 to 23 ms in my test); applied to the indexed column, the index is lost (125 to 128 ms). Also note that the collations don't compare all strings identically. The real fix is converting the odd table out to the standard collation, in a planned migration.",
            },
            {
              question: "A Spring service loads 1,500 drivers with their trips for a dashboard and takes over a second; logs show thousands of SELECTs. How do you fix it, and what's the trade-off?",
              answer:
                "N+1: one query for drivers, then one per driver for trips (lazy collections). Load them with one `LEFT JOIN` ordered by driver id and group rows into a map (or `JOIN FETCH` in JPA), or with two queries: drivers, then all their trips with `WHERE driver_id IN (...)` (batch fetching). In my JDBC test the join took 241 to 653 ms with 1 query against 894 to 1,239 ms with 1,668. The trade-off is duplication: the join repeats driver columns per trip, and fetching two child collections in one join multiplies rows (trips times payments), which is the fan-out bug again; for several collections, use separate batched queries.",
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
            "Load `schema.sql` and run `SELECT COUNT(*) FROM drivers CROSS JOIN trips`.",
            "Run `SELECT d.name, t.id FROM drivers d LEFT JOIN trips t ON t.driver_id = d.id WHERE t.status = 'cancelled'`, then move the status test into `ON`. How many rows does each return?",
            "Run `SELECT r.name FROM riders r WHERE r.id NOT IN (SELECT rider_id FROM trips)`. Why does `NOT IN` work here when it failed for drivers?",
            "Count rows per rider in `riders JOIN trips JOIN payments`, grouped by rider. Which rider disappears, and why?",
            "Run `SELECT COUNT(*) FROM drivers FULL JOIN trips ON trips.driver_id = FULL.id` and then `SHOW WARNINGS`.",
            "In `DriverTrips.java`, replace `if (!rs.wasNull())` with `if (true)` and run it. What does Neha's list contain?",
            "On a big table, run the `joinbuf.sql` measurement with `join_buffer_size` at 256 KB and at 64 MB, and compare `chunk_file_io`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints 40 (5 drivers times 8 trips). Step 2 returns 2 rows with `WHERE` (Arjun with 105, Imran with 108) and 5 with `ON` (every driver; Vikram, Sunita and Neha with `NULL`). Step 3 returns Priya and Kabir correctly, because `trips.rider_id` is `NOT NULL`, so the subquery can't produce a `NULL`. Step 4 gives Asha 3 rows, Ravi 2 and Meera 2: Asha's trip 103 doubles through its failed payment, Ravi's 102 through its split, and Farhan disappears because none of his trips has a payment row (they were cancelled), and an inner join to `payments` drops them. Step 5 returns 7 and warning 4119, `Using FULL as unquoted identifier is deprecated`. Step 6 prints `Driver[id=4, name=Neha, trips=[Trip[id=0, status=null, farePaise=0]]]`: a phantom trip built from `getInt`'s 0 for `NULL`. Step 7 showed 1,344 chunk-file operations at 256 KB and 0 at 64 MB on my 500,000-trip data set.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `MODEL      join = Cartesian product filtered by ON
           INNER: matches only     LEFT: + unmatched left rows, right cols NULL
           RIGHT = mirrored LEFT   FULL: not in MySQL -> LEFT UNION ALL RIGHT..IS NULL
           CROSS: every pair       SELF: same table, two role-named aliases

ON/WHERE   right-table filter in WHERE -> LEFT becomes INNER (3 drivers, not 5)
           left-table filter in ON     -> removes nothing (only partners)
           check: EXPLAIN says "Nested loop inner join"?

ANTI       NOT EXISTS  = LEFT JOIN .. WHERE right.pk IS NULL -> antijoin
           NOT IN + one NULL in subquery -> EMPTY result
SEMI       EXISTS / IN -> FirstMatch / Materialization ...; not JOIN+DISTINCT

FAN-OUT    1 trip x 2 payments = fare counted twice (100,000 -> 149,000)
           aggregate children per parent first, or EXISTS; never SUM(DISTINCT)

ENGINE     nested loop + index: eq_ref (unique) / ref (non-unique)
           hash join 8.0.18+ (outer/semi/anti 8.0.20; BNL removed)
           "Inner hash join", "Using join buffer (hash join)"
           join_buffer_size 256K default -> chunk files on disk when exceeded
           order: optimizer cost; STRAIGHT_JOIN / JOIN_ORDER to force

INDEXES    index every join column; same type + charset + collation
           VARCHAR = INT -> compared as DOUBLE, index lost, '0042' = 42

JAVA       LEFT JOIN + ORDER BY parent + LinkedHashMap + wasNull()
           1 query vs N+1; several child collections -> separate queries`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A join's correctness is decided by its clauses: where a filter sits (`ON` or `WHERE`), what grain the result has (one row per trip or per payment), and how `NULL` behaves (`NOT IN`). The engine never warns about any of them, so check row counts and totals against the parent table.",
            "A join's speed is decided by the algorithm the optimizer picks: index lookups when the join column is indexed and the outer side is small, a hash join when nothing is indexed, and a join order chosen from estimates that can be wrong. `EXPLAIN ANALYZE` shows which one ran and what it cost.",
            "Next comes GROUP BY, HAVING and Aggregate Functions: how MySQL groups rows (temporary tables, sorted streams and index-ordered aggregation), `ONLY_FULL_GROUP_BY`, `COUNT(*)` against `COUNT(col)`, `HAVING` against `WHERE`, `WITH ROLLUP`, and the aggregation bugs that start as the fan-out in this lesson.",
          ],
        },
      ],
    },
  ],
};
