import type { Lesson } from "../types";

export const urlShortener: Lesson = {
  slug: "url-shortener",
  date: "2026-10-29",
  title: "Project 2: URL Shortener with Analytics",
  description:
    "A URL shortener built with Spring Boot, PostgreSQL and Redis: Base62 short codes, cache-aside redirects, click counting that doesn't hammer the database, link expiry, Redis rate limiting, and a k6 load test to prove the numbers.",
  tags: ["Project", "Spring Boot", "Redis", "PostgreSQL", "Caching"],
  difficulty: "Easy",
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "The URL shortener is the \"hello world\" of system design interviews, so building one for real gives me something most candidates only draw on a whiteboard. It's also the first project where performance matters: a redirect is read thousands of times for every one write, and that read path has to be fast.",
        },
        {
          type: "paragraph",
          text: "Project 1 was about getting the Spring basics right. This one adds a second data store (Redis) and forces real decisions: what to cache, when the cache is wrong, how to count clicks without one database write per click, and how to stop one script from creating a million links.",
        },
        {
          type: "table",
          headers: ["Job skill", "Where it shows up here"],
          rows: [
            ["Caching with Redis", "Cache-aside on the redirect path, TTLs, negative caching"],
            ["ID generation", "Base62 encoding of a database sequence"],
            ["HTTP semantics", "302 vs 301, `Location` header, 404 vs 410"],
            ["Write batching", "Click counters in Redis, flushed to PostgreSQL by a scheduled job"],
            ["Rate limiting", "Fixed-window counter in Redis, 429 with `Retry-After`"],
            ["Analytics queries", "Per-day aggregates with `GROUP BY` and UPSERT"],
            ["Performance testing", "k6 load test, before/after cache numbers"],
          ],
        },
        {
          type: "paragraph",
          text: "**Effort:** 2 weekends for the core (shorten, redirect, cache, counts), 1 more for rate limiting, analytics and the load test write-up.",
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a coat check at a wedding. I hand over a big, awkward coat and get back a small numbered token. Anyone holding token 42 gets that exact coat back, quickly, and the attendant can tell me later how many times token 42 was used. This service does that for links: I give it a long URL, it gives back a short one like `http://localhost:8080/aZ3`. Opening the short link sends the browser to the original URL, every visit is counted, links can expire, and the owner can see clicks per day.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a creator, I want to paste a long URL and get a short link, so that I can share it in a message or a printed poster.",
            "As a creator, I want to choose a custom alias like `/diwali-sale`, so that the link is readable.",
            "As a creator, I want to set an expiry date, so that a promo link stops working after the promo.",
            "As a visitor, I want the short link to open instantly, so that I don't notice it's a redirect at all.",
            "As a creator, I want to see total clicks and clicks per day, so that I know if my post worked.",
            "As the operator, I want each client limited to a sensible number of links per minute, so that a bot can't fill my database.",
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
            ["FR-01", "Create a short link from a long URL. Only `http`/`https`, max 2,048 chars.", "Must"],
            ["FR-02", "Short code is Base62 of a database sequence value; codes are never reused.", "Must"],
            ["FR-03", "`GET /{code}` returns 302 with `Location` set to the long URL.", "Must"],
            ["FR-04", "Unknown code → 404; expired or disabled link → 410 Gone.", "Must"],
            ["FR-05", "Redirect lookups go through Redis (cache-aside); DB is only hit on a cache miss.", "Must"],
            ["FR-06", "Every successful redirect increments a click counter without a synchronous DB write.", "Must"],
            ["FR-07", "Optional `expiresAt` on create; must be in the future.", "Must"],
            ["FR-08", "Rate limit link creation per client IP (default 10 per minute) → 429 with `Retry-After`.", "Must"],
            ["FR-09", "Analytics: total clicks and clicks per day for a date range.", "Should"],
            ["FR-10", "Custom alias (4–30 chars, `[A-Za-z0-9-]`), unique, cannot clash with reserved paths like `api`.", "Should"],
            ["FR-11", "Disable a link (soft delete) so it returns 410 immediately, including from the cache.", "Should"],
            ["FR-12", "Top referrers / user-agent breakdown.", "Could"],
            ["FR-13", "QR code PNG for a short link.", "Could"],
          ],
        },
      ],
    },
    {
      title: "Non-Functional Requirements",
      blocks: [
        {
          type: "table",
          headers: ["ID", "Target", "How I verify it"],
          rows: [
            ["NFR-01", "Redirect p95 under 20 ms on a warm cache with 50 virtual users", "k6, 60 s run, redirects not followed"],
            ["NFR-02", "Cache hit ratio above 95% during the load test", "Redis `INFO stats` keyspace_hits / misses before and after"],
            ["NFR-03", "Zero DB queries per redirect on a cache hit", "Hibernate statistics or SQL log count during a short k6 run"],
            ["NFR-04", "Click counts lose at most one flush interval (10 s) of data if the app crashes", "Kill the app mid-run, compare k6 request count to stored clicks"],
            ["NFR-05", "Redirect still works (slower) when Redis is down", "Stop the Redis container during a k6 run; no 5xx spike beyond the timeout"],
            ["NFR-06", "Rate limiter allows exactly N requests per window per IP", "Integration test firing N+1 requests"],
          ],
        },
        {
          type: "paragraph",
          text: "I'll record before/after numbers: the same k6 run with the cache disabled, and with it enabled. That comparison is the most convincing thing this project produces.",
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "table",
          headers: ["Store", "Key / table", "Contents"],
          rows: [
            ["PostgreSQL", "`links`", "`id BIGINT PK` (from sequence), `code VARCHAR(30) UNIQUE`, `long_url TEXT`, `created_at`, `expires_at NULL`, `disabled_at NULL`, `creator_ip INET`"],
            ["PostgreSQL", "`link_daily_clicks`", "`link_id FK`, `day DATE`, `clicks BIGINT`; PK `(link_id, day)`"],
            ["Redis", "`link:{code}`", "String: long URL (or a `__NONE__` marker for misses), TTL up to 24 h, never beyond `expires_at`"],
            ["Redis", "`clicks:{yyyy-MM-dd}`", "Hash: field = code, value = clicks not yet flushed"],
            ["Redis", "`rl:create:{ip}:{minute}`", "Counter for the rate limit window, expires after 60 s"],
          ],
        },
        {
          type: "diagram",
          text: `PostgreSQL (source of truth)              Redis (fast, can be lost)
+----------------------+                  +-----------------------------+
| links                |                  | link:aZ3 -> "https://..."   |
|----------------------|                  |   (cache-aside, TTL)        |
| id         PK        |                  |                             |
| code       UNIQUE    |<---- miss -------| clicks:2026-10-29 (hash)    |
| long_url             |                  |   aZ3 -> 118                |
| expires_at           |                  |   k9  -> 7                  |
| disabled_at          |                  |                             |
+----------+-----------+                  | rl:create:10.0.0.5:2026...  |
           | 1                            +--------------+--------------+
           |                                             |
           | *                                           | flush every 10 s
+----------+-----------+                                 |
| link_daily_clicks    |<--------- UPSERT ---------------+
|----------------------|
| link_id  FK  } PK    |
| day          }       |
| clicks               |
+----------------------+`,
          caption: "PostgreSQL owns links and the long-term counts. Redis holds the cache, unflushed clicks and rate limit counters.",
        },
        {
          type: "code",
          language: "sql",
          title: "Flushing one day's counters (one statement per code)",
          code: `INSERT INTO link_daily_clicks (link_id, day, clicks)
VALUES (:linkId, :day, :delta)
ON CONFLICT (link_id, day)
DO UPDATE SET clicks = link_daily_clicks.clicks + EXCLUDED.clicks;`,
        },
      ],
    },
    {
      title: "API Design",
      blocks: [
        {
          type: "table",
          headers: ["Method", "Path", "Purpose", "Success", "Failure"],
          rows: [
            ["POST", "/api/v1/links", "Create a short link", "201 + Location", "400, 409 (alias taken), 429"],
            ["GET", "/api/v1/links/{code}", "Link details (no redirect)", "200", "404"],
            ["DELETE", "/api/v1/links/{code}", "Disable a link", "204", "404"],
            ["GET", "/api/v1/links/{code}/stats?from=&to=", "Total + per-day clicks", "200", "400, 404"],
            ["GET", "/{code}", "The redirect itself (not versioned, it's the public short URL)", "302", "404, 410"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/links (request)",
          code: `{
  "longUrl": "https://shop.example.com/sale/festive?utm_source=whatsapp&utm_campaign=oct",
  "alias": null,
  "expiresAt": "2026-11-15T23:59:59Z"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "201 Created",
          code: `{
  "code": "aZ3",
  "shortUrl": "http://localhost:8080/aZ3",
  "longUrl": "https://shop.example.com/sale/festive?utm_source=whatsapp&utm_campaign=oct",
  "expiresAt": "2026-11-15T23:59:59Z",
  "createdAt": "2026-10-29T10:15:00Z"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "GET /api/v1/links/aZ3/stats?from=2026-10-27&to=2026-10-29 → 200",
          code: `{
  "code": "aZ3",
  "totalClicks": 312,
  "daily": [
    { "day": "2026-10-27", "clicks": 0 },
    { "day": "2026-10-28", "clicks": 194 },
    { "day": "2026-10-29", "clicks": 118 }
  ]
}`,
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "diagram",
          text: `  Browser                         Creator / API client
     |  GET /aZ3                         |  POST /api/v1/links
     v                                   v
+-------------------------------------------------------+
| RedirectController        LinkController              |
|        |                    | RateLimiter (Redis INCR) |
|        v                    v                          |
| RedirectService ------> LinkService                   |
|   1. GET link:aZ3  (Redis)        nextval -> Base62    |
|   2. miss? SELECT links (PG)      INSERT links         |
|      SET link:aZ3 EX ttl                               |
|   3. HINCRBY clicks:<today> aZ3 1                      |
|   4. 302 Location: long_url                            |
|                                                        |
| ClickFlushJob (@Scheduled every 10 s)                  |
|   RENAME clicks:<day> -> clicks:<day>:flushing         |
|   HGETALL -> UPSERT link_daily_clicks -> DEL           |
+-----------+-------------------------------+------------+
            |                               |
            v                               v
       PostgreSQL 16                     Redis 7`,
        },
        {
          type: "paragraph",
          text: "The redirect path is the hot path, so it does the least possible work: one Redis read and one Redis increment on a cache hit. Everything else (writing counts to PostgreSQL, analytics queries) happens off that path. The flush job renames the hash first so that new clicks go into a fresh hash while the old one is being written; nothing is counted twice or dropped between read and delete.",
        },
        {
          type: "code",
          language: "java",
          title: "Base62.java",
          code: `public final class Base62 {

    private static final String ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    private Base62() {}

    public static String encode(long value) {
        if (value < 0) {
            throw new IllegalArgumentException("value must be >= 0");
        }
        if (value == 0) {
            return "0";
        }
        StringBuilder sb = new StringBuilder();
        while (value > 0) {
            sb.append(ALPHABET.charAt((int) (value % 62)));
            value /= 62;
        }
        return sb.reverse().toString();
    }

    public static long decode(String code) {
        long value = 0;
        for (char c : code.toCharArray()) {
            int digit = ALPHABET.indexOf(c);
            if (digit < 0) {
                throw new IllegalArgumentException("invalid character: " + c);
            }
            value = Math.addExact(Math.multiplyExact(value, 62), digit);
        }
        return value;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "RedirectService.java (cache-aside)",
          code: `@Service
class RedirectService {

    private static final String NONE = "__NONE__";
    private static final Duration MAX_TTL = Duration.ofHours(24);

    private final StringRedisTemplate redis;
    private final LinkRepository links;
    private final Clock clock;

    RedirectService(StringRedisTemplate redis, LinkRepository links, Clock clock) {
        this.redis = redis;
        this.links = links;
        this.clock = clock;
    }

    String resolve(String code) {
        String cached = redis.opsForValue().get("link:" + code);
        if (NONE.equals(cached)) {
            throw new LinkNotFoundException(code);
        }
        if (cached != null) {
            return cached;
        }

        Link link = links.findByCode(code).orElse(null);
        if (link == null) {
            redis.opsForValue().set("link:" + code, NONE, Duration.ofMinutes(5));
            throw new LinkNotFoundException(code);
        }
        if (!link.isActiveAt(clock.instant())) {
            throw new LinkGoneException(code);
        }
        redis.opsForValue().set("link:" + code, link.getLongUrl(), ttlFor(link));
        return link.getLongUrl();
    }

    private Duration ttlFor(Link link) {
        if (link.getExpiresAt() == null) {
            return MAX_TTL;
        }
        Duration left = Duration.between(clock.instant(), link.getExpiresAt());
        return left.compareTo(MAX_TTL) < 0 ? left : MAX_TTL;
    }
}`,
        },
        {
          type: "paragraph",
          text: "Because the cache TTL never outlives `expires_at`, an expired link drops out of Redis by itself and the next lookup hits the database, which returns 410. Disabling a link deletes `link:{code}` right after the DB update commits.",
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
            ["Java 21 + Spring Boot 3.x", "Same base as Project 1, so the new learning is Redis and performance"],
            ["PostgreSQL 16", "Source of truth for links; sequences for IDs; UPSERT for counters"],
            ["Redis 7 + Spring Data Redis (`StringRedisTemplate`)", "Sub-millisecond reads, atomic `INCR`/`HINCRBY`, key TTLs"],
            ["Flyway", "Schema migrations, as in Project 1"],
            ["Testcontainers (PostgreSQL + Redis)", "Integration tests against the real thing"],
            ["k6", "Scriptable load test with thresholds; easy to run from a laptop"],
            ["Docker Compose", "App + PostgreSQL + Redis in one command"],
            ["Spring Boot Actuator", "Health checks for DB and Redis; basic metrics"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Base62 of a sequence instead of random codes or hashing",
        },
        {
          type: "paragraph",
          text: "Like a ticket counter at a bank: every customer gets the next number, so there are never two people with the same token. The sequence guarantees uniqueness with no retry loop, and Base62 keeps codes short (62^6 is about 56 billion). Trade-off: codes are guessable, so someone can walk through all links. If links might be private, I'd switch to 7 random Base62 characters with a unique constraint and retry on collision. Hashing the URL (MD5 and truncate) gives the same code for the same URL but needs collision handling, so I skip it.",
        },
        {
          type: "heading",
          text: "ADR-2: 302 Found, not 301 Moved Permanently",
        },
        {
          type: "paragraph",
          text: "Browsers cache 301s and stop asking me, so I'd lose clicks and couldn't expire or disable a link for that browser. 302 means every visit comes through. Trade-off: slightly more traffic to my service, which is exactly the traffic I want to count.",
        },
        {
          type: "heading",
          text: "ADR-3: Count clicks in Redis, flush to PostgreSQL in batches",
        },
        {
          type: "paragraph",
          text: "Like a shopkeeper tallying sales on a slate and writing the total into the ledger every evening. One DB write per click would make the redirect as slow as the database. `HINCRBY` is atomic and in memory. Trade-off: if Redis dies before a flush, up to one interval of clicks is lost. For analytics that's acceptable; for billing it wouldn't be.",
        },
        {
          type: "heading",
          text: "ADR-4: Fixed-window rate limiting",
        },
        {
          type: "paragraph",
          text: "One counter per IP per minute, `INCR` then `EXPIRE` on the first hit. It's simple and easy to explain. Trade-off: a client can send 2N requests across a window boundary. A sliding window or token bucket fixes that and is a stretch goal. I also note that `INCR` + `EXPIRE` as two calls can leave a key without a TTL if the app dies in between; a Lua script or `SET key 0 EX 60 NX` before `INCR` closes that gap.",
        },
        {
          type: "heading",
          text: "ADR-5: Fail open on Redis errors for redirects",
        },
        {
          type: "paragraph",
          text: "If Redis is down, the redirect falls back to the database (with a short Redis timeout so I don't wait long). Availability of links matters more than counting. Trade-off: clicks during the outage aren't counted, and the DB takes the full load.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "`javascript:alert(1)` or `ftp://` as the long URL → 400. Only `http` and `https` are allowed.",
            "A long URL pointing back at my own domain → 400, to prevent redirect loops.",
            "Custom alias equal to a reserved path (`api`, `actuator`, `swagger-ui`) → 400.",
            "Two people request the same custom alias at the same time → the unique constraint picks one; the other gets 409.",
            "Code with characters outside Base62 → 404 straight away, without touching Redis or the DB.",
            "Cache stampede: a hot link's key expires and 500 requests miss at once. Acceptable at this scale; a per-key lock is a stretch goal.",
            "Many lookups for codes that don't exist → negative cache entry for 5 minutes so the DB isn't hammered.",
            "Expiry set in the past → 400 on create.",
            "A click lands exactly while the flush job runs → goes into the new hash, counted on the next flush.",
            "Clicks for a day that has no row yet → UPSERT inserts it.",
            "Requests behind a proxy → read the client IP from `X-Forwarded-For` only when the proxy is trusted, otherwise anyone can spoof their way past the rate limit.",
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
            "**Shorten and redirect, no cache.** Flyway schema, `nextval`, Base62, `POST /api/v1/links`, `GET /{code}` with 302/404. Demo: create a link and open it in a browser. Tests: Base62 round-trip unit tests (0, 61, 62, `Long.MAX_VALUE`), integration test for 302 and `Location`.",
            "**Baseline load test.** Seed 10,000 links, run k6 without Redis. Demo: k6 summary with p95. Tests: none new; the numbers go in the README as \"before\".",
            "**Cache-aside.** Redis in Compose, `RedirectService` with TTL and negative caching. Demo: the same k6 run, now faster, and Redis `INFO stats` showing hits. Tests: Testcontainers test asserting the second lookup doesn't hit the repository (spy).",
            "**Expiry and disable.** 410 for expired/disabled, cache eviction on disable. Demo: disable a link and immediately get 410. Tests: expiry uses a fixed `Clock`; evict-on-disable test.",
            "**Click counting.** `HINCRBY` on redirect, `@Scheduled` flush with RENAME + UPSERT, stats endpoint. Demo: k6 sends 1,000 hits, stats show 1,000 after a flush. Tests: flush job integration test, counts are exact.",
            "**Rate limiting and polish.** Limiter on create, 429 + `Retry-After`, README with before/after numbers and a Redis-down experiment. Tests: N allowed, N+1 rejected, new window resets.",
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
            "**Unit:** Base62 encode/decode round trip and invalid input; URL validation rules; TTL calculation never exceeding expiry.",
            "**Integration (Testcontainers PostgreSQL + Redis):** cache miss then hit, negative cache, 410 after expiry, flush job writes exact counts, rate limiter boundary, alias uniqueness under two concurrent inserts.",
            "**Failure test:** stop the Redis container in a test (or point at a dead port) and assert redirects still return 302.",
            "**Load (k6):** warm-cache redirect test with thresholds; run once without cache and once with; also a mixed test (95% redirects, 5% creates).",
          ],
        },
        {
          type: "code",
          language: "javascript",
          title: "k6/redirect.js",
          code: `import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 50,
  duration: "60s",
  thresholds: {
    http_req_duration: ["p(95)<20"],
    checks: ["rate>0.99"],
  },
};

const codes = JSON.parse(open("./codes.json"));

export default function () {
  const code = codes[Math.floor(Math.random() * codes.length)];
  const res = http.get("http://localhost:8080/" + code, { redirects: 0 });
  check(res, { "is 302": (r) => r.status === 302 });
}`,
        },
      ],
    },
    {
      title: "Stretch Goals",
      blocks: [
        {
          type: "list",
          items: [
            "Sliding-window or token-bucket rate limiter as an atomic Lua script.",
            "Hot-key protection: a short in-process cache (Caffeine) in front of Redis for the top links.",
            "Referrer and device breakdown stored as daily aggregates.",
            "Random, non-guessable codes with a collision-retry loop, and a test that forces collisions.",
            "Owner accounts and API keys (after Project 3 teaches auth).",
            "Run two app instances behind Nginx to show the counters and limiter still work across instances.",
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
              question: "How do you generate short codes, and why that way?",
              answer:
                "I take the next value from a PostgreSQL sequence and encode it in Base62. The sequence guarantees uniqueness with no collision handling, and Base62 keeps it short: six characters cover about 56 billion links.\n\nThe downside is that codes are predictable. If that mattered I'd generate random codes and rely on a unique constraint with a retry.",
            },
            {
              question: "Why 302 and not 301?",
              answer:
                "A 301 tells the browser the move is permanent, so it caches the redirect and never asks me again. Then I can't count clicks, and I can't expire or disable the link for that browser.\n\n302 keeps every visit coming through my service.",
            },
            {
              question: "Explain cache-aside and its failure modes.",
              answer:
                "The app checks Redis first. On a miss it reads the database and writes the result into Redis with a TTL. Writes go to the database and then evict the cache key.\n\nThe failure modes are stale data (fixed by evicting on change and keeping TTLs bounded), a stampede when a hot key expires and many requests hit the DB at once, and lots of misses for keys that don't exist, which I handle with a short negative cache entry.",
            },
            {
              question: "Why not write each click directly to PostgreSQL?",
              answer:
                "A DB write per click makes the redirect only as fast as the database, and hot links would cause lock contention on the same counter row.\n\n`HINCRBY` in Redis is atomic and in memory. A job flushes the totals every 10 seconds with one UPSERT per link. I accept losing up to one interval of clicks if Redis crashes, which is fine for analytics.",
            },
            {
              question: "How does your flush job avoid losing or double-counting clicks that arrive during the flush?",
              answer:
                "It renames the day's hash to a `:flushing` key first. `RENAME` is atomic, so new increments start a fresh hash under the original name. The job reads the renamed hash, writes the UPSERTs, then deletes it.\n\nIf the job crashes after the DB write but before the delete, the next run could count those clicks again, so I either check for a leftover `:flushing` key on startup or accept that small risk and document it.",
            },
            {
              question: "How does your rate limiter work, and what's its weakness?",
              answer:
                "Fixed window: the key is the IP plus the current minute. I `INCR` it, and if the result is 1, set a 60-second expiry. Over the limit returns 429 with `Retry-After`.\n\nThe weakness is the boundary: a client can send the full limit at 12:00:59 and again at 12:01:00. A sliding window log or token bucket fixes that.",
            },
            {
              question: "What happens if Redis goes down?",
              answer:
                "Redirects fall back to PostgreSQL, with a short Redis command timeout so requests don't hang. Clicks during the outage aren't counted and rate limiting fails open. I chose availability of links over perfect counting, and I tested it by stopping the Redis container during a k6 run.",
            },
            {
              question: "How do you handle link expiry with a cache in front?",
              answer:
                "The cache TTL is the smaller of 24 hours and the time left until `expires_at`, so a cached entry can never outlive the link. After it drops out, the next lookup reads the DB, sees the link has expired, and returns 410.",
            },
            {
              question: "What numbers did your load test show?",
              answer:
                "This is where I quote my README: p95 and requests per second without the cache and with it, at 50 virtual users on my laptop, plus the cache hit ratio from Redis `INFO stats`.\n\nI also mention it's a single machine running the app, DB, Redis and k6 together, so the absolute numbers are modest; the before/after difference is what matters.",
            },
            {
              question: "How would this scale to many app instances?",
              answer:
                "The app is stateless, so I can run several behind a load balancer. The counters and rate limits already live in Redis, so they're shared. The sequence lives in PostgreSQL, so codes stay unique.\n\nThe next bottlenecks would be Redis itself (read replicas or a cluster) and the flush job, which needs to run on only one instance or use a lock.",
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
            "Built a URL shortener in Spring Boot with PostgreSQL and Redis: Base62 codes from a DB sequence, cache-aside redirects, link expiry and per-IP rate limiting.",
            "Cut redirect p95 from [X] ms to [Y] ms at 50 concurrent users ([Z]% cache hit ratio), measured with k6 on a local Docker stack.",
            "Moved click counting off the hot path with atomic Redis counters flushed to PostgreSQL via scheduled UPSERTs, removing per-click database writes.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Quote what I measured",
          text: "The [X], [Y] and [Z] must come from my own k6 and Redis output, with the machine described honestly (a laptop, everything in Docker). Never write \"handles millions of requests\" for something I ran on one laptop for 60 seconds.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "Project 1 finished, or at least comfortable with Spring Boot, JPA and Flyway",
            "Java → Data Types and Operators (`long` division and remainder for Base62)",
            "Java → Date and Time API (`Instant`, `Duration`, `Clock`)",
            "Spring Boot: `@Scheduled`, Spring Data Redis, configuration properties",
            "Redis basics: strings, hashes, `INCR`, `HINCRBY`, `EXPIRE`, `RENAME`, TTLs",
            "PostgreSQL: sequences, `INSERT ... ON CONFLICT`, unique constraints",
            "REST API Design: redirects (301 vs 302), 404 vs 410, 429 and `Retry-After`",
            "System Design: caching strategies and rate limiting",
          ],
        },
      ],
    },
  ],
};
