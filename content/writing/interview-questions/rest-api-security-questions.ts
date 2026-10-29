import type { Lesson } from "../types";

export const restApiSecurityQuestions: Lesson = {
  slug: "rest-api-security-interview-questions",
  date: "2026-10-29",
  title: "REST API Design and Security Interview Questions",
  description:
    "The REST design and API security questions I keep getting asked, from status codes, idempotency keys and versioning to JWTs, OAuth2, Spring Security, CORS, CSRF and webhook signatures, answered the way I'd say them out loud.",
  tags: ["Interview", "REST", "API Design", "Security", "Spring Security", "JWT"],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the API design and security questions that come up in almost every backend round. Each answer starts with a plain, everyday picture (a bank queue, a hotel key card, a food order), then the technical detail, then the trade-off.",
        },
        {
          type: "paragraph",
          text: "Try answering each question aloud before opening the answer. If I can't explain it in about a minute without notes, I don't really know it yet. Questions marked with ⭐ are the ones asked most often, so I start with those.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "How I shape every answer",
          text: "One-line definition, a simple real-life example, how it actually works, and when I wouldn't use it. Where I mention RideX, my ride-hailing backend, it's only for things that are really in the code.",
        },
      ],
    },
    {
      title: "REST Basics",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is REST?",
              answer:
                "REST is a style for designing APIs around **resources**. A resource is a noun, like a ride or an order, and it gets an address: `/rides/123`. I act on it with the standard HTTP methods, GET to read, POST to create, and so on, and the data travels as a representation, usually JSON.\n\nThink of a library. Every book has a shelf number (the URL), and there's a fixed set of things you can do at the counter: borrow, return, renew. You don't invent a new counter for every book. REST is that idea for APIs: fixed verbs, many nouns.",
            },
            {
              question: "What are the REST constraints?",
              answer:
                "Six of them. **Client-server**: the UI and the data are separate. **Stateless**: every request carries everything the server needs, so the server keeps no conversation memory between calls. **Cacheable**: responses say whether they can be cached. **Uniform interface**: resources with URLs, standard methods, self-describing messages. **Layered system**: the client can't tell if it's talking to the real server or a proxy or load balancer in between. **Code on demand** is optional and rarely used.\n\nThe one that matters most in practice is statelessness. It's what lets me put ten identical servers behind a load balancer, because any server can answer any request.",
            },
            {
              question: "⭐ What do safe and idempotent mean for HTTP methods?",
              answer:
                "A **safe** method doesn't change anything on the server: GET, HEAD, OPTIONS. Reading a menu doesn't change the menu.\n\nAn **idempotent** method gives the same end state no matter how many times I repeat it. Pressing a lift button five times still calls the lift once. GET, PUT and DELETE are idempotent: deleting order 5 twice still leaves order 5 deleted. POST is not, because each call usually creates something new, like placing a food order twice gives two orders. PATCH depends on the operation: \"set status to PAID\" is idempotent, \"add 1 to quantity\" is not.\n\nThis matters because networks retry. A client that times out can safely retry an idempotent call, but retrying a POST needs extra help, which is what idempotency keys are for.",
            },
            {
              question: "⭐ PUT vs PATCH vs POST?",
              answer:
                "POST creates something or triggers an action. PUT replaces the whole resource with what I send. PATCH changes only the fields I send.\n\nWith a user profile: PUT means \"here's the full profile, store exactly this\", so a missing field gets cleared. PATCH means \"only change the phone number\". POST to `/users` means \"make a new user\".\n\nFor state changes that aren't really field edits, like starting a trip or accepting an offer, I use POST on an action path such as `/trips/{id}/start`. A trip moving through a state machine isn't the same as editing a column, and the action name says what happens.",
            },
            {
              question: "How do you name endpoints?",
              answer:
                "Plural nouns, lowercase, hyphens if needed, and nesting only for real ownership: `/riders/42/rides`, not `/getRidesForRider?id=42`. The verb is the HTTP method, so it doesn't belong in the URL.\n\nI keep nesting shallow, one level at most. `/rides/123` is fine on its own once I have the ride ID; I don't need `/cities/5/drivers/7/rides/123`.",
            },
            {
              question: "What is HATEOAS, and do people use it?",
              answer:
                "It means responses include links to what the client can do next, like a `cancel` link on a ride that can still be cancelled. It's like a vending machine that lights up only the buttons you can press right now.\n\nIt's elegant but rarely used in practice, because most mobile and web clients are written against known endpoints anyway. I mention it, and then say I haven't needed it.",
            },
            {
              question: "REST vs GraphQL vs gRPC?",
              answer:
                "**REST** is simple, cacheable and understood by every tool, so it's my default for public and mobile APIs. **GraphQL** lets the client ask for exactly the fields it wants in one call, which helps when many different screens need different shapes, but caching and protecting against very expensive queries get harder. **gRPC** uses binary Protobuf over HTTP/2, so it's fast and strictly typed, with streaming, which makes it a good fit between internal services.\n\nA rough rule: REST outside, gRPC inside when performance matters, GraphQL when the frontends are many and varied.",
            },
          ],
        },
      ],
    },
    {
      title: "Status Codes and Error Responses",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Which status codes should every backend developer know?",
              answer:
                "The 2xx family means it worked: **200** OK, **201** Created (with a `Location` header pointing to the new resource), **202** Accepted (I'll do it in the background), **204** No Content.\n\nThe 4xx family means the client did something wrong: **400** malformed request, **401** not logged in, **403** logged in but not allowed, **404** not found, **409** conflict with the current state (\"that ride was already taken\"), **422** valid JSON but breaks a business rule, **429** too many requests.\n\nThe 5xx family means the server failed: **500** a bug, **502** a bad answer from an upstream, **503** overloaded or in maintenance, **504** an upstream timed out.\n\nA food-order picture helps me remember: 4xx is \"you ordered something not on the menu\", 5xx is \"the kitchen caught fire\".",
            },
            {
              question: "⭐ 401 vs 403?",
              answer:
                "**401** means \"I don't know who you are\": no token, an expired token, or a bad signature. **403** means \"I know who you are, and you're not allowed\".\n\nAt an office gate, 401 is having no ID card at all. 403 is having a valid card that doesn't open the server room. The naming is confusing, because 401 is called \"Unauthorized\" but really means unauthenticated.",
            },
            {
              question: "400 vs 422 vs 409?",
              answer:
                "**400** is for a request I can't even read: broken JSON, a string where a number should be. **422** is for a request I understood that breaks a rule: a pickup time in the past, a negative amount. **409** is for a request that clashes with the current state of the resource: accepting a ride another driver already took, or creating a user with an email that already exists.\n\nTeams draw the 400/422 line differently, and that's fine. What matters is being consistent across the whole API.",
            },
            {
              question: "What should an error response look like?",
              answer:
                "One shape everywhere, so clients write one error handler. I use **RFC 7807 Problem Details** (updated as RFC 9457): `type`, `title`, `status`, `detail` and `instance`, served as `application/problem+json`. For validation I add an `errors` list with one entry per field, and I include a request or trace ID so support can find the log line.\n\nWhat I never put in it: stack traces, SQL, or internal class names. That's free reconnaissance for an attacker. The real exception goes to the logs; the client gets a short, safe message.",
            },
          ],
        },
        {
          type: "code",
          language: "json",
          title: "A Problem Details body for a validation error",
          code: `{
  "type": "https://api.example.com/problems/validation",
  "title": "Invalid request",
  "status": 422,
  "detail": "Pickup time must be in the future.",
  "instance": "/api/v1/rides",
  "errors": [{ "field": "pickupAt", "message": "must be in the future" }],
  "traceId": "4f2a9c1e"
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "How do you return Problem Details from Spring Boot?",
              answer:
                "A `@RestControllerAdvice` class with `@ExceptionHandler` methods that map each exception to a `ProblemDetail` object, which Spring 6 has built in. `RideNotFoundException` becomes 404, a conflict becomes 409, validation errors become 400 or 422 with field details, and anything unexpected becomes a generic 500 that's logged in full on the server.\n\nOne gap people miss: errors thrown in a servlet filter, like a rate limiter, never reach `@ControllerAdvice`, because filters run before Spring MVC. So the filter has to write the Problem Details body itself.",
            },
          ],
        },
      ],
    },
    {
      title: "Idempotency Keys",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How do you make a POST endpoint idempotent?",
              answer:
                "With an **idempotency key**. The client generates a unique ID for the action, like a UUID, and sends it in an `Idempotency-Key` header. The server stores the key together with the result. If the same key comes again, the server returns the stored result instead of doing the work twice.\n\nPicture paying a shop bill on your phone. The network drops, you tap Pay again. Without a key, you're charged twice. With a key, the second tap is recognised as \"the same payment\" and you just see the first receipt.\n\nStripe made this pattern famous, and RideX uses it for wallet top-ups.",
            },
            {
              question: "Two requests with the same idempotency key arrive at the same millisecond. What happens?",
              answer:
                "Both can pass a \"have I seen this key?\" check, because neither has saved anything yet. A check in code alone is a race.\n\nThe real referee is a **unique constraint** on the key column in the database. Both requests try to insert, exactly one insert succeeds, and the other gets a constraint violation, which I turn into \"return the first result\" or a 409. In RideX the wallet top-up works this way: the unique constraint on the idempotency key decides the winner, not the Java check in front of it.",
            },
            {
              question: "What if the same key comes with a different body?",
              answer:
                "That's a client bug or an attack, so I reject it with 422 or 409 instead of replaying. I store a hash of the request body next to the key and compare.\n\nI also keep keys only for as long as retries are realistic, often 24 hours, so the table doesn't grow forever.",
            },
            {
              question: "A payment call timed out. Can you just retry it?",
              answer:
                "Only with the **same** idempotency key. A timeout doesn't mean the payment failed; it means I don't know. The provider might have charged the card and the response got lost on the way back.\n\nRetrying with the same key is safe: if the first attempt worked, the provider returns that result. Retrying without a key, or with a fresh one, is how customers get charged twice.",
            },
          ],
        },
      ],
    },
    {
      title: "Versioning and Breaking Changes",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What API versioning strategies are there, and which do you prefer?",
              answer:
                "Four common ones: the version in the URL path, in a query parameter, in a custom header, or in the `Accept` media type. The table below compares them.\n\nFor public and mobile APIs I prefer the **URL path**, like `/api/v1/rides`. It's obvious in logs, easy to route at a gateway, easy to try in a browser, and caches handle it with no tricks. RideX uses `/api/v1`. Header-based versioning is fine for internal APIs where every client is under our control.",
            },
          ],
        },
        {
          type: "table",
          headers: ["Strategy", "Example", "Good", "Not so good"],
          rows: [
            ["URL path", "/api/v1/rides", "Obvious, easy to route, cache and test", "The URL changes between versions"],
            ["Query parameter", "/rides?version=2", "Easy to add", "Easy to forget, messy for caching"],
            ["Custom header", "X-API-Version: 2", "Clean URLs", "Invisible in a browser, harder to test and cache"],
            ["Media type", "Accept: application/vnd.example.v2+json", "Can version each resource separately", "The most work for clients"],
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Which changes are breaking and which aren't?",
              answer:
                "**Safe**: adding a new endpoint, adding a new field to a response, adding an optional field to a request, adding an enum value if clients ignore values they don't know.\n\n**Breaking**: removing or renaming a field, changing its type or format (a number becoming a string, a date format changing), making an optional field required, changing status codes or the error shape, changing a URL, or quietly changing what a field means.\n\nThe rule I follow: be tolerant in what I accept, and only ever add to what I return. A mobile app installed eight months ago is still out there calling my API, and it can't be updated by a deploy.",
            },
            {
              question: "How do you run v1 and v2 side by side?",
              answer:
                "One service layer, one database, two thin edges. I add a v2 controller with v2 request and response DTOs, and mappers that turn the same domain objects into each version's shape. Business logic is never copied, so a bug fix lands in both versions at once.\n\nIt's like one kitchen serving two menus: the dishes are cooked the same way, only the plating differs.",
            },
            {
              question: "How do you deprecate and retire an old version?",
              answer:
                "First, announce it and set a date. Then send `Deprecation` and `Sunset` headers on every v1 response, with a `Link` to the migration guide, so client developers see it in their own logs.\n\nNext, measure. I track v1 traffic per client or app version, because a sunset date means nothing if half the users are still on it. For mobile apps, a minimum-version check that asks users to update is the lever that actually moves people.\n\nOnly when v1 traffic is near zero, or the date has passed and it's been communicated, do I remove it.",
            },
            {
              question: "How do you change the database without breaking the old API version?",
              answer:
                "**Expand and contract.** Say I'm splitting `name` into `first_name` and `last_name`. Step one, expand: add the new columns as nullable and write to both old and new. Step two, backfill old rows in small batches. Step three, switch reads to the new columns. Step four, contract: once v1 is gone and nothing reads `name`, drop it.\n\nEvery step is deployable on its own, and at no point does a running app see a schema it doesn't understand. It's like moving house one room at a time while still living there.",
            },
            {
              question: "How do you version events or webhook payloads?",
              answer:
                "The same rules as APIs: only add fields, and make consumers ignore fields they don't know. I put a version or schema field in the payload. If a change really is incompatible, I publish a new event type rather than changing the meaning of the old one.",
            },
          ],
        },
      ],
    },
    {
      title: "Pagination, Filtering and Caching",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Offset vs cursor pagination?",
              answer:
                "**Offset** (`?page=5&size=20`) is like saying \"skip the first 100 people in the queue and show me the next 20\". It's simple and lets you jump to page 50. But the database still has to walk past those skipped rows, so deep pages get slow, and if new rows arrive while someone is scrolling, items shift: some are shown twice, some never.\n\n**Cursor** or keyset pagination (`?after=<last item's createdAt and id>`) says \"show me 20 items after this exact one\". With an index on those columns, the database jumps straight there, so page 1,000 is as fast as page 1, and new rows don't shift anything. The catch: no jumping to an arbitrary page.\n\nI use offset for admin tables with page numbers, cursor for feeds, timelines and anything big or live.",
            },
          ],
        },
        {
          type: "code",
          language: "sql",
          title: "Keyset pagination: the next 20 rides after the last one shown",
          code: `SELECT id, fare, created_at
FROM rides
WHERE (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;`,
        },
        {
          type: "qa",
          items: [
            {
              question: "How do you design filtering and sorting?",
              answer:
                "Query parameters with a clear convention: `GET /rides?status=COMPLETED&city=Pune&sort=-createdAt&size=20`, where the minus means descending.\n\nThe important part is security: I keep an **allow-list** of fields that can be filtered and sorted on. If I pass a raw `sort` value into SQL, someone sends `sort=password` or worse, an injection payload. I also cap `size`, so nobody asks for a million rows in one call.",
            },
            {
              question: "How does HTTP caching work with ETags?",
              answer:
                "An **ETag** is a fingerprint of a response, like a version stamp on a document. The server sends `ETag: \"v7\"` with the data. Next time, the client sends `If-None-Match: \"v7\"`. If nothing changed, the server answers **304 Not Modified** with no body, which saves bandwidth and the client reuses its copy.\n\n`Cache-Control` says how long a copy stays fresh without asking at all: `max-age=60` for public data, `no-store` for anything personal or sensitive.\n\nThe same ETag also prevents lost updates. A client sends `If-Match: \"v7\"` with its PUT. If someone else changed the resource meanwhile, the ETag is now v8, and the server returns **412 Precondition Failed** instead of silently overwriting. That's optimistic locking over HTTP.",
            },
            {
              question: "How do you handle a long-running operation, like a big report export?",
              answer:
                "Don't make the client wait on an open connection. Return **202 Accepted** right away with a job ID and a status URL like `/exports/123`. A background worker builds the file. The client polls the status URL, or gets a webhook, and when it's ready, it downloads from a short-lived signed link.\n\nIt's the coffee-shop buzzer: you order, get a buzzer, and sit down instead of standing at the counter.",
            },
          ],
        },
      ],
    },
    {
      title: "Rate Limiting",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is rate limiting, and why do APIs need it?",
              answer:
                "Capping how many requests a client can make in a time window, say 30 per minute per IP. A ticket counter that serves each person only so many times an hour, so one person can't block the queue.\n\nIt protects three things. **Security**: nobody can guess passwords at full speed. **Cost**: nobody can make me burn through a paid API, like a maps provider billed per call. **Fairness**: one noisy client can't starve everyone else. When the limit is hit, the API returns **429 Too Many Requests** with a `Retry-After` header.",
            },
            {
              question: "Fixed window vs sliding window vs token bucket?",
              answer:
                "**Fixed window** counts requests in clock buckets, like 10:00 to 10:01. One counter, very simple. The weakness is the edge: 30 requests at 10:00:59 and 30 more at 10:01:00 is 60 in two seconds.\n\n**Sliding window log** stores a timestamp per request and counts the last 60 seconds exactly. Accurate, but memory grows with traffic. **Sliding window counter** blends the current and previous windows by weight, which is nearly exact and cheap.\n\n**Token bucket** is like a jar that refills with one token every two seconds, up to a maximum. Each request takes a token. It allows short bursts but holds the average rate, which is why most API gateways use it. **Leaky bucket** drains requests at a fixed rate, smoothing traffic into a steady stream.\n\nRideX uses a fixed window on purpose, with a code comment about the edge burst. For \"8 failed logins per 15 minutes\", a worst case of 16 doesn't matter. For a paid API I'd use a token bucket so honest bursts aren't punished.",
            },
            {
              question: "How do you build a rate limiter with Redis?",
              answer:
                "For a fixed window: build a key like `rl:ip:<ip>:<route>`, call `INCR`. If the result is 1, it's the first hit in this window, so set `EXPIRE` to the window length. If the count is over the limit, return 429. That's how the RideX limiter works, as a servlet filter placed before the security filters, so a flood never reaches JWT parsing or the database.\n\nWhy Redis and not an in-memory map? With two app instances, each in-memory map allows 30, so the real limit is 60. Redis gives one shared counter, and `INCR` is atomic, so two instances incrementing at once can't lose a count.",
            },
            {
              question: "Is INCR plus EXPIRE atomic?",
              answer:
                "No, they're two commands. If the app crashes right after `INCR` returns 1 and before `EXPIRE` runs, the key never expires, and that client stays blocked forever once it hits the limit.\n\nThe proper fix is a small Lua script that does both in one atomic step, or `SET key 0 EX 60 NX` followed by `INCR`. In an interview I'd name this gap myself; it shows I know where the simple version cuts a corner.",
            },
            {
              question: "What happens if Redis is down: fail open or fail closed?",
              answer:
                "A business decision, not purely a technical one. **Fail open** lets requests through when the limiter can't check. **Fail closed** rejects them.\n\nRideX fails open: a rate limiter that locks out every user because Redis had a blip causes a bigger outage than the abuse it prevents. For a bank's login I might fail closed, because there the cost of brute force is higher than the cost of a short lockout.",
            },
            {
              question: "Do you limit by IP, user or API key?",
              answer:
                "It depends on what I know at that point. Before login I only have the IP. After login, the user ID is better, because a whole office can share one IP and I don't want to block all of them. For partner APIs, the API key.\n\nOne trap: behind a proxy, the real client IP is in `X-Forwarded-For`, but a client can fake that header. I only trust it if my own proxy or load balancer overwrites it; otherwise an attacker sends a new fake IP each time and gets a fresh bucket.",
            },
            {
              question: "Where should rate limiting live: gateway or app?",
              answer:
                "Both, for different jobs. The **edge** (an API gateway, Nginx or a WAF) stops crude floods cheaply, before they cost me CPU. The **app** applies limits that need business knowledge, like \"8 failed logins per account\" or \"3 OTPs per phone number per hour\". Only the app knows what a failed login or an account is.",
            },
            {
              question: "Rate limiting vs throttling vs quota?",
              answer:
                "**Rate limiting** rejects requests over the limit. **Throttling** slows them down or queues them instead of rejecting. A **quota** is a long-period allowance, like 10,000 calls a month on a pricing plan.",
            },
          ],
        },
      ],
    },
    {
      title: "Authentication, Hashing and Encryption",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Authentication vs authorization?",
              answer:
                "**Authentication** is proving who you are. **Authorization** is deciding what you're allowed to do.\n\nAt a hotel, showing your passport at reception is authentication. The key card that opens room 304 but not the manager's office is authorization. In an API, login and token checking are authentication; checks like \"can this user see this ride?\" are authorization.",
            },
            {
              question: "Hashing vs encryption vs encoding?",
              answer:
                "**Encoding**, like Base64, is just a format change. Anyone can reverse it, so it's not security at all.\n\n**Encryption** is reversible with a key, like a locked box. I use it for data I need back later, like a stored third-party API key, with AES.\n\n**Hashing** is one-way, like a fingerprint: from the fingerprint I can check it's the same person, but I can't rebuild the person. I use it for passwords and for tokens I only need to verify. RideX stores passwords with BCrypt and stores refresh tokens hashed, so a database leak doesn't hand out working sessions.",
            },
            {
              question: "Why BCrypt for passwords and not SHA-256? What's a salt?",
              answer:
                "A **salt** is random data added to each password before hashing. Two users with the password `hello123` then get completely different hashes, and precomputed lookup tables (rainbow tables) become useless.\n\nSHA-256 and MD5 are designed to be **fast**, which is exactly wrong for passwords: a GPU can try billions of guesses a second. BCrypt is **deliberately slow**, with a cost factor I can raise as hardware gets faster, and it builds the salt in. Argon2 is the modern alternative, designed to be expensive in memory as well as time.",
            },
            {
              question: "How does BCrypt check a password if it can't decrypt anything?",
              answer:
                "The stored string looks like `$2a$10$` followed by a 22-character salt and a 31-character hash. The `10` is the cost: 2 to the power 10 rounds of key setup.\n\nTo verify a login, BCrypt reads the salt and cost from the stored string, hashes the typed password the same way, and compares the two results. Nothing is ever decrypted. If the hashes match, the password was right. Raising the cost by 1 doubles the work, for my server once per login and for an attacker on every single guess.",
            },
            {
              question: "Symmetric vs asymmetric cryptography?",
              answer:
                "**Symmetric** uses one shared key for both sides, like a house key you copy for family. AES and HS256 are symmetric. Fast, but everyone who can verify can also create.\n\n**Asymmetric** uses a key pair, like a post box: anyone can drop a letter in through the slot (the public key), only the owner can open it (the private key). RSA and ECDSA are asymmetric. For signatures it's the other way round: only the private key holder can sign, anyone with the public key can verify.\n\nTLS uses both: asymmetric crypto to agree on a key safely, then fast symmetric crypto for the actual data.",
            },
            {
              question: "What does HTTPS actually give you?",
              answer:
                "Three things. **Confidentiality**: nobody on the café Wi-Fi can read the traffic. **Integrity**: nobody can change it in transit without being noticed. **Server authenticity**: the certificate, checked against trusted authorities, proves I'm talking to the real server and not an impostor.\n\nThe handshake checks the certificate and agrees on session keys (usually ECDHE), and then everything is encrypted with symmetric crypto. It doesn't prove who the client is; that's what login, tokens, or mutual TLS are for.",
            },
            {
              question: "⭐ Session-based vs token-based authentication?",
              answer:
                "With **sessions**, the server keeps the login state and gives the browser a cookie with a session ID, like a cloakroom ticket: the coat stays with the cloakroom, you only carry the number. Easy to revoke (throw away the ticket), but with many servers the session store must be shared, usually Redis.\n\nWith **tokens** like JWT, the client carries a signed pass that says who it is, like a wristband at a festival. Any server can verify it without a lookup, so it scales easily. The downside: a wristband is valid until it expires, so revoking it early is hard.",
            },
            {
              question: "Where should a client store tokens?",
              answer:
                "In a browser app, `localStorage` is readable by any JavaScript on the page, so a single XSS bug leaks the token. An httpOnly, Secure, SameSite cookie can't be read by JavaScript, but then the browser sends it automatically, so I need CSRF protection. A common middle path is the access token in memory and the refresh token in an httpOnly cookie.\n\nOn mobile, the platform's secure storage: Keychain on iOS, Keystore-backed storage on Android.",
            },
            {
              question: "How do you manage secrets like API keys and the JWT signing key?",
              answer:
                "Never in Git. They come from environment variables or a secrets manager, with different values per environment, and they get rotated. If a key was ever committed, I treat it as stolen: rotate first, clean up history later.\n\nRideX refuses to start if the JWT secret isn't set. There's no default value on purpose, because a default would sit in Git history and someone would eventually deploy with it.",
            },
          ],
        },
      ],
    },
    {
      title: "JWT, Refresh Tokens and OAuth2",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What's inside a JWT? Is it encrypted?",
              answer:
                "Three Base64URL parts joined by dots: `header.payload.signature`. The header says the algorithm, like HS256. The payload holds claims: `sub` (who), `exp` (expiry), `iat` (issued at), and things like roles. The signature is computed over the first two parts with a secret or private key.\n\nIt's **signed, not encrypted**. Anyone can paste it into a decoder and read the payload, like a sealed envelope made of clear plastic: you can see the letter, you just can't change it without breaking the seal. So never put a password, card number or personal secret in it.",
            },
            {
              question: "⭐ How does a server verify a JWT?",
              answer:
                "It splits the token into its three parts, recomputes the signature over `header.payload` with its key (HMAC-SHA256 for HS256) or verifies it with the public key (RS256), and compares that with the token's signature in **constant time**, so the comparison time doesn't leak hints.\n\nOnly if the signature matches does it check the claims: `exp` and `nbf` against the clock, and issuer and audience if they're used. Only then does it trust `sub` and the roles. No database call is needed, which is why JWT checks cost microseconds.\n\nTwo classic attacks to block: accepting `alg: none`, and letting the token's header choose the algorithm. The server should pin the algorithm it expects.",
            },
            {
              question: "⭐ Access token vs refresh token? Why rotate?",
              answer:
                "The **access token** is short-lived and sent with every request. If it leaks, the damage window is small. The **refresh token** is long-lived and only used to get a new access token, so the user doesn't have to log in every 15 minutes. In RideX the access token lasts 15 minutes and the refresh token 7 days, and refresh tokens are stored hashed.\n\n**Rotation** means every refresh spends the old refresh token and issues a new one, like a single-use ticket. If a spent ticket is ever shown again, someone copied it, so the whole session is revoked. That's reuse detection.\n\nOne practical detail: a mobile app can fire two refreshes in parallel by accident. RideX allows a 5-second grace window for that, so a genuine race isn't treated as theft.",
            },
            {
              question: "How do you log out or revoke a JWT?",
              answer:
                "You can't delete a JWT; it's valid until it expires, wherever it is. So the practical options are: keep access tokens short and revoke the **refresh token** on the server, which is what RideX does, so the session dies within one access-token lifetime. Or keep a denylist of token IDs (the `jti` claim) in Redis until their expiry. Or store a token version on the user, bump it on logout or password change, and compare it on every request, which costs a lookup per call.",
            },
            {
              question: "HS256 vs RS256?",
              answer:
                "HS256 uses one shared secret to both sign and verify. That's fine inside one app, but every service that can verify tokens could also forge them.\n\nRS256 signs with a private key and verifies with a public key. Only the auth service holds the private key; every other service gets the public key, often from a JWKS endpoint. That's the better fit when many services check tokens but only one should issue them.",
            },
            {
              question: "OAuth2 vs OpenID Connect?",
              answer:
                "**OAuth2** is about **authorization**: letting an app act on your behalf without giving it your password. Like a valet key that starts the car but doesn't open the boot. The app gets an access token with limited scopes.\n\n**OpenID Connect** sits on top of OAuth2 and adds **authentication**: an ID token that says who the user is. \"Login with Google\" is OIDC. OAuth2 alone never told the app who you are, only what it's allowed to do.",
            },
            {
              question: "Which OAuth2 flows should you know?",
              answer:
                "**Authorization code with PKCE** for anything with a user: the user logs in at the auth server, the app gets a short-lived code and swaps it for tokens. PKCE adds a one-time secret the app creates, so a stolen code is useless to anyone else. That's the right flow for mobile apps and single-page apps.\n\n**Client credentials** for service-to-service calls with no user: the service proves its own identity and gets a token.\n\nThe old **implicit** and **password** flows are deprecated; I mention them only to say why they're avoided.",
            },
            {
              question: "API keys vs OAuth tokens for service calls?",
              answer:
                "An API key is a static password for a program: simple, but if it leaks it works until someone rotates it, and it usually has broad access. OAuth client credentials give short-lived, scoped tokens, so a leak expires on its own. For serious internal traffic I'd use OAuth or mutual TLS; for a quick partner integration, API keys with rotation and per-key rate limits are often fine.",
            },
          ],
        },
      ],
    },
    {
      title: "Spring Security",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How does Spring Security work?",
              answer:
                "It's a chain of servlet **filters** that every request passes through before reaching my controller, like security checkpoints at an airport: ID check, bag scan, boarding pass, each doing one job.\n\nThe servlet container calls `DelegatingFilterProxy`, which hands over to Spring's `FilterChainProxy`, which runs the filters of the matching `SecurityFilterChain` bean: CORS, CSRF, authentication, exception translation and finally authorization. Since Spring Boot 3, I configure it by declaring a `SecurityFilterChain` bean; the old `WebSecurityConfigurerAdapter` is gone.",
            },
            {
              question: "What happens during a username and password login?",
              answer:
                "The credentials go to the `AuthenticationManager`, which delegates to an `AuthenticationProvider`. The provider loads the user through `UserDetailsService` and checks the password with the `PasswordEncoder`, for example BCrypt. On success, an `Authentication` object with the user's authorities is stored in the `SecurityContextHolder`.\n\nThe `SecurityContextHolder` uses a ThreadLocal by default, so everything on that request thread can see who the user is, and it's cleared at the end of the request. A new thread doesn't inherit it unless I use a delegating executor.",
            },
            {
              question: "⭐ How do you add JWT authentication in Spring Security?",
              answer:
                "Three steps. Make the chain stateless with `sessionCreationPolicy(STATELESS)`. Add a custom `OncePerRequestFilter` before `UsernamePasswordAuthenticationFilter`: it reads `Authorization: Bearer ...`, verifies the signature and expiry, builds an `Authentication` with the user's authorities, and puts it in the `SecurityContext`. Then set the `authorizeHttpRequests` rules, ending with `anyRequest().authenticated()`, so anything I forgot is denied by default.\n\nRideX's JWT filter works exactly like this, with the rate-limit filter in front of it.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "A stateless, default-deny security chain",
          code: `@Bean
SecurityFilterChain api(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())                    // token in a header, not a cookie
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/v1/auth/**").permitAll()
            .anyRequest().authenticated())               // default deny
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "@PreAuthorize vs @Secured?",
              answer:
                "Both are method-level checks, turned on with `@EnableMethodSecurity`. `@Secured(\"ROLE_ADMIN\")` only checks role names. `@PreAuthorize` takes a SpEL expression, so it can do much more: `hasAuthority('RIDE_CANCEL')`, or calling a bean for an ownership check like `@rideSecurity.isOwner(#rideId)`.\n\nI prefer `@PreAuthorize` with fine-grained permissions rather than roles, because roles change shape over time while \"can cancel a ride\" stays a clear rule.",
            },
            {
              question: "Role vs authority in Spring?",
              answer:
                "Both are `GrantedAuthority` objects. A role is just an authority with a `ROLE_` prefix, so `hasRole(\"ADMIN\")` checks for `ROLE_ADMIN`. I use roles as a friendly grouping for people (Support Agent, Admin) and permissions for the actual decisions in code.",
            },
            {
              question: "How do you return proper 401 and 403 bodies from Spring Security?",
              answer:
                "An `AuthenticationEntryPoint` handles unauthenticated requests (401), and an `AccessDeniedHandler` handles authenticated but forbidden ones (403). Both run inside the filter chain, before `@ControllerAdvice` could ever see the error, so I customise them to write the same Problem Details JSON as the rest of the API.",
            },
            {
              question: "How do you secure Spring Boot Actuator?",
              answer:
                "Expose only `health`, and maybe `info`, publicly. Everything else goes behind authentication or on a separate management port that isn't reachable from the internet. The `env` and `heapdump` endpoints can leak secrets, so an open Actuator is a classic misconfiguration finding.",
            },
          ],
        },
      ],
    },
    {
      title: "CORS, CSRF and the OWASP Top 10",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is CORS? Does it protect my server?",
              answer:
                "CORS is a **browser** rule. A web page from `shop.com` can't read responses from `api.other.com` unless that API says, through `Access-Control-Allow-Origin` headers, that `shop.com` is allowed. For some requests the browser first sends an `OPTIONS` preflight to ask.\n\nIt protects **users in browsers**, not my server. curl, Postman or a script ignore CORS completely. So CORS is never a replacement for authentication. I configure an explicit list of allowed origins, and never `*` together with credentials.",
            },
            {
              question: "What is CSRF, and when do you need protection?",
              answer:
                "Cross-Site Request Forgery tricks a logged-in user's browser into sending a request they didn't intend. You're logged into your bank in one tab; a malicious page in another tab submits a hidden form to the bank. Because the browser **automatically attaches cookies**, the bank sees a valid session.\n\nSo CSRF matters when authentication rides on cookies. The fixes are CSRF tokens, which the malicious page can't read, and `SameSite` cookies.\n\nA JWT sent in an `Authorization` header is not attached automatically, so stateless token APIs usually disable CSRF protection. If I move the token into a cookie, CSRF protection has to come back.",
            },
            {
              question: "What are the main OWASP Top 10 risks, and how do you fix them?",
              answer:
                "**Broken access control**, number one: the API doesn't check that the caller owns the thing they asked for. Fix: an ownership check on every client-supplied ID. **Injection**: user input reaches SQL as code. Fix: parameterised queries, never string concatenation. **Cryptographic failures**: plain HTTP, weak hashing, secrets in logs. Fix: TLS everywhere, BCrypt, encryption at rest.\n\n**Security misconfiguration**: default passwords, open Actuator, stack traces in responses. **Vulnerable components**: old libraries with known holes; fix with dependency scanning. **Authentication failures**: no login rate limit, tokens that never expire. **SSRF**: the server fetches a URL the user supplied, which can be pointed at internal services; fix with an allow-list.\n\nI don't recite all ten in order. I pick the ones that matter for APIs and give the fix for each.",
            },
            {
              question: "A user can see another user's booking by changing the ID in the URL. What's wrong?",
              answer:
                "That's **IDOR**, Insecure Direct Object Reference, a form of broken access control. Like a hotel where room keys open any door if you just change the number on the card.\n\nThe quick fix is an ownership check on that endpoint. The real fix is systematic: every query that takes an ID from the client is scoped to the caller, like `findByIdAndRiderId(id, currentUserId)`, which returns 404 for someone else's booking. Then I add tests that call with another user's ID and expect 404 or 403, and check the logs for whether it was exploited.",
            },
            {
              question: "How do you prevent SQL injection?",
              answer:
                "Parameterised queries, always. With JPA, Spring Data or `JdbcTemplate` that's the default, as long as I bind values (`where email = :email`) instead of building strings. Injection sneaks back in through the places parameters can't go, like column names in `ORDER BY`, which is why sorting needs an allow-list.",
            },
            {
              question: "What is mass assignment?",
              answer:
                "Binding request JSON straight onto an entity, so a client can set fields they should never touch, like `role: \"ADMIN\"` or `walletBalance: 99999`. The fix is request DTOs that contain only the fields the client may set, then copying those onto the entity in the service.",
            },
            {
              question: "How do you prevent XSS from an API's side?",
              answer:
                "XSS happens in the browser, but APIs feed it. I validate and limit input, return JSON with the right `Content-Type` so it's never rendered as HTML, and let the frontend escape output. A Content-Security-Policy on the web app is the safety net. Keeping tokens out of JavaScript-readable storage limits the damage if XSS happens anyway.",
            },
            {
              question: "How would you secure a public API end to end?",
              answer:
                "Layer by layer, like a building: a gate, a front desk, locked doors and cameras. HTTPS only. Authentication with OAuth2 or JWT, or API keys for partners. Authorization with ownership checks on every resource. Input validation and request size limits. Rate limiting per IP and per user. A gateway or WAF at the edge for floods. No sensitive data in logs or errors. And logging plus alerts on unusual patterns, like a burst of 401s or 403s, so abuse is noticed early.",
            },
          ],
        },
      ],
    },
    {
      title: "Webhooks",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How do you verify that a webhook really came from the provider?",
              answer:
                "Anyone on the internet can POST to my webhook URL and claim \"payment succeeded\". So the provider signs each request: it computes an **HMAC**, usually SHA-256, over the raw body with a secret only we both know, and sends the result in a header.\n\nI recompute the HMAC over the **raw bytes** I received, before any JSON parsing (re-serialising changes spacing and breaks the signature), and compare it with the header in **constant time** using `MessageDigest.isEqual`. If it doesn't match, I reject it with 401 or 400. It's like a wax seal: only the sender has the stamp, and any change to the letter shows.\n\nRideX verifies the payment provider's webhooks with HMAC exactly this way.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "WebhookCheck.java",
          code: `import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

public class WebhookCheck {

    static String sign(String rawBody, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    static boolean isValid(String rawBody, String signatureHeader, String secret) throws Exception {
        byte[] expected = sign(rawBody, secret).getBytes(StandardCharsets.UTF_8);
        byte[] received = signatureHeader.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, received); // constant-time compare
    }

    public static void main(String[] args) throws Exception {
        String secret = "whsec_test";
        String body = "{\\"event\\":\\"payment.captured\\",\\"id\\":\\"evt_101\\"}";
        String header = sign(body, secret); // what the provider would send

        System.out.println("Genuine body:  " + isValid(body, header, secret));
        String tampered = body.replace("captured", "failed");
        System.out.println("Tampered body: " + isValid(tampered, header, secret));
    }
}`,
        },
        {
          type: "output",
          text: "Genuine body:  true\nTampered body: false",
        },
        {
          type: "qa",
          items: [
            {
              question: "Why constant-time comparison and not String.equals?",
              answer:
                "`equals` stops at the first byte that differs. An attacker who can measure response times very precisely can learn how many leading bytes were right, and guess the signature byte by byte. `MessageDigest.isEqual` takes the same time whatever the input, so timing leaks nothing. It's a one-word change, so there's no reason not to.",
            },
            {
              question: "The provider sends the same webhook twice. How do you avoid processing it twice?",
              answer:
                "Webhooks are delivered **at least once**, so duplicates are normal, not a bug. I record each event ID in a table with a **unique index** before acting on it. The insert itself is the lock: if it fails on the unique index, I've already seen this event, so I return 200 and do nothing.\n\nA check-then-insert in code alone is racy, because two deliveries can arrive together. RideX records webhook event IDs under a unique index for exactly this reason.",
            },
            {
              question: "How do you stop replay attacks on webhooks?",
              answer:
                "Many providers include a timestamp in the signed data. I reject anything older than a few minutes, so a captured request can't be replayed next week. Combined with the unique event ID, an old request is either too old or already seen.",
            },
            {
              question: "Should you trust what the webhook says?",
              answer:
                "Trust that it came from the provider, yes, once the signature checks out. But webhooks can arrive late or out of order, like a \"payment failed\" arriving after \"payment succeeded\" for a retry. So I apply state changes only if they move forward in my state machine, and for money it's reasonable to re-fetch the current status from the provider's API before acting.\n\nI also respond quickly with 2xx and do heavy work in the background, because providers retry when my endpoint is slow, which creates even more duplicates.",
            },
            {
              question: "Webhooks stopped arriving. How do you investigate?",
              answer:
                "Two sides. Is the provider sending? Their dashboard usually shows delivery attempts and what my server answered. Am I rejecting them? Common causes are a rotated secret so every signature fails, a changed URL, a firewall, or my endpoint returning 500.\n\nThe design lesson: payments shouldn't depend on webhooks alone. There should be a fallback, like a scheduled or on-demand \"check status with the provider\" path, and a metric on failed webhooks, so a spike points straight at the cause.",
            },
          ],
        },
      ],
    },
    {
      title: "Quick Revision",
      blocks: [
        {
          type: "diagram",
          caption: "REST and API security cheat sheet",
          text: `METHODS     safe: GET HEAD OPTIONS      idempotent: GET PUT DELETE (+ safe ones)
            POST = create/action, not idempotent -> use Idempotency-Key + UNIQUE constraint

STATUS      200 OK  201 Created+Location  202 Accepted  204 No Content  304 Not Modified
            400 malformed  401 who are you?  403 not allowed  404  409 state clash
            412 If-Match failed  422 rule broken  429 slow down (Retry-After)
            500 bug  502 bad upstream  503 overloaded  504 upstream timeout

ERRORS      RFC 7807 Problem Details: type, title, status, detail, instance (+ errors, traceId)

VERSIONING  /api/v1 path (my default) | query | header | media type
            only ADD to responses; expand -> backfill -> switch reads -> contract
            retire: Deprecation + Sunset headers, measure traffic, force-update apps

PAGINATION  offset: simple, can jump, slow + shifting when deep
            keyset: WHERE (created_at, id) < (?, ?) ORDER BY ... LIMIT n, fast + stable

CACHING     Cache-Control max-age | ETag + If-None-Match -> 304 | If-Match -> 412

RATE LIMIT  fixed window (INCR+EXPIRE, edge burst 2x) | sliding log | sliding counter
            token bucket (bursts ok, gateways) | leaky bucket (smooth)
            Redis = shared counter; fail open vs closed is a business call

AUTH        authN = who you are (401)   authZ = what you can do (403)
            encode (Base64) != encrypt (AES, reversible) != hash (BCrypt, one-way, salted)

JWT         header.payload.signature, signed NOT encrypted; pin alg, check exp/iss/aud
            access 15 min + refresh 7 days, rotate refresh, reuse = revoke session
            HS256 shared secret | RS256 private signs, public verifies

OAUTH2      auth code + PKCE (users) | client credentials (services) | OIDC adds ID token

SPRING SEC  DelegatingFilterProxy -> FilterChainProxy -> SecurityFilterChain filters
            STATELESS + OncePerRequestFilter (JWT) + anyRequest().authenticated()

BROWSER     CORS = browser read rule, not server protection
            CSRF = cookie auth problem; header tokens don't need it

OWASP       access control (IDOR) | injection | crypto | misconfig | old libs | SSRF

WEBHOOKS    HMAC-SHA256 over RAW body, MessageDigest.isEqual, timestamp window,
            unique event ID ("the insert is the lock"), reply 2xx fast`,
        },
      ],
    },
  ],
};
