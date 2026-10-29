import type { Lesson } from "../types";

export const reliableOutboundCalls: Lesson = {
  slug: "reliable-outbound-calls",
  date: "2026-10-29",
  title: "Reliable Outbound Calls",
  description:
    "The checklist I go through for every HTTP client that calls another service: timeouts, retries with backoff and jitter, idempotency keys, circuit breakers, bulkheads, fallbacks and token caching, with plain Java and Resilience4j examples.",
  tags: ["System Design", "Resilience", "HTTP Clients", "Resilience4j", "Spring"],
  sections: [
    {
      title: "What Reliable Outbound Calls Are",
      blocks: [
        {
          type: "paragraph",
          text: "Think about calling a restaurant to book a table. Sometimes nobody picks up. Sometimes they put you on hold forever. Sometimes the line is busy, and calling again ten times a second won't help. A sensible person hangs up after a while, tries again a bit later, gives up after a few tries, and maybe books somewhere else. Nobody stays on hold for an hour while their whole family waits in the car.",
        },
        {
          type: "paragraph",
          text: "Every backend makes calls like that: to a payment gateway, an SMS provider, a maps API, another team's service. An **outbound call** is any request my service makes to something it doesn't control. Making it **reliable** doesn't mean the other side never fails. It means that when it fails, slows down or disappears, my service stays healthy, my users get a sensible answer, and nothing happens twice that shouldn't.",
        },
        {
          type: "paragraph",
          text: "This lesson is the checklist I now go through for every new HTTP client, one item at a time, with code for each.",
        },
      ],
    },
    {
      title: "Why It Matters",
      blocks: [
        {
          type: "paragraph",
          text: "The scary part of outbound calls isn't that they fail. It's that a slow dependency can take down a perfectly healthy service. If the SMS provider starts taking 60 seconds per request, and my request threads wait for it, then within a minute every thread is stuck waiting on SMS. Now login, search and payments are down too, though none of them needed SMS. That's a **cascading failure**.",
        },
        {
          type: "list",
          items: [
            "**No timeout** means a thread can wait forever. Java's `HttpURLConnection` and the JDK `HttpClient` both default to no read timeout.",
            "**Naive retries** turn a struggling dependency into a dead one: every client retrying immediately triples the load right when the server is weakest.",
            "**Retrying a non-idempotent call** (\"charge the card\") after a timeout can charge twice.",
            "**A token cached for too long** turns into a wave of 401s the moment it expires, often at night.",
            "**No metrics per dependency** means that when things are slow, nobody can tell which partner is slow.",
          ],
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "A household electrical system maps surprisingly well onto the toolbox.",
        },
        {
          type: "list",
          items: [
            "**Timeout:** an auto-off timer on the geyser. It doesn't run forever just because nobody switched it off.",
            "**Retry with backoff:** a lift that's full. You wait a bit and press again, and if it's still full, you wait longer, rather than pressing the button nonstop.",
            "**Jitter:** if everyone in the building waits exactly 30 seconds, they all rush the lift at once again. Waiting a random 0 to 30 seconds spreads people out.",
            "**Circuit breaker:** the MCB in your fuse box. When something keeps shorting, it trips and cuts power, so the fault can't burn the house down. After a while you flip it back on to test.",
            "**Bulkhead:** separate MCBs for the kitchen and the bedroom. A fault in the kitchen doesn't plunge the whole house into darkness.",
            "**Fallback:** the inverter. When mains power is gone, a few essential lights still work.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The checklist",
        },
        {
          type: "table",
          headers: ["#", "Item", "Question to ask"],
          rows: [
            ["1", "Timeouts", "Are connect and read timeouts set, and shorter than my own caller's timeout?"],
            ["2", "Retries", "Do I retry only transient errors, with exponential backoff, jitter and a small cap?"],
            ["3", "Retry-After", "Do I respect the server's `Retry-After` on 429 and 503?"],
            ["4", "Idempotency", "Is every retried write protected by an idempotency key?"],
            ["5", "Circuit breaker", "Do I stop calling a dependency that's clearly down?"],
            ["6", "Bulkhead", "Can this dependency use up all my threads or connections?"],
            ["7", "Fallback", "What does the user see when it fails: cached data, a default, a clear error?"],
            ["8", "Budgets", "Do I stay inside the provider's rate limits and my own cost budget?"],
            ["9", "No DB transaction", "Is this call outside any open database transaction?"],
            ["10", "Tokens", "Are auth tokens cached until just before their real expiry, and refreshed safely?"],
            ["11", "Observability", "Do I log and measure latency, errors and retries per dependency?"],
          ],
        },
        {
          type: "heading",
          text: "Two kinds of timeout",
        },
        {
          type: "list",
          items: [
            "**Connect timeout:** how long to wait to open the TCP (and TLS) connection. If a server is down or unreachable, this fails fast. A few seconds is plenty.",
            "**Read (response) timeout:** how long to wait for the response once connected. This must cover the slowest normal response, plus a margin. It's the one that protects my threads from a slow server.",
          ],
        },
        {
          type: "paragraph",
          text: "Timeouts should nest. If my API promises clients an answer in 10 seconds, the outbound call can't have a 30-second read timeout, and with retries the total (attempts times timeout plus backoff) has to fit too. In RideX I set them per client: the Razorpay client uses 5 seconds to connect and 10 seconds to read, the maps client 5 and 5, and SMTP 5 seconds.",
        },
        {
          type: "heading",
          text: "What to retry",
        },
        {
          type: "table",
          headers: ["Error", "Retry?", "Why"],
          rows: [
            ["Connect timeout, connection refused", "Yes", "The request never reached the server"],
            ["Read timeout", "Only if idempotent", "The server may have done the work"],
            ["`429 Too Many Requests`", "Yes, after `Retry-After`", "The server asked me to slow down"],
            ["`502`, `503`, `504`", "Yes", "Usually temporary: gateway or overloaded server"],
            ["`500`", "Carefully", "Sometimes temporary, often a real bug"],
            ["`400`, `401`, `403`, `404`, `422`", "No", "Retrying the same bad request gives the same answer"],
          ],
        },
        {
          type: "heading",
          text: "Exponential backoff with jitter",
        },
        {
          type: "diagram",
          text: `attempt   ceiling = min(cap, base * 2^(attempt-1))   full jitter: sleep = random(0..ceiling)
   1        200 ms                                    e.g.  49 ms
   2        400 ms                                    e.g.  87 ms
   3        800 ms                                    e.g. 725 ms
   4      1 600 ms                                    ...
   5      2 000 ms  (capped)

without jitter:   ||||      ||||           ||||               all clients in sync
with jitter:      | |  ||  |   | |   |  |    |   |  |         load spread out`,
          caption: "The ceiling doubles; the actual sleep is a random point below it.",
        },
        {
          type: "paragraph",
          text: "Exponential backoff gives the server room to recover. Jitter stops thousands of clients that failed at the same moment from all retrying at the same moment again (the \"thundering herd\"). \"Full jitter\", a random value between zero and the ceiling, is the variant I use by default.",
        },
        {
          type: "heading",
          text: "Circuit breaker states",
        },
        {
          type: "diagram",
          text: `          failure rate >= threshold
  ┌────────┐  (after min calls)   ┌────────┐
  │ CLOSED │ ───────────────────► │  OPEN  │  calls fail fast:
  │ calls  │                      │        │  CallNotPermittedException
  │ go     │ ◄──────┐             └────────┘
  └────────┘        │                  │ wait duration passes
                    │                  ▼
            trial calls OK      ┌────────────┐
                    └────────── │ HALF_OPEN  │  a few trial calls
                                │            │ ── trials fail ──► OPEN
                                └────────────┘`,
          caption: "Closed is normal. Open protects both sides. Half-open tests whether the dependency is back.",
        },
        {
          type: "heading",
          text: "Bulkheads and fallbacks",
        },
        {
          type: "paragraph",
          text: "A **bulkhead** caps how many calls to one dependency can be in flight at once, say 20 for the SMS provider. The 21st caller is rejected immediately (or waits briefly) instead of taking another thread. So even if SMS is completely stuck, at most 20 threads are stuck with it.",
        },
        {
          type: "paragraph",
          text: "A **fallback** is what I return when the call fails or is refused: the last cached exchange rate, a fare estimate without live traffic, \"we'll text you shortly\" while the SMS goes into a retry queue. Not every call has a good fallback. For a payment, the honest fallback is a clear error, not a fake success.",
        },
        {
          type: "heading",
          text: "Never inside a database transaction",
        },
        {
          type: "paragraph",
          text: "If an HTTP call sits inside `@Transactional`, every slow response also holds a database connection and any row locks. A slow partner then exhausts the database pool, and the cascade spreads to every feature that uses the database. Commit first, call after; or write a \"to do\" row in the transaction and let a worker make the call. The Transactions and Locking lesson covers the after-commit tools.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "How Resilience4j's circuit breaker counts failures",
        },
        {
          type: "paragraph",
          text: "Resilience4j records the outcome of each call into a **sliding window**. There are two kinds:",
        },
        {
          type: "list",
          items: [
            "**Count-based:** a circular array of the last N outcomes (`slidingWindowSize`). Each new call overwrites the oldest slot, and running totals of calls, failures and slow calls are updated by subtracting the old slot and adding the new one. So computing the failure rate doesn't loop over the window; it's a couple of additions.",
            "**Time-based:** an array of N buckets, one per second for the last N seconds. Each bucket keeps its own totals, and old buckets are reset as time moves on. Good when traffic is very uneven.",
          ],
        },
        {
          type: "paragraph",
          text: "After each call, if at least `minimumNumberOfCalls` have been recorded and the failure rate (or the slow-call rate) is at or above its threshold, the breaker moves to `OPEN`. Without the minimum, two failures out of the first three calls after a deploy would trip it. The defaults are a count-based window of 100, a minimum of 100 calls, a 50% failure-rate threshold and 60 seconds in `OPEN`, so for low-traffic dependencies I always lower them.",
        },
        {
          type: "paragraph",
          text: "What counts as a failure is configurable: by default any exception counts, and I usually narrow it with `recordExceptions` (timeouts, 5xx) and `ignoreExceptions` (a 404 is a valid answer, not a sign the server is sick). In `OPEN`, every call is rejected with `CallNotPermittedException` without touching the network. After `waitDurationInOpenState`, the breaker allows `permittedNumberOfCallsInHalfOpenState` trial calls and decides from those whether to close or open again.",
        },
        {
          type: "paragraph",
          text: "To see the counting with my own eyes, I wrote a tiny count-based breaker with a window of 5, a minimum of 5 calls and a 50% threshold:",
        },
        {
          type: "code",
          language: "java",
          title: "MiniBreaker.java",
          code: `import java.util.ArrayDeque;
import java.util.Deque;

public class MiniBreaker {
    enum State { CLOSED, OPEN, HALF_OPEN }

    static final int WINDOW = 5, MIN_CALLS = 5;
    static final double FAILURE_RATE_THRESHOLD = 50.0;
    static final Deque<Boolean> window = new ArrayDeque<>();   // last N outcomes, true = failed
    static State state = State.CLOSED;

    static void record(boolean failed) {
        window.addLast(failed);
        if (window.size() > WINDOW) window.removeFirst();       // slide: drop the oldest
        long failures = window.stream().filter(f -> f).count();
        double rate = 100.0 * failures / window.size();
        if (window.size() >= MIN_CALLS && rate >= FAILURE_RATE_THRESHOLD) state = State.OPEN;
        System.out.printf("%-4s window=%s rate=%.0f%% -> %s%n",
                failed ? "FAIL" : "ok", window, rate, state);
    }

    public static void main(String[] args) {
        boolean[] outcomes = {false, true, false, true, false, true};
        for (boolean failed : outcomes) {
            if (state == State.OPEN) { System.out.println("call rejected without trying"); continue; }
            record(failed);
        }
        System.out.println("next call: " + (state == State.OPEN ? "CallNotPermittedException" : "allowed"));
    }
}`,
        },
        {
          type: "output",
          text: `ok   window=[false] rate=0% -> CLOSED
FAIL window=[false, true] rate=50% -> CLOSED
ok   window=[false, true, false] rate=33% -> CLOSED
FAIL window=[false, true, false, true] rate=50% -> CLOSED
ok   window=[false, true, false, true, false] rate=40% -> CLOSED
FAIL window=[true, false, true, false, true] rate=60% -> OPEN
next call: CallNotPermittedException`,
        },
        {
          type: "list",
          items: [
            "On the second call the rate was already 50%, but only 2 calls had been recorded, below the minimum of 5, so the breaker stayed closed. That's `minimumNumberOfCalls` doing its job.",
            "On the sixth call the window slid: the first `ok` fell out and a `FAIL` came in, so 3 of the last 5 failed, 60%, and the breaker opened.",
            "The real implementation keeps running totals instead of re-counting with a stream, but the decision is the same. (`HALF_OPEN` is declared but my toy never reaches it; the real one moves there after the wait duration.)",
          ],
        },
        {
          type: "heading",
          text: "How the decorators wrap each other",
        },
        {
          type: "paragraph",
          text: "With the Spring Boot annotations, Resilience4j applies its aspects in a fixed default order, outermost first:",
        },
        {
          type: "diagram",
          text: `Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( your call ) ) ) ) )

  Retry           sees every failure below it, tries the whole stack again
  CircuitBreaker  counts each attempt; when OPEN, rejects before anything else runs
  RateLimiter     waits for a permit, or rejects
  TimeLimiter     cancels a future that takes too long (async calls only)
  Bulkhead        caps concurrent calls`,
          caption: "Each retry attempt passes through the breaker, so a dependency that's down trips it quickly.",
        },
        {
          type: "paragraph",
          text: "Two consequences I had to learn. Because retry is outside the breaker, when the breaker is open the retry would happily retry the `CallNotPermittedException`, so I add it to the retry's `ignoreExceptions`. And `TimeLimiter` only works on asynchronous calls (`CompletableFuture`); for a normal blocking call, the HTTP client's own read timeout is the real timeout. The order can be changed with the `*-aspect-order` properties, but I've never needed to.",
        },
        {
          type: "heading",
          text: "What the JDK HttpClient does with its timeouts",
        },
        {
          type: "paragraph",
          text: "`HttpClient.Builder.connectTimeout` limits connection setup. `HttpRequest.Builder.timeout` is a per-request deadline for receiving the response headers; when it fires, `send` throws `HttpTimeoutException`. If no request timeout is set, it waits indefinitely. I tested it against a local socket that accepts connections and never answers:",
        },
        {
          type: "code",
          language: "java",
          title: "SilentServer.java",
          code: `import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class SilentServer {
    public static void main(String[] args) throws Exception {
        try (ServerSocket server = new ServerSocket(0)) {   // accepts, never answers
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(2))
                    .build();
            HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + server.getLocalPort() + "/fare"))
                    .timeout(Duration.ofSeconds(1))         // whole-response deadline
                    .build();
            long start = System.nanoTime();
            try {
                client.send(request, HttpResponse.BodyHandlers.ofString());
            } catch (java.net.http.HttpTimeoutException e) {
                long ms = (System.nanoTime() - start) / 1_000_000;
                System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage()
                        + " (gave up after ~" + (ms / 100 * 100) + " ms)");
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `HttpTimeoutException: request timed out (gave up after ~1000 ms)`,
        },
        {
          type: "paragraph",
          text: "The connection succeeded (the OS accepted it into the socket's backlog), so the connect timeout didn't matter; the request timeout did. Remove `.timeout(...)` and the program just hangs. That hang is exactly what a request thread does in production without a read timeout.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A small retry helper you can actually run",
        },
        {
          type: "paragraph",
          text: "Before reaching for a library, I like to see the whole idea in one screen. This helper retries only a `TransientException`, doubles the ceiling each time, picks a random sleep below it, and gives up after `maxAttempts`. The `Random` has a fixed seed so the output is the same on every run:",
        },
        {
          type: "code",
          language: "java",
          title: "RetryWithBackoff.java",
          code: `import java.util.Random;
import java.util.function.Supplier;

public class RetryWithBackoff {
    static class TransientException extends RuntimeException {
        TransientException(String msg) { super(msg); }
    }

    static final Random random = new Random(42);          // fixed seed so the run repeats

    static <T> T retry(Supplier<T> call, int maxAttempts, long baseMs, long capMs) throws InterruptedException {
        for (int attempt = 1; ; attempt++) {
            try {
                return call.get();
            } catch (TransientException e) {
                if (attempt == maxAttempts) throw e;
                long ceiling = Math.min(capMs, baseMs * (1L << (attempt - 1)));  // 200, 400, 800...
                long sleep = random.nextLong(ceiling + 1);                     // full jitter
                System.out.printf("attempt %d failed (%s), waiting %d ms of max %d%n",
                        attempt, e.getMessage(), sleep, ceiling);
                Thread.sleep(sleep);
            }
        }
    }

    public static void main(String[] args) throws InterruptedException {
        int[] calls = {0};
        String fare = retry(() -> {
            if (++calls[0] < 4) throw new TransientException("503 from fare service");
            return "fare = 240.00";
        }, 5, 200, 2_000);
        System.out.println(fare + " after " + calls[0] + " calls");

        try {
            retry(() -> { throw new IllegalArgumentException("400 bad pickup"); }, 5, 200, 2_000);
        } catch (IllegalArgumentException e) {
            System.out.println("not retried: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `attempt 1 failed (503 from fare service), waiting 49 ms of max 200
attempt 2 failed (503 from fare service), waiting 87 ms of max 400
attempt 3 failed (503 from fare service), waiting 725 ms of max 800
fare = 240.00 after 4 calls
not retried: 400 bad pickup`,
        },
        {
          type: "list",
          items: [
            "`1L << (attempt - 1)` is 1, 2, 4, 8, so the ceiling goes 200, 400, 800 ms, and `Math.min` caps it at 2 seconds.",
            "`random.nextLong(ceiling + 1)` is the full jitter: anything from 0 to the ceiling. Notice the second wait (87 ms) was shorter than the third (725 ms) but also shorter than the first's ceiling. That randomness is the point.",
            "The `400 bad pickup` is an `IllegalArgumentException`, not a `TransientException`, so it went straight through with zero retries. Retrying a bad request just repeats the mistake.",
            "`Thread.sleep` is fine for a demo and for a background worker. On a request thread I'd keep the total small, or move the retry into a queue.",
          ],
        },
        {
          type: "heading",
          text: "Respecting Retry-After",
        },
        {
          type: "code",
          language: "java",
          code: `static Duration retryAfter(HttpResponse<?> response, Duration fallback) {
    return response.headers().firstValue("Retry-After")
            .map(value -> value.chars().allMatch(Character::isDigit)
                    ? Duration.ofSeconds(Long.parseLong(value))                 // "120"
                    : Duration.between(Instant.now(),                           // an HTTP date
                        ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME)))
            .filter(d -> !d.isNegative())
            .orElse(fallback);
}`,
        },
        {
          type: "paragraph",
          text: "`Retry-After` can be a number of seconds or an HTTP date. When a provider says \"come back in 120 seconds\", my backoff guess is irrelevant; I wait what it asked, or I give up and queue the work if that's longer than my caller can wait.",
        },
        {
          type: "heading",
          text: "RestClient with explicit timeouts",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentClientConfig.java",
          code: `@Bean
RestClient paymentRestClient(RestClient.Builder builder) {
    HttpClient jdkClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))      // open the connection
            .build();
    JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(jdkClient);
    factory.setReadTimeout(Duration.ofSeconds(10));     // wait for the response

    return builder
            .baseUrl("https://api.payments.example")
            .requestFactory(factory)
            .build();
}`,
        },
        {
          type: "paragraph",
          text: "One `RestClient` bean per dependency, each with its own timeouts, base URL and (later) its own metrics name. Injecting the auto-configured `RestClient.Builder` keeps Spring Boot's observation support, so every call gets a timer with the URI template and status in its tags.",
        },
        {
          type: "heading",
          text: "Resilience4j: the configuration",
        },
        {
          type: "code",
          language: "yaml",
          title: "application.yml",
          code: `resilience4j:
  retry:
    instances:
      sms:
        max-attempts: 3                 # includes the first call
        wait-duration: 200ms
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2
        enable-randomized-wait: true    # jitter
        randomized-wait-factor: 0.5
        retry-exceptions:
          - java.io.IOException
          - org.springframework.web.client.HttpServerErrorException
        ignore-exceptions:
          - io.github.resilience4j.circuitbreaker.CallNotPermittedException
  circuitbreaker:
    instances:
      sms:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 20
        minimum-number-of-calls: 10
        failure-rate-threshold: 50
        slow-call-duration-threshold: 3s
        slow-call-rate-threshold: 80
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
  bulkhead:
    instances:
      sms:
        max-concurrent-calls: 20
        max-wait-duration: 0            # reject immediately when full`,
        },
        {
          type: "heading",
          text: "Resilience4j: the annotations",
        },
        {
          type: "code",
          language: "java",
          title: "SmsClient.java",
          code: `@Component
class SmsClient {
    private final RestClient smsRestClient;

    SmsClient(RestClient smsRestClient) { this.smsRestClient = smsRestClient; }

    @Retry(name = "sms")
    @CircuitBreaker(name = "sms", fallbackMethod = "queueForLater")
    @Bulkhead(name = "sms")
    public SmsResult send(String phone, String text) {
        return smsRestClient.post().uri("/messages")
                .body(new SmsRequest(phone, text))
                .retrieve()
                .body(SmsResult.class);
    }

    SmsResult queueForLater(String phone, String text, Throwable cause) {
        smsOutbox.save(phone, text);                 // a worker will retry later
        return SmsResult.queued();
    }
}`,
        },
        {
          type: "list",
          items: [
            "The fallback method has the same parameters plus a `Throwable` at the end, and the same return type.",
            "Like `@Transactional`, these annotations work through a Spring proxy, so calling `send` from inside `SmsClient` itself would skip them.",
            "The fallback here doesn't pretend success; it records the work for a retry worker and tells the caller it's queued.",
          ],
        },
        {
          type: "heading",
          text: "Caching an access token correctly",
        },
        {
          type: "paragraph",
          text: "Many APIs use OAuth client-credentials: I exchange a client id and secret for an access token that lasts, say, an hour. I've seen code cache that token \"for a year\" because the first test worked. It works for exactly one hour. The token response says how long it lives, and I use that:",
        },
        {
          type: "code",
          language: "java",
          title: "TokenCache.java",
          code: `class TokenCache {
    private static final Duration SAFETY_MARGIN = Duration.ofSeconds(60);
    private String token;
    private Instant refreshAt = Instant.EPOCH;

    synchronized String get() {
        if (Instant.now().isAfter(refreshAt)) {
            TokenResponse r = authClient.fetchToken();       // POST /oauth/token
            token = r.accessToken();
            refreshAt = Instant.now().plusSeconds(r.expiresIn()).minus(SAFETY_MARGIN);
        }
        return token;
    }

    synchronized void invalidate() { refreshAt = Instant.EPOCH; }   // call on a 401
}`,
        },
        {
          type: "list",
          items: [
            "The token is refreshed a minute before it really expires, so a request never leaves with a token that dies in flight.",
            "`synchronized` makes sure that when it expires, one thread fetches a new token and the others wait for it, instead of fifty threads all calling the auth server at once.",
            "If a call still gets a `401`, I `invalidate()` and retry that call once. Tokens can be revoked early.",
            "For several app instances, each one having its own cache is usually fine. Spring Security's OAuth2 client (`OAuth2AuthorizedClientManager`) does all of this for you if it's already on the classpath.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "No timeout at all",
        },
        {
          type: "paragraph",
          text: "The single most common one. A client built with `new RestTemplate()` or `HttpClient.newHttpClient()` and no timeouts will wait forever on a server that accepts the connection and never answers, as `SilentServer` showed when I removed the timeout.",
        },
        {
          type: "heading",
          text: "Retrying everything, immediately, many times",
        },
        {
          type: "paragraph",
          text: "Five instant retries on every error multiply load by six during an outage. Retry only transient errors, a few times, with backoff and jitter. And retry at one layer only: if the client, the service and the gateway each retry three times, one user click can become 27 calls.",
        },
        {
          type: "heading",
          text: "Retrying a write without an idempotency key",
        },
        {
          type: "paragraph",
          text: "A read timeout on \"create payment\" doesn't mean it failed. Retry it without a key and the customer may be charged twice. Every retried write needs a stable idempotency key, built from my own ids. The Idempotency and Webhooks lesson goes deeper.",
        },
        {
          type: "heading",
          text: "Calling out inside @Transactional",
        },
        {
          type: "paragraph",
          text: "The call holds a database connection and row locks for its full duration. A slow partner turns into a database outage. In RideX, the payment gateway call used to sit in the trip-completion transaction; I moved it to a worker that runs after commit and sends an idempotency key.",
        },
        {
          type: "heading",
          text: "A fallback that lies",
        },
        {
          type: "paragraph",
          text: "Returning \"payment successful\" from a fallback because the gateway was down. Fallbacks should degrade honestly: cached data with its age, a queued status, or a clear error.",
        },
        {
          type: "heading",
          text: "Logging the secret",
        },
        {
          type: "paragraph",
          text: "Logging full request headers for debugging puts the `Authorization` token or API key into log storage. Log the dependency name, method, path, status, latency and attempt number, and mask anything sensitive.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "One client bean per dependency, with its own timeouts, base URL, resilience settings and metrics name.",
            "Always set connect and read timeouts, and make the total time (attempts, timeouts, backoff) fit inside your own caller's deadline.",
            "Retry only transient errors, at most 2 or 3 times on a request path, with exponential backoff, jitter and a cap. Honour `Retry-After`.",
            "Put an idempotency key on every write you might retry.",
            "Use a circuit breaker for dependencies that can go down, tuned to their traffic, and don't count 4xx as failures.",
            "Use a bulkhead so one slow dependency can't take every thread.",
            "Decide the fallback with the product owner: cached, default, queued, or an honest error.",
            "Stay inside rate limits with a client-side limiter, and track usage against paid quotas.",
            "Keep outbound calls out of database transactions; use after-commit hooks or an outbox and a worker.",
            "Cache tokens until shortly before their real `expires_in`, refresh under a lock, and retry once on 401.",
            "Measure latency percentiles, error rate, retry count and breaker state per dependency, and alert on them.",
            "Background work that must eventually happen goes through a queue or outbox with its own retry policy: for example exponential backoff up to 6 attempts, then a `DEAD` status for a human to look at. That's how RideX's outbox worker handles it.",
          ],
        },
      ],
    },
    {
      title: "Trade-offs",
      blocks: [
        {
          type: "table",
          headers: ["Tool", "Protects against", "Costs", "Watch out for"],
          rows: [
            ["Timeouts", "Hung threads", "Some slow-but-valid calls fail", "Too short means false failures; too long means no protection"],
            ["Retries", "Brief blips", "Extra load and latency", "Retry storms; duplicate writes without idempotency"],
            ["Backoff + jitter", "Thundering herds", "Slower recovery for one caller", "Total time exceeding the caller's deadline"],
            ["Circuit breaker", "Hammering a dead service; wasted waits", "Some good calls rejected while open", "Bad thresholds on low traffic; counting 4xx as failures"],
            ["Bulkhead", "One dependency eating all threads", "Rejections at peak", "Limit set too low for normal traffic"],
            ["Fallback", "User-facing errors", "Stale or partial data", "Fallbacks that hide real failures"],
            ["Async queue / outbox", "Slow partners on the request path", "Eventual, not immediate, result", "Needs its own retries, dead-letter handling and monitoring"],
          ],
        },
      ],
    },
    {
      title: "Reliable Calls in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A simple, realistic service: sending a login OTP by SMS. The user is staring at the screen, so the call must be quick, but an OTP that never arrives is a locked-out user.",
        },
        {
          type: "code",
          language: "java",
          title: "OtpService.java",
          code: `@Service
public class OtpService {
    private final OtpRepository otps;
    private final SmsClient sms;

    public OtpResponse sendOtp(String phone) {
        String code = OtpCodes.random6Digits();
        long otpId = otps.saveHashed(phone, code, Duration.ofMinutes(5));  // short transaction, committed
        SmsResult result = sms.send(phone, "Your login code is " + code);    // outside any transaction
        return result.isQueued()
                ? OtpResponse.delayed(otpId)        // "this may take a minute"
                : OtpResponse.sent(otpId);
    }
}`,
        },
        {
          type: "paragraph",
          text: "Walking through the checklist for this one call:",
        },
        {
          type: "list",
          items: [
            "**Timeouts:** connect 2 s, read 3 s. An OTP screen can't wait longer than that.",
            "**Retries:** at most 3 attempts with 200 ms base backoff and jitter, only on connection errors and 5xx. Total worst case stays well under the app's 15-second request timeout.",
            "**Idempotency:** the request carries `otp-{otpId}` as the provider's idempotency or client reference, so a retried send doesn't text the user twice.",
            "**Circuit breaker:** if most recent SMS calls failed, stop waiting on a dead provider; the fallback queues the message for the outbox worker and the app says \"this may take a minute\".",
            "**Bulkhead:** 20 concurrent SMS calls max. A provider outage can't take more than 20 request threads.",
            "**Budget:** a per-phone rate limit (say 3 OTPs per 10 minutes) protects the SMS bill from abuse.",
            "**No transaction:** the OTP row is committed before the call, so the code can be verified even if the SMS takes a while.",
            "**Observability:** a timer tagged `dependency=sms`, plus counters for retries and breaker state, on a dashboard next to login success rate.",
          ],
        },
        {
          type: "paragraph",
          text: "None of these pieces is clever. Together they turn \"the SMS provider had a bad 10 minutes\" from an outage into a slightly slower login.",
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What's the difference between a connect timeout and a read timeout?",
              answer:
                "The connect timeout limits how long it takes to open the connection, including the TCP handshake (and TLS, depending on the client). It catches servers that are down or unreachable.\n\nThe read timeout limits how long I wait for data once connected. It catches servers that accepted the connection but are slow or stuck, which is the case that actually ties up threads. Both need to be set; many clients default to waiting forever.",
            },
            {
              question: "Which errors should you retry and which shouldn't you?",
              answer:
                "Retry transient ones: connection failures, 429 with its `Retry-After`, 502, 503, 504, and read timeouts only if the operation is idempotent.\n\nDon't retry client errors like 400, 401, 403, 404 or 422, because the same request will fail the same way. A 500 is a judgment call; it's often a real bug rather than a blip.",
            },
            {
              question: "Why exponential backoff, and why add jitter?",
              answer:
                "Exponential backoff gives a struggling server more and more breathing room instead of hitting it at a constant rate.\n\nJitter randomises each wait so that clients which failed together don't retry together. Without it, a thousand clients that failed at the same second all come back at exactly 200 ms, 400 ms, 800 ms, as synchronised waves that can knock the server over again.",
            },
            {
              question: "Why is retrying a POST dangerous, and how do you make it safe?",
              answer:
                "A timeout doesn't tell me whether the server did the work. If it did, my retry creates a second order or a second charge.\n\nI make it safe with an idempotency key: a stable value derived from my own ids, sent on every attempt, so the server recognises the retry and returns the original result.",
            },
            {
              question: "Explain the three states of a circuit breaker.",
              answer:
                "Closed is normal: calls go through and outcomes are recorded. When the failure or slow-call rate crosses a threshold (after a minimum number of calls), it opens, and calls fail immediately without touching the network.\n\nAfter a wait, it goes half-open and lets a few trial calls through. If they succeed it closes again; if they fail it opens again. That protects both my threads and the struggling dependency.",
            },
            {
              question: "How does Resilience4j decide to open the breaker?",
              answer:
                "It records each call's outcome in a sliding window, count-based (last N calls, in a ring buffer with running totals) or time-based (last N seconds, in per-second buckets).\n\nOnce at least `minimumNumberOfCalls` are recorded, it compares the failure rate and the slow-call rate to their thresholds after each call. If either is at or above its threshold, it opens. Which exceptions count is configurable with record and ignore lists.",
            },
            {
              question: "In what order does Resilience4j apply retry and circuit breaker, and why does it matter?",
              answer:
                "By default Retry is outermost, then CircuitBreaker, RateLimiter, TimeLimiter and Bulkhead around the actual call. So every retry attempt is counted by the breaker, which means a dead dependency trips it quickly.\n\nIt also means the retry will see `CallNotPermittedException` when the breaker is open, so I add that exception to the retry's ignore list. Otherwise it just wastes attempts against a breaker that will keep saying no.",
            },
            {
              question: "What is a bulkhead?",
              answer:
                "A cap on concurrent calls to one dependency, named after the watertight compartments in a ship. If the cap is 20, the 21st call is rejected or waits briefly, instead of taking another thread.\n\nSo even if that dependency hangs completely, it can only tie up 20 threads, and the rest of the service keeps working.",
            },
            {
              question: "Does TimeLimiter replace the HTTP client's read timeout?",
              answer:
                "No. Resilience4j's `TimeLimiter` works on asynchronous calls returning a `CompletableFuture`, and even then cancelling the future doesn't necessarily stop the underlying I/O.\n\nFor a normal blocking call, the HTTP client's own read timeout is what actually frees the thread, so it must always be set.",
            },
            {
              question: "Why shouldn't outbound HTTP calls be made inside a database transaction?",
              answer:
                "While the call waits, the transaction holds a database connection and any row locks. A slow dependency then drains the connection pool and blocks other requests on those rows, spreading the failure to everything that uses the database.\n\nThere's also no atomicity: the remote side can succeed while my commit fails. The fix is to commit first and call after commit, or record the intent in an outbox row and let a worker call.",
            },
            {
              question: "How should you cache an OAuth access token?",
              answer:
                "Until shortly before its real expiry, using the `expires_in` from the token response minus a safety margin, say a minute. Refresh under a lock so only one thread fetches a new token when it expires.\n\nIf a call still gets a 401, invalidate the cache and retry once, because tokens can be revoked early. Hard-coding a long cache time works only until the first expiry.",
            },
            {
              question: "What's a good fallback?",
              answer:
                "One that degrades honestly: cached data (with its age), a sensible default, or \"queued, we'll finish this shortly\" with a worker that really does finish it.\n\nA bad fallback pretends success, like reporting a payment as done when the gateway was down. For some operations the right fallback is just a clear error message.",
            },
            {
              question: "How do retries at multiple layers cause problems?",
              answer:
                "They multiply. If the mobile app, the API gateway and my service each retry three times, one tap can become 27 calls to the dependency, right when it's struggling.\n\nI pick one layer to own retries for a given call, usually the one closest to the dependency, and make the other layers fail fast.",
            },
            {
              question: "What would you monitor for each external dependency?",
              answer:
                "Latency percentiles (p50, p95, p99), error rate split by type (timeouts, 4xx, 5xx), retry counts, circuit breaker state changes, bulkhead rejections, and rate-limit or quota usage.\n\nAll tagged by dependency name, so when the app is slow I can see in one glance whether it's payments, maps or SMS.",
            },
            {
              question: "A partner API starts responding in 30 seconds instead of 300 ms. What protects your service?",
              answer:
                "First the read timeout, which cuts each call off at a few seconds instead of 30. Then the circuit breaker's slow-call threshold, which opens after enough slow calls so I stop waiting at all. The bulkhead limits how many threads can be stuck meanwhile.\n\nThe fallback decides what users see. Without these, request threads pile up waiting and the whole service becomes unresponsive.",
            },
            {
              question: "What does Retry-After tell you, and how do you handle it?",
              answer:
                "The server is saying when it's willing to take requests again, either as a number of seconds or an HTTP date. It usually comes with 429 or 503.\n\nI wait that long instead of my own backoff. If it's longer than my caller can wait, I don't block a request thread; I fail fast or queue the work for a background worker.",
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
            "Run `SilentServer.java`, then remove the `.timeout(...)` line and see it hang. Press Ctrl+C, and remember that feeling next time you create a client.",
            "Run `RetryWithBackoff.java`. Change the seed, then remove the jitter (sleep the full ceiling) and compare the waits.",
            "Change `MiniBreaker.java` to add `HALF_OPEN`: after the breaker opens, allow two trial calls; close if both succeed, open again otherwise.",
            "In a Spring Boot app, create a `RestClient` with a 1-second read timeout and call `https://httpbin.org/delay/3` (or a local endpoint that sleeps). Check the exception you get.",
            "Add Resilience4j with a retry and a circuit breaker on that call. Hit it repeatedly and watch the breaker open in the `/actuator/circuitbreakers` endpoint.",
            "Write a token cache that refreshes 60 seconds before `expires_in`, and a test with a fake clock that proves it refreshes only once for many concurrent callers.",
            "Pick one external call in your own project and go through the eleven-item checklist. Write down which items are missing.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `EVERY OUTBOUND CLIENT
 1 TIMEOUTS      connect + read; total fits the caller's deadline
 2 RETRIES       transient only (conn errors, 429, 502/503/504); 2-3 tries
 3 BACKOFF       min(cap, base*2^n), full jitter; honour Retry-After
 4 IDEMPOTENCY   stable key on every retried write
 5 BREAKER       CLOSED -> OPEN (rate >= threshold after min calls)
                 -> HALF_OPEN (trial calls) -> CLOSED / OPEN
 6 BULKHEAD      cap concurrent calls per dependency
 7 FALLBACK      cached / default / queued / honest error
 8 BUDGETS       client-side rate limit, quota tracking
 9 NO DB TX      commit first, call after, or outbox + worker
10 TOKENS        cache until expires_in - margin; one refresher; retry once on 401
11 METRICS       latency, errors, retries, breaker state per dependency

RESILIENCE4J ORDER   Retry(CircuitBreaker(RateLimiter(TimeLimiter(Bulkhead(call)))))
                     retry: ignore CallNotPermittedException`,
          caption: "The checklist, on one screen.",
        },
        {
          type: "list",
          items: [
            "A slow dependency is more dangerous than a dead one, because it quietly eats your threads. Timeouts come first.",
            "Retries help only when they're limited, spread out, and safe to repeat.",
            "Breakers, bulkheads and fallbacks keep one partner's bad day from becoming your outage.",
          ],
        },
      ],
    },
  ],
};
