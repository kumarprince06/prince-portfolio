import type { Lesson } from "../types";

export const mysqlSetupTablesAndDataTypes: Lesson = {
  slug: "mysql-setup-tables-and-data-types",
  date: "2026-11-16",
  title: "How MySQL Runs a Query: Setup, Tables and Data Types",
  description:
    "MySQL 8.0.45 in Docker, taken apart from the connection to the disk: one OS thread per connection (26 connections served by 3 threads thanks to the thread cache), the seventeen stages of a primary-key lookup read from performance_schema (334 µs, half of it opening tables), parser and resolver errors 1064, 1054 and 1146, a const lookup the optimizer answers while planning, a table scan that made 300,002 Handler_read_rnd_next calls for 300,001 rows, a cold buffer pool that read 1,763 pages from disk (1,664 by read-ahead) and a warm one that read none, a 63 MB trips.ibd file whose 3,840 pages I counted by type, with the table definition stored inside as compressed JSON, CREATE TABLE for riders, drivers and trips with every constraint violated on purpose (CHECK enforced since 8.0.16), INT overflowing at 2,147,483,647 and an INT key running out, DOUBLE summing 100,000 fares of 123.45 to 12,344,999.999985056 while DECIMAL got 12,345,000.00, ROUND(2.5e0) returning 2, CHAR eating trailing spaces, the 65,535-byte and 8,126-byte row limits, utf8mb3 rejecting a rider called Asha 🚕, a latin1 client that silently double-encoded an emoji, a UNIQUE email that refused Asha.Roy@Example.com because the default collation ignores case and accents, TIMESTAMP shifting by the session time zone and refusing 2038-01-19 03:14:08, JSON that rejects a trailing comma, ENUM sorting by position, BOOLEAN holding 5 and -1, non-strict sql_mode turning 400 seats into 127 and February 30 into zeros, AUTO_INCREMENT burning ids on rollback, duplicates and INSERT IGNORE and reserving 1,023 ids for a 1,000-row insert, a JDBC driver in Kolkata that stored instants 5.5 hours off, and a payout job on DOUBLE fares that underpaid drivers on 29,523 of 200,000 trips.",
  tags: ["MySQL", "SQL", "Data Types", "InnoDB"],
  sections: [
    {
      title: "What MySQL Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, SKIP LOCKED Job Queues, Idempotency and Distributed Locks, closed the Multithreading track by leaving the JVM: two instances of the same service can't share a `ReentrantLock`, so the last tools were rows locked with `FOR UPDATE SKIP LOCKED`, unique keys that make a retry harmless, and locks held in a shared store. That's where a backend developer's concurrency problems end up. Once a service runs on more than one machine, the database is the only place where every instance sees the same state, and most of the hard production incidents in a Java backend (a double charge, a stuck payout, a slow endpoint, an outage at midnight) finish with somebody reading a query plan or a lock wait. So the next track is the database itself, starting with MySQL.",
        },
        {
          type: "paragraph",
          text: "MySQL is a relational database server: a long-running process (`mysqld`) that stores data in **tables** (rows and typed columns), accepts SQL over a network connection, and keeps the data correct while many clients read and write at once. Almost all of the real work is done by a **storage engine**, and in MySQL 8 that's **InnoDB**: it owns the files on disk, the cache of pages in memory, transactions, and row locks. The SQL layer above it parses your statement, checks it, plans it and executes the plan by calling the engine.",
        },
        {
          type: "paragraph",
          text: "This lesson does three things. It follows one query from the client to the disk, using the server's own counters (`Threads_connected`, the stages in `performance_schema`, `Handler_read_*`, `Innodb_buffer_pool_read_requests` against `Innodb_buffer_pool_reads`) and the bytes of the `.ibd` file. It builds the schema the whole track uses (riders, drivers, trips, payments, payouts) with real constraints. And it measures the data types, because almost every type in MySQL has a behaviour that surprises someone in production: integers overflow, `DOUBLE` loses paise, `utf8` can't store an emoji, the default collation thinks `Asha` and `asha` are the same, `TIMESTAMP` moves with the time zone and stops in 2038, and a non-strict server silently changes what you inserted.",
        },
        {
          type: "paragraph",
          text: "Everything here was run on MySQL 8.0.45 (the `mysql:8.0` Docker image) with Connector/J 9.5.0 and Java 21. The next lesson, SELECT, WHERE, ORDER BY, INSERT, UPDATE and DELETE, uses these tables to write and read data properly.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "MySQL was written by Michael Widenius, David Axmark and Allan Larsson at the Swedish company MySQL AB and released in 1995. It was fast and simple and became the M in the LAMP stack, but its original engine, MyISAM, had no transactions and locked whole tables. Transactions came from outside: InnoDB, written by Heikki Tuuri's company Innobase, was shipped as a pluggable engine from 2001. The two halves have been owned by Oracle since it bought Innobase (2005) and then Sun (2010), which had bought MySQL AB in 2008. MariaDB is the community fork Widenius started in 2009.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["MySQL 3.23 / 4.0 (2001 to 2003)", "InnoDB shipped as a storage engine", "Transactions, row locks and crash recovery in MySQL"],
            ["5.5 (2010)", "InnoDB becomes the default engine", "`CREATE TABLE` without `ENGINE=` gets InnoDB"],
            ["5.7 (2015)", "Native `JSON` type; strict `sql_mode` in the default", "Invalid values become errors instead of silent changes"],
            ["8.0 GA (2018)", "Transactional data dictionary (no more `.frm` files); `utf8mb4` with `utf8mb4_0900_ai_ci` as the default; persisted `AUTO_INCREMENT`; CTEs and window functions", "The defaults every table in this lesson inherits"],
            ["8.0.16 (2019)", "`CHECK` constraints enforced", "Before 8.0.16 they were parsed and silently ignored"],
            ["8.0.17 (2019)", "Integer display width and `ZEROFILL` deprecated", "`INT(11)` means nothing"],
            ["8.4 LTS (2024)", "First long-term-support release of the new release model", "The upgrade target; 8.0 reached end of life in April 2026"],
          ],
        },
        {
          type: "paragraph",
          text: "Two things in that history explain a lot of what follows. First, the split between the SQL layer and the storage engine is still visible in every query: the counters in this lesson come from both sides. Second, many of MySQL's surprises are old defaults kept for compatibility (`utf8` meaning three bytes, non-strict modes, `TIMESTAMP` as a 32-bit number), so a server's behaviour depends on its version and its configuration, not only on the SQL you send.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A city's records office, where the ride-hailing company keeps its paper trip sheets.",
        },
        {
          type: "list",
          items: [
            "**Each visitor gets their own clerk** at the front desk for as long as they stay (a connection thread). Clerks who finish wait on a bench for the next visitor rather than going home (the thread cache).",
            "**The clerk first checks the request form is filled in properly** (the parser): a misspelt word is rejected before anyone looks for a cabinet. Then the clerk checks that the cabinet and the drawer you named exist and that you're allowed to open them (resolving names and privileges).",
            "**A planner decides how to fetch it** (the optimizer): \"trip 4242\" means one drawer, so fetch it now; \"every Howrah trip\" means walking every cabinet.",
            "**A runner carries out the plan** (the executor), asking the archive for sheets one by one through a fixed hatch (the storage engine API).",
            "**The archive keeps a reading table of recently used folders** (the buffer pool). A folder already on the table is handed over at once; anything else is fetched from the basement (the `.ibd` file on disk), and the archivist brings the next few folders too, guessing you'll want them (read-ahead).",
            "**Every form has pre-printed boxes of a fixed size and kind** (data types): a box for whole rupees can't hold paise, a box with ten squares can't hold eleven letters, and an old form printed without room for emoji can't record a rider's name the way they typed it.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real clerk who finds a form that doesn't fit will ask you. MySQL, depending on one setting (`sql_mode`), either refuses or quietly trims, rounds or replaces the value and carries on. That setting decides whether the surprises in this lesson are errors you see or data you only discover is wrong months later.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/mysql/mysql-setup-tables-and-data-types-query-path.svg",
          alt: "The path of one query through MySQL 8.0, in ten boxes. Top row, left to right: 1, the client (JDBC or the mysql client) sends SQL text as a COM_QUERY packet over TCP port 3306 or a Unix socket; 2, a connection thread (thread/sql/one_connection), one per session, with Threads_connected = 3 and 26 connections served by 3 created threads because of the thread cache; 3, the parser turns text into a parse tree and rejects SELEKT with ERROR 1064; 4, resolving and checking maps names to real objects, rejecting the column fair with ERROR 1054 and the table tripz with ERROR 1146, in the stages checking permissions and Opening tables (173 microseconds). An arrow goes down to the second row, right to left: 5, the optimizer, which turns id = 4242 into a const lookup whose row is read while planning, and plans pickup_zone = HOWRAH as a table scan estimated at 29,855 rows; 6, the executor runs Table scan, Filter, Aggregate and matched 60,000 rows; 7, the storage engine API, the handler interface, called rnd_next 300,002 times for the scan and read_key once for the lookup; 8, the result 60000 and 11996400.00 goes back to the client, with Com_select incremented, 0.17 seconds cold and 0.14 seconds warm. From the handler an arrow goes down to 9, the InnoDB buffer pool of 16 KB pages (64 MB here): the cold scan after a restart made 4,168 read requests, 99 reads, 1,664 read-ahead pages and 1,763 pages read; the same scan again made 2,338 read requests and no reads at all; 1,708 pages of trips stayed in the pool. Arrows connect it to 10, the disk file ride_hailing/trips.ibd: 62,914,560 bytes, 3,840 pages; page 0 FSP_HDR, 1 IBUF_BITMAP, 2 INODE, 3 SDI holding the table definition as JSON, 4 the PRIMARY root over 3 internal and 1,706 leaf pages; one .ibd per table and no .frm since 8.0. A bottom bar lists the stages of SELECT fare FROM trips WHERE id = 4242 from events_stages_history_long, 334 microseconds in all: starting, checking permissions, Opening tables, init, System lock, optimizing, statistics, preparing, executing, end, query end, closing tables, cleaning up.",
          caption: "The SQL layer (blue, orange) decides what to do; InnoDB decides where the bytes are. Every number on this picture came from the server itself.",
        },
        {
          type: "heading",
          text: "The layers and how to see each one",
        },
        {
          type: "table",
          headers: ["Layer", "What it does", "How I watched it"],
          rows: [
            ["Connection handling", "One OS thread per client connection (`thread_handling = one-thread-per-connection`), reused through `thread_cache_size`", "`Threads_connected`, `Threads_created`, `Connections`, `performance_schema.threads`"],
            ["Parser", "SQL text to a parse tree; syntax only", "`ERROR 1064`"],
            ["Resolver and privilege check", "Binds names to tables and columns, checks grants, opens the tables", "`ERROR 1054` / `1146`, stages `checking permissions` and `Opening tables`"],
            ["Optimizer", "Rewrites conditions, estimates rows, picks access paths and join order by cost", "`EXPLAIN FORMAT=TREE`, `optimizer_trace`, stages `optimizing`, `statistics`, `preparing`"],
            ["Executor", "Runs the iterator tree, evaluates `WHERE`, aggregates, sends rows", "`EXPLAIN ANALYZE` (lesson 13), stage `executing`, `Com_select`"],
            ["Storage engine API (handler)", "The fixed set of calls the executor makes: read by key, read next, write, update, delete", "`Handler_read_key`, `Handler_read_rnd_next`, ..."],
            ["InnoDB buffer pool", "16 KB pages cached in memory, an LRU list, read-ahead", "`Innodb_buffer_pool_read_requests`, `_reads`, `_read_ahead`, `INNODB_BUFFER_PAGE`"],
            ["Tablespace files", "One `.ibd` file per table: B-tree pages plus the table's dictionary entry", "`ls -l`, `INNODB_TABLES`, `INNODB_TABLESPACES`, reading the pages"],
          ],
        },
        {
          type: "heading",
          text: "The types this lesson measures",
        },
        {
          type: "table",
          headers: ["Need", "Type", "Bytes", "The trap measured below"],
          rows: [
            ["Ids, counts", "`INT` / `BIGINT` (`UNSIGNED`)", "4 / 8", "`INT` stops at 2,147,483,647; an id column runs out"],
            ["Money", "`DECIMAL(p,s)`", "about 4 per 9 digits", "`DOUBLE` and `FLOAT` round in binary; sums and `ROUND` drift"],
            ["Short text", "`VARCHAR(n)`", "1 or 2 + the bytes used", "`n` is characters; utf8mb4 is up to 4 bytes each"],
            ["Fixed codes", "`CHAR(n)`", "n characters", "Trailing spaces are removed on read"],
            ["Long text", "`TEXT`", "2 + length, stored off-page when large", "No plain index, no literal default"],
            ["Wall-clock date and time", "`DATETIME(fsp)`", "5 + up to 3", "No time zone at all"],
            ["An instant", "`TIMESTAMP(fsp)`", "4 + up to 3", "Converted by session `time_zone`; ends at 2038-01-19 03:14:07 UTC"],
            ["Flexible documents", "`JSON`", "binary, a bit more than the text", "`->>` compares case-sensitively"],
            ["A small fixed list", "`ENUM`", "1 or 2", "Sorts by position; changing the list rebuilds the table"],
            ["Yes or no", "`BOOLEAN` = `TINYINT(1)`", "1", "Holds any value from -128 to 127"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The lab: MySQL 8.0 in Docker",
        },
        {
          type: "paragraph",
          text: "I ran a throwaway server in Docker, with a small buffer pool so cache effects are easy to see, and the `performance_schema` stage instruments switched on at startup (they're off by default because they cost a little on every statement):",
        },
        {
          type: "code",
          language: "bash",
          code: `docker run -d --name lesson-mysql-setup -e MYSQL_ROOT_PASSWORD=lesson -p 33307:3306 mysql:8.0 \\
  --innodb-buffer-pool-size=32M \\
  --performance-schema-consumer-events-stages-history-long=ON \\
  --performance-schema-instrument='stage/%=ON'
docker logs lesson-mysql-setup 2>&1 | grep 'ready for connections' | tail -1`,
        },
        {
          type: "output",
          text: `67493ed51e850b73f78fea55ec7236e19ba98380fdf9970cce277b0dca9b0f6d
2026-11-15T19:59:22.619806Z 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. Version: '8.0.45'  socket: '/var/run/mysqld/mysqld.sock'  port: 3306  MySQL Community Server - GPL.`,
        },
        {
          type: "paragraph",
          text: "The first start takes a few seconds longer than later ones: the image's entrypoint initialises the data directory, starts a temporary server to set the root password, stops it and starts the real one. Wait for the `ready for connections` line with `port: 3306`; the temporary server prints one with `port: 0`. Then connect with the `mysql` client inside the container and ask for `status`:",
        },
        {
          type: "code",
          language: "bash",
          code: `docker exec -it lesson-mysql-setup mysql -uroot -plesson      # an interactive mysql> prompt
docker exec lesson-mysql-setup mysql -uroot -plesson -e status   # one command and exit`,
        },
        {
          type: "output",
          text: `mysql  Ver 8.0.45 for Linux on x86_64 (MySQL Community Server - GPL)

Connection id:		9
Current database:
Current user:		root@localhost
SSL:			Not in use
Current pager:		stdout
Using outfile:		''
Using delimiter:	;
Server version:		8.0.45 MySQL Community Server - GPL
Protocol version:	10
Connection:		Localhost via UNIX socket
Server characterset:	utf8mb4
Db     characterset:	utf8mb4
Client characterset:	latin1
Conn.  characterset:	latin1
UNIX socket:		/var/run/mysqld/mysqld.sock
Uptime:			25 sec

Threads: 2  Questions: 8  Slow queries: 0  Opens: 119  Flush tables: 3  Open tables: 38  Queries per second avg: 0.320`,
        },
        {
          type: "list",
          items: [
            "**`Connection: Localhost via UNIX socket`.** Inside the container, `localhost` means the socket file, not TCP. From the host, the same server is `mysql -h 127.0.0.1 -P 33307` or the JDBC URL `jdbc:mysql://localhost:33307/ride_hailing`.",
            "**`Client characterset: latin1`.** The server is utf8mb4, but the client picked latin1 because the container has no locale set. Anything non-ASCII typed into this session is misread, and the lesson shows later what that does to an emoji. Every SQL file in this lesson was run with `mysql --default-character-set=utf8mb4`.",
            "Passing the password on the command line prints `mysql: [Warning] Using a password on the command line interface can be insecure.` on every run; I filtered that line out of all the outputs below.",
            "I ran every SQL file the same way: `docker exec -i lesson-mysql-setup mysql -uroot -plesson --default-character-set=utf8mb4 -t -n ride_hailing < file.sql` (`-t` prints tables like the interactive client, `-n` flushes after each statement so errors appear in order). Files that are meant to fail also got `--force`, which keeps going after an error, and the client then prints `ERROR ... at line N` with the line number in the file.",
          ],
        },
        {
          type: "paragraph",
          text: "The database (`ride_hailing`), its three main tables and 300,001 trips are built in the next section; the internals below were measured on them.",
        },
        {
          type: "heading",
          text: "Step 1: every connection is a thread",
        },
        {
          type: "paragraph",
          text: "I opened two extra sessions that sleep, plus one short-lived session, and then looked at the server from a third:",
        },
        {
          type: "code",
          language: "bash",
          code: `for u in 1 2; do (docker exec lesson-mysql-setup mysql -uroot -plesson ride_hailing -e "SELECT SLEEP(6)" &); done
docker exec lesson-mysql-setup mysql -uroot -plesson ride_hailing -e "SELECT 1"
sleep 2`,
        },
        {
          type: "code",
          language: "sql",
          title: "threads.sql",
          code: `SELECT ID, USER, DB, COMMAND, TIME, STATE, INFO FROM information_schema.PROCESSLIST WHERE USER <> 'event_scheduler' ORDER BY ID;
SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running','Threads_created','Threads_cached','Connections');
SELECT NAME, COUNT(*) FROM performance_schema.threads GROUP BY NAME
HAVING NAME LIKE 'thread/sql/one_connection' OR NAME LIKE 'thread/innodb/%' ORDER BY NAME;`,
        },
        {
          type: "output",
          text: `+----+------+--------------+---------+------+------------+-----------------------------------------------------------+
| ID | USER | DB           | COMMAND | TIME | STATE      | INFO                                                      |
+----+------+--------------+---------+------+------------+-----------------------------------------------------------+
| 24 | root | ride_hailing | Query   |    2 | User sleep | SELECT SLEEP(6)                                           |
| 25 | root | ride_hailing | Query   |    2 | User sleep | SELECT SLEEP(6)                                           |
| 26 | root | ride_hailing | Query   |    0 | executing  | SELECT ID, USER, DB, COMMAND, TIME, STATE, INFO FROM ...  |
+----+------+--------------+---------+------+------------+-----------------------------------------------------------+
+-------------------+-------+
| Variable_name     | Value |
+-------------------+-------+
| Connections       | 26    |
| Threads_cached    | 0     |
| Threads_connected | 3     |
| Threads_created   | 3     |
| Threads_running   | 4     |
+-------------------+-------+
+---------------------------------------------+----------+
| NAME                                        | COUNT(*) |
+---------------------------------------------+----------+
| thread/innodb/buf_dump_thread               |        1 |
| thread/innodb/buf_resize_thread             |        1 |
| thread/innodb/clone_gtid_thread             |        1 |
| thread/innodb/dict_stats_thread             |        1 |
| thread/innodb/fts_optimize_thread           |        1 |
| thread/innodb/io_ibuf_thread                |        1 |
| thread/innodb/io_read_thread                |        4 |
| thread/innodb/io_write_thread               |        4 |
| thread/innodb/log_checkpointer_thread       |        1 |
| thread/innodb/log_files_governor_thread     |        1 |
| thread/innodb/log_flush_notifier_thread     |        1 |
| thread/innodb/log_flusher_thread            |        1 |
| thread/innodb/log_write_notifier_thread     |        1 |
| thread/innodb/log_writer_thread             |        1 |
| thread/innodb/page_flush_coordinator_thread |        1 |
| thread/innodb/srv_error_monitor_thread      |        1 |
| thread/innodb/srv_lock_timeout_thread       |        1 |
| thread/innodb/srv_master_thread             |        1 |
| thread/innodb/srv_monitor_thread            |        1 |
| thread/innodb/srv_purge_thread              |        1 |
| thread/innodb/srv_worker_thread             |        3 |
| thread/sql/one_connection                   |        3 |
+---------------------------------------------+----------+`,
        },
        {
          type: "paragraph",
          text: "(I shortened the `INFO` text of the third row, which is the query itself.) The same server, from inside one session:",
        },
        {
          type: "code",
          language: "sql",
          title: "my-thread.sql",
          code: `SELECT CONNECTION_ID() AS conn_id, PS_CURRENT_THREAD_ID() AS ps_thread_id;
SELECT THREAD_ID, NAME, TYPE, PROCESSLIST_ID, THREAD_OS_ID, CONNECTION_TYPE
FROM performance_schema.threads WHERE PROCESSLIST_ID = CONNECTION_ID();
SHOW GLOBAL VARIABLES WHERE Variable_name IN ('thread_handling','thread_cache_size','max_connections','innodb_buffer_pool_size','innodb_page_size');`,
        },
        {
          type: "output",
          text: `+---------+--------------+
| conn_id | ps_thread_id |
+---------+--------------+
|      10 |           50 |
+---------+--------------+
+-----------+---------------------------+------------+----------------+--------------+-----------------+
| THREAD_ID | NAME                      | TYPE       | PROCESSLIST_ID | THREAD_OS_ID | CONNECTION_TYPE |
+-----------+---------------------------+------------+----------------+--------------+-----------------+
|        50 | thread/sql/one_connection | FOREGROUND |             10 |          146 | Socket          |
+-----------+---------------------------+------------+----------------+--------------+-----------------+
+-------------------------+---------------------------+
| Variable_name           | Value                     |
+-------------------------+---------------------------+
| innodb_buffer_pool_size | 33554432                  |
| innodb_page_size        | 16384                     |
| max_connections         | 151                       |
| thread_cache_size       | 9                         |
| thread_handling         | one-thread-per-connection |
+-------------------------+---------------------------+`,
        },
        {
          type: "list",
          items: [
            "**A connection is a real OS thread.** My session was connection 10, `performance_schema` thread 50, and Linux thread 146 inside the container (`THREAD_OS_ID`). The community server has no other mode: `thread_handling` is `one-thread-per-connection` (a thread pool exists only in MySQL Enterprise and in Percona and MariaDB builds).",
            "**`Connections` counts connection attempts since startup (26); `Threads_created` counts OS threads made (3).** Each `docker exec mysql` was a new connection, but when a client disconnects its thread parks in the thread cache (up to `thread_cache_size = 9`) and serves the next one. A high and growing `Threads_created` means the cache is too small.",
            "**`Threads_connected` is open sessions; `Threads_running` is sessions executing a statement right now.** Two sleepers plus my query make 3; the fourth running thread is the `event_scheduler` daemon, which I filtered out of the processlist (with the scheduler switched off, an idle server's `Threads_running` dropped from 2 to 1). `Threads_running` is the number to alert on: a database with 3,000 connected and 20 running is fine; 200 running on 8 cores is queueing.",
            "**InnoDB has its own background threads**: 4 read and 4 write I/O threads, a log writer and flusher (the redo log, lesson 9), a purge thread (old row versions, lesson 10), a page flush coordinator, and more. They do their work regardless of how many clients are connected.",
            "**`max_connections = 151`** is the default. A Java fleet of 20 instances with a HikariCP pool of 10 each needs 200 connections, and the 152nd gets `Too many connections`. Each connection costs a thread and its per-session buffers, which is why pools are sized small.",
          ],
        },
        {
          type: "heading",
          text: "Step 2: the stages of one statement",
        },
        {
          type: "paragraph",
          text: "`performance_schema` can record the **stages** a statement goes through, each with a timer. The history consumers only fill if `events_stages_current` is also on, which my startup flags hadn't set, so I enabled it at runtime (`UPDATE performance_schema.setup_consumers SET ENABLED='YES' WHERE NAME='events_stages_current'`). Then one primary-key lookup:",
        },
        {
          type: "code",
          language: "sql",
          title: "stages.sql",
          code: `SELECT fare FROM trips WHERE id = 4242;
SELECT EVENT_ID, SQL_TEXT, TIMER_WAIT/1000000 AS micros, ROWS_EXAMINED, ROWS_SENT
FROM performance_schema.events_statements_history
WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND SQL_TEXT LIKE 'SELECT fare FROM trips%';
SET @stmt := (SELECT EVENT_ID FROM performance_schema.events_statements_history
              WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND SQL_TEXT LIKE 'SELECT fare FROM trips%' ORDER BY EVENT_ID DESC LIMIT 1);
SELECT EVENT_NAME AS stage, ROUND(TIMER_WAIT/1000000, 1) AS micros
FROM performance_schema.events_stages_history_long
WHERE THREAD_ID = PS_CURRENT_THREAD_ID() AND NESTING_EVENT_ID = @stmt ORDER BY EVENT_ID;`,
        },
        {
          type: "output",
          text: `+--------+
| fare   |
+--------+
| 258.68 |
+--------+
+----------+----------------------------------------+----------+---------------+-----------+
| EVENT_ID | SQL_TEXT                               | micros   | ROWS_EXAMINED | ROWS_SENT |
+----------+----------------------------------------+----------+---------------+-----------+
|       13 | SELECT fare FROM trips WHERE id = 4242 | 333.5680 |             1 |         1 |
+----------+----------------------------------------+----------+---------------+-----------+
+------------------------------------------------+--------+
| stage                                          | micros |
+------------------------------------------------+--------+
| stage/sql/starting                             |   33.6 |
| stage/sql/Executing hook on transaction begin. |    0.4 |
| stage/sql/starting                             |    1.7 |
| stage/sql/checking permissions                 |    1.3 |
| stage/sql/Opening tables                       |  172.9 |
| stage/sql/init                                 |    2.8 |
| stage/sql/System lock                          |    3.8 |
| stage/sql/optimizing                           |    7.9 |
| stage/sql/statistics                           |   42.8 |
| stage/sql/preparing                            |    7.4 |
| stage/sql/executing                            |    4.8 |
| stage/sql/end                                  |   29.3 |
| stage/sql/query end                            |    0.9 |
| stage/sql/waiting for handler commit           |    4.5 |
| stage/sql/closing tables                       |    7.5 |
| stage/sql/freeing items                        |   11.3 |
| stage/sql/cleaning up                          |    0.3 |
+------------------------------------------------+--------+`,
        },
        {
          type: "list",
          items: [
            "**The whole statement took 334 µs and `Opening tables` was half of it (173 µs).** This was the first statement on a new connection, and opening a table means finding its definition in the data dictionary and getting a table handle, which the server then caches (`table_open_cache`). Repeated queries on a warm server spend almost nothing there.",
            "**`checking permissions` comes before `Opening tables`**: privileges are checked from the in-memory grant tables before anything is read.",
            "**`statistics` (43 µs) is where the optimizer asks the engine for estimates**; for this query it also read the row itself, as the next steps show. **`executing` took only 4.8 µs**, because there was nothing left to do.",
            "**`waiting for handler commit`** is the end of the implicit transaction every statement runs in (autocommit). Even a `SELECT` begins and commits one (`Executing hook on transaction begin`).",
            "Stage timings vary run to run by tens of microseconds; the order of stages doesn't.",
          ],
        },
        {
          type: "heading",
          text: "Step 3: the parser and the resolver say no",
        },
        {
          type: "code",
          language: "sql",
          title: "layers.sql (first part)",
          code: `SELEKT fare FROM trips WHERE id = 4242;
SELECT fair FROM trips WHERE id = 4242;
SELECT fare FROM tripz WHERE id = 4242;`,
        },
        {
          type: "output",
          text: `ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'SELEKT fare FROM trips WHERE id = 4242' at line 1
ERROR 1054 (42S22) at line 2: Unknown column 'fair' in 'field list'
ERROR 1146 (42S02) at line 3: Table 'ride_hailing.tripz' doesn't exist`,
        },
        {
          type: "paragraph",
          text: "Three different layers. **1064** comes from the parser, which only knows the grammar: it stops at the first token it can't fit (`SELEKT`) and has no idea whether `trips` exists. **1146** comes from opening the tables, and **1054** from resolving column names against them. The SQLSTATE in brackets is what JDBC exposes as `SQLException.getSQLState()`, next to the MySQL error code from `getErrorCode()`: class `42` is \"syntax error or access rule violation\", class `23` (later) is \"integrity constraint violation\", class `22` is \"data exception\". Spring's exception translation turns the first into a `BadSqlGrammarException` and the second into a `DataIntegrityViolationException`.",
        },
        {
          type: "heading",
          text: "Step 4: the optimizer picks a plan",
        },
        {
          type: "code",
          language: "sql",
          title: "layers.sql (second part)",
          code: `EXPLAIN FORMAT=TREE SELECT fare FROM trips WHERE id = 4242;
EXPLAIN FORMAT=TREE SELECT COUNT(*), SUM(fare) FROM trips WHERE pickup_zone = 'HOWRAH';`,
        },
        {
          type: "output",
          text: `+-------------------------------------------------------+
| EXPLAIN                                               |
+-------------------------------------------------------+
| -> Rows fetched before execution  (cost=0..0 rows=1)
 |
+-------------------------------------------------------+
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| EXPLAIN                                                                                                                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| -> Aggregate: count(0), sum(trips.fare)  (cost=33282 rows=1)
    -> Filter: (trips.pickup_zone = 'HOWRAH')  (cost=30296 rows=29855)
        -> Table scan on trips  (cost=30296 rows=298550)
 |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+`,
        },
        {
          type: "list",
          items: [
            "**`Rows fetched before execution`.** An equality on the whole primary key can match at most one row, so the optimizer treats the table as a **constant** and reads that row while it's still planning. By the time the executor runs, there's nothing to fetch. That's why the stage list showed `statistics` longer than `executing`.",
            "**The zone query is a full table scan**, because there's no index on `pickup_zone` (lesson 7 adds one). The plan is a tree of **iterators**: `Aggregate` pulls rows from `Filter`, which pulls from `Table scan`.",
            "**The estimates are guesses.** The table scan expects 298,550 rows (the real count is 300,001; InnoDB estimates from sampled pages), and the filter expects 10% of them, 29,855, because without an index or a histogram the optimizer has no idea how common `HOWRAH` is. The real answer was 60,000. Wrong estimates are harmless here and the cause of bad join orders later (lesson 13).",
          ],
        },
        {
          type: "paragraph",
          text: "The optimizer can explain itself. With `SET optimizer_trace = 'enabled=on'`, the last statement's reasoning is in `information_schema.OPTIMIZER_TRACE` as JSON. For the primary-key lookup (trimmed, the full trace is 100 lines):",
        },
        {
          type: "output",
          text: `"join_preparation": {
  "steps": [ { "expanded_query": "/* select#1 */ select \`trips\`.\`fare\` AS \`fare\` from \`trips\` where (\`trips\`.\`id\` = 4242)" } ]
},
"join_optimization": {
  "steps": [
    { "condition_processing": {
        "original_condition": "(\`trips\`.\`id\` = 4242)",
        "steps": [ { "transformation": "equality_propagation", "resulting_condition": "multiple equal(4242, \`trips\`.\`id\`)" }, ... ] } },
    { "ref_optimizer_key_uses": [ { "table": "\`trips\`", "field": "id", "equals": "4242", "null_rejecting": true } ] },
    { "rows_estimation": [ { "table": "\`trips\`", "rows": 1, "cost": 1, "table_type": "const", "empty": false } ] },
    { "condition_on_constant_tables": "true", "condition_value": true },
    ...
  ]
},
"join_execution": { "select#": 1, "steps": [ ] }`,
        },
        {
          type: "paragraph",
          text: "`expanded_query` is the statement after parsing and resolving: every name is fully qualified and `fare` has become `` `trips`.`fare` AS `fare` ``. `rows_estimation` decided `table_type: const`, and `join_execution` has no steps: the work was done in optimization. Lesson 13 reads full traces for joins.",
        },
        {
          type: "heading",
          text: "Step 5: the executor calls the storage engine API",
        },
        {
          type: "paragraph",
          text: "The executor never touches pages. It calls the **handler** interface, a fixed set of functions every engine implements (`index_read`, `rnd_next`, `write_row`, ...), and the server counts each call per session in `Handler_*` status variables. `FLUSH STATUS` resets the session counters:",
        },
        {
          type: "code",
          language: "sql",
          title: "layers.sql (third part)",
          code: `FLUSH STATUS;
SELECT fare FROM trips WHERE id = 4242;
SHOW SESSION STATUS WHERE Variable_name LIKE 'Handler_read%' AND Value > 0;
FLUSH STATUS;
SELECT COUNT(*), SUM(fare) FROM trips WHERE pickup_zone = 'HOWRAH';
SHOW SESSION STATUS WHERE Variable_name LIKE 'Handler_read%' AND Value > 0;`,
        },
        {
          type: "output",
          text: `+--------+
| fare   |
+--------+
| 258.68 |
+--------+
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| Handler_read_key | 1     |
+------------------+-------+
+----------+-------------+
| COUNT(*) | SUM(fare)   |
+----------+-------------+
|    60000 | 11996400.00 |
+----------+-------------+
+-----------------------+--------+
| Variable_name         | Value  |
+-----------------------+--------+
| Handler_read_first    | 1      |
| Handler_read_key      | 1      |
| Handler_read_rnd_next | 300002 |
+-----------------------+--------+`,
        },
        {
          type: "list",
          items: [
            "**The lookup was one handler call**: `Handler_read_key = 1`, \"position on this key value\".",
            "**The scan was 300,002 calls of `rnd_next` for 300,001 rows**: one call per row, and a last call that returned \"end of table\". The executor evaluated `pickup_zone = 'HOWRAH'` on every one of those rows and kept 60,000. The cost of a query without an index is visible right there.",
            "These counters are the cheapest way to check what a query really did. `Handler_read_rnd_next` in the hundreds of thousands for an endpoint that returns one row is a missing index, whatever the plan claimed.",
          ],
        },
        {
          type: "heading",
          text: "Step 6: InnoDB and the buffer pool",
        },
        {
          type: "paragraph",
          text: "Below the handler, InnoDB reads 16 KB **pages**, and every page it needs must be in the **buffer pool**, its cache in memory. Two global counters tell the story: `Innodb_buffer_pool_read_requests` (logical reads: \"give me this page\") and `Innodb_buffer_pool_reads` (requests that missed the pool and had to read the disk). To get a cold pool I turned off the buffer pool dump (by default InnoDB saves the list of cached pages at shutdown and reloads them at startup), restarted, and grew the pool to 64 MB so the whole table would fit. This is my own container, so changing global settings was safe:",
        },
        {
          type: "code",
          language: "bash",
          code: `docker exec lesson-mysql-setup mysql -uroot -plesson -e "SET GLOBAL innodb_buffer_pool_dump_at_shutdown = OFF"
docker restart lesson-mysql-setup
docker exec lesson-mysql-setup mysql -uroot -plesson -e "SET GLOBAL innodb_buffer_pool_size = 64*1024*1024"`,
        },
        {
          type: "code",
          language: "sql",
          title: "cold-and-warm.sql",
          code: `SHOW GLOBAL STATUS WHERE Variable_name IN ('Innodb_buffer_pool_read_requests','Innodb_buffer_pool_reads','Innodb_buffer_pool_read_ahead','Innodb_pages_read','Com_select');
SELECT COUNT(*), SUM(fare) FROM trips WHERE pickup_zone = 'HOWRAH';
SHOW GLOBAL STATUS WHERE Variable_name IN ('Innodb_buffer_pool_read_requests','Innodb_buffer_pool_reads','Innodb_buffer_pool_read_ahead','Innodb_pages_read','Com_select');
SELECT COUNT(*), SUM(fare) FROM trips WHERE pickup_zone = 'HOWRAH';
SHOW GLOBAL STATUS WHERE Variable_name IN ('Innodb_buffer_pool_read_requests','Innodb_buffer_pool_reads','Innodb_buffer_pool_read_ahead','Innodb_pages_read','Com_select');
SELECT COUNT(*) AS pages_of_trips_in_pool, SUM(PAGE_TYPE='INDEX') AS index_pages
FROM information_schema.INNODB_BUFFER_PAGE WHERE TABLE_NAME = '\`ride_hailing\`.\`trips\`';`,
        },
        {
          type: "output",
          text: `+----------------------------------+-------+
| Variable_name                    | Value |
+----------------------------------+-------+
| Com_select                       | 6     |
| Innodb_buffer_pool_read_ahead    | 0     |
| Innodb_buffer_pool_read_requests | 15380 |
| Innodb_buffer_pool_reads         | 872   |
| Innodb_pages_read                | 874   |
+----------------------------------+-------+
+----------+-------------+
| COUNT(*) | SUM(fare)   |
+----------+-------------+
|    60000 | 11996400.00 |
+----------+-------------+
1 row in set (0.17 sec)
+----------------------------------+-------+
| Variable_name                    | Value |
+----------------------------------+-------+
| Com_select                       | 7     |
| Innodb_buffer_pool_read_ahead    | 1664  |
| Innodb_buffer_pool_read_requests | 19548 |
| Innodb_buffer_pool_reads         | 971   |
| Innodb_pages_read                | 2637  |
+----------------------------------+-------+
+----------+-------------+
| COUNT(*) | SUM(fare)   |
+----------+-------------+
|    60000 | 11996400.00 |
+----------+-------------+
1 row in set (0.14 sec)
+----------------------------------+-------+
| Variable_name                    | Value |
+----------------------------------+-------+
| Com_select                       | 8     |
| Innodb_buffer_pool_read_ahead    | 1664  |
| Innodb_buffer_pool_read_requests | 21886 |
| Innodb_buffer_pool_reads         | 971   |
| Innodb_pages_read                | 2637  |
+----------------------------------+-------+
+------------------------+-------------+
| pages_of_trips_in_pool | index_pages |
+------------------------+-------------+
|                   1708 |        1708 |
+------------------------+-------------+`,
        },
        {
          type: "paragraph",
          text: "(The `1 row in set` timing lines come from running the same file with `-vvv`.) The deltas:",
        },
        {
          type: "table",
          headers: ["Counter", "Cold scan", "Warm scan", "Meaning"],
          rows: [
            ["`Innodb_buffer_pool_read_requests`", "+4,168", "+2,338", "Logical page reads, served from memory or not"],
            ["`Innodb_buffer_pool_reads`", "+99", "+0", "Requests that missed and read one page from disk"],
            ["`Innodb_buffer_pool_read_ahead`", "+1,664", "+0", "Pages prefetched by read-ahead because the scan was sequential"],
            ["`Innodb_pages_read`", "+1,763", "+0", "All pages read from disk (the two above together)"],
            ["`Com_select`", "+1", "+1", "One `SELECT` statement each (`SHOW` isn't counted)"],
            ["Query time", "0.17 s", "0.14 s", "The OS file cache hid most of the disk cost"],
          ],
        },
        {
          type: "list",
          items: [
            "**The first scan read 1,763 pages from disk, almost all through read-ahead.** InnoDB noticed it was reading pages in order and fetched whole 64-page extents ahead of the scan (`innodb_read_ahead_threshold`, 56 sequential pages by default), so only 99 reads were single-page misses that made the query wait.",
            "**The second scan read nothing from disk.** All 1,708 pages it needed were in the pool, which `INNODB_BUFFER_PAGE` confirmed. The **hit ratio** people quote is `1 - reads / read_requests`: over the warm scan it was 100%.",
            "**The time barely changed** (0.17 s against 0.14 s) because Linux had the `.ibd` file in its own page cache, so \"disk\" reads were memory copies. On a real server with `O_DIRECT` and a cold disk, the gap is much larger.",
            "**My first attempt used the 32 MB pool and the warm scan still did 475 disk reads** (and 1,113 pages read). The table's 1,710 primary-key pages are about 27 MB, which didn't fit beside everything else in a 32 MB pool, and InnoDB inserts pages read by a scan into the \"old\" end of its LRU list so a big scan can't flush the hot pages. The rule it teaches: if the working set is bigger than the buffer pool, every query reads disk. On a dedicated database server the pool is usually set to 50 to 75% of RAM.",
            "`innodb_buffer_pool_size` is resizable online in 8.0 (`SET GLOBAL`), in chunks; it went from 32 MB to 64 MB without a restart.",
          ],
        },
        {
          type: "heading",
          text: "Step 7: where the table lives on disk",
        },
        {
          type: "code",
          language: "bash",
          code: `docker exec lesson-mysql-setup ls -l /var/lib/mysql/ride_hailing/`,
        },
        {
          type: "output",
          text: `total 71084
-rw-r----- 1 mysql mysql   425984 Nov 15 20:00 drivers.ibd
-rw-r----- 1 mysql mysql  9437184 Nov 15 20:00 riders.ibd
-rw-r----- 1 mysql mysql 62914560 Nov 15 20:00 trips.ibd`,
        },
        {
          type: "paragraph",
          text: "A database is a directory; each InnoDB table is one `.ibd` file (`innodb_file_per_table`, on by default). There's no `.frm` file: since 8.0 the table definitions live in the **data dictionary**, InnoDB tables inside `mysql.ibd`, with a copy in each table's own file. A brand-new empty table's file was 114,688 bytes, 7 pages. The server describes the files itself:",
        },
        {
          type: "code",
          language: "sql",
          title: "disk.sql",
          code: `ANALYZE TABLE riders, drivers, trips;
SELECT TABLE_NAME, ENGINE, ROW_FORMAT, TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, INDEX_LENGTH, AUTO_INCREMENT
FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'ride_hailing' ORDER BY TABLE_NAME;
SELECT TABLE_ID, NAME, SPACE, ROW_FORMAT, N_COLS, INSTANT_COLS FROM information_schema.INNODB_TABLES WHERE NAME LIKE 'ride_hailing/%';
SELECT SPACE, NAME, PAGE_SIZE, FILE_SIZE, ALLOCATED_SIZE FROM information_schema.INNODB_TABLESPACES WHERE NAME LIKE 'ride_hailing/%';
SELECT i.INDEX_ID, i.NAME AS index_name, i.PAGE_NO AS root_page FROM information_schema.INNODB_INDEXES i
JOIN information_schema.INNODB_TABLES t USING (TABLE_ID) WHERE t.NAME = 'ride_hailing/trips';
SELECT stat_name, stat_value, stat_description FROM mysql.innodb_index_stats
WHERE database_name = 'ride_hailing' AND table_name = 'trips' AND index_name = 'PRIMARY';`,
        },
        {
          type: "output",
          text: `+----------------------+---------+----------+----------+
| Table                | Op      | Msg_type | Msg_text |
+----------------------+---------+----------+----------+
| ride_hailing.riders  | analyze | status   | OK       |
| ride_hailing.drivers | analyze | status   | OK       |
| ride_hailing.trips   | analyze | status   | OK       |
+----------------------+---------+----------+----------+
+------------+--------+------------+------------+----------------+-------------+--------------+----------------+
| TABLE_NAME | ENGINE | ROW_FORMAT | TABLE_ROWS | AVG_ROW_LENGTH | DATA_LENGTH | INDEX_LENGTH | AUTO_INCREMENT |
+------------+--------+------------+------------+----------------+-------------+--------------+----------------+
| drivers    | InnoDB | Dynamic    |       2000 |             90 |      180224 |       163840 |           2049 |
| riders     | InnoDB | Dynamic    |      10184 |            156 |     1589248 |       311296 |          16386 |
| trips      | InnoDB | Dynamic    |     298550 |             96 |    28901376 |     24182784 |         327679 |
+------------+--------+------------+------------+----------------+-------------+--------------+----------------+
+----------+----------------------+-------+------------+--------+--------------+
| TABLE_ID | NAME                 | SPACE | ROW_FORMAT | N_COLS | INSTANT_COLS |
+----------+----------------------+-------+------------+--------+--------------+
|     1068 | ride_hailing/riders  |     2 | Dynamic    |      8 |            0 |
|     1069 | ride_hailing/drivers |     3 | Dynamic    |      9 |            0 |
|     1070 | ride_hailing/trips   |     4 | Dynamic    |     13 |            0 |
+----------+----------------------+-------+------------+--------+--------------+
+-------+----------------------+-----------+-----------+----------------+
| SPACE | NAME                 | PAGE_SIZE | FILE_SIZE | ALLOCATED_SIZE |
+-------+----------------------+-----------+-----------+----------------+
|     2 | ride_hailing/riders  |     16384 |   9437184 |        9441280 |
|     3 | ride_hailing/drivers |     16384 |    425984 |         430080 |
|     4 | ride_hailing/trips   |     16384 |  62914560 |       62918656 |
+-------+----------------------+-----------+-----------+----------------+
+----------+-----------------+-----------+
| INDEX_ID | index_name      | root_page |
+----------+-----------------+-----------+
|      163 | PRIMARY         |         4 |
|      164 | fk_trips_rider  |         5 |
|      165 | fk_trips_driver |         6 |
+----------+-----------------+-----------+
+--------------+------------+-----------------------------------+
| stat_name    | stat_value | stat_description                  |
+--------------+------------+-----------------------------------+
| n_diff_pfx01 |     298550 | id                                |
| n_leaf_pages |       1706 | Number of leaf pages in the index |
| size         |       1764 | Number of pages in the index      |
+--------------+------------+-----------------------------------+`,
        },
        {
          type: "list",
          items: [
            "**`TABLE_ROWS` is an estimate**: 298,550 for a table with exactly 300,001 rows, and 10,184 for 10,000 riders. InnoDB samples a few leaf pages (`innodb_stats_persistent_sample_pages`, 20 by default) and extrapolates. Never use it as a count.",
            "**`DATA_LENGTH` is the clustered index**, which in InnoDB *is* the table: 28,901,376 bytes is 1,764 pages of 16 KB, the same as `size` in `innodb_index_stats`. `INDEX_LENGTH` (24 MB) is the two secondary indexes MySQL created for the foreign keys. Lesson 7 explains why the table is an index.",
            "**`N_COLS` is three more than the columns I declared** (13 for trips' 10): InnoDB adds hidden system columns to every row, including the id of the last transaction that changed it (`DB_TRX_ID`) and a pointer to its previous version (`DB_ROLL_PTR`), which lessons 9 and 10 rely on.",
            "**`AUTO_INCREMENT` is 327,679 for 300,001 trips**, and 16,386 for 10,000 riders. That's not a bug; the AUTO_INCREMENT section explains it.",
            "The `riders.ibd` file (9 MB) is much bigger than its data (1.5 MB): a tablespace grows in whole extents and never shrinks on its own. `OPTIMIZE TABLE` rebuilds it.",
          ],
        },
        {
          type: "paragraph",
          text: "To see the file the way InnoDB does, I flushed the table to disk with `FLUSH TABLES trips FOR EXPORT` (which writes all its dirty pages and blocks writes until `UNLOCK TABLES`), copied `trips.ibd` out of the container with `docker cp`, and read the page headers. Every page starts with a 38-byte **FIL header** (checksum, page number, type at byte 24, space id at byte 34); B-tree pages then have a page header with the tree level and the index id. Page 3 holds the **SDI** (serialized dictionary information): the table's definition as zlib-compressed JSON.",
        },
        {
          type: "code",
          language: "python",
          title: "ibd_peek.py",
          code: `import collections, json, struct, sys, zlib

PAGE = 16384
TYPES = {0: "ALLOCATED", 3: "INODE", 5: "IBUF_BITMAP", 8: "FSP_HDR", 0x45BD: "SDI", 0x45BF: "INDEX"}

data = open(sys.argv[1], "rb").read()
print(f"{len(data):,} bytes = {len(data) // PAGE:,} pages of {PAGE} bytes")

kinds, btree = collections.Counter(), collections.Counter()
for no in range(len(data) // PAGE):
    page = data[no * PAGE:(no + 1) * PAGE]
    ptype = struct.unpack(">H", page[24:26])[0]          # FIL header: FIL_PAGE_TYPE
    kinds[TYPES.get(ptype, ptype)] += 1
    if no < 5:
        space = struct.unpack(">I", page[34:38])[0]       # FIL header: space id
        print(f"page {no}: {TYPES.get(ptype, ptype):<12} space_id={space}")
    if ptype == 0x45BF:                                  # INDEX page header starts at byte 38
        level = struct.unpack(">H", page[64:66])[0]       # PAGE_LEVEL: 0 = leaf
        index_id = struct.unpack(">Q", page[66:74])[0]    # PAGE_INDEX_ID
        btree[(index_id, level)] += 1
print(dict(kinds))
for (index_id, level), n in sorted(btree.items()):
    print(f"index_id={index_id} level={level} pages={n}")

# Page 3 holds the SDI: the table's data dictionary entry, as zlib-compressed JSON
sdi = data[3 * PAGE:4 * PAGE]
pos = 0
while pos < PAGE - 2:
    if sdi[pos] == 0x78:
        try:
            d = zlib.decompressobj()
            obj = json.loads(d.decompress(sdi[pos:]))
            o = obj["dd_object"]
            print(f"SDI {obj['dd_object_type']}: {o['name']} (mysqld_version_id {obj['mysqld_version_id']})")
            if obj["dd_object_type"] == "Table":
                print("  columns:", ", ".join(c["name"] + " " + c["column_type_utf8"] for c in o["columns"]))
                print("  indexes:", [i["name"] for i in o["indexes"]])
            pos += len(sdi) - pos - len(d.unused_data)
            continue
        except Exception:
            pass
    pos += 1`,
        },
        {
          type: "code",
          language: "bash",
          code: `docker cp lesson-mysql-setup:/var/lib/mysql/ride_hailing/trips.ibd ./trips.ibd
python3 ibd_peek.py trips.ibd`,
        },
        {
          type: "output",
          text: `62,914,560 bytes = 3,840 pages of 16384 bytes
page 0: FSP_HDR      space_id=4
page 1: IBUF_BITMAP  space_id=4
page 2: INODE        space_id=4
page 3: SDI          space_id=4
page 4: INDEX        space_id=4
{'FSP_HDR': 1, 'IBUF_BITMAP': 1, 'INODE': 1, 'SDI': 1, 'INDEX': 2907, 'ALLOCATED': 929}
index_id=163 level=0 pages=1706
index_id=163 level=1 pages=3
index_id=163 level=2 pages=1
index_id=164 level=0 pages=489
index_id=164 level=1 pages=1
index_id=165 level=0 pages=704
index_id=165 level=1 pages=2
index_id=165 level=2 pages=1
SDI Tablespace: ride_hailing/trips (mysqld_version_id 80045)
SDI Table: trips (mysqld_version_id 80045)
  columns: id bigint unsigned, rider_id bigint unsigned, driver_id bigint unsigned, status varchar(20), pickup_zone varchar(40), distance_km decimal(6,2), fare decimal(10,2), surge decimal(3,2), requested_at datetime(3), completed_at datetime(3), DB_TRX_ID , DB_ROLL_PTR
  indexes: ['PRIMARY', 'fk_trips_rider', 'fk_trips_driver']`,
        },
        {
          type: "list",
          items: [
            "**The space id in every page header (4) matches `INNODB_TABLES.SPACE`**, and pages 4, 5 and 6 are the roots that `INNODB_INDEXES` reported for `PRIMARY`, `fk_trips_rider` and `fk_trips_driver`.",
            "**The primary key is a three-level B-tree**: one root page (level 2), 3 internal pages (level 1) and 1,706 leaf pages (level 0) for index id 163. That 1,706 is exactly `n_leaf_pages` from `innodb_index_stats`, so the statistics and the file agree. Finding any trip by id costs three page reads, all of them in memory once the pool is warm.",
            "**929 of 3,840 pages are allocated but unused**: the file is grown ahead of need, in extents of 64 pages (1 MB).",
            "**The table definition travels inside the file.** The SDI JSON lists every column with its type, the indexes, and the two hidden system columns `DB_TRX_ID` and `DB_ROLL_PTR`. This is what lets 8.0 import a tablespace or rebuild its dictionary without the old `.frm`. MySQL ships a tool for it, `ibd2sdi`, but the `mysql:8.0` image doesn't include it, so I decoded it myself.",
          ],
        },
      ],
    },
    {
      title: "Databases, Tables and Constraints",
      blocks: [
        {
          type: "heading",
          text: "A database is a schema is a directory",
        },
        {
          type: "code",
          language: "sql",
          title: "schema.sql (first part)",
          code: `CREATE DATABASE ride_hailing;
SHOW CREATE DATABASE ride_hailing;
CREATE SCHEMA IF NOT EXISTS ride_hailing;
SHOW WARNINGS;`,
        },
        {
          type: "output",
          text: `+--------------+----------------------------------------------------------------------------------------------------------------------------------------+
| Database     | Create Database                                                                                                                        |
+--------------+----------------------------------------------------------------------------------------------------------------------------------------+
| ride_hailing | CREATE DATABASE \`ride_hailing\` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */ |
+--------------+----------------------------------------------------------------------------------------------------------------------------------------+
+-------+------+-------------------------------------------------------+
| Level | Code | Message                                               |
+-------+------+-------------------------------------------------------+
| Note  | 1007 | Can't create database 'ride_hailing'; database exists |
+-------+------+-------------------------------------------------------+`,
        },
        {
          type: "list",
          items: [
            "**In MySQL, `DATABASE` and `SCHEMA` are synonyms.** `CREATE SCHEMA` created nothing new here, and `IF NOT EXISTS` turned the error into a note. (In PostgreSQL a schema is a namespace *inside* a database; the PostgreSQL track comes back to that.)",
            "**A database carries defaults, not data**: the character set and collation every new table inherits (`utf8mb4`, `utf8mb4_0900_ai_ci` from the server), shown inside version comments (`/*!40100 ... */` runs only on servers 4.1.0 and newer).",
            "On disk it's the `ride_hailing/` directory seen above. `information_schema.SCHEMATA` lists every database with its defaults; `information_schema`, `mysql`, `performance_schema` and `sys` are the server's own. Queries can always name another database explicitly, as in `SELECT COUNT(*) FROM ride_hailing.trips`, even with no current database selected.",
          ],
        },
        {
          type: "heading",
          text: "The ride-hailing schema",
        },
        {
          type: "paragraph",
          text: "Three tables to start with, the core of the whole track. Payments and payouts arrive later in this lesson.",
        },
        {
          type: "code",
          language: "sql",
          title: "schema.sql (second part)",
          code: `USE ride_hailing;

CREATE TABLE riders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  phone       VARCHAR(15)     NOT NULL,
  email       VARCHAR(255)    NULL,
  created_at  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_riders_phone (phone)
);

CREATE TABLE drivers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  phone       VARCHAR(15)     NOT NULL,
  vehicle_no  VARCHAR(12)     NOT NULL,
  rating      DECIMAL(3,2)    NOT NULL DEFAULT 5.00,
  is_online   BOOLEAN         NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uk_drivers_phone (phone),
  UNIQUE KEY uk_drivers_vehicle (vehicle_no),
  CONSTRAINT chk_drivers_rating CHECK (rating BETWEEN 1.00 AND 5.00)
);

CREATE TABLE trips (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rider_id      BIGINT UNSIGNED NOT NULL,
  driver_id     BIGINT UNSIGNED NULL,
  status        VARCHAR(20)     NOT NULL DEFAULT 'REQUESTED',
  pickup_zone   VARCHAR(40)     NOT NULL,
  distance_km   DECIMAL(6,2)    NULL,
  fare          DECIMAL(10,2)   NULL,
  surge         DECIMAL(3,2)    NOT NULL DEFAULT 1.00,
  requested_at  DATETIME(3)     NOT NULL,
  completed_at  DATETIME(3)     NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_trips_rider  FOREIGN KEY (rider_id)  REFERENCES riders (id),
  CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES drivers (id),
  CONSTRAINT chk_trips_status CHECK (status IN ('REQUESTED','ACCEPTED','ONGOING','COMPLETED','CANCELLED')),
  CONSTRAINT chk_trips_fare   CHECK (fare IS NULL OR fare >= 0),
  CONSTRAINT chk_trips_surge  CHECK (surge BETWEEN 1.00 AND 5.00),
  CONSTRAINT chk_trips_times  CHECK (completed_at IS NULL OR completed_at >= requested_at)
);

SHOW CREATE TABLE drivers\\G`,
        },
        {
          type: "output",
          text: `*************************** 1. row ***************************
       Table: drivers
Create Table: CREATE TABLE \`drivers\` (
  \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
  \`name\` varchar(100) NOT NULL,
  \`phone\` varchar(15) NOT NULL,
  \`vehicle_no\` varchar(12) NOT NULL,
  \`rating\` decimal(3,2) NOT NULL DEFAULT '5.00',
  \`is_online\` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_drivers_phone\` (\`phone\`),
  UNIQUE KEY \`uk_drivers_vehicle\` (\`vehicle_no\`),
  CONSTRAINT \`chk_drivers_rating\` CHECK ((\`rating\` between 1.00 and 5.00))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
        },
        {
          type: "list",
          items: [
            "**What the server stored is not exactly what I wrote.** `BOOLEAN` became `tinyint(1)`, `FALSE` became `'0'`, the defaults became quoted strings, the `CHECK` got an extra pair of brackets, and the engine, charset and collation I didn't specify were filled in. `SHOW CREATE TABLE` is the source of truth; keep migrations in version control, but check against it.",
            "**`PRIMARY KEY`**: unique, not null, and in InnoDB the order the rows are physically stored in. `BIGINT UNSIGNED AUTO_INCREMENT` gives 18.4 quintillion ids.",
            "**`NOT NULL`** on everything that must exist. A nullable column is a third state (\"unknown\") that every query must handle.",
            "**`UNIQUE KEY`** builds an index and rejects duplicates: one account per phone number, one driver per vehicle.",
            "**`CHECK`** constraints are enforced since 8.0.16. On earlier versions the same `CREATE TABLE` succeeded and the checks did nothing, which is why old schemas often have none.",
            "**`FOREIGN KEY`** makes InnoDB check that the referenced row exists, and creates an index on the referencing column if there isn't one (`fk_trips_rider` and `fk_trips_driver` above).",
            "Naming every constraint (`uk_`, `chk_`, `fk_`) pays off at 3 a.m.: the error message names the constraint, and the name says what was violated.",
          ],
        },
        {
          type: "heading",
          text: "Every constraint, violated on purpose",
        },
        {
          type: "code",
          language: "sql",
          title: "constraints.sql",
          code: `INSERT INTO riders (name, phone, email) VALUES ('Asha', '+919800000001', 'asha@example.com');
INSERT INTO drivers (name, phone, vehicle_no) VALUES ('Ravi', '+919700000001', 'WB02AB1234');
INSERT INTO trips (rider_id, driver_id, status, pickup_zone, requested_at) VALUES (1, 1, 'REQUESTED', 'SALT-LAKE', '2026-11-16 09:00:00');

INSERT INTO riders (name, phone) VALUES ('Asha again', '+919800000001');
INSERT INTO riders (name, phone) VALUES (NULL, '+919800000002');
INSERT INTO drivers (name, phone, vehicle_no, rating) VALUES ('Meera', '+919700000002', 'WB02CD5678', 5.5);
INSERT INTO trips (rider_id, pickup_zone, requested_at) VALUES (42, 'NEW-TOWN', NOW());
INSERT INTO trips (rider_id, status, pickup_zone, requested_at) VALUES (1, 'DONE', 'NEW-TOWN', NOW());
INSERT INTO trips (rider_id, pickup_zone, fare, requested_at) VALUES (1, 'NEW-TOWN', -10.00, NOW());
DELETE FROM riders WHERE id = 1;
SELECT * FROM trips;`,
        },
        {
          type: "output",
          text: `ERROR 1062 (23000) at line 5: Duplicate entry '+919800000001' for key 'riders.uk_riders_phone'
ERROR 1048 (23000) at line 6: Column 'name' cannot be null
ERROR 3819 (HY000) at line 7: Check constraint 'chk_drivers_rating' is violated.
ERROR 1452 (23000) at line 8: Cannot add or update a child row: a foreign key constraint fails (\`ride_hailing\`.\`trips\`, CONSTRAINT \`fk_trips_rider\` FOREIGN KEY (\`rider_id\`) REFERENCES \`riders\` (\`id\`))
ERROR 3819 (HY000) at line 9: Check constraint 'chk_trips_status' is violated.
ERROR 3819 (HY000) at line 10: Check constraint 'chk_trips_fare' is violated.
ERROR 1451 (23000) at line 11: Cannot delete or update a parent row: a foreign key constraint fails (\`ride_hailing\`.\`trips\`, CONSTRAINT \`fk_trips_rider\` FOREIGN KEY (\`rider_id\`) REFERENCES \`riders\` (\`id\`))
+----+----------+-----------+-----------+-------------+-------------+------+-------+-------------------------+--------------+
| id | rider_id | driver_id | status    | pickup_zone | distance_km | fare | surge | requested_at            | completed_at |
+----+----------+-----------+-----------+-------------+-------------+------+-------+-------------------------+--------------+
|  1 |        1 |         1 | REQUESTED | SALT-LAKE   |        NULL | NULL |  1.00 | 2026-11-16 09:00:00.000 | NULL         |
+----+----------+-----------+-----------+-------------+-------------+------+-------+-------------------------+--------------+`,
        },
        {
          type: "list",
          items: [
            "**Each constraint has its own error code**: 1062 duplicate key, 1048 null, 3819 check, 1452 missing parent, 1451 parent still referenced. The key name in 1062 is `table.index`, so code can tell which unique key fired (a retried payment versus a reused phone number).",
            "**SQLSTATE `23000` covers 1062, 1048, 1452 and 1451, but `CHECK` failures are `HY000`.** Code that recognises constraint violations by SQLSTATE class `23` alone misses check violations; look at the error code (`SQLException.getErrorCode()`) too.",
            "**The foreign key works in both directions**: a trip can't point to rider 42, and rider 1 can't be deleted while a trip points to them. `ON DELETE CASCADE` or `SET NULL` change the second rule; for financial records, the default (`RESTRICT`) is usually right.",
            "Statements in the same file kept running after each error only because of `--force`. Each failed statement was rolled back on its own; the others were unaffected.",
          ],
        },
        {
          type: "paragraph",
          text: "The constraints are also data the server can show, and a `CHECK` can be switched off and on:",
        },
        {
          type: "code",
          language: "sql",
          title: "constraint-meta.sql",
          code: `SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE, ENFORCED FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'ride_hailing' AND TABLE_NAME IN ('riders','drivers','trips') ORDER BY TABLE_NAME, CONSTRAINT_TYPE, CONSTRAINT_NAME;
SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns, NON_UNIQUE FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'ride_hailing' AND TABLE_NAME = 'trips' GROUP BY INDEX_NAME, NON_UNIQUE;
ALTER TABLE trips ALTER CHECK chk_trips_surge NOT ENFORCED;
INSERT INTO trips (rider_id, pickup_zone, surge, requested_at) VALUES (1, 'GARIA', 9.99, NOW());
ALTER TABLE trips ALTER CHECK chk_trips_surge ENFORCED;
DELETE FROM trips WHERE surge = 9.99;
ALTER TABLE trips ALTER CHECK chk_trips_surge ENFORCED;`,
        },
        {
          type: "output",
          text: `+--------------------+------------+-----------------+----------+
| CONSTRAINT_NAME    | TABLE_NAME | CONSTRAINT_TYPE | ENFORCED |
+--------------------+------------+-----------------+----------+
| chk_drivers_rating | drivers    | CHECK           | YES      |
| PRIMARY            | drivers    | PRIMARY KEY     | YES      |
| uk_drivers_phone   | drivers    | UNIQUE          | YES      |
| uk_drivers_vehicle | drivers    | UNIQUE          | YES      |
| PRIMARY            | riders     | PRIMARY KEY     | YES      |
| uk_riders_phone    | riders     | UNIQUE          | YES      |
| chk_trips_fare     | trips      | CHECK           | YES      |
| chk_trips_status   | trips      | CHECK           | YES      |
| chk_trips_surge    | trips      | CHECK           | YES      |
| chk_trips_times    | trips      | CHECK           | YES      |
| fk_trips_driver    | trips      | FOREIGN KEY     | YES      |
| fk_trips_rider     | trips      | FOREIGN KEY     | YES      |
| PRIMARY            | trips      | PRIMARY KEY     | YES      |
+--------------------+------------+-----------------+----------+
+-----------------+-----------+------------+
| INDEX_NAME      | columns   | NON_UNIQUE |
+-----------------+-----------+------------+
| fk_trips_driver | driver_id |          1 |
| fk_trips_rider  | rider_id  |          1 |
| PRIMARY         | id        |          0 |
+-----------------+-----------+------------+
ERROR 3819 (HY000) at line 7: Check constraint 'chk_trips_surge' is violated.`,
        },
        {
          type: "paragraph",
          text: "With the check `NOT ENFORCED`, a 9.99 surge went in. Turning it back on (line 7) **validated every existing row** and refused while the bad one was there; after the `DELETE`, line 9 succeeded. So a `NOT ENFORCED` window during a migration isn't free: re-enabling scans the table. One more rule that catches people: a foreign key column must have the same type as the column it references.",
        },
        {
          type: "code",
          language: "sql",
          title: "fk-type.sql",
          code: `CREATE TABLE ratings (id INT AUTO_INCREMENT PRIMARY KEY, trip_id INT NOT NULL, stars TINYINT NOT NULL,
  CONSTRAINT fk_ratings_trip FOREIGN KEY (trip_id) REFERENCES trips (id));`,
        },
        {
          type: "output",
          text: `ERROR 3780 (HY000) at line 1: Referencing column 'trip_id' and referenced column 'id' in foreign key constraint 'fk_ratings_trip' are incompatible.`,
        },
        {
          type: "paragraph",
          text: "`INT` can't reference `BIGINT UNSIGNED`. Pick one id type for the whole schema and use it everywhere.",
        },
        {
          type: "heading",
          text: "Loading 300,001 trips",
        },
        {
          type: "paragraph",
          text: "A recursive CTE (lesson 5) generates numbers to insert from, which is much faster than a loop of single inserts:",
        },
        {
          type: "code",
          language: "sql",
          title: "load.sql",
          code: `SET SESSION cte_max_recursion_depth = 1000000;
INSERT INTO riders (name, phone, email)
WITH RECURSIVE seq (n) AS (SELECT 2 UNION ALL SELECT n + 1 FROM seq WHERE n < 10000)
SELECT CONCAT('rider-', n), CONCAT('+9198', LPAD(n, 8, '0')), CONCAT('rider', n, '@example.com') FROM seq;

INSERT INTO drivers (name, phone, vehicle_no, rating, is_online)
WITH RECURSIVE seq (n) AS (SELECT 2 UNION ALL SELECT n + 1 FROM seq WHERE n < 2000)
SELECT CONCAT('driver-', n), CONCAT('+9197', LPAD(n, 8, '0')), CONCAT('WB', LPAD(n, 8, '0')),
       3.50 + (n % 150) / 100, n % 3 = 0 FROM seq;

INSERT INTO trips (rider_id, driver_id, status, pickup_zone, distance_km, fare, surge, requested_at, completed_at)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 300000)
SELECT 3 + n % 9999, 1 + n % 2000, 'COMPLETED',
       ELT(1 + n % 5, 'SALT-LAKE', 'NEW-TOWN', 'HOWRAH', 'PARK-STREET', 'GARIA'),
       1 + (n % 2500) / 100, 50 + (n % 2500) * 0.12, 1.00 + (n % 4) * 0.25,
       TIMESTAMP('2026-10-01') + INTERVAL n MINUTE, TIMESTAMP('2026-10-01') + INTERVAL n MINUTE + INTERVAL 20 MINUTE
FROM seq;
SELECT COUNT(*) FROM trips;`,
        },
        {
          type: "output",
          text: `+----------+
| COUNT(*) |
+----------+
|   300001 |
+----------+`,
        },
        {
          type: "paragraph",
          text: "The trips insert took 21 seconds, foreign key checks included. My first version used `1 + n % 10000` for `rider_id` and failed with `ERROR 1452 ... fk_trips_rider`: there is no rider 2. The duplicate-phone insert in `constraints.sql` had already taken id 2 before failing, so the riders are 1 and 3 to 10,001. The NULL-name insert hadn't taken one. That gap is the first AUTO_INCREMENT surprise of several.",
        },
      ],
    },
    {
      title: "Integers and AUTO_INCREMENT",
      blocks: [
        {
          type: "code",
          language: "sql",
          title: "ints.sql",
          code: `DROP TABLE IF EXISTS int_lab, width_lab, small_ids;
CREATE TABLE int_lab (
  t  TINYINT,
  ti TINYINT UNSIGNED,
  s  SMALLINT,
  i  INT,
  iu INT UNSIGNED,
  b  BIGINT
);
INSERT INTO int_lab (t) VALUES (127);
INSERT INTO int_lab (t) VALUES (128);
INSERT INTO int_lab (ti) VALUES (-1);
INSERT INTO int_lab (i) VALUES (2147483647);
INSERT INTO int_lab (i) VALUES (2147483648);
INSERT INTO int_lab (iu) VALUES (4294967295);
INSERT INTO int_lab (b) VALUES (9223372036854775807);
INSERT INTO int_lab (b) VALUES (9223372036854775808);
SELECT i + 1 FROM int_lab WHERE i IS NOT NULL;
SELECT b + 1 FROM int_lab WHERE b IS NOT NULL;
SELECT CAST(0 AS UNSIGNED) - 1;

-- INT display width is gone in 8.0.17+
CREATE TABLE width_lab (a INT(11), z INT(5) ZEROFILL);
SHOW WARNINGS;
INSERT INTO width_lab VALUES (42, 42);
SELECT * FROM width_lab;

-- an INT AUTO_INCREMENT key running out
CREATE TABLE small_ids (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, note VARCHAR(10)) AUTO_INCREMENT = 2147483646;
INSERT INTO small_ids (note) VALUES ('a');
INSERT INTO small_ids (note) VALUES ('b');
INSERT INTO small_ids (note) VALUES ('c');
SELECT * FROM small_ids;`,
        },
        {
          type: "output",
          text: `ERROR 1264 (22003) at line 11: Out of range value for column 't' at row 1
ERROR 1264 (22003) at line 12: Out of range value for column 'ti' at row 1
ERROR 1264 (22003) at line 14: Out of range value for column 'i' at row 1
ERROR 1264 (22003) at line 17: Out of range value for column 'b' at row 1
+------------+
| i + 1      |
+------------+
| 2147483648 |
+------------+
ERROR 1690 (22003) at line 19: BIGINT value is out of range in '(\`ride_hailing\`.\`int_lab\`.\`b\` + 1)'
ERROR 1690 (22003) at line 20: BIGINT UNSIGNED value is out of range in '(cast(0 as unsigned) - 1)'
+---------+------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Level   | Code | Message                                                                                                                                                                   |
+---------+------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Warning | 1681 | Integer display width is deprecated and will be removed in a future release.                                                                                              |
| Warning | 1681 | The ZEROFILL attribute is deprecated and will be removed in a future release. Use the LPAD function to zero-pad numbers, or store the formatted numbers in a CHAR column. |
| Warning | 1681 | Integer display width is deprecated and will be removed in a future release.                                                                                              |
+---------+------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
+------+-------+
| a    | z     |
+------+-------+
|   42 | 00042 |
+------+-------+
ERROR 1062 (23000) at line 32: Duplicate entry '2147483647' for key 'small_ids.PRIMARY'
+------------+------+
| id         | note |
+------------+------+
| 2147483646 | a    |
| 2147483647 | b    |
+------------+------+`,
        },
        {
          type: "table",
          headers: ["Type", "Bytes", "Signed range", "Unsigned max", "Java type"],
          rows: [
            ["`TINYINT`", "1", "-128 to 127", "255", "`byte` / `Boolean` for `TINYINT(1)`"],
            ["`SMALLINT`", "2", "-32,768 to 32,767", "65,535", "`short`"],
            ["`INT`", "4", "-2,147,483,648 to 2,147,483,647", "4,294,967,295", "`int` (`long` if unsigned)"],
            ["`BIGINT`", "8", "about ±9.22 x 10^18", "about 1.8 x 10^19", "`long` (`BigInteger` if unsigned)"],
          ],
        },
        {
          type: "list",
          items: [
            "**Strict mode rejects out-of-range values with 1264** instead of storing the nearest limit. 128 doesn't fit a `TINYINT`, -1 doesn't fit anything `UNSIGNED`, 2,147,483,648 doesn't fit `INT`.",
            "**Arithmetic is done in `BIGINT`**, so `i + 1` returned 2,147,483,648 even though the column can't store it. Only `BIGINT` itself overflows in expressions (1690). And unsigned subtraction that goes below zero is an error, not a wrap-around: `CAST(0 AS UNSIGNED) - 1` failed. Subtracting two `UNSIGNED` columns (`completed_count - cancelled_count`) can fail at runtime this way.",
            "**`INT(11)` is not a size.** The number in brackets was only a display width for `ZEROFILL`; both are deprecated since 8.0.17 and `SHOW CREATE TABLE` prints plain `int`. `INT(5)` holds the same range as `INT(11)`.",
            "**An `INT AUTO_INCREMENT` key runs out at 2,147,483,647.** The next insert tried to reuse the maximum and failed with a duplicate-key error, so the table accepts no new rows at all. At 100 inserts per second, that's 248 days. For a growing table, use `BIGINT` from the start: changing a primary key type later rewrites the table and every foreign key to it.",
          ],
        },
        {
          type: "heading",
          text: "AUTO_INCREMENT values are not a sequence without gaps",
        },
        {
          type: "code",
          language: "sql",
          title: "autoinc.sql",
          code: `SELECT @@innodb_autoinc_lock_mode, @@auto_increment_increment, @@auto_increment_offset;
DROP TABLE IF EXISTS payouts;
CREATE TABLE payouts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  driver_id  BIGINT UNSIGNED NOT NULL,
  amount     DECIMAL(10,2)   NOT NULL,
  UNIQUE KEY uk_driver (driver_id)
);
INSERT INTO payouts (driver_id, amount) VALUES (1, 950.00);           -- id 1

START TRANSACTION;
INSERT INTO payouts (driver_id, amount) VALUES (2, 1200.00);          -- takes id 2
INSERT INTO payouts (driver_id, amount) VALUES (3, 700.00);           -- takes id 3
ROLLBACK;                                                             -- rows gone, ids stay used

INSERT INTO payouts (driver_id, amount) VALUES (1, 10.00);            -- duplicate driver: fails
INSERT IGNORE INTO payouts (driver_id, amount) VALUES (1, 10.00);     -- ignored, still burns an id
INSERT INTO payouts (driver_id, amount) VALUES (4, 300.00)
  ON DUPLICATE KEY UPDATE amount = amount;                            -- a real insert
INSERT INTO payouts (driver_id, amount) VALUES (4, 300.00)
  ON DUPLICATE KEY UPDATE amount = amount + 1;                        -- an update, still burns an id
SELECT * FROM payouts;
SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'ride_hailing' AND TABLE_NAME = 'payouts';

-- bulk insert: ids are reserved in growing batches
DROP TABLE IF EXISTS bulk_ids;
CREATE TABLE bulk_ids (id INT AUTO_INCREMENT PRIMARY KEY, n INT);
INSERT INTO bulk_ids (n) SELECT 1 FROM trips LIMIT 1000;
INSERT INTO bulk_ids (n) VALUES (2);
SELECT COUNT(*), MAX(id) FROM bulk_ids;
SELECT id FROM bulk_ids WHERE n = 2;`,
        },
        {
          type: "output",
          text: `+----------------------------+----------------------------+-------------------------+
| @@innodb_autoinc_lock_mode | @@auto_increment_increment | @@auto_increment_offset |
+----------------------------+----------------------------+-------------------------+
|                          2 |                          1 |                       1 |
+----------------------------+----------------------------+-------------------------+
ERROR 1062 (23000) at line 16: Duplicate entry '1' for key 'payouts.uk_driver'
+----+-----------+--------+
| id | driver_id | amount |
+----+-----------+--------+
|  1 |         1 | 950.00 |
|  6 |         4 | 301.00 |
+----+-----------+--------+
+----------------+
| AUTO_INCREMENT |
+----------------+
|              8 |
+----------------+
+----------+---------+
| COUNT(*) | MAX(id) |
+----------+---------+
|     1001 |    1024 |
+----------+---------+
+------+
| id   |
+------+
| 1024 |
+------+`,
        },
        {
          type: "list",
          items: [
            "**A rollback doesn't give ids back.** Ids 2 and 3 were handed out inside the transaction and are gone. They have to be: another session may already have taken id 4 while this transaction was open, and InnoDB doesn't lock the counter for a whole transaction (that would serialise every insert).",
            "**A failed duplicate, an `INSERT IGNORE` and an `ON DUPLICATE KEY UPDATE` that updates each burn an id** (4, 5 and 7). The id is assigned before InnoDB discovers the duplicate in the unique index. Errors found earlier, while the server converts the values (a `NULL` in a `NOT NULL` column, a bad string), happen before an id is assigned and burn nothing, as the riders table showed.",
            "**A bulk insert reserved ids in doubling batches.** With `innodb_autoinc_lock_mode = 2` (the 8.0 default, \"interleaved\"), an `INSERT ... SELECT` whose row count isn't known in advance asks for 1, then 2, 4, 8 ... ids at a time. The 1,000 rows used ids 1 to 1,000 out of 1,023 reserved, and the next single insert got 1,024. That's why 300,001 trips left `AUTO_INCREMENT` at 327,679.",
            "**Mode 2 means concurrent bulk inserts can interleave their ids**, which is fine for a key but breaks statement-based replication; 8.0 defaults to row-based binary logging, so it's safe (lesson 15).",
            "**Treat an AUTO_INCREMENT id as an identifier only.** Don't count rows with `MAX(id)`, don't assume no gaps (receipt numbers that must be consecutive need their own counter table updated in the transaction), and don't expose ids if their growth rate is business information.",
          ],
        },
        {
          type: "paragraph",
          text: "One 8.0 change is worth seeing. Before 8.0, InnoDB kept the counter only in memory and recomputed it as `MAX(id) + 1` at startup, so deleting the newest rows and restarting reused their ids, which broke anything that had stored the old ids elsewhere. I deleted payout 6, leaving `MAX(id)` at 1, and restarted the server:",
        },
        {
          type: "code",
          language: "bash",
          code: `docker exec lesson-mysql-setup mysql -uroot -plesson ride_hailing -e "DELETE FROM payouts WHERE id = 6; SELECT MAX(id) FROM payouts;"
docker restart lesson-mysql-setup
docker exec lesson-mysql-setup mysql -uroot -plesson ride_hailing -e "INSERT INTO payouts (driver_id, amount) VALUES (5, 410.00); SELECT * FROM payouts;"`,
        },
        {
          type: "output",
          text: `+---------+
| MAX(id) |
+---------+
|       1 |
+---------+
+----+-----------+--------+
| id | driver_id | amount |
+----+-----------+--------+
|  1 |         1 | 950.00 |
|  8 |         5 | 410.00 |
+----+-----------+--------+`,
        },
        {
          type: "paragraph",
          text: "The new row got 8, not 2: since 8.0 the counter is written to the redo log and survives restarts.",
        },
      ],
    },
    {
      title: "Money: DECIMAL vs DOUBLE",
      blocks: [
        {
          type: "paragraph",
          text: "`FLOAT` (4 bytes) and `DOUBLE` (8 bytes) are binary floating point: they store the nearest fraction with a power-of-two denominator, so most decimal fractions (0.1, 123.45) are stored approximately. `DECIMAL(p,s)` stores exactly `p` digits with `s` after the point, packed as base-10 groups of nine digits in four bytes.",
        },
        {
          type: "code",
          language: "sql",
          title: "money.sql",
          code: `DROP TABLE IF EXISTS money_lab;
CREATE TABLE money_lab (
  id         INT PRIMARY KEY,
  fare_dbl   DOUBLE,
  fare_flt   FLOAT,
  fare_dec   DECIMAL(10,2)
);
INSERT INTO money_lab VALUES (1, 0.1, 0.1, 0.1), (2, 0.2, 0.2, 0.2);
SELECT SUM(fare_dbl), SUM(fare_flt), SUM(fare_dec) FROM money_lab;
SELECT SUM(fare_dbl) = 0.3 AS dbl_equals, SUM(fare_dec) = 0.3 AS dec_equals FROM money_lab;

-- 100,000 fares of 123.45 (the kind of number a fare engine produces)
TRUNCATE money_lab;
SET SESSION cte_max_recursion_depth = 200000;
INSERT INTO money_lab
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 100000)
SELECT n, 123.45, 123.45, 123.45 FROM seq;
SELECT SUM(fare_dbl), SUM(fare_flt), SUM(fare_dec), 123.45 * 100000 AS exact FROM money_lab;
SELECT fare_flt, fare_flt = 123.45 AS flt_equals, fare_dbl = 123.45 AS dbl_equals FROM money_lab WHERE id = 1;

-- rounding half: ROUND() on DOUBLE vs DECIMAL
SELECT ROUND(2.5) AS dec_lit, ROUND(2.5e0) AS dbl_lit, ROUND(3.5e0) AS dbl_lit2,
       ROUND(1.005, 2) AS dec_2dp, ROUND(1.005e0, 2) AS dbl_2dp;

-- DECIMAL range and scale
DROP TABLE IF EXISTS dec_lab;
CREATE TABLE dec_lab (d DECIMAL(5,2));
INSERT INTO dec_lab VALUES (999.99);
INSERT INTO dec_lab VALUES (1000.00);
INSERT INTO dec_lab VALUES (12.345);
SHOW WARNINGS;
INSERT INTO dec_lab VALUES (12.344);
SELECT * FROM dec_lab;`,
        },
        {
          type: "output",
          text: `+---------------------+---------------------+---------------+
| SUM(fare_dbl)       | SUM(fare_flt)       | SUM(fare_dec) |
+---------------------+---------------------+---------------+
| 0.30000000000000004 | 0.30000000447034836 |          0.30 |
+---------------------+---------------------+---------------+
+------------+------------+
| dbl_equals | dec_equals |
+------------+------------+
|          0 |          1 |
+------------+------------+
+--------------------+--------------------+---------------+-------------+
| SUM(fare_dbl)      | SUM(fare_flt)      | SUM(fare_dec) | exact       |
+--------------------+--------------------+---------------+-------------+
| 12344999.999985056 | 12344999.694824219 |   12345000.00 | 12345000.00 |
+--------------------+--------------------+---------------+-------------+
+----------+------------+------------+
| fare_flt | flt_equals | dbl_equals |
+----------+------------+------------+
|   123.45 |          0 |          1 |
+----------+------------+------------+
+---------+---------+----------+---------+---------+
| dec_lit | dbl_lit | dbl_lit2 | dec_2dp | dbl_2dp |
+---------+---------+----------+---------+---------+
|       3 |       2 |        4 |    1.01 |       1 |
+---------+---------+----------+---------+---------+
ERROR 1264 (22003) at line 29: Out of range value for column 'd' at row 1
+-------+------+----------------------------------------+
| Level | Code | Message                                |
+-------+------+----------------------------------------+
| Note  | 1265 | Data truncated for column 'd' at row 1 |
+-------+------+----------------------------------------+
+--------+
| d      |
+--------+
| 999.99 |
|  12.35 |
|  12.34 |
+--------+`,
        },
        {
          type: "list",
          items: [
            "**0.1 + 0.2 is not 0.3 in `DOUBLE`**: the sum was 0.30000000000000004 and the equality test returned 0. In `DECIMAL` it's exactly 0.30.",
            "**100,000 fares of 123.45 summed to 12,344,999.999985056 in `DOUBLE`** (1.5 thousandths of a paisa short) and to 12,344,999.69 in `FLOAT`, 31 paise short. `DECIMAL` gave 12,345,000.00 exactly. Errors grow with the number of rows.",
            "**`FLOAT` can't even find its own value.** The column displays `123.45`, but `fare_flt = 123.45` is false: the stored float is about 123.4499969, and the literal is compared as a double. Never use `=` on approximate types.",
            "**`ROUND` behaves differently for the two kinds of number.** On `DECIMAL` (and exact literals like `2.5`), halves round away from zero: `ROUND(2.5)` = 3, `ROUND(1.005, 2)` = 1.01. On `DOUBLE` (`2.5e0` is a double literal) MySQL uses the C library, which gave round-half-to-even (2.5 to 2, 3.5 to 4), and `1.005e0` is really 1.00499999... in binary, so it rounded down to 1. Any payout computed with `ROUND` on a `DOUBLE` column is rounded by a different rule than the receipt the rider saw.",
            "**`DECIMAL(5,2)` holds up to 999.99.** 1000.00 is out of range (an error), while 12.345 has too many decimals and is **rounded** to 12.35 with only a Note 1265, even in strict mode. So rounding money to paise before the insert is your job; the column will round silently otherwise.",
            "**`DECIMAL(10,2)` takes 5 bytes per value** (8 digits before the point in 4 bytes, 2 after in 1), less than a `DOUBLE`. Exactness doesn't cost space.",
          ],
        },
      ],
    },
    {
      title: "Strings: CHAR, VARCHAR, TEXT and Row Size",
      blocks: [
        {
          type: "code",
          language: "sql",
          title: "strings.sql",
          code: `DROP TABLE IF EXISTS str_lab;
CREATE TABLE str_lab (
  c   CHAR(10),
  v   VARCHAR(10),
  t   TEXT
);
INSERT INTO str_lab VALUES ('WB02  ', 'WB02  ', 'WB02  ');
SELECT CONCAT('[', c, ']') AS c, CONCAT('[', v, ']') AS v, CONCAT('[', t, ']') AS t,
       LENGTH(c), LENGTH(v), LENGTH(t) FROM str_lab;
INSERT INTO str_lab (v) VALUES ('KOLKATA-NEW-TOWN');
INSERT INTO str_lab (v) VALUES ('কলকাতা');
SELECT v, CHAR_LENGTH(v) AS chars, LENGTH(v) AS bytes FROM str_lab WHERE v = 'কলকাতা';

-- TEXT columns: no plain index, no literal default
CREATE TABLE text_lab (note TEXT, UNIQUE KEY (note));
CREATE TABLE text_lab (note TEXT DEFAULT 'none');
CREATE TABLE text_lab (note TEXT DEFAULT ('none'), KEY k_note (note(20)));
SHOW CREATE TABLE text_lab\\G
DROP TABLE text_lab;`,
        },
        {
          type: "output",
          text: `+--------+----------+----------+-----------+-----------+-----------+
| c      | v        | t        | LENGTH(c) | LENGTH(v) | LENGTH(t) |
+--------+----------+----------+-----------+-----------+-----------+
| [WB02] | [WB02  ] | [WB02  ] |         4 |         6 |         6 |
+--------+----------+----------+-----------+-----------+-----------+
ERROR 1406 (22001) at line 10: Data too long for column 'v' at row 1
+--------------------+-------+-------+
| v                  | chars | bytes |
+--------------------+-------+-------+
| কলকাতা             |     6 |    18 |
+--------------------+-------+-------+
ERROR 1170 (42000) at line 15: BLOB/TEXT column 'note' used in key specification without a key length
ERROR 1101 (42000) at line 16: BLOB, TEXT, GEOMETRY or JSON column 'note' can't have a default value
*************************** 1. row ***************************
       Table: text_lab
Create Table: CREATE TABLE \`text_lab\` (
  \`note\` text DEFAULT (_utf8mb4'none'),
  KEY \`k_note\` (\`note\`(20))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
        },
        {
          type: "list",
          items: [
            "**`CHAR` removes trailing spaces when read**: `'WB02  '` came back as `WB02`, 4 bytes. `CHAR(n)` pads to `n` on storage and strips on retrieval (unless `sql_mode` has `PAD_CHAR_TO_FULL_LENGTH`), so trailing spaces are lost for good. `VARCHAR` and `TEXT` kept them.",
            "**`VARCHAR(10)` means 10 characters, not 10 bytes.** Sixteen characters were rejected (1406), but `কলকাতা` (Kolkata in Bengali) fit: 6 characters, 18 bytes in utf8mb4. On disk a `VARCHAR` takes the bytes used plus a 1-byte length (2 bytes if the column's maximum is over 255 bytes).",
            "**`TEXT` can't be indexed whole**, only by a prefix (`note(20)`), and it can't have a literal default, only an expression default in brackets (8.0.13+), which `SHOW CREATE TABLE` displays as `(_utf8mb4'none')`. `TEXT` holds up to 65,535 bytes; `MEDIUMTEXT` 16 MB, `LONGTEXT` 4 GB.",
            "**Use `VARCHAR` with an honest limit** for names, phones, zones and codes; `CHAR` only for truly fixed-length values (a currency code, a country code); `TEXT` for free text you won't search by equality.",
          ],
        },
        {
          type: "heading",
          text: "Two row-size limits",
        },
        {
          type: "code",
          language: "sql",
          title: "rowsize.sql",
          code: `DROP TABLE IF EXISTS wide_lab;
CREATE TABLE wide_lab (a VARCHAR(16383));
DROP TABLE wide_lab;
CREATE TABLE wide_lab (a VARCHAR(10000), b VARCHAR(10000));
CREATE TABLE wide_lab (a VARCHAR(10000), b TEXT);
DROP TABLE wide_lab;
CREATE TABLE wide_lab (c01 CHAR(255) CHARACTER SET latin1, c02 CHAR(255) CHARACTER SET latin1, /* ... */ c40 CHAR(255) CHARACTER SET latin1);
SELECT @@innodb_strict_mode, @@innodb_default_row_format, @@innodb_page_size;`,
        },
        {
          type: "output",
          text: `ERROR 1118 (42000) at line 4: Row size too large. The maximum row size for the used table type, not counting BLOBs, is 65535. This includes storage overhead, check the manual. You have to change some columns to TEXT or BLOBs
ERROR 1118 (42000) at line 7: Row size too large (> 8126). Changing some columns to TEXT or BLOB may help. In current row format, BLOB prefix of 0 bytes is stored inline.
+----------------------+-----------------------------+--------------------+
| @@innodb_strict_mode | @@innodb_default_row_format | @@innodb_page_size |
+----------------------+-----------------------------+--------------------+
|                    1 | dynamic                     |              16384 |
+----------------------+-----------------------------+--------------------+`,
        },
        {
          type: "list",
          items: [
            "(Line 7 really lists all 40 columns; I shortened it here.)",
            "**The server's limit is 65,535 bytes for the declared maximum of all columns together, not counting `TEXT`/`BLOB`.** One `VARCHAR(16383)` in utf8mb4 is 65,532 bytes plus a 2-byte length, and fit. Two `VARCHAR(10000)` are 80,000 bytes and didn't, even though no row will ever be that long; switching one to `TEXT` fixed it, because `TEXT` counts as only a few bytes (a length and a pointer).",
            "**InnoDB's own limit is about half a page: 8,126 bytes per row on a 16 KB page**, so that every B-tree page can hold at least two rows. In the `DYNAMIC` row format (the default), long `VARCHAR`, `TEXT` and `BLOB` values are moved to overflow pages and leave a 20-byte pointer, so they rarely hit this. Fixed-length `CHAR` can't move: forty `CHAR(255)` latin1 columns are 10,200 bytes, and `innodb_strict_mode` rejected the table at `CREATE`. With strict mode off, the `CREATE` succeeds and the error moves to the first insert of a long row.",
            "Rows that fit comfortably in a page are faster to scan: trips averaged 96 bytes (`AVG_ROW_LENGTH`), about 176 rows per leaf page (300,001 rows in 1,706 leaves). Lesson 7 shows what that means for range scans.",
          ],
        },
      ],
    },
    {
      title: "Character Sets and Collations",
      blocks: [
        {
          type: "paragraph",
          text: "A **character set** is how characters become bytes; a **collation** is the set of rules for comparing and sorting them. MySQL's `utf8mb4` is real UTF-8, up to 4 bytes per character. Its old `utf8`, now named `utf8mb3`, stops at 3 bytes, which covers most living scripts but not emoji, many CJK extension characters, or some mathematical symbols.",
        },
        {
          type: "code",
          language: "sql",
          title: "charset.sql",
          code: `DROP TABLE IF EXISTS names_mb3, names_mb4;
CREATE TABLE names_mb3 (name VARCHAR(50)) CHARACTER SET utf8;
SHOW WARNINGS;
SHOW CREATE TABLE names_mb3\\G
CREATE TABLE names_mb4 (name VARCHAR(50)) CHARACTER SET utf8mb4;

INSERT INTO names_mb3 VALUES ('Asha'), ('Ñandú'), ('অশা');
INSERT INTO names_mb3 VALUES ('Asha 🚕');
INSERT INTO names_mb4 VALUES ('Asha 🚕');
SELECT name, CHAR_LENGTH(name) AS chars, LENGTH(name) AS bytes, HEX(RIGHT(name, 1)) AS last_char_hex FROM names_mb4;

-- the same insert with strict mode off
SET SESSION sql_mode = '';
INSERT INTO names_mb3 VALUES ('Ravi 🚕');
SHOW WARNINGS;
SELECT name FROM names_mb3;
SET SESSION sql_mode = DEFAULT;

SELECT @@character_set_client, @@character_set_connection, @@character_set_results, @@character_set_server;
SELECT CHARACTER_SET_NAME, MAXLEN FROM information_schema.CHARACTER_SETS WHERE CHARACTER_SET_NAME IN ('latin1','utf8mb3','utf8mb4');`,
        },
        {
          type: "output",
          text: `+---------+------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Level   | Code | Message                                                                                                                                                                     |
+---------+------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Warning | 3719 | 'utf8' is currently an alias for the character set UTF8MB3, but will be an alias for UTF8MB4 in a future release. Please consider using UTF8MB4 in order to be unambiguous. |
+---------+------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
*************************** 1. row ***************************
       Table: names_mb3
Create Table: CREATE TABLE \`names_mb3\` (
  \`name\` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
ERROR 1366 (HY000) at line 8: Incorrect string value: '\\xF0\\x9F\\x9A\\x95' for column 'name' at row 1
+-----------+-------+-------+---------------+
| name      | chars | bytes | last_char_hex |
+-----------+-------+-------+---------------+
| Asha 🚕     |     6 |     9 | F09F9A95      |
+-----------+-------+-------+---------------+
+---------+------+-----------------------------------------------------------------------+
| Level   | Code | Message                                                               |
+---------+------+-----------------------------------------------------------------------+
| Warning | 1366 | Incorrect string value: '\\xF0\\x9F\\x9A\\x95' for column 'name' at row 1 |
+---------+------+-----------------------------------------------------------------------+
+-----------+
| name      |
+-----------+
| Asha      |
| Ñandú     |
| অশা       |
| Ravi ?    |
+-----------+
+------------------------+----------------------------+-------------------------+------------------------+
| @@character_set_client | @@character_set_connection | @@character_set_results | @@character_set_server |
+------------------------+----------------------------+-------------------------+------------------------+
| utf8mb4                | utf8mb4                    | utf8mb4                 | utf8mb4                |
+------------------------+----------------------------+-------------------------+------------------------+
+--------------------+--------+
| CHARACTER_SET_NAME | MAXLEN |
+--------------------+--------+
| latin1             |      1 |
| utf8mb3            |      3 |
| utf8mb4            |      4 |
+--------------------+--------+`,
        },
        {
          type: "list",
          items: [
            "**`utf8` is `utf8mb3` in MySQL 8.0**, with a warning that it will mean `utf8mb4` some day. Spanish and Bengali names went in fine; `Asha 🚕` was refused because the taxi emoji is 4 bytes (`F0 9F 9A 95`), one more than utf8mb3 can hold.",
            "**In utf8mb4 the same name is 6 characters and 9 bytes.** The table-drawing client pads by bytes, which is why the emoji row's border looks misaligned.",
            "**With strict mode off, the emoji became a literal `?`** (byte `3F`, I checked with `HEX`) and the insert reported success with a warning. That's data loss nobody will notice until a rider complains their name is wrong.",
            "**Four settings decide how text travels**: the client says what it sends (`character_set_client`), the server converts it to `character_set_connection` for evaluation, then to the column's set for storage, and back to `character_set_results` for the reply. `SET NAMES utf8mb4` sets the client-side three together; Connector/J sets them from the URL (`characterEncoding=UTF-8`, the default with 8.0 servers).",
          ],
        },
        {
          type: "heading",
          text: "The silent version: a latin1 client",
        },
        {
          type: "paragraph",
          text: "Remember the `Client characterset: latin1` in `status`. Here's the same `docker exec` without `--default-character-set`:",
        },
        {
          type: "code",
          language: "sql",
          title: "latin1-client.sql",
          code: `SELECT @@character_set_client;
INSERT INTO names_mb4 VALUES ('Meera 🚕');
SELECT name, LENGTH(name) AS bytes, HEX(name) FROM names_mb4 WHERE name LIKE 'Meera%';`,
        },
        {
          type: "output",
          text: `+------------------------+
| @@character_set_client |
+------------------------+
| latin1                 |
+------------------------+
+------------+-------+--------------------------------+
| name       | bytes | HEX(name)                      |
+------------+-------+--------------------------------+
| Meera 🚕 |    15 | 4D6565726120C3B0C5B8C5A1E280A2 |
+------------+-------+--------------------------------+`,
        },
        {
          type: "code",
          language: "bash",
          code: `docker exec lesson-mysql-setup mysql -uroot -plesson --default-character-set=utf8mb4 -t ride_hailing \\
  -e "SELECT name, CHAR_LENGTH(name) AS chars, LENGTH(name) AS bytes FROM names_mb4"`,
        },
        {
          type: "output",
          text: `+-----------------+-------+-------+
| name            | chars | bytes |
+-----------------+-------+-------+
| Asha 🚕           |     6 |     9 |
| Meera ðŸš•      |    10 |    15 |
+-----------------+-------+-------+`,
        },
        {
          type: "list",
          items: [
            "**No error, no warning, and the latin1 session read its own row back correctly**, so it looked fine. But the client had sent the emoji's four UTF-8 bytes while claiming they were four latin1 characters, and the server faithfully converted each \"character\" to UTF-8: 15 bytes stored instead of 10.",
            "**A correct utf8mb4 client then saw `Meera ðŸš•`**: ten characters of **mojibake**, text encoded twice. Every other application reading the table sees the same garbage, and fixing it means finding and re-decoding the affected rows.",
            "The rule: the client, the connection and the column must all be utf8mb4. For the `mysql` client pass `--default-character-set=utf8mb4`; for JDBC, I checked that Connector/J 9.5.0 with no charset options set the session to utf8mb4 (`character_set_client`, `character_set_connection`, collation `utf8mb4_0900_ai_ci`) and stored `Farhan 🚕` as 11 bytes; an old `characterEncoding` or `connectionCollation` in a legacy URL can still override that.",
          ],
        },
        {
          type: "heading",
          text: "Collations: what counts as equal",
        },
        {
          type: "paragraph",
          text: "The default collation `utf8mb4_0900_ai_ci` is based on Unicode 9.0 sorting rules: `ai` is accent-insensitive and `ci` is case-insensitive. That one default changes the meaning of `=`, `UNIQUE`, `GROUP BY` and `ORDER BY` for every text column:",
        },
        {
          type: "code",
          language: "sql",
          title: "collation.sql",
          code: `SELECT 'asha' = 'ASHA' AS case_ci, 'José' = 'jose' AS accent_ai, 'ravi' = 'ravi ' AS trailing_space;
SELECT 'asha' = 'ASHA' COLLATE utf8mb4_0900_as_cs AS as_cs, 'José' = 'jose' COLLATE utf8mb4_0900_as_ci AS as_ci,
       'asha' = 'ASHA' COLLATE utf8mb4_bin AS bin;
SELECT COLLATION_NAME, PAD_ATTRIBUTE FROM information_schema.COLLATIONS
WHERE COLLATION_NAME IN ('utf8mb4_0900_ai_ci','utf8mb4_general_ci','utf8mb4_unicode_ci','utf8mb4_bin','utf8mb4_0900_as_cs');
SELECT 'ravi' = 'ravi ' COLLATE utf8mb4_general_ci AS pad_space_general;

-- a UNIQUE email column under the default collation
DROP TABLE IF EXISTS email_lab;
CREATE TABLE email_lab (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, UNIQUE KEY uk_email (email));
INSERT INTO email_lab (email) VALUES ('asha.roy@example.com');
INSERT INTO email_lab (email) VALUES ('Asha.Roy@Example.com');
INSERT INTO email_lab (email) VALUES ('ásha.roy@example.com');
SELECT * FROM email_lab WHERE email = 'ASHA.ROY@EXAMPLE.COM';

-- same column, binary collation
ALTER TABLE email_lab MODIFY email VARCHAR(255) COLLATE utf8mb4_bin NOT NULL;
INSERT INTO email_lab (email) VALUES ('Asha.Roy@Example.com');
SELECT * FROM email_lab;
SELECT COUNT(*) AS matches FROM email_lab WHERE email = 'ASHA.ROY@EXAMPLE.COM';

-- comparing columns with different collations
DROP TABLE IF EXISTS coll_a, coll_b;
CREATE TABLE coll_a (v VARCHAR(20) COLLATE utf8mb4_0900_ai_ci);
CREATE TABLE coll_b (v VARCHAR(20) COLLATE utf8mb4_general_ci);
INSERT INTO coll_a VALUES ('x'); INSERT INTO coll_b VALUES ('x');
SELECT * FROM coll_a JOIN coll_b ON coll_a.v = coll_b.v;`,
        },
        {
          type: "output",
          text: `+---------+-----------+----------------+
| case_ci | accent_ai | trailing_space |
+---------+-----------+----------------+
|       1 |         1 |              0 |
+---------+-----------+----------------+
+-------+-------+------+
| as_cs | as_ci | bin  |
+-------+-------+------+
|     0 |     0 |    0 |
+-------+-------+------+
+--------------------+---------------+
| COLLATION_NAME     | PAD_ATTRIBUTE |
+--------------------+---------------+
| utf8mb4_0900_ai_ci | NO PAD        |
| utf8mb4_0900_as_cs | NO PAD        |
| utf8mb4_bin        | PAD SPACE     |
| utf8mb4_general_ci | PAD SPACE     |
| utf8mb4_unicode_ci | PAD SPACE     |
+--------------------+---------------+
+-------------------+
| pad_space_general |
+-------------------+
|                 1 |
+-------------------+
ERROR 1062 (23000) at line 12: Duplicate entry 'Asha.Roy@Example.com' for key 'email_lab.uk_email'
ERROR 1062 (23000) at line 13: Duplicate entry 'ásha.roy@example.com' for key 'email_lab.uk_email'
+----+----------------------+
| id | email                |
+----+----------------------+
|  1 | asha.roy@example.com |
+----+----------------------+
+----+----------------------+
| id | email                |
+----+----------------------+
|  4 | Asha.Roy@Example.com |
|  1 | asha.roy@example.com |
+----+----------------------+
+---------+
| matches |
+---------+
|       0 |
+---------+
ERROR 1267 (HY000) at line 27: Illegal mix of collations (utf8mb4_0900_ai_ci,IMPLICIT) and (utf8mb4_general_ci,IMPLICIT) for operation '='`,
        },
        {
          type: "list",
          items: [
            "**Under the default collation, `asha` = `ASHA` and `José` = `jose`.** So a `UNIQUE` email refused `Asha.Roy@Example.com` and even `ásha.roy@example.com` as duplicates of `asha.roy@example.com`, and a lookup in capitals found the lowercase row. For emails that's usually what you want (and the two failed inserts burned ids 2 and 3, so the next row was 4). For a case-sensitive value (a promo code `SAVE10` vs `save10`, an API token, a base64 id) it's a bug: two different values collide.",
            "**With `utf8mb4_bin`, comparison is by code point**: both spellings could be stored, and the capitalised lookup matched nothing. `_as_cs` (accent- and case-sensitive) is the linguistic middle ground.",
            "**`NO PAD` vs `PAD SPACE`.** The 0900 collations compare trailing spaces as characters (`'ravi' = 'ravi '` is 0); the older `general_ci`, `unicode_ci` and `utf8mb4_bin` pad with spaces first (1). Moving a table from `utf8mb4_general_ci` to `0900_ai_ci` can therefore make values that used to collide in a `UNIQUE` index distinct, and change which rows a query matches.",
            "**Different collations on two columns can make a join fail** with `Illegal mix of collations` (1267). It happens when tables created under different server defaults (5.7 used `utf8mb4_general_ci`) are joined after an upgrade. Fix the columns, not every query: `ALTER TABLE ... CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`.",
          ],
        },
      ],
    },
    {
      title: "Dates and Times: DATETIME vs TIMESTAMP",
      blocks: [
        {
          type: "paragraph",
          text: "`DATETIME` stores a calendar date and a clock time, with no time zone: it's what a wall clock showed somewhere. `TIMESTAMP` stores an **instant**, as seconds since 1970-01-01 UTC: values are converted from the session's `time_zone` to UTC on the way in and back on the way out. The connection's time zone therefore changes what a `TIMESTAMP` looks like and what it stores.",
        },
        {
          type: "code",
          language: "sql",
          title: "time.sql",
          code: `DROP TABLE IF EXISTS time_lab;
CREATE TABLE time_lab (
  id  INT PRIMARY KEY,
  dt  DATETIME,
  ts  TIMESTAMP NULL
);
SET time_zone = '+05:30';                       -- an app server in Kolkata
INSERT INTO time_lab VALUES (1, '2026-11-16 09:00:00', '2026-11-16 09:00:00');
SELECT @@session.time_zone, dt, ts, UNIX_TIMESTAMP(dt), UNIX_TIMESTAMP(ts) FROM time_lab;

SET time_zone = '+00:00';                       -- a reporting job running in UTC
SELECT @@session.time_zone, dt, ts, UNIX_TIMESTAMP(dt), UNIX_TIMESTAMP(ts) FROM time_lab;

SET time_zone = '-05:00';
SELECT @@session.time_zone, dt, ts FROM time_lab;

-- the 2038 limit
SET time_zone = '+00:00';
INSERT INTO time_lab VALUES (2, '2038-01-19 03:14:07', '2038-01-19 03:14:07');
INSERT INTO time_lab VALUES (3, '2038-01-19 03:14:08', '2038-01-19 03:14:08');
INSERT INTO time_lab VALUES (4, '2038-01-19 03:14:08', NULL);
INSERT INTO time_lab VALUES (5, '9999-12-31 23:59:59', NULL);
INSERT INTO time_lab VALUES (6, '1000-01-01 00:00:00', '1969-12-31 23:59:59');
SELECT * FROM time_lab ORDER BY id;

-- fractional seconds are rounded, not truncated, unless asked
DROP TABLE IF EXISTS fsp_lab;
CREATE TABLE fsp_lab (a DATETIME, b DATETIME(3), c DATETIME(6));
INSERT INTO fsp_lab VALUES ('2026-11-16 23:59:59.7', '2026-11-16 23:59:59.7', '2026-11-16 23:59:59.7');
SELECT * FROM fsp_lab;`,
        },
        {
          type: "output",
          text: `+---------------------+---------------------+---------------------+--------------------+--------------------+
| @@session.time_zone | dt                  | ts                  | UNIX_TIMESTAMP(dt) | UNIX_TIMESTAMP(ts) |
+---------------------+---------------------+---------------------+--------------------+--------------------+
| +05:30              | 2026-11-16 09:00:00 | 2026-11-16 09:00:00 |         1794799800 |         1794799800 |
+---------------------+---------------------+---------------------+--------------------+--------------------+
+---------------------+---------------------+---------------------+--------------------+--------------------+
| @@session.time_zone | dt                  | ts                  | UNIX_TIMESTAMP(dt) | UNIX_TIMESTAMP(ts) |
+---------------------+---------------------+---------------------+--------------------+--------------------+
| +00:00              | 2026-11-16 09:00:00 | 2026-11-16 03:30:00 |         1794819600 |         1794799800 |
+---------------------+---------------------+---------------------+--------------------+--------------------+
+---------------------+---------------------+---------------------+
| @@session.time_zone | dt                  | ts                  |
+---------------------+---------------------+---------------------+
| -05:00              | 2026-11-16 09:00:00 | 2026-11-15 22:30:00 |
+---------------------+---------------------+---------------------+
ERROR 1292 (22007) at line 20: Incorrect datetime value: '2038-01-19 03:14:08' for column 'ts' at row 1
ERROR 1292 (22007) at line 23: Incorrect datetime value: '1969-12-31 23:59:59' for column 'ts' at row 1
+----+---------------------+---------------------+
| id | dt                  | ts                  |
+----+---------------------+---------------------+
|  1 | 2026-11-16 09:00:00 | 2026-11-16 03:30:00 |
|  2 | 2038-01-19 03:14:07 | 2038-01-19 03:14:07 |
|  4 | 2038-01-19 03:14:08 | NULL                |
|  5 | 9999-12-31 23:59:59 | NULL                |
+----+---------------------+---------------------+
+---------------------+-------------------------+----------------------------+
| a                   | b                       | c                          |
+---------------------+-------------------------+----------------------------+
| 2026-11-17 00:00:00 | 2026-11-16 23:59:59.700 | 2026-11-16 23:59:59.700000 |
+---------------------+-------------------------+----------------------------+`,
        },
        {
          type: "list",
          items: [
            "**The `TIMESTAMP` moved with the session; the `DATETIME` didn't.** Written as 09:00 in `+05:30`, the `TIMESTAMP` reads as 03:30 in UTC and 22:30 the previous day in `-05:00`: always the same instant (`UNIX_TIMESTAMP` 1794799800 both times). The `DATETIME` reads 09:00 everywhere, and its `UNIX_TIMESTAMP` changed (1794799800 vs 1794819600), because MySQL has to guess which zone the wall-clock value was in and uses the session's.",
            "**`TIMESTAMP` ends at 2038-01-19 03:14:07 UTC**, the largest signed 32-bit number of seconds; one second later was rejected (1292). It also can't go before 1970-01-01 00:00:01 UTC (row 6 failed). A trip `scheduled_for` date, a driver's licence expiry or a 30-year loan schedule doesn't fit. `DATETIME` runs from year 1000 to 9999.",
            "**Fractional seconds are rounded**: `23:59:59.7` in a plain `DATETIME` became the next day, `2026-11-17 00:00:00`. A trip completed at 23:59:59.7 lands in tomorrow's report. Declare the precision you mean (`DATETIME(3)` for milliseconds, as `trips` does) or add `TIME_TRUNCATE_FRACTIONAL` to `sql_mode`.",
            "**Which to choose.** `TIMESTAMP` behaves like Java's `Instant` but stops in 2038. The common production convention is `DATETIME(3)` holding **UTC by agreement**, with every connection set to UTC, which keeps the full date range and makes the value independent of session settings. Either way, decide once, write it in the schema comments, and make the JDBC driver agree (next section).",
          ],
        },
      ],
    },
    {
      title: "JSON, ENUM and BOOLEAN",
      blocks: [
        {
          type: "heading",
          text: "JSON: validated, normalised, binary",
        },
        {
          type: "code",
          language: "sql",
          title: "json.sql",
          code: `DROP TABLE IF EXISTS trip_events;
CREATE TABLE trip_events (
  id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  trip_id  BIGINT NOT NULL,
  payload  JSON NOT NULL
);
INSERT INTO trip_events (trip_id, payload) VALUES
  (1, '{"type": "PICKUP", "lat": 22.5726, "lng": 88.3639, "device": {"os": "android", "app": "7.4.1"}}'),
  (1, '{"type": "DROP",   "lat": 22.5958, "lng": 88.4795, "toll": 45.00}');
INSERT INTO trip_events (trip_id, payload) VALUES (2, '{"type": "PICKUP", "lat": 22.57,}');
SELECT id, payload->'$.type' AS arrow, payload->>'$.type' AS unquoted, payload->>'$.device.os' AS os,
       JSON_TYPE(payload->'$.lat') AS lat_type FROM trip_events;
SELECT payload FROM trip_events WHERE id = 2;
SELECT JSON_STORAGE_SIZE(payload) AS binary_bytes, LENGTH(CAST(payload AS CHAR)) AS text_bytes FROM trip_events;
SELECT SUM(payload->>'$.type' = 'DROP') AS upper_matches, SUM(payload->>'$.type' = 'drop') AS lower_matches FROM trip_events;
SELECT DISTINCT COLLATION(payload->>'$.type') AS unquoted_collation FROM trip_events;`,
        },
        {
          type: "output",
          text: `ERROR 3140 (22032) at line 10: Invalid JSON text: "Missing a name for object member." at position 32 in value for column 'trip_events.payload'.
+----+----------+----------+---------+----------+
| id | arrow    | unquoted | os      | lat_type |
+----+----------+----------+---------+----------+
|  1 | "PICKUP" | PICKUP   | android | DOUBLE   |
|  2 | "DROP"   | DROP     | NULL    | DOUBLE   |
+----+----------+----------+---------+----------+
+----------------------------------------------------------------+
| payload                                                        |
+----------------------------------------------------------------+
| {"lat": 22.5958, "lng": 88.4795, "toll": 45.0, "type": "DROP"} |
+----------------------------------------------------------------+
+--------------+------------+
| binary_bytes | text_bytes |
+--------------+------------+
|          109 |         95 |
|           76 |         62 |
+--------------+------------+
+---------------+---------------+
| upper_matches | lower_matches |
+---------------+---------------+
|             1 |             0 |
+---------------+---------------+
+--------------------+
| unquoted_collation |
+--------------------+
| utf8mb4_bin        |
+--------------------+`,
        },
        {
          type: "list",
          items: [
            "**`JSON` is validated on insert**: a trailing comma was refused with 3140 and the position of the error. A `TEXT` column would have stored it, and the consumer would have failed later.",
            "**`->` returns JSON (`\"PICKUP\"`, with quotes); `->>` returns the unquoted text.** A missing path (`$.device.os` on the DROP event) is `NULL`, not an error.",
            "**The stored document is normalised**: keys sorted, extra spaces gone, and `45.00` became `45.0`, because JSON numbers are stored as doubles (`JSON_TYPE` said `DOUBLE`). Don't keep money in JSON if you need the exact decimal back; store it as a string or in a `DECIMAL` column.",
            "**The binary format is bigger than the text** (109 against 95 bytes) because it stores offsets that let MySQL jump to one key without parsing the whole document.",
            "**`->>` compares with `utf8mb4_bin`, case-sensitively**, unlike every ordinary column in this schema: `'drop'` didn't match `DROP`. Code that moves a field from a column into JSON changes the meaning of its `WHERE` clauses.",
            "To search inside JSON quickly, index a generated column or use a functional index (`INDEX ((CAST(payload->>'$.type' AS CHAR(20)) COLLATE utf8mb4_bin))`); lesson 8 covers indexes on expressions.",
          ],
        },
        {
          type: "heading",
          text: "ENUM: a list of strings stored as a number",
        },
        {
          type: "code",
          language: "sql",
          title: "enum.sql",
          code: `DROP TABLE IF EXISTS enum_lab;
CREATE TABLE enum_lab (id INT PRIMARY KEY, status ENUM('REQUESTED','ONGOING','COMPLETED','CANCELLED') NOT NULL);
INSERT INTO enum_lab VALUES (1, 'COMPLETED'), (2, 'CANCELLED'), (3, 'REQUESTED'), (4, 'ongoing');
INSERT INTO enum_lab VALUES (5, 'DONE');
SELECT id, status, status + 0 AS stored_index FROM enum_lab ORDER BY status;
SELECT id, status FROM enum_lab ORDER BY CAST(status AS CHAR);
SELECT id, status FROM enum_lab WHERE status = 2;
SELECT id, status FROM enum_lab WHERE status > 'COMPLETED';
SET SESSION sql_mode = '';
INSERT INTO enum_lab VALUES (6, 'DONE');
SELECT id, CONCAT('[', status, ']') AS status, status + 0 AS stored_index FROM enum_lab WHERE id = 6;
SET SESSION sql_mode = DEFAULT;
ALTER TABLE enum_lab MODIFY status ENUM('REQUESTED','ONGOING','COMPLETED','CANCELLED','NO_SHOW') NOT NULL, ALGORITHM=INSTANT;
ALTER TABLE enum_lab MODIFY status ENUM('REQUESTED','ACCEPTED','ONGOING','COMPLETED','CANCELLED','NO_SHOW') NOT NULL, ALGORITHM=INSTANT;
ALTER TABLE enum_lab MODIFY status ENUM('REQUESTED','ACCEPTED','ONGOING','COMPLETED','CANCELLED','NO_SHOW') NOT NULL;
SELECT id, status, status + 0 AS stored_index FROM enum_lab ORDER BY id;`,
        },
        {
          type: "output",
          text: `ERROR 1265 (01000) at line 4: Data truncated for column 'status' at row 1
+----+-----------+--------------+
| id | status    | stored_index |
+----+-----------+--------------+
|  3 | REQUESTED |            1 |
|  4 | ONGOING   |            2 |
|  1 | COMPLETED |            3 |
|  2 | CANCELLED |            4 |
+----+-----------+--------------+
+----+-----------+
| id | status    |
+----+-----------+
|  2 | CANCELLED |
|  1 | COMPLETED |
|  4 | ONGOING   |
|  3 | REQUESTED |
+----+-----------+
+----+---------+
| id | status  |
+----+---------+
|  4 | ONGOING |
+----+---------+
+----+-----------+
| id | status    |
+----+-----------+
|  3 | REQUESTED |
|  4 | ONGOING   |
+----+-----------+
+----+--------+--------------+
| id | status | stored_index |
+----+--------+--------------+
|  6 | []     |            0 |
+----+--------+--------------+
ERROR 1846 (0A000) at line 14: ALGORITHM=INSTANT is not supported. Reason: Need to rebuild the table to change column type. Try ALGORITHM=COPY/INPLACE.
+----+-----------+--------------+
| id | status    | stored_index |
+----+-----------+--------------+
|  1 | COMPLETED |            4 |
|  2 | CANCELLED |            5 |
|  3 | REQUESTED |            1 |
|  4 | ONGOING   |            3 |
|  6 |           |            0 |
+----+-----------+--------------+`,
        },
        {
          type: "list",
          items: [
            "**An `ENUM` stores the position in the list (1 byte), and that leaks everywhere.** `ORDER BY status` sorted by position (REQUESTED, ONGOING, COMPLETED, CANCELLED), not alphabetically; `WHERE status = 2` matched `ONGOING`; but `status > 'COMPLETED'` compared as **strings** and returned `REQUESTED` and `ONGOING`. Three operators, two different orders.",
            "**Values match case-insensitively** (`'ongoing'` was stored as `ONGOING`) because the column uses the table's collation.",
            "**Strict mode rejects an unknown value; non-strict stores the empty string with index 0**, a hidden extra member every reader must handle.",
            "**Appending a value at the end was instant** (`Query OK, 0 rows affected` in 0.02 s), but inserting `ACCEPTED` in the middle was refused as `INSTANT` and the plain `ALTER` rebuilt the table (`5 rows affected`), because every stored index after it changes: `COMPLETED` went from 3 to 4. On a 300-million-row trips table, that's hours of copying.",
            "**For a status that will grow, use `VARCHAR` with a `CHECK`** (as `trips.status` does) or a small lookup table with a foreign key. `ENUM` is fine for lists that truly never change.",
          ],
        },
        {
          type: "heading",
          text: "BOOLEAN is TINYINT(1)",
        },
        {
          type: "code",
          language: "sql",
          title: "bool.sql",
          code: `DROP TABLE IF EXISTS bool_lab;
CREATE TABLE bool_lab (id INT PRIMARY KEY, is_online BOOLEAN);
SHOW CREATE TABLE bool_lab\\G
INSERT INTO bool_lab VALUES (1, TRUE), (2, FALSE), (3, 5), (4, -1);
INSERT INTO bool_lab VALUES (5, 300);
SELECT id, is_online, is_online = TRUE AS eq_true, is_online IS TRUE AS is_true FROM bool_lab;
SELECT TRUE, FALSE, TRUE + TRUE;`,
        },
        {
          type: "output",
          text: `*************************** 1. row ***************************
       Table: bool_lab
Create Table: CREATE TABLE \`bool_lab\` (
  \`id\` int NOT NULL,
  \`is_online\` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
ERROR 1264 (22003) at line 5: Out of range value for column 'is_online' at row 1
+----+-----------+---------+---------+
| id | is_online | eq_true | is_true |
+----+-----------+---------+---------+
|  1 |         1 |       1 |       1 |
|  2 |         0 |       0 |       0 |
|  3 |         5 |       0 |       1 |
|  4 |        -1 |       0 |       1 |
+----+-----------+---------+---------+
+------+-------+-------------+
| TRUE | FALSE | TRUE + TRUE |
+------+-------+-------------+
|    1 |     0 |           2 |
+------+-------+-------------+`,
        },
        {
          type: "paragraph",
          text: "MySQL has no boolean type: `BOOLEAN` is an alias for `TINYINT(1)` and `TRUE` is the number 1. The column accepted 5 and -1 (anything from -128 to 127). Those rows are true for `IS TRUE` and in a bare `WHERE is_online`, but false for `= TRUE`, so two queries that look equivalent return different drivers. Write `WHERE is_online` or `IS TRUE`, and add `CHECK (is_online IN (0, 1))` if other systems write to the table. Connector/J reports `TINYINT(1)` as `BIT` and maps it to `java.lang.Boolean` (`tinyInt1isBit=true` by default), so a 5 written by another system arrives in Java as `true`.",
        },
      ],
    },
    {
      title: "Strict sql_mode",
      blocks: [
        {
          type: "paragraph",
          text: "`sql_mode` is a list of flags that decide how forgiving the server is. MySQL 8.0's default is `ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`. `STRICT_TRANS_TABLES` is the one that turns bad values into errors. Many servers upgraded from 5.6, and many managed-database parameter groups, still run with it removed. The same five inserts, both ways:",
        },
        {
          type: "code",
          language: "sql",
          title: "sqlmode.sql",
          code: `DROP TABLE IF EXISTS mode_lab;
CREATE TABLE mode_lab (
  vehicle_no  VARCHAR(10) NOT NULL,
  seats       TINYINT     NOT NULL,
  fare        DECIMAL(6,2),
  pickup_at   DATETIME
);
-- strict (the 8.0 default)
INSERT INTO mode_lab VALUES ('WB02AB12345678', 4, 120.00, '2026-11-16 09:00:00');
INSERT INTO mode_lab VALUES ('WB02AB1234', 400, 120.00, '2026-11-16 09:00:00');
INSERT INTO mode_lab VALUES ('WB02AB1234', 4, 'abc', '2026-11-16 09:00:00');
INSERT INTO mode_lab VALUES ('WB02AB1234', 4, 120.00, '2026-02-30 09:00:00');
INSERT INTO mode_lab (fare) VALUES (120.00);

-- non-strict: what MySQL 5.6 and many old configs did
SET SESSION sql_mode = '';
INSERT INTO mode_lab VALUES ('WB02AB12345678', 4, 120.00, '2026-11-16 09:00:00');
SHOW WARNINGS;
INSERT INTO mode_lab VALUES ('WB02AB1234', 400, 120.00, '2026-11-16 09:00:00');
SHOW WARNINGS;
INSERT INTO mode_lab VALUES ('WB02AB1234', 4, 'abc', '2026-11-16 09:00:00');
SHOW WARNINGS;
INSERT INTO mode_lab VALUES ('WB02AB1234', 4, 120.00, '2026-02-30 09:00:00');
SHOW WARNINGS;
INSERT INTO mode_lab (fare) VALUES (120.00);
SHOW WARNINGS;
SELECT * FROM mode_lab;
SET SESSION sql_mode = DEFAULT;`,
        },
        {
          type: "output",
          text: `ERROR 1406 (22001) at line 9: Data too long for column 'vehicle_no' at row 1
ERROR 1264 (22003) at line 10: Out of range value for column 'seats' at row 1
ERROR 1366 (HY000) at line 11: Incorrect decimal value: 'abc' for column 'fare' at row 1
ERROR 1292 (22007) at line 12: Incorrect datetime value: '2026-02-30 09:00:00' for column 'pickup_at' at row 1
ERROR 1364 (HY000) at line 13: Field 'vehicle_no' doesn't have a default value
+---------+------+-------------------------------------------------+
| Level   | Code | Message                                         |
+---------+------+-------------------------------------------------+
| Warning | 1265 | Data truncated for column 'vehicle_no' at row 1 |
+---------+------+-------------------------------------------------+
+---------+------+------------------------------------------------+
| Level   | Code | Message                                        |
+---------+------+------------------------------------------------+
| Warning | 1264 | Out of range value for column 'seats' at row 1 |
+---------+------+------------------------------------------------+
+---------+------+-----------------------------------------------------------+
| Level   | Code | Message                                                   |
+---------+------+-----------------------------------------------------------+
| Warning | 1366 | Incorrect decimal value: 'abc' for column 'fare' at row 1 |
+---------+------+-----------------------------------------------------------+
+---------+------+----------------------------------------------------+
| Level   | Code | Message                                            |
+---------+------+----------------------------------------------------+
| Warning | 1264 | Out of range value for column 'pickup_at' at row 1 |
+---------+------+----------------------------------------------------+
+---------+------+-------------------------------------------------+
| Level   | Code | Message                                         |
+---------+------+-------------------------------------------------+
| Warning | 1364 | Field 'vehicle_no' doesn't have a default value |
| Warning | 1364 | Field 'seats' doesn't have a default value      |
+---------+------+-------------------------------------------------+
+------------+-------+--------+---------------------+
| vehicle_no | seats | fare   | pickup_at           |
+------------+-------+--------+---------------------+
| WB02AB1234 |     4 | 120.00 | 2026-11-16 09:00:00 |
| WB02AB1234 |   127 | 120.00 | 2026-11-16 09:00:00 |
| WB02AB1234 |     4 |   0.00 | 2026-11-16 09:00:00 |
| WB02AB1234 |     4 | 120.00 | 0000-00-00 00:00:00 |
|            |     0 | 120.00 | NULL                |
+------------+-------+--------+---------------------+`,
        },
        {
          type: "table",
          headers: ["Input", "Strict (8.0 default)", "Non-strict: what got stored"],
          rows: [
            ["14-character plate in `VARCHAR(10)`", "Error 1406", "`WB02AB1234`, silently cut"],
            ["400 seats in `TINYINT`", "Error 1264", "127, the type's maximum"],
            ["`'abc'` as a fare", "Error 1366", "0.00"],
            ["February 30", "Error 1292", "`0000-00-00 00:00:00`, a date that doesn't exist"],
            ["Missing `NOT NULL` columns", "Error 1364", "`''` and 0, the implicit defaults"],
          ],
        },
        {
          type: "list",
          items: [
            "**Every non-strict insert reported success** (`Query OK, 1 row affected, 1 warning`). JDBC exposes warnings only through `Statement.getWarnings()`, which almost nobody reads, so in a Java service the data was simply changed.",
            "**The zero date is a trap for Java.** Connector/J by default throws on `0000-00-00` when reading a `DATETIME` (`zeroDateTimeBehavior=EXCEPTION`), so one bad row written years ago can break a report today.",
            "**Never turn strict mode off to make an error go away.** The error is telling you the value is wrong. If a legacy server runs non-strict, set the mode per session from the application (`sessionVariables=sql_mode='...'` in the JDBC URL) while you fix the server configuration.",
            "`STRICT_TRANS_TABLES` applies fully to transactional tables (InnoDB); `STRICT_ALL_TABLES` also covers non-transactional engines. In 8.0, with only InnoDB in use, they behave the same here.",
          ],
        },
      ],
    },
    {
      title: "The Java Side: JDBC Type Mapping",
      blocks: [
        {
          type: "paragraph",
          text: "What a Java backend actually receives from these columns, with Connector/J 9.5.0 and the default URL options, on a JVM whose default time zone is `Asia/Kolkata` (as on my machine) and a server whose session time zone is `SYSTEM` (UTC in the container):",
        },
        {
          type: "code",
          language: "sql",
          title: "jdbc-prep.sql",
          code: `DROP TABLE IF EXISTS jdbc_lab;
CREATE TABLE jdbc_lab (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fare       DECIMAL(10,2),
  fare_dbl   DOUBLE,
  is_online  BOOLEAN,
  status     ENUM('REQUESTED','COMPLETED'),
  payload    JSON,
  dt         DATETIME(3),
  ts         TIMESTAMP(3) NULL,
  seats      TINYINT
);`,
        },
        {
          type: "code",
          language: "java",
          title: "JdbcTypes.java",
          code: `import java.math.BigDecimal;
import java.sql.*;
import java.time.*;

public class JdbcTypes {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:mysql://localhost:33307/ride_hailing?user=root&password=lesson" + (args.length > 0 ? "&" + args[0] : "");
        System.out.println("URL options: " + (args.length > 0 ? args[0] : "(none)"));
        Instant completedAt = Instant.parse("2026-11-16T03:30:00Z");          // 09:00 in Kolkata
        System.out.println("JVM time zone: " + ZoneId.systemDefault());
        try (Connection c = DriverManager.getConnection(url)) {
            c.createStatement().execute("TRUNCATE jdbc_lab");
            try (PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO jdbc_lab (fare, fare_dbl, is_online, status, payload, dt, ts, seats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
                ps.setBigDecimal(1, new BigDecimal("123.45"));
                ps.setDouble(2, 123.45);
                ps.setBoolean(3, true);
                ps.setString(4, "COMPLETED");
                ps.setString(5, "{\\"type\\": \\"DROP\\", \\"toll\\": 45.00}");
                ps.setObject(6, LocalDateTime.of(2026, 11, 16, 9, 0));                // wall-clock time, no zone
                ps.setObject(7, completedAt);                                          // an instant
                ps.setInt(8, 4);
                ps.executeUpdate();
            }
            try (ResultSet rs = c.createStatement().executeQuery("SELECT * FROM jdbc_lab")) {
                ResultSetMetaData md = rs.getMetaData();
                rs.next();
                for (int i = 1; i <= md.getColumnCount(); i++) {
                    Object v = rs.getObject(i);
                    System.out.printf("%-10s %-22s -> %-22s %s%n", md.getColumnName(i), md.getColumnTypeName(i),
                            md.getColumnClassName(i), v);
                }
                System.out.println("ts as Instant:        " + rs.getTimestamp("ts").toInstant());
                System.out.println("ts as OffsetDateTime: " + rs.getObject("ts", OffsetDateTime.class));
                System.out.println("dt as LocalDateTime:  " + rs.getObject("dt", LocalDateTime.class));
            }
            try (ResultSet rs = c.createStatement().executeQuery("SELECT @@session.time_zone, CAST(ts AS CHAR) FROM jdbc_lab")) {
                rs.next();
                System.out.println("session time_zone=" + rs.getString(1) + ", ts as the server prints it: " + rs.getString(2));
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `J=~/.m2/repository/com/mysql/mysql-connector-j/9.5.0/mysql-connector-j-9.5.0.jar
java -cp $J JdbcTypes.java
java -cp $J JdbcTypes.java connectionTimeZone=SERVER`,
        },
        {
          type: "output",
          text: `URL options: (none)
JVM time zone: Asia/Kolkata
id         BIGINT UNSIGNED        -> java.math.BigInteger   1
fare       DECIMAL                -> java.math.BigDecimal   123.45
fare_dbl   DOUBLE                 -> java.lang.Double       123.45
is_online  BIT                    -> java.lang.Boolean      true
status     CHAR                   -> java.lang.String       COMPLETED
payload    JSON                   -> java.lang.String       {"toll": 45.0, "type": "DROP"}
dt         DATETIME               -> java.time.LocalDateTime 2026-11-16T09:00
ts         TIMESTAMP              -> java.sql.Timestamp     2026-11-16 09:00:00.0
seats      TINYINT                -> java.lang.Integer      4
ts as Instant:        2026-11-16T03:30:00Z
ts as OffsetDateTime: 2026-11-16T09:00+05:30
dt as LocalDateTime:  2026-11-16T09:00
session time_zone=SYSTEM, ts as the server prints it: 2026-11-16 09:00:00.000
=====
URL options: connectionTimeZone=SERVER
ts         TIMESTAMP              -> java.sql.Timestamp     2026-11-16 09:00:00.0
ts as Instant:        2026-11-16T03:30:00Z
ts as OffsetDateTime: 2026-11-16T03:30Z
session time_zone=SYSTEM, ts as the server prints it: 2026-11-16 03:30:00.000`,
        },
        {
          type: "paragraph",
          text: "(The `=====` separator is mine; for the second run I show only the time lines, the rest was identical.)",
        },
        {
          type: "table",
          headers: ["MySQL column", "`getObject` returns", "What to use in an entity"],
          rows: [
            ["`BIGINT UNSIGNED`", "`BigInteger`", "`Long` (fine below 2^63), or a signed `BIGINT` column"],
            ["`DECIMAL`", "`BigDecimal`", "`BigDecimal`, constructed from strings, never from `double`"],
            ["`DOUBLE`", "`Double`", "Measurements only (coordinates, ratings), never money"],
            ["`BOOLEAN` / `TINYINT(1)`", "`Boolean` (reported as `BIT`)", "`boolean`"],
            ["`ENUM`", "`String` (reported as `CHAR`)", "A Java `enum` with `@Enumerated(EnumType.STRING)`"],
            ["`JSON`", "`String`, normalised by the server", "A `String` plus a mapper, or a JSON type from Hibernate 6"],
            ["`DATETIME`", "`LocalDateTime`", "`LocalDateTime`, or `Instant` if the column is UTC by convention"],
            ["`TIMESTAMP`", "`java.sql.Timestamp`", "`Instant` / `OffsetDateTime` via `getObject(col, OffsetDateTime.class)`"],
          ],
        },
        {
          type: "list",
          items: [
            "**`getObject(col, Instant.class)` threw `SQLException: Conversion not supported for type java.time.Instant`** on this driver version, so I converted through `getTimestamp(...).toInstant()`. `OffsetDateTime`, `LocalDateTime` and `ZonedDateTime` are supported.",
            "**With the default URL, the instant stored in the database was 5.5 hours wrong.** The driver assumes the session runs in the JVM's zone (Kolkata) and sent the instant as the local text `09:00`, but the server's session was UTC, so it stored 09:00 UTC. Java read it back as the right `Instant` (03:30Z) because it made the same assumption in reverse, but the server's own view (`CAST(ts AS CHAR)` in a UTC session) was 09:00. Any SQL report, any other service with a UTC JVM, and `UNIX_TIMESTAMP(ts)` see a time 5.5 hours late.",
            "**With `connectionTimeZone=SERVER`, the driver used the server's zone and stored 03:30 UTC**, the true instant. Alternatives are running every JVM and server in UTC (`-Duser.timezone=UTC`), or `connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true`, which also sets the session's `time_zone`. Pick one rule for the whole fleet.",
            "**`DATETIME` round-tripped unchanged** as a `LocalDateTime`: no zone, no conversion. That's its strength and its weakness: nothing stops two services writing it in different zones.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `SELECT COUNT(*), SUM(fare) FROM trips WHERE pickup_zone = 'HOWRAH'` sent from a Java service through HikariCP, on a cold server:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The pool hands out a connection** that was opened earlier: a TCP connection to port 3306, authenticated, with session variables (`character_set_client`, `time_zone`, `sql_mode`) already set. On the server side it's one `thread/sql/one_connection` thread, counted in `Threads_connected`.",
            "**The driver sends a `COM_QUERY` packet** with the SQL text (or `COM_STMT_EXECUTE` for a server-side prepared statement). The connection's thread wakes up and becomes one of `Threads_running`. `Com_select` is incremented.",
            "**The parser builds a parse tree.** A typo stops here with error 1064, before any table is touched.",
            "**Privileges are checked and the table is opened** (`checking permissions`, `Opening tables`): the definition comes from the data dictionary, or from the table cache if another session opened it recently. Unknown tables and columns fail here (1146, 1054). A metadata lock on `trips` is taken so no `ALTER TABLE` can change it mid-query.",
            "**The optimizer prepares and plans** (`optimizing`, `statistics`, `preparing`): it simplifies the `WHERE`, asks InnoDB for row estimates (298,550 rows, no usable index), and chooses a table scan with a filter and an aggregate. A primary-key equality would instead be resolved right here as a `const` table.",
            "**The executor runs the iterator tree** (`executing`). The aggregate asks the filter for rows, the filter asks the table scan, and the scan calls the handler's `rnd_next`: 300,002 times, one per row plus the final \"end of table\".",
            "**InnoDB serves each `rnd_next` from the clustered index**, walking the leaf pages left to right. Each page it needs is looked up in the buffer pool (a read request). On a miss it reads the page from `trips.ibd` (a read); once it sees a sequential pattern it schedules read-ahead of whole extents, so most pages are already arriving before the scan reaches them.",
            "**Each row comes back to the executor**, which evaluates `pickup_zone = 'HOWRAH'` using the column's collation, and adds matching fares to the running `COUNT` and `SUM` (exact, because `fare` is `DECIMAL`).",
            "**The statement ends** (`end`, `query end`, `waiting for handler commit`): the autocommit transaction commits (trivially, it changed nothing), the tables are closed back into the cache, and the single result row is sent. The thread goes back to waiting for the next packet; the driver turns the row into a `ResultSet` with `Long` and `BigDecimal` values.",
            "**Run it again** and steps 3 to 6 repeat, but step 7 finds every page in the buffer pool: zero disk reads.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "A `payments` table that uses each type the way this lesson recommends, with the reasons as comments:",
        },
        {
          type: "code",
          language: "sql",
          title: "payments.sql",
          code: `CREATE TABLE IF NOT EXISTS payments (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,        -- surrogate key, never INT for growing tables
  trip_id         BIGINT UNSIGNED NOT NULL,                       -- same type as trips.id, or the FK is rejected
  amount          DECIMAL(10,2)   NOT NULL,                       -- money: exact
  currency        CHAR(3)         NOT NULL DEFAULT 'INR',         -- fixed-length code
  method          VARCHAR(20)     NOT NULL,                       -- extensible list: VARCHAR + CHECK, not ENUM
  gateway_ref     VARCHAR(64)     CHARACTER SET ascii COLLATE ascii_bin NULL,  -- opaque id: exact match
  is_refunded     BOOLEAN         NOT NULL DEFAULT FALSE,         -- TINYINT(1)
  gateway_payload JSON            NULL,                           -- raw webhook, validated JSON
  paid_at         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),  -- an instant (UTC inside)
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_gateway_ref (gateway_ref),
  CONSTRAINT fk_payments_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
  CONSTRAINT chk_payments_amount CHECK (amount > 0),
  CONSTRAINT chk_payments_method CHECK (method IN ('CARD','UPI','CASH','WALLET'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO payments (trip_id, amount, method, gateway_ref, gateway_payload)
VALUES (1, 258.68, 'UPI', 'pay_Nx81Kq', '{"vpa": "asha@okbank", "status": "captured"}');
INSERT INTO payments (trip_id, amount, method, gateway_ref) VALUES (1, 258.68, 'UPI', 'PAY_NX81KQ');
SELECT id, amount, method, gateway_ref, is_refunded, gateway_payload->>'$.status' AS status FROM payments;

DESCRIBE payments;`,
        },
        {
          type: "output",
          text: `+----+--------+--------+-------------+-------------+----------+
| id | amount | method | gateway_ref | is_refunded | status   |
+----+--------+--------+-------------+-------------+----------+
|  1 | 258.68 | UPI    | pay_Nx81Kq  |           0 | captured |
|  2 | 258.68 | UPI    | PAY_NX81KQ  |           0 | NULL     |
+----+--------+--------+-------------+-------------+----------+
+-----------------+-----------------+------+-----+----------------------+-------------------+
| Field           | Type            | Null | Key | Default              | Extra             |
+-----------------+-----------------+------+-----+----------------------+-------------------+
| id              | bigint unsigned | NO   | PRI | NULL                 | auto_increment    |
| trip_id         | bigint unsigned | NO   | MUL | NULL                 |                   |
| amount          | decimal(10,2)   | NO   |     | NULL                 |                   |
| currency        | char(3)         | NO   |     | INR                  |                   |
| method          | varchar(20)     | NO   |     | NULL                 |                   |
| gateway_ref     | varchar(64)     | YES  | UNI | NULL                 |                   |
| is_refunded     | tinyint(1)      | NO   |     | 0                    |                   |
| gateway_payload | json            | YES  |     | NULL                 |                   |
| paid_at         | timestamp(3)    | NO   |     | CURRENT_TIMESTAMP(3) | DEFAULT_GENERATED |
+-----------------+-----------------+------+-----+----------------------+-------------------+`,
        },
        {
          type: "paragraph",
          text: "Both gateway references were accepted because `gateway_ref` uses `ascii_bin`: `pay_Nx81Kq` and `PAY_NX81KQ` are different ids at the payment gateway, and under the default collation the second insert would have failed as a duplicate. ASCII also makes the index smaller (1 byte per character instead of up to 4). `MUL` in `DESCRIBE` means a non-unique index, here the one the foreign key created.",
        },
        {
          type: "table",
          headers: ["Command", "What it does"],
          rows: [
            ["`CREATE DATABASE db` / `CREATE SCHEMA db`", "Same thing in MySQL: a namespace and a directory"],
            ["`USE db`", "Sets the default database for unqualified names"],
            ["`CREATE TABLE t (...) ENGINE=InnoDB`", "Columns, keys and constraints; InnoDB is the default"],
            ["`SHOW CREATE TABLE t\\G`", "The definition as the server stored it"],
            ["`DESCRIBE t`", "Columns, types, nullability, keys, defaults"],
            ["`ALTER TABLE t MODIFY col type`", "Change a type (often a full rebuild)"],
            ["`ALTER TABLE t CONVERT TO CHARACTER SET utf8mb4`", "Convert every text column"],
            ["`ALTER TABLE t ALTER CHECK c NOT ENFORCED`", "Disable a check (re-enabling validates all rows)"],
            ["`SET SESSION sql_mode = ...` / `time_zone = ...`", "Per-connection behaviour"],
            ["`SHOW WARNINGS`", "What the last statement quietly changed"],
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: moving a legacy riders table to utf8mb4",
        },
        {
          type: "paragraph",
          text: "A table created years ago under `utf8mb3` starts rejecting new riders whose names contain emoji. Converting it:",
        },
        {
          type: "code",
          language: "sql",
          title: "convert.sql",
          code: `DROP TABLE IF EXISTS legacy_riders;
CREATE TABLE legacy_riders (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(100) NOT NULL,
  email  VARCHAR(255) NOT NULL,
  UNIQUE KEY uk_email (email)
) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
INSERT INTO legacy_riders (name, email) VALUES ('Asha', 'asha@example.com'), ('Ravi', 'ravi@example.com');
INSERT INTO legacy_riders (name, email) VALUES ('Meera 🌸', 'meera@example.com');

SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME, CHARACTER_MAXIMUM_LENGTH, CHARACTER_OCTET_LENGTH
FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ride_hailing' AND TABLE_NAME = 'legacy_riders' AND DATA_TYPE = 'varchar';

ALTER TABLE legacy_riders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME, CHARACTER_MAXIMUM_LENGTH, CHARACTER_OCTET_LENGTH
FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ride_hailing' AND TABLE_NAME = 'legacy_riders' AND DATA_TYPE = 'varchar';
INSERT INTO legacy_riders (name, email) VALUES ('Meera 🌸', 'meera@example.com');
SELECT id, name, CHAR_LENGTH(name) AS chars, LENGTH(name) AS bytes FROM legacy_riders;`,
        },
        {
          type: "output",
          text: `ERROR 1366 (HY000) at line 9: Incorrect string value: '\\xF0\\x9F\\x8C\\xB8' for column 'name' at row 1
+-------------+--------------------+--------------------+--------------------------+------------------------+
| COLUMN_NAME | CHARACTER_SET_NAME | COLLATION_NAME     | CHARACTER_MAXIMUM_LENGTH | CHARACTER_OCTET_LENGTH |
+-------------+--------------------+--------------------+--------------------------+------------------------+
| name        | utf8mb3            | utf8mb3_general_ci |                      100 |                    300 |
| email       | utf8mb3            | utf8mb3_general_ci |                      255 |                    765 |
+-------------+--------------------+--------------------+--------------------------+------------------------+
Query OK, 2 rows affected (0.20 sec)
Records: 2  Duplicates: 0  Warnings: 0
+-------------+--------------------+--------------------+--------------------------+------------------------+
| COLUMN_NAME | CHARACTER_SET_NAME | COLLATION_NAME     | CHARACTER_MAXIMUM_LENGTH | CHARACTER_OCTET_LENGTH |
+-------------+--------------------+--------------------+--------------------------+------------------------+
| name        | utf8mb4            | utf8mb4_0900_ai_ci |                      100 |                    400 |
| email       | utf8mb4            | utf8mb4_0900_ai_ci |                      255 |                   1020 |
+-------------+--------------------+--------------------+--------------------------+------------------------+
+----+------------+-------+-------+
| id | name       | chars | bytes |
+----+------------+-------+-------+
|  1 | Asha       |     4 |     4 |
|  2 | Ravi       |     4 |     4 |
|  3 | Meera 🌸     |     7 |    10 |
+----+------------+-------+-------+`,
        },
        {
          type: "list",
          items: [
            "(I ran this file with `-vvv` and kept only the results and the `ALTER`'s summary line.)",
            "**The column lengths in characters didn't change (100, 255); the maximum bytes did** (300 to 400, 765 to 1,020). That's why old 5.6 servers, with a 767-byte index key limit, failed this conversion with `Specified key was too long` on `VARCHAR(255)` keys. On 8.0 with the `DYNAMIC` row format, the index limit is 3,072 bytes, and it went through.",
            "**`CONVERT TO` rebuilt the table** (`2 rows affected`): every row was rewritten. On a large table it's a long operation that blocks writes for most of its run; production teams use online schema-change tools (`gh-ost`, `pt-online-schema-change`) for it.",
            "**The collation changed too**, from `utf8mb3_general_ci` (PAD SPACE) to `utf8mb4_0900_ai_ci` (NO PAD). Check unique columns for values that differ only by trailing spaces or by characters the new collation treats differently, before the conversion fails or, worse, succeeds and changes query results.",
            "The failed emoji insert before the conversion didn't burn an id: Meera became 3.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: a DOUBLE fare column in Java",
        },
        {
          type: "paragraph",
          text: "Before the production story, the same arithmetic in Java, where the service computes a driver's 75% share:",
        },
        {
          type: "code",
          language: "java",
          title: "PayoutRounding.java",
          code: `import java.math.BigDecimal;
import java.math.RoundingMode;

public class PayoutRounding {
    public static void main(String[] args) {
        double fare = 53.9;
        double share = fare * 0.75;
        System.out.println("double share prints as     " + share);
        System.out.println("double share really is     " + new BigDecimal(share));
        System.out.println("Math.round(share*100)/100  " + Math.round(share * 100) / 100.0);

        BigDecimal exact = new BigDecimal("53.90").multiply(new BigDecimal("0.75"));
        System.out.println("BigDecimal share           " + exact);
        System.out.println("BigDecimal payout HALF_UP  " + exact.setScale(2, RoundingMode.HALF_UP));
        System.out.println("new BigDecimal(53.9)       " + new BigDecimal(53.9));
        System.out.println("BigDecimal.valueOf(53.9)   " + BigDecimal.valueOf(53.9));
    }
}`,
        },
        {
          type: "output",
          text: `double share prints as     40.425
double share really is     40.4249999999999971578290569595992565155029296875
Math.round(share*100)/100  40.42
BigDecimal share           40.4250
BigDecimal payout HALF_UP  40.43
new BigDecimal(53.9)       53.89999999999999857891452847979962825775146484375
BigDecimal.valueOf(53.9)   53.9`,
        },
        {
          type: "paragraph",
          text: "The double prints as 40.425, which looks like an exact half, but the stored binary value is just below it, so every rounding rule rounds it down to 40.42. `BigDecimal` from strings holds 40.4250 exactly and `HALF_UP` gives 40.43. Note the last two lines: `new BigDecimal(double)` copies the binary error into the `BigDecimal`; `BigDecimal.valueOf(double)` goes through the shortest decimal string and gives 53.9. JDBC's `getBigDecimal` on a `DECIMAL` column never involves a double at all.",
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Data", "Use", "Avoid"],
          rows: [
            ["Primary and foreign keys", "`BIGINT UNSIGNED AUTO_INCREMENT` (or signed `BIGINT`, simpler in Java), the same type on both sides", "`INT` on a growing table; random `CHAR(36)` UUIDs as the clustered key"],
            ["Money, fares, payouts, rates", "`DECIMAL(10,2)` (or `BIGINT` paise), `BigDecimal` in Java", "`DOUBLE`, `FLOAT`, money inside JSON"],
            ["Measurements (GPS, ratings averages)", "`DOUBLE`, or `DECIMAL` if you compare for equality", "`FLOAT` for anything that needs more than 7 digits"],
            ["Names, addresses, free text", "`VARCHAR(n)` in utf8mb4 with an honest `n`; `TEXT` for long text", "`utf8`/`utf8mb3`; `VARCHAR(255)` everywhere by habit"],
            ["Case-sensitive identifiers (tokens, gateway refs, promo codes)", "`ascii_bin` or `utf8mb4_bin` collation", "The default `_ai_ci` collation on a `UNIQUE` column"],
            ["An instant (created, paid, completed)", "`DATETIME(3)` holding UTC by convention, or `TIMESTAMP(3)` before 2038", "`DATETIME` in mixed time zones; `TIMESTAMP` for future dates"],
            ["A wall-clock time (a driver's shift start in local time)", "`DATETIME` or `TIME`, with the zone stored separately", "`TIMESTAMP`, which converts it"],
            ["A status that will grow", "`VARCHAR(20)` + `CHECK`, or a lookup table", "`ENUM` with values added in the middle later"],
            ["A flag", "`BOOLEAN` with `CHECK (col IN (0,1))` if others write to it", "Comparing with `= TRUE`"],
            ["Semi-structured payloads (webhooks, device info)", "`JSON`, with generated columns for the fields you filter on", "`JSON` for data you join and aggregate every day"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Storing money in DOUBLE or FLOAT",
        },
        {
          type: "paragraph",
          text: "Sums drift (12,344,999.999985056 instead of 12,345,000 over 100,000 fares), equality fails (`fare_flt = 123.45` was false) and `ROUND` uses a different rule. Use `DECIMAL` in the table and `BigDecimal` in Java, created from strings.",
        },
        {
          type: "heading",
          text: "Using utf8 (utf8mb3) or a latin1 client",
        },
        {
          type: "paragraph",
          text: "`utf8` refuses 4-byte characters (error 1366 for `Asha 🚕`) or, non-strict, stores `?`. A latin1 client is worse: it double-encodes silently and the data reads as mojibake (`Meera ðŸš•`) for everyone else. Everything utf8mb4: server, database, table, connection.",
        },
        {
          type: "heading",
          text: "Forgetting what the default collation does to UNIQUE",
        },
        {
          type: "paragraph",
          text: "`utf8mb4_0900_ai_ci` treats `Asha.Roy@Example.com` and `ásha.roy@example.com` as duplicates of `asha.roy@example.com`. Right for emails, wrong for tokens and codes: give those a `_bin` collation.",
        },
        {
          type: "heading",
          text: "INT keys and INT(11)",
        },
        {
          type: "paragraph",
          text: "An `INT AUTO_INCREMENT` key stops at 2,147,483,647 and the table then rejects every insert with a duplicate-key error. `INT(11)` doesn't make it bigger; the number is a deprecated display width.",
        },
        {
          type: "heading",
          text: "Assuming AUTO_INCREMENT has no gaps",
        },
        {
          type: "paragraph",
          text: "Rollbacks, duplicates, `INSERT IGNORE`, upserts that update and bulk reservations all leave gaps (1,000 rows reserved 1,023 ids). Don't count with `MAX(id)` or use ids as invoice numbers that must be consecutive.",
        },
        {
          type: "heading",
          text: "Mixing time zones with TIMESTAMP and JDBC",
        },
        {
          type: "paragraph",
          text: "A Kolkata JVM with default Connector/J settings stored instants 5.5 hours off on a UTC server, and only Java code with the same setting read them correctly. Set `connectionTimeZone` (or run everything in UTC), and don't use `TIMESTAMP` for dates after 2038-01-19.",
        },
        {
          type: "heading",
          text: "Running without strict mode",
        },
        {
          type: "paragraph",
          text: "Non-strict mode turned 400 seats into 127, `'abc'` into 0.00 and February 30 into `0000-00-00`, with only warnings that JDBC code never reads. Keep `STRICT_TRANS_TABLES`, and check `@@GLOBAL.sql_mode` on every server you inherit.",
        },
        {
          type: "heading",
          text: "Using ENUM for a list that changes, and = TRUE on booleans",
        },
        {
          type: "paragraph",
          text: "Inserting a value in the middle of an `ENUM` renumbers stored values and rebuilds the table; sorting follows positions. And `BOOLEAN` columns can hold 5, which `= TRUE` doesn't match. Use `VARCHAR` + `CHECK` for statuses and test flags with `IS TRUE`.",
        },
        {
          type: "heading",
          text: "Trusting TABLE_ROWS and information_schema sizes as exact",
        },
        {
          type: "paragraph",
          text: "`TABLE_ROWS` was 298,550 for 300,001 rows: it's a sampled estimate. `COUNT(*)` is the count (and costs a scan; lesson 4 discusses alternatives).",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Run MySQL locally the way production runs it: same major version, same `sql_mode`, same character set and collation, same time zone. A Docker container with explicit flags is the easiest way to get there.",
            "Pass `--default-character-set=utf8mb4` to the `mysql` client and check `status` once per new environment.",
            "Name every constraint (`pk_`, `uk_`, `fk_`, `chk_`) and keep them: `NOT NULL`, `UNIQUE`, `CHECK` and `FOREIGN KEY` are cheaper than any validation layer and the only ones every writer must pass.",
            "One id type across the schema, `BIGINT`, on both sides of every foreign key.",
            "Money in `DECIMAL` (or integer paise), rounded explicitly in the application with a named `RoundingMode` before it's stored.",
            "utf8mb4 everywhere, with deliberate `_bin` collations for identifiers that are case-sensitive.",
            "Store instants in UTC: either `DATETIME(3)` with a UTC-only convention, or `TIMESTAMP(3)` for values that stay before 2038, and configure Connector/J (`connectionTimeZone`) so the database's view and Java's view agree.",
            "Prefer `VARCHAR` + `CHECK` over `ENUM` for anything a product manager might extend.",
            "Keep strict `sql_mode` and treat a warning count in `Query OK, n rows affected, k warnings` as a bug.",
            "Read the server, not your migration: `SHOW CREATE TABLE`, `information_schema.COLUMNS` and `TABLE_CONSTRAINTS` show what's really there.",
            "Watch `Threads_running`, `Innodb_buffer_pool_reads` against `read_requests`, and `Handler_read_rnd_next` in production dashboards; they're the first signs of overload, a cache that's too small, and missing indexes.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Data types are a performance decision because InnoDB stores the primary key inside every secondary index entry: a wide key is paid for once per row in the table and again in each index. I loaded 200,000 rows into three tables that differ only in the primary key type, each with a secondary index on `rider_id`, on the 32 MB buffer pool:",
        },
        {
          type: "code",
          language: "sql",
          title: "key-types.sql",
          code: `SET SESSION cte_max_recursion_depth = 300000;
DROP TABLE IF EXISTS k_bigint, k_char36, k_bin16;
CREATE TABLE k_bigint (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, rider_id BIGINT UNSIGNED NOT NULL, fare DECIMAL(10,2) NOT NULL, KEY (rider_id));
CREATE TABLE k_char36 (id CHAR(36) NOT NULL PRIMARY KEY,               rider_id BIGINT UNSIGNED NOT NULL, fare DECIMAL(10,2) NOT NULL, KEY (rider_id));
CREATE TABLE k_bin16  (id BINARY(16) NOT NULL PRIMARY KEY,             rider_id BIGINT UNSIGNED NOT NULL, fare DECIMAL(10,2) NOT NULL, KEY (rider_id));

INSERT INTO k_bigint (rider_id, fare)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 200000) SELECT n % 10000, 100.00 FROM seq;
INSERT INTO k_char36 (id, rider_id, fare)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 200000) SELECT UUID(), n % 10000, 100.00 FROM seq;
INSERT INTO k_bin16 (id, rider_id, fare)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 200000) SELECT UUID_TO_BIN(UUID()), n % 10000, 100.00 FROM seq;

ANALYZE TABLE k_bigint, k_char36, k_bin16;
SELECT TABLE_NAME, TABLE_ROWS, ROUND(DATA_LENGTH/1024/1024, 1) AS data_mb, ROUND(INDEX_LENGTH/1024/1024, 1) AS secondary_index_mb
FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'ride_hailing' AND TABLE_NAME LIKE 'k\\_%' ORDER BY DATA_LENGTH;`,
        },
        {
          type: "output",
          text: `Query OK, 200000 rows affected (2.70 sec)
Query OK, 200000 rows affected (10.80 sec)
Query OK, 200000 rows affected (7.99 sec)
...
+------------+------------+---------+--------------------+
| TABLE_NAME | TABLE_ROWS | data_mb | secondary_index_mb |
+------------+------------+---------+--------------------+
| k_bigint   |     199680 |     8.5 |                8.5 |
| k_bin16    |     199694 |    10.5 |               10.5 |
| k_char36   |     199342 |    14.6 |               18.6 |
+------------+------------+---------+--------------------+`,
        },
        {
          type: "table",
          headers: ["Primary key", "Bytes per key", "Table (MB)", "Secondary index (MB)", "Insert 200,000 rows, three runs"],
          rows: [
            ["`BIGINT` AUTO_INCREMENT", "8", "8.5", "8.5", "2.70 to 4.47 s"],
            ["`BINARY(16)` UUID", "16", "10.5", "10.5", "7.52 to 9.74 s"],
            ["`CHAR(36)` UUID, utf8mb4", "36", "14.6", "18.6", "9.30 to 10.89 s"],
          ],
        },
        {
          type: "list",
          items: [
            "**The text UUID made the secondary index 2.2 times bigger** (18.6 MB against 8.5) and the table 1.7 times bigger, for the same data. Every extra megabyte is buffer pool space the hot pages don't get.",
            "**Inserts were roughly 2 to 4 times slower with UUID keys.** `AUTO_INCREMENT` appends to the right edge of the B-tree; MySQL's `UUID()` values arrive in no useful order, so each insert lands in a random leaf page, which must be in memory and often splits. With a 32 MB pool, that means disk reads during the load. `UUID_TO_BIN(UUID(), 1)` (the swap flag) or time-ordered UUIDv7 values restore insert order; lesson 7 measures page splits directly.",
            "**Sizes were identical across three runs; timings varied** (shown as ranges) because other workloads were running on the machine. The ordering never changed.",
            "**The buffer pool matters more than any type choice.** The same table scan read 1,763 pages from disk cold and none warm; with a pool too small for the working set (my first 32 MB attempt), even the warm scan read 475 pages from disk. Fit the working set in memory first, then make rows and keys narrow so more of them fit.",
            "**`DECIMAL` is not slow.** Summing 60,000 `DECIMAL(10,2)` fares was part of a 0.14 s scan; the cost of a query is in pages and rows touched, not in the arithmetic.",
          ],
        },
      ],
    },
    {
      title: "Data Types in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend stored fares in a `DOUBLE` column, written by a fare service that computed them as Java `double`s. A nightly payout job paid each driver 75% of each fare: `ROUND(fare * 0.75, 2)` in SQL, summed per driver. The rider app showed receipts computed with `BigDecimal`. After a few weeks, drivers started posting screenshots: the payout statement was one paisa short on some trips compared with what the receipt implied, and finance's weekly reconciliation (collected minus paid minus commission) never came to zero. I rebuilt a week of 200,000 trips with both column types:",
        },
        {
          type: "code",
          language: "sql",
          title: "payout-incident.sql",
          code: `DROP TABLE IF EXISTS trip_fares_v1, trip_fares_v2;
-- v1: what shipped
CREATE TABLE trip_fares_v1 (
  trip_id   BIGINT UNSIGNED PRIMARY KEY,
  driver_id BIGINT UNSIGNED NOT NULL,
  fare      DOUBLE NOT NULL
);
-- v2: the fix
CREATE TABLE trip_fares_v2 (
  trip_id   BIGINT UNSIGNED PRIMARY KEY,
  driver_id BIGINT UNSIGNED NOT NULL,
  fare      DECIMAL(10,2) NOT NULL
);
SET SESSION cte_max_recursion_depth = 300000;
-- one week of trips: fares are base 40 + 12.35/km + waiting, always whole paise
INSERT INTO trip_fares_v1
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 200000)
SELECT n, 1 + n % 500, 40 + (n % 30) * 12.35 + (n % 7) * 1.5 + (n % 3) * 0.05 FROM seq;
INSERT INTO trip_fares_v2 SELECT trip_id, driver_id, fare FROM trip_fares_v1;

-- payout = 75% of each fare, rounded to paise; the platform keeps the rest
SELECT 'DOUBLE'  AS fare_type, SUM(fare) AS collected, SUM(ROUND(fare * 0.75, 2)) AS paid_to_drivers,
       SUM(fare - ROUND(fare * 0.75, 2)) AS commission FROM trip_fares_v1
UNION ALL
SELECT 'DECIMAL', SUM(fare), SUM(ROUND(fare * 0.75, 2)), SUM(fare - ROUND(fare * 0.75, 2)) FROM trip_fares_v2;

SELECT COUNT(*) AS trips_with_different_payout,
       SUM(ROUND(v2.fare * 0.75, 2) - ROUND(v1.fare * 0.75, 2)) AS paise_short_in_rupees
FROM trip_fares_v1 v1 JOIN trip_fares_v2 v2 USING (trip_id)
WHERE ROUND(v1.fare * 0.75, 2) <> ROUND(v2.fare * 0.75, 2);

SELECT v1.trip_id, v1.fare, v1.fare * 0.75 AS dbl_share, ROUND(v1.fare * 0.75, 2) AS dbl_payout,
       v2.fare * 0.75 AS dec_share, ROUND(v2.fare * 0.75, 2) AS dec_payout
FROM trip_fares_v1 v1 JOIN trip_fares_v2 v2 USING (trip_id)
WHERE ROUND(v1.fare * 0.75, 2) <> ROUND(v2.fare * 0.75, 2) ORDER BY v1.trip_id LIMIT 3;`,
        },
        {
          type: "output",
          text: `+-----------+--------------------+--------------------+--------------------+
| fare_type | collected          | paid_to_drivers    | commission         |
+-----------+--------------------+--------------------+--------------------+
| DOUBLE    | 44724007.550000004 | 33542960.410000257 | 11181047.139999546 |
| DECIMAL   |        44724007.55 |        33543255.64 |        11180751.91 |
+-----------+--------------------+--------------------+--------------------+
+-----------------------------+-----------------------+
| trips_with_different_payout | paise_short_in_rupees |
+-----------------------------+-----------------------+
|                       29523 |     295.2299999999427 |
+-----------------------------+-----------------------+
+---------+-------+--------------------+------------+-----------+------------+
| trip_id | fare  | dbl_share          | dbl_payout | dec_share | dec_payout |
+---------+-------+--------------------+------------+-----------+------------+
|       1 |  53.9 |             40.425 |      40.42 |   40.4250 |      40.43 |
|       6 | 123.1 |  92.32499999999999 |      92.32 |   92.3250 |      92.33 |
|      12 | 195.7 | 146.77499999999998 |     146.77 |  146.7750 |     146.78 |
+---------+-------+--------------------+------------+-----------+------------+`,
        },
        {
          type: "list",
          items: [
            "**29,523 of 200,000 trips (about 15%) paid the driver one paisa less**, ₹295.23 for the week (`paise_short_in_rupees` is in rupees; the trailing `...9427` is itself `DOUBLE` arithmetic). Every one of them is a fare whose 75% share ends in exactly half a paisa: 40.425, 92.325, 146.775. In `DECIMAL` those are exact halves and round up; in `DOUBLE` they're stored just below the half and round down.",
            "**The totals don't reconcile in `DOUBLE`**: even `collected` is `44724007.550000004`, and `paid_to_drivers` differs from the `DECIMAL` result by ₹295.23. Finance's ledger, kept in `DECIMAL`, could never match the payout table.",
            "**Why nobody saw it in testing.** A display like `40.425` looks exact, unit tests compared rounded values computed the same way on both sides, and each driver lost at most a few rupees a week. It surfaced only because drivers compared statements with receipts, which used `BigDecimal` and `HALF_UP`.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix was a type change and a backfill. Changing the column in place:",
        },
        {
          type: "code",
          language: "sql",
          title: "fix.sql",
          code: `ALTER TABLE trip_fares_v1 MODIFY fare DECIMAL(10,2) NOT NULL, ALGORITHM=INPLACE;
ALTER TABLE trip_fares_v1 MODIFY fare DECIMAL(10,2) NOT NULL;
SELECT SUM(fare) AS collected, SUM(ROUND(fare * 0.75, 2)) AS paid_to_drivers FROM trip_fares_v1;`,
        },
        {
          type: "output",
          text: `ERROR 1846 (0A000) at line 1: ALGORITHM=INPLACE is not supported. Reason: Cannot change column type INPLACE. Try ALGORITHM=COPY.
Query OK, 200000 rows affected (2.05 sec)
Records: 200000  Duplicates: 0  Warnings: 0
+-------------+-----------------+
| collected   | paid_to_drivers |
+-------------+-----------------+
| 44724007.55 |     33543255.64 |
+-------------+-----------------+`,
        },
        {
          type: "list",
          items: [
            "**Converting to `DECIMAL(10,2)` recovered the exact fares**: each stored double was the nearest binary value to a whole-paise amount, so rounding it to two decimals during the copy gave back the intended number. After the change, the payout total matched the `DECIMAL` table to the paisa. That only works because the fares were whole paise to begin with; values produced by `double` arithmetic over many steps may not round back correctly, so I'd compare against the source (the fare service's logs or the payment gateway) before trusting the conversion.",
            "**A type change can't be done in place**: InnoDB refused `ALGORITHM=INPLACE`, and the default `COPY` rebuilt all 200,000 rows (2 s here), blocking writes while it ran. On the real trips table, with hundreds of millions of rows, this went through `gh-ost` instead.",
            "**What I'd check first in a similar incident**: `SELECT DATA_TYPE, COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '...' AND DATA_TYPE IN ('double','float') GROUP BY DATA_TYPE`, then which of those columns hold money; then where `ROUND` is applied and by which side (SQL or Java), because the two must use the same rule.",
            "**What prevents it next time**: a schema review rule (no `FLOAT`/`DOUBLE` for amounts), `BigDecimal` with an explicit `RoundingMode` in one shared fare/payout library, a reconciliation job that alerts when collected minus payouts minus commission isn't exactly zero, and back-paying the affected drivers from the computed difference.",
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
              question: "What happens inside MySQL when you run a SELECT?",
              answer:
                "The connection's thread receives the SQL text, the parser builds a parse tree (syntax errors, 1064, stop here), the server resolves table and column names and checks privileges (1146, 1054), the optimizer chooses a plan by estimated cost, and the executor runs it by calling the storage engine API (`index_read`, `rnd_next`). InnoDB serves rows from 16 KB pages in its buffer pool, reading pages from the table's `.ibd` file on a miss. The result goes back over the same connection. I watched each step: stages in `performance_schema`, plans with `EXPLAIN FORMAT=TREE`, 300,002 `Handler_read_rnd_next` calls for a scan of 300,001 rows, and `Innodb_buffer_pool_reads` going from +99 cold to 0 warm.",
            },
            {
              question: "What's the difference between DECIMAL and DOUBLE, and which do you use for money?",
              answer:
                "`DECIMAL(p,s)` stores exact decimal digits; `DOUBLE` stores a binary floating-point approximation. Money must be `DECIMAL` (or an integer number of paise). In my test, 0.1 + 0.2 in `DOUBLE` was 0.30000000000000004, and 100,000 fares of 123.45 summed to 12,344,999.999985056 in `DOUBLE` and 12,344,999.69 in `FLOAT`, against an exact 12,345,000.00 in `DECIMAL`. In Java the matching type is `BigDecimal`, created from strings.",
            },
            {
              question: "VARCHAR or CHAR? What does the number in VARCHAR(100) mean?",
              answer:
                "`VARCHAR(n)` stores up to `n` **characters** using only the bytes needed plus a 1 or 2-byte length; `CHAR(n)` is fixed-length and strips trailing spaces when read (my `'WB02  '` came back as `WB02`). Use `VARCHAR` for most text and `CHAR` for truly fixed codes like a currency. In utf8mb4 a character can be up to 4 bytes: a 6-character Bengali word took 18 bytes.",
            },
            {
              question: "What is the difference between utf8 and utf8mb4 in MySQL?",
              answer:
                "MySQL's `utf8` is `utf8mb3`: at most 3 bytes per character, so it can't store emoji and other 4-byte characters. `utf8mb4` is real UTF-8 and the 8.0 default. Inserting `Asha 🚕` into a utf8mb3 column failed with error 1366 in strict mode and stored `Asha ?` in non-strict mode. Use utf8mb4 for the server, tables and connection.",
            },
            {
              question: "What constraints does MySQL support, and what does each one do?",
              answer:
                "`PRIMARY KEY` (unique, not null, and the clustered index in InnoDB), `NOT NULL`, `UNIQUE` (error 1062 on duplicates), `FOREIGN KEY` (1452 when the parent is missing, 1451 when deleting a referenced parent) and `CHECK` (3819, enforced only since 8.0.16; earlier versions parsed and ignored it). `DEFAULT` isn't a constraint but fills missing values. I triggered each one on the trips schema.",
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
              question: "DATETIME vs TIMESTAMP: what's the difference and which would you choose?",
              answer:
                "`DATETIME` is a wall-clock value with no time zone, year 1000 to 9999. `TIMESTAMP` is an instant stored as UTC seconds, converted using the session's `time_zone`, and limited to 1970-01-01 00:00:01 to 2038-01-19 03:14:07 UTC. I wrote 09:00 in a `+05:30` session; in UTC the `TIMESTAMP` read 03:30 and the `DATETIME` still 09:00, and `2038-01-19 03:14:08` was rejected. For instants I'd use `DATETIME(3)` holding UTC by convention (full range, no session dependence) or `TIMESTAMP(3)` if nothing goes past 2038, and set the JDBC driver's `connectionTimeZone` deliberately.",
            },
            {
              question: "Why can AUTO_INCREMENT ids have gaps?",
              answer:
                "Because ids are handed out before the insert is known to succeed and are never returned: a rolled-back transaction, a duplicate-key failure, `INSERT IGNORE` and an `ON DUPLICATE KEY UPDATE` that updates all consume an id (my payouts table went 1, 6 with `AUTO_INCREMENT` at 8). Bulk inserts of unknown size reserve ids in doubling batches under `innodb_autoinc_lock_mode = 2`: 1,000 rows reserved 1,023, and 300,001 trips left the counter at 327,679. Returning ids would require locking the counter for whole transactions.",
            },
            {
              question: "What is a collation, and how can it break a UNIQUE constraint?",
              answer:
                "The rules for comparing and sorting strings. The 8.0 default, `utf8mb4_0900_ai_ci`, is accent- and case-insensitive and `NO PAD`, so a `UNIQUE` email column rejected `Asha.Roy@Example.com` and `ásha.roy@example.com` as duplicates of `asha.roy@example.com`. That's wrong for case-sensitive identifiers (tokens, gateway references), which need `_bin`. Older `general_ci` collations are `PAD SPACE`, so converting between them changes whether `'ravi'` and `'ravi '` collide.",
            },
            {
              question: "What does strict sql_mode do, and what happens without it?",
              answer:
                "`STRICT_TRANS_TABLES` turns invalid data into errors. Without it, MySQL adjusts the value and warns: in my test a 14-character plate was cut to 10, 400 seats became 127, `'abc'` became 0.00, February 30 became `0000-00-00`, and missing `NOT NULL` columns got `''` and 0, each with `Query OK`. JDBC code rarely reads warnings, so the data is silently wrong. Keep strict mode on everywhere.",
            },
            {
              question: "What do Innodb_buffer_pool_read_requests and Innodb_buffer_pool_reads tell you?",
              answer:
                "Read requests are logical page reads; reads are the requests that missed the buffer pool and went to disk. `1 - reads / read_requests` is the hit ratio. A cold scan of trips cost 4,168 requests, 99 single-page reads and 1,664 read-ahead pages; the same scan warm cost 2,338 requests and zero reads. When reads grow with traffic, the working set doesn't fit in `innodb_buffer_pool_size`.",
            },
            {
              question: "What are Handler_read_* counters useful for?",
              answer:
                "They count calls from the executor to the storage engine per session, so they show what a query really did regardless of the plan. After `FLUSH STATUS`, a primary-key lookup showed `Handler_read_key = 1`; a filter on an unindexed column showed `Handler_read_rnd_next = 300002`, a full scan. A high `rnd_next` on a query that returns a few rows means a missing or unused index.",
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
              question: "How is a table stored on disk in MySQL 8.0?",
              answer:
                "With `innodb_file_per_table` (the default), each table is one `.ibd` tablespace of 16 KB pages: page 0 `FSP_HDR` (space header and extent descriptors), 1 the insert-buffer bitmap, 2 `INODE` (segments), 3 the `SDI` (the table definition as compressed JSON, which replaced `.frm` files when 8.0 moved to a transactional data dictionary), then B-tree `INDEX` pages. For my trips table: 3,840 pages, a three-level primary key with 1 root, 3 internal and 1,706 leaf pages (matching `n_leaf_pages` in `innodb_index_stats`), two secondary indexes, and 929 pages allocated but unused. `INNODB_TABLES`, `INNODB_TABLESPACES` and `INNODB_INDEXES` give the space id and root page numbers.",
            },
            {
              question: "Why does a primary-key lookup show \"Rows fetched before execution\" in EXPLAIN?",
              answer:
                "Because an equality on the full primary key (or a unique not-null key) matches at most one row, so the optimizer classifies the table as `const` and reads the row during optimization; the optimizer trace shows `table_type: const` and an empty `join_execution`. In the stage timings, `statistics` took longer than `executing` for that query. It also lets the optimizer substitute the row's values into the rest of the query as constants.",
            },
            {
              question: "What are MySQL's row size limits?",
              answer:
                "Two. The server limits the declared maximum size of all columns to 65,535 bytes, excluding `TEXT`/`BLOB` (two `VARCHAR(10000)` utf8mb4 columns failed with 1118; one became `TEXT` and it worked). InnoDB limits a row stored in a page to about half a page, 8,126 bytes on 16 KB pages, so a page holds at least two rows; with the `DYNAMIC` row format long variable-length values move to overflow pages, but fixed `CHAR` can't, so forty `CHAR(255)` latin1 columns were rejected under `innodb_strict_mode`.",
            },
            {
              question: "What changed about AUTO_INCREMENT in MySQL 8.0, and why did it matter?",
              answer:
                "The counter became persistent: it's written to the redo log, so it survives a restart. In 5.7 it was recomputed as `MAX(id) + 1` at startup, so deleting the newest rows and restarting reused their ids, which corrupted anything (caches, other tables, external systems) that still referenced the old ids. I deleted payout 6 leaving `MAX(id) = 1`, restarted, and the next insert got 8.",
            },
            {
              question: "How do Connector/J time zone settings affect TIMESTAMP values?",
              answer:
                "The driver converts between Java instants and the session's local time text. By default it assumes the session's zone is the JVM's. With a Kolkata JVM and a UTC server session, an `Instant` of 03:30Z was sent as `09:00` and stored as 09:00 UTC: Java read it back correctly, but SQL and any UTC JVM saw it 5.5 hours late. `connectionTimeZone=SERVER` (or `UTC` with `forceConnectionTimeZoneToSession=true`, or UTC everywhere) stored 03:30 UTC. Also, on 9.5.0, `getObject(col, Instant.class)` isn't supported; `OffsetDateTime` is.",
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
              question: "Riders with emoji in their names suddenly can't sign up; the API returns 500 and the logs show \"Incorrect string value: '\\xF0\\x9F...'\". What happened and how do you fix it?",
              answer:
                "The column (or table) is `utf8`/`utf8mb3`, which can't hold 4-byte characters, and strict mode turned it into error 1366 (non-strict would have stored `?`). Check `information_schema.COLUMNS` for `CHARACTER_SET_NAME = 'utf8mb3'` and the connection's `character_set_client`. Fix with `ALTER TABLE ... CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci` (an online schema change tool for big tables), after checking that indexes fit (3,072-byte limit on 8.0) and that the collation change (`general_ci` to `0900_ai_ci`, `PAD SPACE` to `NO PAD`) doesn't create or remove duplicates. In my conversion the byte maximum went from 300 to 400 for `VARCHAR(100)` and the emoji then stored as 10 bytes.",
            },
            {
              question: "Finance says driver payouts are a few paise short on some trips and the weekly totals never reconcile. Fares are in a DOUBLE column. What's going on?",
              answer:
                "Binary floating point. A fare like 53.90 times 0.75 is 40.425 in decimal but 40.42499999... as a double, so `ROUND(..., 2)` gives 40.42 instead of 40.43; MySQL also rounds doubles half-to-even (`ROUND(2.5e0)` = 2). I reproduced it: 29,523 of 200,000 trips underpaid by a paisa, ₹295.23 a week, and `SUM(fare)` itself came out as 44724007.550000004. Fix: `DECIMAL(10,2)` columns (a copying `ALTER`, online for big tables), `BigDecimal` with one explicit `RoundingMode` shared by receipts and payouts, a reconciliation alert that expects exactly zero, and back-payment of the computed difference.",
            },
            {
              question: "A report built on a SQL query shows trips completing 5.5 hours later than the app shows. The column is TIMESTAMP and the Java service runs in Asia/Kolkata. Explain.",
              answer:
                "The JDBC driver is converting with the JVM's zone while the server session is UTC. With default Connector/J settings, my Kolkata JVM stored an `Instant` of 03:30Z as 09:00 UTC; Java reads it back correctly using the same assumption, but the SQL report (UTC session) sees 09:00. Fix the driver config (`connectionTimeZone=SERVER`, or UTC everywhere with `forceConnectionTimeZoneToSession=true`), then correct existing rows with a one-off `UPDATE` that subtracts the offset for rows written before the fix (and only those: find the deployment boundary first).",
            },
            {
              question: "Inserts into an events table started failing overnight with \"Duplicate entry '2147483647' for key 'PRIMARY'\". Nothing was deployed. What happened?",
              answer:
                "The `INT AUTO_INCREMENT` primary key reached its maximum, 2,147,483,647; the next insert tries to reuse the maximum and fails as a duplicate, so the table accepts nothing. I reproduced it with `AUTO_INCREMENT = 2147483646`: two inserts worked, the third failed exactly like that. Gaps (rollbacks, `INSERT IGNORE`, bulk reservations) make it arrive sooner than the row count suggests. Short term, if the column is signed, switch to `INT UNSIGNED` or `BIGINT` with a table rebuild (and the same for every foreign key pointing at it); some teams archive and re-seed instead. Long term, `BIGINT` for every id and a monitor on `AUTO_INCREMENT` against the type's maximum.",
            },
            {
              question: "After migrating an old server's data to a new MySQL 8 instance, a nightly import that used to succeed now fails with \"Data too long\" and \"Incorrect datetime value\" errors. The data hasn't changed. Why?",
              answer:
                "The old server ran without strict `sql_mode`, so the same bad values were silently truncated, clamped or turned into `0000-00-00` (my non-strict run stored 127 for 400 seats and zeros for February 30). MySQL 8's default includes `STRICT_TRANS_TABLES`, so they're now errors. The import was always corrupting data; fix the source or validate in the importer, and audit the old data for zero dates and maximum-value integers. Turning strict mode off on the new server to make it pass would move the corruption to the new system.",
            },
            {
              question: "Two promo codes, SAVE10 and save10, are meant to be different campaigns, but creating the second fails with a duplicate-key error. What would you change?",
              answer:
                "The `UNIQUE` column uses the default `utf8mb4_0900_ai_ci`, which is case- and accent-insensitive, so the two codes are equal to the index (just as my `Asha.Roy@Example.com` collided with `asha.roy@example.com`). Change that column to a binary collation (`utf8mb4_bin`, or `ascii_bin` if codes are ASCII), which requires rebuilding the index, and check queries that relied on case-insensitive lookups, since `WHERE code = 'save10'` will stop matching `SAVE10`.",
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
            "Start the container, run `status` with and without `--default-character-set=utf8mb4`, and compare the `Client characterset` lines.",
            "Run `SELECT 'ravi' = 'ravi ', 'ravi' = 'ravi ' COLLATE utf8mb4_general_ci;` and explain the two answers.",
            "Run `SELECT ROUND(2.5), ROUND(2.5e0), ROUND(3.5e0);`.",
            "Create a `TIMESTAMP` column, insert `'2026-11-16 09:00:00'` with `SET time_zone = '+05:30'`, then select it with `'+00:00'` and with `'-05:00'`.",
            "Create a table with an `AUTO_INCREMENT` key, insert one row, insert two inside `START TRANSACTION ... ROLLBACK`, insert one more, and look at the ids.",
            "Run `FLUSH STATUS;` then a `SELECT` with a `WHERE` on an unindexed column of a table you know the size of, then `SHOW SESSION STATUS LIKE 'Handler_read_rnd_next';`.",
            "Insert `'Ravi 🚕'` into a `utf8mb3` column with `SET SESSION sql_mode = '';`, then `SELECT HEX(name)`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 shows `latin1` without the flag and `utf8mb4` with it (in the `mysql:8.0` container, which has no locale). Step 2 returns 0 and 1: the default 0900 collation is `NO PAD`, `general_ci` is `PAD SPACE`. Step 3 returns 3, 2 and 4: the exact literal rounds half away from zero, the double literals round half to even. Step 4 shows 03:30 the same day and 22:30 the day before: the same instant (`UNIX_TIMESTAMP(ts)` stays 1794799800). Step 5 gives ids 1 and 4: the rolled-back rows used 2 and 3. Step 6 shows the number of rows in the table plus one (300,002 for my 300,001 trips). Step 7 stores `Ravi ?` with hex `52617669203F`, the emoji replaced by a question mark, with warning 1366.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PATH       client → connection thread (1 per conn, thread cache)
           → parser (1064) → resolve + privileges (1146, 1054)
           → optimizer (EXPLAIN, trace; PK = const) → executor
           → handler API (Handler_read_*) → InnoDB buffer pool → .ibd

COUNTERS   Threads_connected / Threads_running / Threads_created
           Innodb_buffer_pool_read_requests (memory) vs _reads (disk)
           Handler_read_rnd_next ≈ rows scanned; Com_select per SELECT

ON DISK    db = schema = directory; table = one .ibd of 16 KB pages
           page 3 = SDI (definition as JSON), no .frm since 8.0
           TABLE_ROWS is an estimate; DATA_LENGTH = clustered index

TYPES      ids: BIGINT (INT ends at 2,147,483,647)
           money: DECIMAL; DOUBLE drifts and ROUNDs half-to-even
           text: VARCHAR(n chars) in utf8mb4; CHAR strips spaces
           utf8 = utf8mb3: no emoji; latin1 client: mojibake
           default collation 0900_ai_ci: Asha = asha = ásha, NO PAD
           TIMESTAMP: UTC instant, session tz, ends 2038-01-19
           JSON validated, ->> is _bin; ENUM sorts by position
           BOOLEAN = TINYINT(1): stores 5; use IS TRUE

RULES      strict sql_mode always; CHECK enforced since 8.0.16
           AUTO_INCREMENT has gaps; persisted since 8.0
           JDBC: BigDecimal, LocalDateTime, set connectionTimeZone`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A query passes through a connection thread, the parser, the resolver, the optimizer and the executor before InnoDB reads a single page, and each layer can be watched with the server's own counters; the buffer pool decides whether those pages cost memory reads or disk reads, and a table is one `.ibd` file of 16 KB pages that even carries its own definition.",
            "Most data type bugs are defaults doing what they were designed to do: `DOUBLE` approximating, `utf8` being three bytes, the collation ignoring case, `TIMESTAMP` converting by time zone, `ENUM` storing positions, non-strict mode adjusting values. Choosing types deliberately (`BIGINT`, `DECIMAL`, utf8mb4, explicit collations, UTC instants, strict mode) prevents a whole class of production incidents before any query is written.",
            "Next comes SELECT, WHERE, ORDER BY, INSERT, UPDATE and DELETE: reading and writing these tables properly, including `NULL` logic in `WHERE`, sorting by collation, multi-row and `INSERT ... ON DUPLICATE KEY UPDATE` writes, `UPDATE` and `DELETE` with limits, and what the affected-rows count in JDBC really means.",
          ],
        },
      ],
    },
  ],
};
