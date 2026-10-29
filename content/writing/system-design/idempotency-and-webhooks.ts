import type { Lesson } from "../types";

export const idempotencyAndWebhooks: Lesson = {
  slug: "idempotency-and-webhooks",
  date: "2026-10-29",
  title: "Idempotency and Webhooks",
  description:
    "How to make a write safe to repeat with idempotency keys and unique constraints, and how to build webhook endpoints that verify signatures, ignore duplicates, never trust the event body and still work when events arrive early, late or twice.",
  tags: ["System Design", "Idempotency", "Webhooks", "Payments", "Spring"],
  sections: [
    {
      title: "What Idempotency Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a lift button. I press \"5\" once, the lift goes to the fifth floor. My impatient friend presses it four more times. The lift still goes to the fifth floor once. Pressing it again doesn't send five lifts. That button is **idempotent**: doing it once or many times has the same effect.",
        },
        {
          type: "paragraph",
          text: "Now think of a food delivery app on a weak network. I tap \"Place order\", the spinner turns for 20 seconds, nothing happens, so I tap again. If the first request actually reached the server and only the reply got lost, a non-idempotent API would cook and deliver two biryanis. An idempotent one recognises the second tap as \"the same order again\" and just returns the first result.",
        },
        {
          type: "paragraph",
          text: "A **webhook** is the same problem from the other direction. A payment provider calls **my** server to say \"refund rf_9 succeeded\". It retries until I answer with a 2xx, so I will get the same event more than once, sometimes out of order, sometimes before my own database even knows about the refund. A webhook endpoint has to be idempotent too, and it has to be sure the call really came from the provider.",
        },
      ],
    },
    {
      title: "Why It Matters",
      blocks: [
        {
          type: "paragraph",
          text: "Networks fail in the worst possible place: after the server did the work, before the client got the answer. The client can't tell \"never arrived\" from \"arrived, reply lost\". So it retries, and that's correct behaviour. My job is to make retries harmless.",
        },
        {
          type: "list",
          items: [
            "**Double charges and double refunds.** The most expensive bug in a payments system, and the most embarrassing one to explain to a customer.",
            "**Duplicate records.** Two bookings, two invoices, two welcome emails.",
            "**Forged webhooks.** A webhook URL is public. Without signature checks, anyone who finds it can POST \"payment succeeded\" and get free rides.",
            "**State going backwards.** A late \"refund processing\" event arriving after \"refund succeeded\" can overwrite the good state if I apply events blindly.",
          ],
        },
        {
          type: "paragraph",
          text: "Most message systems, job queues and webhook senders promise **at-least-once** delivery: they'll keep trying until they're sure I got it, which means \"sometimes twice\". Exactly-once delivery over a network isn't really on offer. What I can build is **exactly-once effect**: at-least-once delivery plus an idempotent receiver.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "A token counter at a busy canteen helped me with all of it.",
        },
        {
          type: "list",
          items: [
            "**The idempotency key is the token number.** I pay, I get token 42. If I come back and say \"token 42\", the counter doesn't take money again. It looks up 42 and tells me what I already ordered.",
            "**The unique constraint is the token book.** Token 42 can only be written in the book once. Two cashiers can't both issue it, because the book physically has one line for 42.",
            "**Replaying the response:** when I return with token 42, I get the same answer as the first time (\"one masala dosa, coming\"), not \"error, already ordered\".",
            "**The webhook signature is the manager's stamp** on a note that says \"give table 7 a free dessert\". Without the stamp, the kitchen ignores the note.",
            "**Never trust the event body:** even with a stamped note, a careful cook phones the manager to confirm before handing out something expensive.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Idempotency keys for my own write APIs",
        },
        {
          type: "paragraph",
          text: "The client generates a unique key (usually a UUID) per **intended operation** and sends it in a header like `Idempotency-Key`. If it retries, it sends the same key. The server stores the key with the result of the first attempt, and any repeat with that key gets the stored result back.",
        },
        {
          type: "diagram",
          text: `  Client                              Server                      DB
  ──────                              ──────                      ──
  POST /refunds  Key: k1  ─────────►  insert key k1 ─────────────► ok (new)
                                      do the refund
                                      save response for k1 ──────► saved
       ✗ reply lost on the way back ◄─ 201 {refund 77}

  POST /refunds  Key: k1  ─────────►  insert key k1 ─────────────► duplicate!
  (retry)                             load saved response for k1 ◄─
                         ◄─────────── 201 {refund 77}   (same answer, no new refund)`,
          caption: "The key turns \"did my request get through?\" into a safe retry.",
        },
        {
          type: "paragraph",
          text: "Three details make this robust:",
        },
        {
          type: "list",
          items: [
            "**The database decides, not a Java `if`.** \"Check if the key exists, then insert\" is a race; two retries arriving together both see \"not there\". A `UNIQUE` index on the key column means only one insert can ever succeed, and the loser gets a duplicate-key error it can handle.",
            "**Store the request fingerprint.** If the same key comes back with a different body (different amount), that's a client bug. I return `422` instead of replaying a response that doesn't match.",
            "**Handle \"still in progress\".** If the first attempt hasn't finished, a retry with the same key shouldn't start a second one. I return `409 Conflict` and let the client try again shortly.",
          ],
        },
        {
          type: "heading",
          text: "Natural keys are idempotency keys too",
        },
        {
          type: "paragraph",
          text: "Often I don't need a header at all. \"One refund per booking\" or \"one payment order per trip\" is already a natural unique key. A `UNIQUE (trip_id)` on the payment orders table makes \"charge this trip\" idempotent no matter how many times the trip-completed event is delivered.",
        },
        {
          type: "heading",
          text: "Idempotency keys I send to providers",
        },
        {
          type: "paragraph",
          text: "When **I** call a payment provider, I'm the client, and my retries are just as dangerous. Most payment APIs accept an idempotency key header. I build it from my own ids so it's stable across retries, restarts and even different servers: `{scope}:refund:{refundId}`, for example `order-42:refund:7`. Never a fresh random UUID per attempt, because then every retry looks like a new refund to the provider.",
        },
        {
          type: "heading",
          text: "Webhook endpoints",
        },
        {
          type: "diagram",
          text: `  Provider                       My webhook endpoint
  ────────                       ───────────────────────────────────────────
  POST /webhooks/payments  ───►  1. verify signature on the RAW body
  (signed, may repeat)           2. check timestamp is recent (replay window)
                                 3. INSERT event_id into webhook_events
                                      duplicate? -> 200, stop
                                 4. store payload, enqueue for processing
                         ◄───    5. 200 OK   (fast, within a few seconds)

  background worker:             6. look up my record by provider reference
                                 7. GET status from provider API (don't trust body)
                                 8. apply transition if it moves state forward`,
          caption: "Receive fast, process later, and treat the event as a hint.",
        },
        {
          type: "list",
          items: [
            "**Signature:** the provider signs the raw body (often with a timestamp) using HMAC and a shared secret. I recompute it and compare in constant time.",
            "**Replay window:** if the signed timestamp is older than a few minutes, reject. A stolen but valid request can't be replayed next week.",
            "**Dedupe:** every event has an id. A unique insert of that id is my \"seen it already\" check.",
            "**Don't trust the body:** the event says \"succeeded\". I ask the provider's API what the status actually is, and use that. The webhook only tells me **when** to look.",
            "**Fast 2xx:** providers time out after a few seconds and retry. Heavy work goes to a queue or worker, not the request thread.",
          ],
        },
        {
          type: "heading",
          text: "When the webhook beats my own commit",
        },
        {
          type: "paragraph",
          text: "If my code calls the provider inside a transaction and saves the provider's refund id afterwards, the webhook can arrive before that row is committed. My endpoint looks up `rf_9`, finds nothing, and the event is lost if I just ignore it. Three things fix it:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Create and commit my own record (status `PROCESSING`) **before** calling the provider, and pass my id to the provider as metadata or as part of the idempotency key. Then the webhook can always find the record.",
            "If the record still isn't found, don't throw the event away. Store it, return 200, and let a worker retry the match later. (Returning a 5xx so the provider retries also works, but it burns their retry budget.)",
            "Run a **reconciliation** job that asks the provider about anything stuck in `PROCESSING` for too long, so a missing webhook can never leave money in limbo. The same code powers a \"check with provider\" button for support staff.",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "How HMAC works",
        },
        {
          type: "paragraph",
          text: "HMAC is a way to get a fingerprint of a message that only someone with the secret key can produce. With SHA-256 it's two nested hashes:",
        },
        {
          type: "code",
          language: "text",
          code: `HMAC(K, m) = SHA256( (K' XOR opad) || SHA256( (K' XOR ipad) || m ) )

K'    = key padded to 64 bytes (hashed first if longer)
ipad  = 0x36 repeated 64 times
opad  = 0x5c repeated 64 times
||    = concatenate`,
        },
        {
          type: "paragraph",
          text: "Why not just `SHA256(secret + body)`? Because SHA-256 is vulnerable to **length extension**: knowing the hash of `secret + body` lets an attacker compute the hash of `secret + body + extra` without knowing the secret. The nested construction of HMAC blocks that. Change one byte of the body and the output changes completely, and without the key there's no practical way to produce a valid signature for a new body.",
        },
        {
          type: "heading",
          text: "Why the compare must be constant-time",
        },
        {
          type: "paragraph",
          text: "`String.equals` stops at the first character that differs. An attacker who sends millions of guesses and measures response times could, in theory, learn how many leading characters were right and build a valid signature one byte at a time. `MessageDigest.isEqual` compares every byte regardless and takes the same time whether the first byte or the last one is wrong. It costs nothing, so I always use it.",
        },
        {
          type: "heading",
          text: "Why the raw body matters",
        },
        {
          type: "paragraph",
          text: "The provider signed the exact bytes it sent. If I let Spring parse the JSON into an object and then serialise it back, spacing, key order and number formatting can change, and the signature won't match. The endpoint must read the raw body (`@RequestBody String` or `byte[]`) and verify it before parsing anything.",
        },
        {
          type: "heading",
          text: "How a unique index referees a race",
        },
        {
          type: "paragraph",
          text: "When two transactions insert the same key at once, the database checks the unique index. The first insert places an entry and holds a lock on it. The second finds the entry and waits for the first transaction to finish. If the first commits, the second fails with a duplicate-key error (Postgres SQLSTATE `23505`, MySQL error 1062). If the first rolls back, the second goes ahead. Either way, only one row ever exists. That's why I trust the index, not a `SELECT` before the `INSERT`.",
        },
        {
          type: "paragraph",
          text: "In Postgres, `INSERT ... ON CONFLICT (event_id) DO NOTHING` gives me the same guarantee without an exception: the insert returns 0 rows when it's a duplicate. In MySQL, `INSERT IGNORE` is the rough equivalent, but it also hides other errors, so I prefer catching the duplicate-key error explicitly there.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Verifying a webhook signature",
        },
        {
          type: "paragraph",
          text: "Many providers sign `timestamp + \".\" + body` and send both the timestamp and the hex signature in headers. Here's the whole check, runnable with only the JDK:",
        },
        {
          type: "code",
          language: "java",
          title: "WebhookSignature.java",
          code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class WebhookSignature {
    static final String SECRET = "whsec_demo_only";
    static final long TOLERANCE_SECONDS = 300;

    static String sign(long timestamp, String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal((timestamp + "." + body).getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }

    static String verify(long timestamp, String body, String signature, long now) throws Exception {
        if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) return "rejected: too old";
        byte[] expected = sign(timestamp, body).getBytes(StandardCharsets.UTF_8);
        byte[] received = signature.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, received) ? "accepted" : "rejected: bad signature";
    }

    public static void main(String[] args) throws Exception {
        long sentAt = 1_790_000_000L;
        String body = "{\\"id\\":\\"evt_1\\",\\"type\\":\\"refund.succeeded\\",\\"refund\\":\\"rf_9\\"}";
        String sig = sign(sentAt, body);
        System.out.println("signature  " + sig);
        System.out.println("genuine    " + verify(sentAt, body, sig, sentAt + 2));
        System.out.println("tampered   " + verify(sentAt, body.replace("rf_9", "rf_8"), sig, sentAt + 2));
        System.out.println("replayed   " + verify(sentAt, body, sig, sentAt + 3600));
    }
}`,
        },
        {
          type: "output",
          text: `signature  f1b7d3e20031aab67387e985662a81286a61d1f514f4b15a41d3b543c7e1650e
genuine    accepted
tampered   rejected: bad signature
replayed   rejected: too old`,
        },
        {
          type: "list",
          items: [
            "Changing one character of the body (`rf_9` to `rf_8`) made the signature useless. That's HMAC doing its job.",
            "The replayed request had a perfectly valid signature, but it was an hour old, so the timestamp check stopped it. That's why the timestamp is part of what gets signed: an attacker can't just edit it.",
            "`MessageDigest.isEqual` does the constant-time compare. The timestamp check comes first because it's cheap.",
          ],
        },
        {
          type: "paragraph",
          text: "Some providers sign just the raw body with no timestamp, sent in a single header. The same code works with `sign(body)`; there's simply no replay window, so deduplication by event id becomes the main protection against replays. RideX's Razorpay webhook endpoint verifies an HMAC over the raw body this way and then dedupes by event id.",
        },
        {
          type: "heading",
          text: "An idempotent refund API, in miniature",
        },
        {
          type: "paragraph",
          text: "Before the Spring version, here's the idea with a `ConcurrentHashMap` playing the table with a unique key. `putIfAbsent` is atomic, just like a unique insert: only one caller can put a given key.",
        },
        {
          type: "code",
          language: "java",
          title: "IdempotentRefunds.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class IdempotentRefunds {
    // stands in for a table with UNIQUE(idempotency_key)
    static final Map<String, String> responses = new ConcurrentHashMap<>();
    static int moneySent = 0;

    static String refund(String idempotencyKey, int amount) {
        String saved = responses.putIfAbsent(idempotencyKey, "IN_PROGRESS");
        if (saved != null) return "replayed: " + saved;      // key seen before
        moneySent += amount;                                 // the real side effect
        String response = "refund of " + amount + " created";
        responses.put(idempotencyKey, response);             // store the first answer
        return response;
    }

    public static void main(String[] args) {
        System.out.println(refund("order-42:refund:1", 300));
        System.out.println(refund("order-42:refund:1", 300));  // client retried after a timeout
        System.out.println(refund("order-42:refund:2", 100));  // a genuinely new refund
        System.out.println("total refunded: " + moneySent);
    }
}`,
        },
        {
          type: "output",
          text: `refund of 300 created
replayed: refund of 300 created
refund of 100 created
total refunded: 400`,
        },
        {
          type: "paragraph",
          text: "The retry got the same answer and no extra money moved. If the retry had arrived while the first call was still running, it would have seen `IN_PROGRESS`, which is where a real API returns `409`.",
        },
        {
          type: "heading",
          text: "The same thing with Spring and a real table",
        },
        {
          type: "code",
          language: "sql",
          code: `CREATE TABLE idempotency_keys (
    idem_key      VARCHAR(100) PRIMARY KEY,
    request_hash  CHAR(64)     NOT NULL,
    status        VARCHAR(20)  NOT NULL,      -- IN_PROGRESS / DONE
    response_code INT,
    response_body TEXT,
    created_at    TIMESTAMP    NOT NULL
);`,
        },
        {
          type: "code",
          language: "java",
          title: "RefundController.java",
          code: `@PostMapping("/refunds")
public ResponseEntity<String> create(@RequestHeader("Idempotency-Key") String key,
                                     @RequestBody String body) {
    String hash = sha256(body);
    Optional<IdempotencyKey> existing = idempotency.tryStart(key, hash);  // unique insert
    if (existing.isPresent()) {
        IdempotencyKey k = existing.get();
        if (!k.requestHash().equals(hash)) return ResponseEntity.unprocessableEntity().build();
        if (k.inProgress())                return ResponseEntity.status(409).build();
        return ResponseEntity.status(k.responseCode()).body(k.responseBody());  // replay
    }
    String result = refunds.create(body);                 // the real work
    idempotency.finish(key, 201, result);                  // remember the answer
    return ResponseEntity.status(201).body(result);
}`,
        },
        {
          type: "paragraph",
          text: "`tryStart` does an `INSERT ... ON CONFLICT DO NOTHING` and, if nothing was inserted, loads the existing row. The fingerprint check catches a client that reused a key for a different request. In a real system I'd also handle the case where `refunds.create` throws: either delete the key so the client can retry, or store the error response, depending on whether the failure is retryable.",
        },
        {
          type: "heading",
          text: "Sending a stable key to the provider",
        },
        {
          type: "code",
          language: "java",
          code: `String idempotencyKey = "order-" + refund.getOrderId() + ":refund:" + refund.getId();

ProviderRefund result = restClient.post()
        .uri("/v1/refunds")
        .header("Idempotency-Key", idempotencyKey)    // same value on every retry
        .body(new RefundRequest(refund.getPaymentRef(), refund.getAmount()))
        .retrieve()
        .body(ProviderRefund.class);`,
        },
        {
          type: "paragraph",
          text: "Because the key comes from my own refund id, a retry next minute or from another server sends the same key, and the provider returns the refund it already created instead of a second one. Providers keep keys for a limited time (often around 24 hours), so very late retries should look up the existing refund first.",
        },
        {
          type: "heading",
          text: "Deduplicating webhook events",
        },
        {
          type: "code",
          language: "java",
          title: "EventDedupe.java",
          code: `import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class EventDedupe {
    // stands in for INSERT INTO processed_events(event_id) with a unique index
    static final Set<String> processed = ConcurrentHashMap.newKeySet();

    static String handle(String eventId) {
        if (!processed.add(eventId)) return eventId + " duplicate, 200 OK and skip";
        return eventId + " processed";
    }

    public static void main(String[] args) {
        // the provider retried evt_1 because our first 200 got lost
        for (String id : List.of("evt_1", "evt_2", "evt_1")) System.out.println(handle(id));
    }
}`,
        },
        {
          type: "output",
          text: `evt_1 processed
evt_2 processed
evt_1 duplicate, 200 OK and skip`,
        },
        {
          type: "paragraph",
          text: "The duplicate still gets a 200. If I answered with an error, the provider would keep retrying an event I've already handled.",
        },
        {
          type: "heading",
          text: "The webhook endpoint in Spring",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentWebhookController.java",
          code: `@PostMapping("/webhooks/payments")
public ResponseEntity<Void> receive(@RequestHeader("X-Signature") String signature,
                                    @RequestBody String rawBody) {
    if (!verifier.isValid(rawBody, signature)) {
        return ResponseEntity.status(401).build();       // not from the provider
    }
    String eventId = extractEventId(rawBody);            // null if unparseable
    if (eventId == null) {
        webhookEvents.saveUnparseable(rawBody);           // keep it for a human
        return ResponseEntity.ok().build();
    }
    boolean isNew = webhookEvents.insertIfAbsent(eventId, rawBody);  // unique index
    if (isNew) {
        worker.wakeUp();                                  // processing happens later
    }
    return ResponseEntity.ok().build();
}`,
        },
        {
          type: "list",
          items: [
            "Signature first, on the raw string, before any JSON parsing.",
            "A payload that's signed but can't be parsed is saved as-is, not thrown away. It may be a new event format, and I want to see it.",
            "The insert both deduplicates and persists the event, so nothing is lost if the app restarts before processing.",
            "The endpoint returns in milliseconds. The worker does the slow part.",
          ],
        },
        {
          type: "heading",
          text: "The worker: read the truth from the provider",
        },
        {
          type: "code",
          language: "java",
          title: "WebhookProcessor.java",
          code: `void process(WebhookEvent event) {
    String providerRefundId = event.refundReference();
    Optional<Refund> refund = refunds.findByProviderRefundId(providerRefundId);
    if (refund.isEmpty()) {
        event.retryLater();               // our row may not be committed yet
        return;
    }
    ProviderStatus actual = provider.fetchRefundStatus(providerRefundId);  // ask, don't trust
    refundTransitions.applyProviderStatus(refund.get(), actual);   // ignores backward moves
    event.markProcessed();
}`,
        },
        {
          type: "paragraph",
          text: "Reading the status back means a forged or stale event can at worst trigger a harmless status check. And `applyProviderStatus` only moves the refund forward (`PROCESSING` to `SUCCEEDED`), never back, so out-of-order events don't undo progress. The State Machines lesson goes into that part.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Check-then-insert instead of a unique constraint",
        },
        {
          type: "paragraph",
          text: "`if (!repo.existsByKey(key)) repo.save(...)` looks right and fails under concurrency, because two requests can both pass the `if` before either saves. The unique index is the only referee that can't be raced.",
        },
        {
          type: "heading",
          text: "A new random idempotency key per retry",
        },
        {
          type: "paragraph",
          text: "Generating `UUID.randomUUID()` inside the retry loop defeats the purpose. The key must be created once for the operation and reused on every attempt, or derived from my own ids.",
        },
        {
          type: "heading",
          text: "Verifying the signature on parsed JSON",
        },
        {
          type: "paragraph",
          text: "Taking `@RequestBody WebhookPayload payload` and re-serialising it for the HMAC changes the bytes and every signature fails. Or worse, someone \"fixes\" that by skipping verification.",
        },
        {
          type: "heading",
          text: "Comparing signatures with equals",
        },
        {
          type: "paragraph",
          text: "Use `MessageDigest.isEqual` on bytes. It's one line and closes a timing side channel.",
        },
        {
          type: "heading",
          text: "Trusting the event body",
        },
        {
          type: "paragraph",
          text: "Marking an order paid because a JSON field says `\"status\": \"captured\"` means the signature is the only line of defence. If the secret ever leaks, or a test-mode event gets sent to production, real orders get marked paid. Fetching the status from the provider costs one API call and removes that whole class of problem.",
        },
        {
          type: "heading",
          text: "Doing all the work before answering",
        },
        {
          type: "paragraph",
          text: "Sending emails, calling the provider and updating five tables inside the webhook request makes it slow. The provider times out, retries, and now two copies are processing at once. Store, answer 200, process in the background.",
        },
        {
          type: "heading",
          text: "Returning 4xx for events I don't care about",
        },
        {
          type: "paragraph",
          text: "If the provider sends an event type I don't handle, I still answer 200. An error code just makes it retry for days and may get my endpoint disabled.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Every write API that moves money or creates something important accepts an `Idempotency-Key`, stores it under a unique constraint, and replays the first response.",
            "Store a hash of the request with the key and reject a reused key with a different body.",
            "Prefer natural unique keys (one payment order per trip) where they exist; they're idempotency for free.",
            "Send stable, derived idempotency keys to providers, like `{scope}:refund:{id}`.",
            "Verify webhook signatures on the raw body, with constant-time compare and a timestamp window when the provider signs one.",
            "Deduplicate webhooks by event id with a unique insert, and answer 200 to duplicates.",
            "Answer fast and process asynchronously. Persist the event before answering so a crash can't lose it.",
            "Treat the event as a hint: read the real status from the provider, and only move state forward.",
            "Create my own record before calling the provider, so an early webhook can find it. Retry unmatched events instead of dropping them.",
            "Run a reconciliation job for anything stuck in an in-between state, and expose the same check as a \"check with provider\" action.",
            "Keep unparseable or unknown payloads for inspection instead of discarding them.",
          ],
        },
      ],
    },
    {
      title: "Trade-offs",
      blocks: [
        {
          type: "table",
          headers: ["Choice", "Upside", "Downside"],
          rows: [
            ["Idempotency-key table", "Works for any endpoint; replays exact response", "Extra table, cleanup job, a write per request"],
            ["Natural unique key", "No extra storage, very simple", "Only where the domain has one; can't replay a response body"],
            ["Read status back from provider", "Forged or stale events can't change money state", "One more API call per event; rate limits"],
            ["Trust the event body", "Fast, no extra call", "Signature is the only defence; out-of-order events bite"],
            ["Process webhook inline", "Simple, immediate", "Slow responses cause provider retries and duplicates"],
            ["Queue then process", "Fast 2xx, retryable, survives restarts", "More moving parts, slight delay"],
            ["Return 5xx when record missing", "Provider retries for me", "Uses their retry budget; endpoint may get flagged"],
            ["Store and retry internally", "I control timing and visibility", "Needs a worker and a retry policy"],
          ],
        },
      ],
    },
    {
      title: "Idempotency in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small, realistic service: a customer requests a refund for a food order, and the payment provider confirms it later by webhook. The whole flow, start to finish:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "The app sends `POST /refunds` with `Idempotency-Key: 6f1c...` (generated once when the customer tapped \"Refund\").",
            "My API inserts the key, creates a `refunds` row with status `PROCESSING` and id 7, and **commits**.",
            "After commit, a worker calls the provider with `Idempotency-Key: order-42:refund:7` and my refund id in metadata. It saves the provider's id, `rf_9`, on row 7.",
            "The provider sends a signed `refund.succeeded` webhook. My endpoint verifies it, inserts the event id, answers 200.",
            "The webhook worker finds refund 7 by `rf_9` (or by my id in metadata if `rf_9` isn't saved yet), asks the provider for the status, gets `succeeded`, and moves the refund to `SUCCEEDED`.",
            "Every 15 minutes, a reconciliation job lists refunds still `PROCESSING` after an hour and asks the provider about each one.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "RefundReconciler.java",
          code: `@Scheduled(fixedDelay = 15, timeUnit = TimeUnit.MINUTES)
public void reconcile() {
    Instant cutoff = Instant.now().minus(Duration.ofHours(1));
    for (Refund refund : refunds.findProcessingOlderThan(cutoff, 100)) {
        checkWithProvider(refund);       // same method support staff can trigger
    }
}

public void checkWithProvider(Refund refund) {
    ProviderStatus actual = provider.fetchRefundStatus(refund.getProviderRefundId());
    refundTransitions.applyProviderStatus(refund, actual);
}`,
        },
        {
          type: "paragraph",
          text: "What can go wrong now, and what catches it: the customer double-taps (same key, replayed response), the worker retries the provider call (same provider key, no second refund), the webhook arrives twice (event id dedupe), the webhook arrives before `rf_9` is saved (matched by metadata, or retried), the webhook never arrives (reconciliation), and a forged webhook shows up (signature check, and even then the status is read from the provider).",
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
              question: "What does idempotent mean for an API?",
              answer:
                "Calling it once or many times with the same input has the same effect on the server. `GET`, `PUT` and `DELETE` are meant to be idempotent by HTTP's definition; `POST` usually isn't.\n\nThe practical reason it matters is retries. A client that timed out can't know whether the server did the work, so it retries, and an idempotent API makes that retry safe.",
            },
            {
              question: "How do idempotency keys work?",
              answer:
                "The client generates a unique key per intended operation and sends it with the request, typically in an `Idempotency-Key` header. The server records the key under a unique constraint along with the result of the first attempt.\n\nA repeat request with the same key doesn't run the operation again; it gets the stored response. Good implementations also store a hash of the request body to reject a reused key with different data, and return 409 while the first attempt is still running.",
            },
            {
              question: "Why use a unique constraint instead of checking whether the key exists?",
              answer:
                "Because check-then-insert is a race. Two concurrent requests can both see \"not there\" and both insert.\n\nA unique index is enforced inside the database: the second insert waits on the first and then fails with a duplicate-key error. Only one row can ever exist, no matter how the requests interleave.",
            },
            {
              question: "What idempotency key would you send to a payment provider for a refund?",
              answer:
                "A deterministic one built from my own ids, like `order-42:refund:7`, so every retry of that refund, from any server, at any time, sends the same key.\n\nA random UUID per attempt would make each retry look like a new refund. I also keep in mind that providers expire keys after a while, so a very late retry should first check whether the refund already exists.",
            },
            {
              question: "What is at-least-once delivery, and how do you get exactly-once behaviour from it?",
              answer:
                "The sender keeps retrying until it gets an acknowledgement, so every message arrives, but some arrive more than once. It's what webhooks, most queues and outbox workers give you.\n\nExactly-once effect comes from pairing it with an idempotent receiver: deduplicate by a message or event id under a unique constraint, or make the operation naturally idempotent, like \"set status to SUCCEEDED\" rather than \"add 100\".",
            },
            {
              question: "How do you verify a webhook signature?",
              answer:
                "Read the raw request body, compute HMAC-SHA256 over it (or over `timestamp.body` if the provider signs a timestamp) with the shared secret, and compare the result to the signature header using a constant-time comparison like `MessageDigest.isEqual`.\n\nIf there's a timestamp, reject requests older than a few minutes. All of that happens before parsing the JSON or touching the database.",
            },
            {
              question: "Why must signature comparison be constant-time?",
              answer:
                "A normal string comparison returns as soon as it finds a difference, so a wrong first byte is rejected slightly faster than a wrong last byte. In principle an attacker could measure that and recover a valid signature byte by byte.\n\nA constant-time comparison always looks at every byte. It's a cheap defence, so there's no reason to skip it.",
            },
            {
              question: "What is the timestamp in a webhook signature for?",
              answer:
                "It limits replays. Because the timestamp is part of what's signed, an attacker can't change it without breaking the signature, and the receiver rejects anything outside a tolerance window, often five minutes.\n\nSo a captured valid request can't be replayed tomorrow. Dedupe by event id covers replays inside the window.",
            },
            {
              question: "Why shouldn't you trust the webhook event body?",
              answer:
                "Because the signature is then the only thing protecting money state. A leaked secret, a misrouted test event, or an out-of-order delivery would directly change orders or refunds.\n\nUsing the event as a trigger and reading the current status from the provider's API means the worst a bad event can do is cause a status check. It also naturally handles out-of-order events, since I always get the latest truth.",
            },
            {
              question: "Why should a webhook endpoint return 2xx quickly?",
              answer:
                "Providers wait only a few seconds before treating the delivery as failed and retrying. A slow endpoint causes duplicate deliveries while the first is still processing, and repeated failures can get the endpoint disabled.\n\nSo the endpoint verifies, stores the event, answers 200, and a background worker does the real processing.",
            },
            {
              question: "What do you do with a duplicate webhook event?",
              answer:
                "Return 200 and do nothing. Returning an error would make the provider keep retrying an event that's already been handled.\n\nThe duplicate is detected by inserting the event id into a table with a unique index; if the insert finds an existing row, it's a duplicate.",
            },
            {
              question: "A webhook arrives before your own transaction has committed the record it refers to. How do you handle it?",
              answer:
                "First prevent it: create and commit my own record before calling the provider, and send my id to the provider so the webhook can be matched to it.\n\nIf an event still can't be matched, store it and retry the match later rather than dropping it. Returning a 5xx so the provider retries also works. And a reconciliation job catches anything that slips through.",
            },
            {
              question: "What is reconciliation and why do you need it if you have webhooks?",
              answer:
                "A scheduled job that finds records stuck in an in-between state, like a refund still `PROCESSING` after an hour, and asks the provider for their real status.\n\nWebhooks can be lost, delayed, or rejected by a bug in my endpoint. Reconciliation guarantees the system eventually converges anyway. The same code is handy behind a \"check with provider\" button for support staff.",
            },
            {
              question: "What do you do with a webhook payload you can't parse?",
              answer:
                "Store it raw, return 200 if the signature was valid, and alert. It might be a new event version or a format change, and I want to inspect it rather than lose it.\n\nAn invalid signature is different: that gets a 401 and is not processed at all.",
            },
            {
              question: "A customer was refunded twice. How would you investigate?",
              answer:
                "Check whether there are two refund rows or one. Two rows means my API lacked idempotency, often two requests both passing a check-then-insert. One row with two provider refunds means my call to the provider wasn't idempotent, usually a fresh key per retry or no key at all.\n\nThen I'd look at logs for timeouts around the first call, because \"timed out, retried, both succeeded\" is the classic story. The fixes are a unique constraint on the refund intent and a stable provider idempotency key.",
            },
            {
              question: "How long should you keep idempotency keys?",
              answer:
                "At least as long as clients might retry, which for most mobile and web clients is minutes to hours. Many APIs keep them around 24 hours.\n\nA scheduled job deletes old rows. For money operations I usually also have a natural unique key in the business table, so even after the idempotency row is gone, a duplicate intent is still blocked.",
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
            "Run `WebhookSignature.java`. Change one character of the body or the secret and confirm verification fails. Then try `String.equals` instead of `MessageDigest.isEqual` and explain why it's worse.",
            "Create an `idempotency_keys` table with a primary key on the key. From two `psql` sessions, insert the same key inside open transactions and watch the second one wait, then fail after the first commits.",
            "Build a tiny Spring endpoint `POST /orders` that takes an `Idempotency-Key`. Call it twice with the same key using `curl` and confirm one order is created and the same response is returned.",
            "Send the same key with a different body and return `422`.",
            "Write a webhook endpoint that verifies an HMAC over the raw body. Send it a valid request with `curl`, then the same request with one byte changed.",
            "Add an `event_id` unique index and send the same event twice. Confirm the second gets 200 and nothing is processed again.",
            "Write a reconciliation method that finds records stuck in `PROCESSING` and logs what it would check. Schedule it with `@Scheduled`.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `IDEMPOTENT      once or many times -> same effect
WHY             timeouts: client can't tell "lost request" from "lost reply"

MY API          Idempotency-Key header -> UNIQUE row -> replay first response
                same key + different body -> 422;  still running -> 409
NATURAL KEYS    UNIQUE(trip_id) on payment_orders = free idempotency
TO PROVIDERS    stable key from my ids:  {scope}:refund:{id}

DELIVERY        at-least-once + idempotent receiver = exactly-once effect

WEBHOOK         1 HMAC over RAW body, MessageDigest.isEqual
                2 timestamp inside the replay window
                3 INSERT event_id (unique); duplicate -> 200, stop
                4 store, 200 fast, process in a worker
                5 read status from provider; only move forward
EARLY EVENT     commit my record first; retry unmatched; reconcile
UNPARSEABLE     keep it raw, alert`,
          caption: "The checklist I'd run through for any payment or webhook code review.",
        },
        {
          type: "list",
          items: [
            "Retries are normal. Make them harmless with keys and unique constraints, not with hope.",
            "A webhook is a signed hint, not the truth. Verify it, dedupe it, then go and read the truth.",
            "Reconciliation is the safety net that makes everything else forgivable.",
          ],
        },
      ],
    },
  ],
};
