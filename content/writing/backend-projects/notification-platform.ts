import type { Lesson } from "../types";

export const notificationPlatform: Lesson = {
  slug: "notification-platform",
  date: "2026-10-29",
  title: "Project 8: Notification Platform with Kafka and RabbitMQ",
  description:
    "A laptop-sized PRD for a notification service: REST and Kafka ingestion with eventId idempotency, separate lanes for transactional and promotional traffic, consent and quiet hours checked at send time, retries through RabbitMQ delay queues, circuit breakers with provider failover, an outbox and status webhooks.",
  difficulty: "Hard",
  tags: ["Backend Project", "PRD", "Java", "Spring Boot", "Kafka", "RabbitMQ", "Resilience4j", "Outbox"],
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "Almost every company I could join has some \"send an email or SMS\" code, and almost all of it has the same bugs: a retry sends the OTP twice, a big marketing campaign delays password-reset emails by an hour, someone who unsubscribed still gets offers, and when the SMS provider goes down everything just fails. I wrote a full design for this once, called NotifyHub, aimed at 100 million messages a day. This project is the honest, smaller version I can actually finish and measure on a laptop.",
        },
        {
          type: "list",
          items: [
            "**What it proves to an interviewer:** I can build an asynchronous pipeline that doesn't lose messages, doesn't send them twice, and degrades well when a dependency fails.",
            "**Job skills it covers:** Kafka producers, consumers, partitions and consumer groups; RabbitMQ queues, TTL and dead-letter exchanges; the transactional outbox; idempotent consumers; Resilience4j circuit breakers; retries with backoff; HMAC webhooks; Micrometer metrics with Prometheus and Grafana; Testcontainers for Kafka, RabbitMQ and PostgreSQL.",
            "**Honest effort:** 6 to 8 weekends. This is the first project with two brokers, and debugging asynchronous flows takes longer than writing them.",
          ],
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a busy post office with two counters. One counter is for speed post and legal notices; the other is for bundles of advertisement flyers. If a shop brings 50,000 flyers, the speed post queue still moves, because it has its own counter and its own staff. Before anything goes out, the clerk checks the \"no flyers please\" list and doesn't knock on doors at night. If a courier company is on strike, the clerk hands the letter to another courier. My platform is that post office for apps: other services send it a request like \"send order confirmation to user 42\", it picks the template, checks consent and quiet hours, sends through an email or SMS provider (fake ones locally), retries when the provider has a bad moment, fails over when it's down, and reports what happened.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a **producer engineer**, I want to send a request with an `eventId`, so that a retry after a timeout never sends twice.",
            "As a **producer engineer**, I want to mark a message `TRANSACTIONAL` or `PROMOTIONAL`, so that my OTP isn't stuck behind a campaign.",
            "As a **producer engineer**, I want to publish requests to Kafka as well as call REST, so that my service doesn't block on HTTP.",
            "As a **producer engineer**, I want to query or receive status events, so that I can show \"delivered\" to my users.",
            "As an **admin**, I want to create and version templates, so that copy changes don't need a deployment.",
            "As an **admin**, I want to see and replay dead letters, so that failures can be recovered after a fix.",
            "As a **recipient**, I want promotions to stop as soon as I unsubscribe.",
            "As a **recipient**, I want no promotional messages during my quiet hours, in my own time zone.",
            "As an **operator**, I want dashboards for sends, failures, retries, open circuits and lane lag, so that I see trouble before users do.",
          ],
        },
      ],
    },
    {
      title: "Functional Requirements",
      blocks: [
        {
          type: "paragraph",
          text: "Compared with the NotifyHub design, I cut scheduling with a timing wheel, campaigns of millions, WhatsApp and push, multi-language templates, client quotas and the full compliance module. They're good stretch goals, not MVP.",
        },
        {
          type: "table",
          headers: ["ID", "Requirement", "Priority"],
          rows: [
            ["FR-01", "Accept requests over REST and from the `notify.requests` Kafka topic; both use the same validation and dedup code", "Must"],
            ["FR-02", "Deduplicate by `(clientId, eventId)`; a repeat returns the original request ID and creates no new deliveries", "Must"],
            ["FR-03", "Acknowledge with 202 without waiting for the provider", "Must"],
            ["FR-04", "Every request has a priority: `TRANSACTIONAL` or `PROMOTIONAL`; each has its own Kafka topic and consumer group", "Must"],
            ["FR-05", "Check consent per channel and category at dispatch time, not only at request time", "Must"],
            ["FR-06", "Defer promotional messages that fall in the recipient's quiet hours to the end of the window, in the recipient's time zone", "Must"],
            ["FR-07", "Render versioned Mustache templates; a missing variable fails the delivery instead of sending a blank", "Must"],
            ["FR-08", "Email and SMS adapters, each with a primary and a secondary fake provider", "Must"],
            ["FR-09", "Classify provider errors as transient or permanent; retry transient ones with growing delays, never retry permanent ones", "Must"],
            ["FR-10", "After the last retry, move the delivery to a dead-letter topic and table with its error history", "Must"],
            ["FR-11", "Open a circuit breaker per provider on repeated failures and fail over to the secondary", "Must"],
            ["FR-12", "Write deliveries and outgoing events through a transactional outbox", "Must"],
            ["FR-13", "Accept provider status webhooks, verify their HMAC signature, apply them idempotently", "Must"],
            ["FR-14", "Record every status change and publish it to `notify.status`", "Must"],
            ["FR-15", "One-click unsubscribe link for promotional email that takes effect immediately", "Should"],
            ["FR-16", "Admin API to list, replay and discard dead letters; replay re-checks consent", "Should"],
            ["FR-17", "Optional signed status callback to the producer's URL", "Should"],
            ["FR-18", "Frequency cap: at most N promotional messages per recipient per day", "Could"],
            ["FR-19", "Send at a given future time (simple DB poller, not a timing wheel)", "Could"],
          ],
        },
      ],
    },
    {
      title: "Non-Functional Requirements",
      blocks: [
        {
          type: "paragraph",
          text: "NotifyHub's targets (12,000 requests a second, 2 million timers a second) need a cluster. These are sized for one laptop running everything in Docker Compose, with fake providers that answer in about 50 ms.",
        },
        {
          type: "table",
          headers: ["ID", "Requirement", "Target and how I check it"],
          rows: [
            ["NFR-01", "Ingestion latency", "REST p95 under 50 ms at 300 requests per second for 2 minutes (k6)"],
            ["NFR-02", "Lane isolation", "With 100,000 promotional messages queued, transactional requests at 20 per second still reach the provider with p95 under 2 s from acceptance (Micrometer timer, Grafana)"],
            ["NFR-03", "No loss", "Kill the dispatcher container mid-run; every accepted request ends in a final state (sent, failed, suppressed or dead-lettered) after restart (test harness count)"],
            ["NFR-04", "No duplicates from our retries", "Same `eventId` sent 50 times in parallel creates one delivery; the fake provider records one send per delivery ID (integration test)"],
            ["NFR-05", "Failover time", "With the primary fake provider returning 503, sends move to the secondary within 10 s and the error rate after that is under 1% (integration test plus dashboard)"],
            ["NFR-06", "Retry timing", "A transient failure is retried after roughly 10 s, 1 min and 10 min, then dead-lettered (integration test with shortened TTLs)"],
            ["NFR-07", "Consent freshness", "An unsubscribe stops any not-yet-sent promotional delivery for that recipient (integration test)"],
            ["NFR-08", "Observability", "Every request has a correlation ID in logs and Kafka headers; dashboards show sends, failures, retries, open circuits and consumer lag per lane"],
            ["NFR-09", "Security", "Producer API keys hashed; webhooks rejected without a valid signature; no phone numbers or emails in logs unmasked"],
          ],
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "diagram",
          text: `┌──────────────┐ 1   n ┌─────────────────────────┐ 1   n ┌─────────────────────┐
│ clients      ├───────┤ notification_requests   ├───────┤ deliveries          │
│ id, name     │       │ id (PK)                 │       │ id (PK)             │
│ api_key_hash │       │ client_id, event_id     │       │ request_id (FK)     │
│ callback_url │       │   UNIQUE together       │       │ channel EMAIL|SMS   │
│ hmac_secret  │       │ priority                │       │ recipient (masked   │
└──────────────┘       │ template_key, version   │       │   in logs)          │
                       │ variables (jsonb)       │       │ status, attempts    │
┌──────────────┐       │ created_at              │       │ provider            │
│ templates    │       └─────────────────────────┘       │ provider_msg_id     │
│ key, version │                                         │ deferred_until      │
│ channel      │       ┌─────────────────────────┐       │ last_error          │
│ category     │       │ delivery_status_history │ n   1 │                     │
│ subject,body │       │ delivery_id, status     ├───────┤                     │
│ active       │       │ detail, at              │       └─────────────────────┘
└──────────────┘       └─────────────────────────┘
┌──────────────────┐   ┌─────────────────────────┐   ┌─────────────────────┐
│ consents         │   │ recipient_profiles      │   │ outbox              │
│ recipient_id     │   │ recipient_id (PK)       │   │ id, topic, msg_key  │
│ channel,category │   │ time_zone               │   │ payload (jsonb)     │
│ status IN|OUT    │   │ quiet_start, quiet_end  │   │ headers, created_at │
│ source, at       │   └─────────────────────────┘   │ sent_at             │
└──────────────────┘                                 └─────────────────────┘
┌──────────────────┐   ┌─────────────────────────┐
│ dead_letters     │   │ provider_webhooks       │
│ delivery_id      │   │ provider, provider_event│
│ payload, errors  │   │   _id UNIQUE together   │
│ status, at       │   │ payload, applied_at     │
└──────────────────┘   └─────────────────────────┘`,
          caption: "One request fans out into one delivery per channel; consent and quiet hours are looked up when each delivery is sent.",
        },
        {
          type: "paragraph",
          text: "Delivery statuses for the MVP: `ACCEPTED`, `QUEUED`, `SENDING`, `RETRY_SCHEDULED`, `DEFERRED`, `SENT`, `DELIVERED`, `BOUNCED`, `FAILED`, `SUPPRESSED` (no consent), `DEAD_LETTERED`. Every change is one row in `delivery_status_history` and one event on `notify.status`.",
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
            ["POST", "/api/v1/notifications", "Submit a request (API key)", "202, or 200 with the original ID on a repeated `eventId` / 400 bad field, 401, 422 unknown template"],
            ["GET", "/api/v1/notifications/{id}", "Request status with its deliveries", "200 / 404"],
            ["POST", "/api/v1/templates", "Create a template version", "201 / 400 invalid Mustache"],
            ["POST", "/api/v1/templates/{key}/disable", "Stop a template", "200 / 404"],
            ["PUT", "/api/v1/recipients/{id}/consents", "Set opt-in or opt-out per channel and category", "200 / 400"],
            ["PUT", "/api/v1/recipients/{id}/profile", "Time zone and quiet hours", "200 / 400 unknown zone"],
            ["GET", "/api/v1/unsubscribe?token=", "One-click unsubscribe from email", "200 / 400 bad or expired token"],
            ["POST", "/api/v1/webhooks/providers/{provider}", "Provider status callback (HMAC)", "200, also on a duplicate / 401 bad signature"],
            ["GET", "/api/v1/admin/dead-letters", "List dead letters", "200"],
            ["POST", "/api/v1/admin/dead-letters/{id}/replay", "Replay one", "202 / 409 already replayed"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/notifications  (header X-Api-Key)",
          code: `{
  "eventId": "order-7781-confirmed",
  "priority": "TRANSACTIONAL",
  "recipient": {
    "id": "user-42",
    "email": "asha@example.com",
    "phone": "+919800000042"
  },
  "channels": ["EMAIL", "SMS"],
  "template": { "key": "order-confirmed", "version": 3 },
  "variables": { "name": "Asha", "orderId": "7781", "total": "1,240.00" }
}`,
        },
        {
          type: "code",
          language: "json",
          title: "202 Accepted",
          code: `{
  "requestId": "01JB9V4M6Q2W8E3R5T7Y9U1I3O",
  "status": "ACCEPTED",
  "deliveries": [
    { "id": 5501, "channel": "EMAIL", "status": "QUEUED" },
    { "id": 5502, "channel": "SMS", "status": "QUEUED" }
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
          text: `Producers ──REST──┐            ┌── Kafka: notify.requests ◄── Producers
                  ▼            ▼
          ┌─────────────────────────────┐
          │ Ingestion                   │  validate, dedup on (clientId, eventId)
          │ one DB tx: request +        │
          │ deliveries + outbox rows    │
          └──────────────┬──────────────┘
                         ▼
                   PostgreSQL ◄─────────── Outbox relay (polls, SKIP LOCKED)
                                                 │
                ┌────────────────────────────────┴───────────────┐
                ▼                                                ▼
   Kafka: notify.dispatch.transactional          Kafka: notify.dispatch.promotional
   (6 partitions, 6 consumers)                   (3 partitions, 2 consumers, throttled)
                └─────────────────┬──────────────────────────────┘
                                  ▼
          ┌──────────────────────────────────────────────┐
          │ Dispatcher                                   │
          │ 1. claim delivery (conditional UPDATE)       │
          │ 2. consent check  ── no ──► SUPPRESSED        │
          │ 3. quiet hours    ── yes ─► DEFERRED (poller) │
          │ 4. render Mustache                           │
          │ 5. provider via circuit breaker + failover   │
          └───────┬──────────────────────┬───────────────┘
        transient │ error                │ success / permanent error
                  ▼                      ▼
   RabbitMQ: retry.10s / 1m / 10m    status row + outbox ──► Kafka: notify.status
   (TTL, then dead-letter exchange          │
    routes to retry.due ──► Dispatcher)     ▼
   after last try ──► Kafka: notify.dlt   Fake providers ──webhook──► /webhooks`,
        },
        {
          type: "paragraph",
          text: "It's one Spring Boot codebase with three roles that can run as separate containers using profiles: `ingestion`, `relay` and `dispatcher`. Splitting them into real microservices would add a lot of plumbing without teaching anything new here; that's Project 10.",
        },
        {
          type: "heading",
          text: "Ingestion and the outbox",
        },
        {
          type: "paragraph",
          text: "The ingestion step never talks to Kafka directly. In one database transaction it inserts the request, one delivery per channel, and an outbox row per delivery. A relay picks up unsent outbox rows with `FOR UPDATE SKIP LOCKED`, publishes them to the right lane topic with the recipient ID as the key, and marks them sent. If the app dies between commit and publish, the rows are still there and the relay sends them after restart. That gives **at-least-once** publishing, so the dispatcher has to be idempotent.",
        },
        {
          type: "code",
          language: "sql",
          title: "Outbox relay batch",
          code: `SELECT id, topic, msg_key, payload, headers
FROM outbox
WHERE sent_at IS NULL
ORDER BY id
LIMIT 200
FOR UPDATE SKIP LOCKED;`,
        },
        {
          type: "heading",
          text: "Dispatch: claim, check, render, send",
        },
        {
          type: "paragraph",
          text: "The dispatcher first claims the delivery with a conditional update. If Kafka redelivers the same record, or a retry and a replay arrive together, only one of them changes a row and the others stop there.",
        },
        {
          type: "code",
          language: "sql",
          title: "Claim a delivery (0 rows updated means someone else has it)",
          code: `UPDATE deliveries
SET status = 'SENDING', attempts = attempts + 1
WHERE id = :deliveryId
  AND status IN ('QUEUED', 'RETRY_SCHEDULED', 'DEFERRED');`,
        },
        {
          type: "paragraph",
          text: "Consent and quiet hours are checked right here, at send time. A request accepted at 9 pm might sit in the promotional lane for an hour; if the person unsubscribed or their quiet hours started in between, the message must not go out.",
        },
        {
          type: "code",
          language: "java",
          title: "QuietHours.java",
          code: `public final class QuietHours {

    public static boolean contains(ZonedDateTime now, LocalTime start, LocalTime end) {
        LocalTime t = now.toLocalTime();
        return start.isBefore(end)
                ? !t.isBefore(start) && t.isBefore(end)
                : !t.isBefore(start) || t.isBefore(end); // window crosses midnight, e.g. 22:00 to 07:00
    }

    // Call only when contains(...) is true: the next moment the window is over
    public static ZonedDateTime nextAllowed(ZonedDateTime now, LocalTime end) {
        ZonedDateTime endToday = now.with(end);
        return endToday.isAfter(now) ? endToday : endToday.plusDays(1);
    }
}`,
        },
        {
          type: "paragraph",
          text: "`now` is the current instant in the recipient's zone, `Instant.now().atZone(ZoneId.of(profile.timeZone()))`. A deferred delivery gets `status = 'DEFERRED'` and `deferred_until`, and a small poller re-queues due rows every 10 seconds. Quiet-hour delays are hours long, so a database poller is fine; it's the same idea as NotifyHub's scheduler without the timing wheel.",
        },
        {
          type: "code",
          language: "java",
          title: "Rendering with JMustache",
          code: `Template body = Mustache.compiler()
        .escapeHTML(channel == Channel.EMAIL) // HTML-escape for email, plain text for SMS
        .compile(template.body());
String text = body.execute(variables); // throws MustacheException if a variable is missing`,
        },
        {
          type: "heading",
          text: "Providers, circuit breaker and failover",
        },
        {
          type: "code",
          language: "java",
          title: "EmailSender.java",
          code: `@Service
public class EmailSender {

    private final EmailProvider primary;
    private final EmailProvider secondary;

    public EmailSender(@Qualifier("fakeMailA") EmailProvider primary,
                       @Qualifier("fakeMailB") EmailProvider secondary) {
        this.primary = primary;
        this.secondary = secondary;
    }

    @CircuitBreaker(name = "emailPrimary", fallbackMethod = "sendViaSecondary")
    public ProviderResult send(EmailMessage message) {
        return primary.send(message);
    }

    public ProviderResult sendViaSecondary(EmailMessage message, Throwable cause) {
        if (cause instanceof PermanentProviderException permanent) {
            throw permanent; // a bad address is bad on every provider
        }
        return secondary.send(message);
    }
}`,
        },
        {
          type: "code",
          language: "yaml",
          title: "application.yml (Resilience4j)",
          code: `resilience4j:
  circuitbreaker:
    instances:
      emailPrimary:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 20
        minimum-number-of-calls: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
        ignore-exceptions:
          - com.example.notify.provider.PermanentProviderException`,
        },
        {
          type: "paragraph",
          text: "Permanent errors (invalid email, number not reachable) are ignored by the breaker, because they say nothing about the provider's health. Transient errors (timeouts, 429, 5xx) count. When half of the last 20 calls fail, the breaker opens and every call goes straight to the fallback, the secondary provider, without waiting for the primary to time out. After 30 seconds, three trial calls decide whether it closes again. If the secondary also fails with a transient error, the delivery goes to the retry queues.",
        },
        {
          type: "heading",
          text: "Retries with RabbitMQ delay queues",
        },
        {
          type: "paragraph",
          text: "Each retry tier is a RabbitMQ queue with a fixed TTL and no consumers. A message sits there until its TTL runs out, then RabbitMQ dead-letters it to the `notify.retry` exchange, which routes it to `notify.retry.due`, and the dispatcher consumes that queue and tries again.",
        },
        {
          type: "code",
          language: "java",
          title: "RetryQueues.java (Spring AMQP)",
          code: `@Configuration
public class RetryQueues {

    @Bean
    DirectExchange retryExchange() {
        return new DirectExchange("notify.retry");
    }

    @Bean
    Queue dueQueue() {
        return QueueBuilder.durable("notify.retry.due").build();
    }

    @Bean
    Binding dueBinding() {
        return BindingBuilder.bind(dueQueue()).to(retryExchange()).with("due");
    }

    @Bean
    Queue retry10s() {
        return delayQueue("notify.retry.10s", 10_000);
    }

    @Bean
    Queue retry1m() {
        return delayQueue("notify.retry.1m", 60_000);
    }

    @Bean
    Queue retry10m() {
        return delayQueue("notify.retry.10m", 600_000);
    }

    private static Queue delayQueue(String name, int ttlMillis) {
        return QueueBuilder.durable(name)
                .ttl(ttlMillis)
                .deadLetterExchange("notify.retry")
                .deadLetterRoutingKey("due")
                .build();
    }
}`,
        },
        {
          type: "paragraph",
          text: "Scheduling a retry is `rabbitTemplate.convertAndSend(\"\", \"notify.retry.1m\", deliveryId)`, using the default exchange to drop it straight into the queue. I use one queue per delay on purpose: with per-message TTLs in a single queue, RabbitMQ only expires the message at the head, so a 10-minute message would hold up a 10-second one behind it.",
        },
        {
          type: "heading",
          text: "Status webhooks",
        },
        {
          type: "paragraph",
          text: "The fake providers call back like real ones do: `POST /api/v1/webhooks/providers/fakeMailA` with a body like `{\"eventId\":\"evt_91\",\"messageId\":\"fm_77\",\"status\":\"DELIVERED\"}` and an `X-Signature` header holding the HMAC-SHA256 of the raw body. I verify the signature over the raw bytes, insert into `provider_webhooks` with a unique `(provider, provider_event_id)` so a duplicate is a no-op, and move the delivery forward only (a late `SENT` never overwrites `DELIVERED`). If the webhook names a `provider_msg_id` I don't have yet, because the send's commit hasn't landed, I keep it unapplied and a job matches it a minute later.",
        },
      ],
    },
    {
      title: "Kafka vs RabbitMQ: Where Each Fits Here",
      blocks: [
        {
          type: "paragraph",
          text: "I use both on purpose, because interviewers love asking \"why not just one?\". The simple way I think about it: Kafka is a **notebook** that everyone can read at their own pace and re-read later. RabbitMQ is a **to-do tray** where each task is picked up by one worker and then it's gone.",
        },
        {
          type: "table",
          headers: ["Need in this project", "Tool", "Why it fits"],
          rows: [
            ["Producers publishing requests", "Kafka", "Durable log, producers don't wait on me, I can replay from an offset after a bug fix"],
            ["Priority lanes", "Kafka (one topic per lane)", "Separate topics and consumer groups mean promotional lag can't block transactional consumers; partitions keyed by recipient keep one person's messages in order"],
            ["Status events to many consumers", "Kafka", "Several producers' services can each read `notify.status` with their own consumer group"],
            ["Dead letters", "Kafka topic plus a table", "The topic keeps an ordered record; the table makes them searchable and replayable from the admin API"],
            ["Delayed retries", "RabbitMQ", "TTL plus dead-letter exchange is a built-in delay; Kafka has no per-message delay, and pausing a partition to wait would block everything behind it"],
            ["One-off work items", "RabbitMQ", "Per-message acknowledgement and redelivery; no offset to manage for a message that waits 10 minutes"],
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "If I had to pick only one",
          text: "Kafka, with retry topics (`retry-10s`, `retry-1m`) whose consumers hold back each record until its due time. Spring Kafka's `@RetryableTopic` does exactly that. It works, but the RabbitMQ version is simpler to reason about, and running both shows I know where each one shines.",
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
            ["Java 21 + Spring Boot 3", "Spring Kafka, Spring AMQP and Resilience4j all integrate cleanly"],
            ["Apache Kafka (KRaft, single broker in Docker)", "Ingestion log, lanes, status and dead-letter topics"],
            ["RabbitMQ 3 with management UI", "Delay queues for retries; the UI makes the demo easy to show"],
            ["PostgreSQL 16", "Requests, deliveries, consent, outbox, dead letters"],
            ["JMustache", "Logic-less templates: no code execution, missing variables fail loudly"],
            ["Resilience4j", "Circuit breaker per provider with a fallback method"],
            ["Micrometer + Prometheus + Grafana", "Counters, timers and consumer lag on a dashboard"],
            ["WireMock or small fake-provider apps", "Providers that can be told to be slow, fail with 503, or reject an address"],
            ["Testcontainers (Kafka, RabbitMQ, PostgreSQL)", "Real brokers in tests"],
            ["k6", "Load on the REST ingestion and on lane isolation"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Transactional outbox instead of publishing inside the request",
        },
        {
          type: "paragraph",
          text: "**Decision:** ingestion writes outbox rows in the same transaction as the request; a relay publishes them. **Trade-off:** extra table, extra process, and a little latency (the relay polls every 200 ms). In return there's no case where the request is saved but the Kafka message is lost, or the message is sent but the request rolled back.",
        },
        {
          type: "heading",
          text: "ADR-2: Separate topics per priority, not one topic with a priority field",
        },
        {
          type: "paragraph",
          text: "**Decision:** `notify.dispatch.transactional` and `notify.dispatch.promotional`, each with its own consumer group and concurrency. **Trade-off:** more topics to manage. A single topic can't skip ahead: if 100,000 promotional records sit in front of an OTP in the same partition, the OTP waits. Separate lanes are the only real fix.",
        },
        {
          type: "heading",
          text: "ADR-3: Check consent and quiet hours at dispatch, not at ingestion",
        },
        {
          type: "paragraph",
          text: "**Decision:** the checks run just before the provider call. **Trade-off:** a database read per delivery (cacheable for a few seconds). Checking only at ingestion would send to someone who unsubscribed while their message was queued, which is exactly the complaint this platform exists to prevent.",
        },
        {
          type: "heading",
          text: "ADR-4: Fixed delay tiers in RabbitMQ",
        },
        {
          type: "paragraph",
          text: "**Decision:** three queues, 10 s, 1 min and 10 min, then dead letter. **Trade-off:** no random jitter inside a tier, so a provider outage sends a wave of retries at the same moment. I soften that by adding up to 2 seconds of random sleep when consuming from `retry.due`, and the circuit breaker stops the wave hitting a dead provider anyway.",
        },
        {
          type: "heading",
          text: "ADR-5: One codebase, three runtime roles",
        },
        {
          type: "paragraph",
          text: "**Decision:** ingestion, relay and dispatcher are Spring profiles of one app. **Trade-off:** they share a database and a deploy, so it's not microservices. But I can scale dispatchers separately in Docker Compose, kill one in a test, and skip service-to-service contracts that would add nothing here.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Same `eventId` with a different body: return 409, never quietly accept new content under an old ID.",
            "Same `eventId` from two clients: allowed, dedup is per client.",
            "Kafka redelivers a record after a rebalance: the conditional claim update makes the second attempt a no-op.",
            "Provider accepted the message but our app crashed before saving `SENT`: the retry could send twice. Send the delivery ID as the provider's idempotency or reference key where supported, and count remaining duplicates as a known limitation.",
            "Webhook arrives before the send's commit: store it and reconcile later.",
            "Webhooks out of order (`DELIVERED` before `SENT`): statuses only move forward.",
            "Recipient has no time zone: default to the client's configured zone, and log it.",
            "Quiet hours that cross midnight (22:00 to 07:00) and DST changes: tested explicitly.",
            "Template disabled after requests were queued: the dispatcher checks `active` and marks deliveries `FAILED` with a clear reason.",
            "Missing template variable: fail the delivery at render time with the variable name, never send \"Hi ,\".",
            "Both providers down: circuit open on the primary, transient errors on the secondary, delivery walks through the retry tiers and ends in the dead-letter topic.",
            "Replay of a dead letter after the person unsubscribed: replay runs the normal consent check and ends `SUPPRESSED`.",
            "Poison message on `notify.requests` that isn't valid JSON: send it to the dead-letter topic on the first attempt, don't retry forever.",
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
            "**Core over REST.** Request and delivery tables, `eventId` dedup, Mustache rendering, one fake email provider, synchronous send. Demo: POST a request, see the fake inbox. Tests: dedup, missing variable rejected.",
            "**Outbox and Kafka lanes.** Outbox relay, two lane topics, dispatcher consumers, status history. Demo: kill the relay, restart, nothing lost. Tests: Testcontainers Kafka end to end; Kafka redelivery doesn't double-send.",
            "**Kafka ingestion.** Consumer on `notify.requests` sharing the REST validation. Demo: a producer script publishes 10,000 requests. Tests: invalid JSON goes to the dead-letter topic once.",
            "**Retries and dead letters.** Error classification, RabbitMQ delay tiers, `notify.dlt`, admin replay. Demo: flaky provider, watch messages move through queues in the RabbitMQ UI. Tests: retry tiers with TTLs shortened to 1 second; permanent error never retried.",
            "**Circuit breaker and failover.** Resilience4j on each primary, SMS adapter with two fake providers. Demo: switch the primary to 503 and watch traffic move to the secondary on Grafana. Tests: breaker opens and fails over; permanent errors don't open it.",
            "**Consent, quiet hours, unsubscribe.** Checks at dispatch, deferral poller, unsubscribe link. Demo: set quiet hours to the current hour and see the message deferred. Tests: midnight-crossing window, DST day, unsubscribe while queued.",
            "**Webhooks, metrics, load test.** Signed provider webhooks, `notify.status`, Grafana dashboard, k6 runs for ingestion and lane isolation. Demo: dashboard during a promotional flood. Tests: duplicate and early webhooks; README with measured numbers.",
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
            "**Unit tests:** quiet-hours math (including a DST date and a midnight-crossing window), error classification, status transition rules, HMAC verification.",
            "**Integration tests with Testcontainers:** Kafka, RabbitMQ and PostgreSQL started once per test class; Awaitility to wait for asynchronous results instead of `Thread.sleep`.",
            "**Fault tests:** fake providers controlled from the test (slow, 503, permanent reject); stop the relay or dispatcher container and restart it.",
            "**Idempotency tests:** same `eventId` 50 times in parallel; the same Kafka record delivered twice; the same webhook three times.",
            "**Load tests:** k6 on REST ingestion; a script that floods the promotional lane while measuring transactional handoff latency.",
            "**Traceability:** a table in the README mapping each FR and NFR ID to the test that covers it, the same habit as in the NotifyHub design.",
          ],
        },
      ],
    },
    {
      title: "Stretch Goals",
      blocks: [
        {
          type: "list",
          items: [
            "A third `ALERT` lane that sends on several channels at once.",
            "Fallback chains across channels: email bounced, so try SMS.",
            "Per-client quotas and rate limits with a retry hint in the 429.",
            "Scheduled sends with a timing wheel, tested against the DB poller as a baseline.",
            "Campaign fan-out from a recipient list file, with drain time reported.",
            "Real provider adapters in a sandbox account (behind a profile, never in tests).",
            "OpenTelemetry tracing across Kafka and RabbitMQ hops.",
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
              question: "How do you make sure a notification is never sent twice?",
              answer:
                "Three layers. Ingestion dedups on `(clientId, eventId)` with a unique constraint. The dispatcher claims each delivery with a conditional update, so a redelivered Kafka record or a racing retry does nothing.\n\nThe last gap is a crash after the provider accepted but before I saved `SENT`. I pass the delivery ID to the provider as a reference where it supports one, and I measure the remaining duplicates instead of pretending they're zero.",
            },
            {
              question: "Why the outbox pattern?",
              answer:
                "Because writing to the database and publishing to Kafka are two systems, and there's no shared transaction. Either order can leave one done and the other not.\n\nWith the outbox, the request and the event to publish are written in one database transaction. A relay publishes later and retries until it succeeds, so publishing is at-least-once and the consumers are idempotent.",
            },
            {
              question: "How do promotional campaigns not delay OTPs?",
              answer:
                "They're on different Kafka topics with different consumer groups. A backlog on the promotional topic is just lag on that group; the transactional consumers keep reading their own topic.\n\nMy load test floods 100,000 promotional messages and checks transactional p95 stays under 2 seconds.",
            },
            {
              question: "Why both Kafka and RabbitMQ?",
              answer:
                "Kafka is a durable, replayable log, ideal for the request stream, lanes and status events that several services read.\n\nRabbitMQ gives me delayed retries almost for free with TTL queues and a dead-letter exchange. Kafka has no per-message delay, so retries on Kafka need extra retry topics and consumers that wait. I can explain how I'd do it with Kafka alone.",
            },
            {
              question: "Explain the circuit breaker settings you chose.",
              answer:
                "A count-based window of the last 20 calls, opening when at least half failed, with at least 10 calls before it decides. It stays open for 30 seconds, then lets 3 trial calls through.\n\nPermanent errors like an invalid address are ignored, because they don't mean the provider is unhealthy. While open, calls go straight to the secondary provider instead of waiting for timeouts.",
            },
            {
              question: "Why check consent at dispatch time?",
              answer:
                "A promotional message can sit in the queue for a while. If the person unsubscribes in that time, a check done at ingestion would already be out of date.\n\nChecking just before the provider call means the latest consent always wins. The cost is one cached lookup per delivery.",
            },
            {
              question: "How do you handle quiet hours across time zones?",
              answer:
                "Each recipient has a time zone and a quiet window. I convert now to their zone and check the window, including windows that cross midnight.\n\nIf it's quiet, the delivery becomes `DEFERRED` with the window's end time, and a poller re-queues it then. Transactional messages skip this check.",
            },
            {
              question: "What goes to the dead-letter topic and what do you do with it?",
              answer:
                "Deliveries that failed all retry tiers, and records that can't even be parsed. Each carries its payload, error history and attempt count.\n\nAn admin can list, replay or discard them through the API. Replay goes through the normal path, so consent and idempotency still apply.",
            },
            {
              question: "How do you verify provider webhooks and handle duplicates?",
              answer:
                "I compute HMAC-SHA256 over the raw request body with the shared secret and compare it to the header with a constant-time compare. Parsing the JSON first and re-serialising would change the bytes.\n\nEach webhook event ID is stored with a unique constraint, so a duplicate is acknowledged with 200 and ignored. Statuses only move forward, so out-of-order webhooks can't move a delivery back.",
            },
            {
              question: "How did you size the Kafka partitions?",
              answer:
                "Partitions cap how many consumers in a group can work in parallel. I gave the transactional topic 6 and the promotional one 3, matching the consumer counts I wanted on my laptop.\n\nThe key is the recipient ID, so one person's messages stay in order. In a real system I'd size from measured throughput per consumer, not guess.",
            },
            {
              question: "What would change at NotifyHub's original scale of 100 million a day?",
              answer:
                "A Kafka cluster with replication, many more partitions, dispatchers scaled per lane, a proper scheduler for timed sends, per-client quotas, and short Kafka retention because messages carry personal data.\n\nThe ideas stay the same: outbox, lanes, idempotent consumers, breakers. That's why I built the small version first.",
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
            "Built a notification platform with Spring Boot, Kafka and RabbitMQ: transactional outbox, idempotent dispatch by `eventId`, and isolated transactional and promotional lanes (p95 transactional handoff of X s during a 100k-message promotional flood).",
            "Added Resilience4j circuit breakers with provider failover, tiered retries through RabbitMQ TTL queues and a dead-letter topic with admin replay.",
            "Enforced consent and time-zone-aware quiet hours at dispatch, with HMAC-verified status webhooks and Grafana dashboards; tested end to end with Testcontainers.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Only claim what you built",
          text: "Use your measured X and say it ran on a laptop with fake providers. Don't write \"100M messages a day\": that's the NotifyHub design target, not something this MVP showed. If the timing wheel or campaigns stayed as stretch goals, leave them off.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "**Kafka and RabbitMQ**: topics, partitions, consumer groups and offsets; exchanges, queues, TTL and dead-letter exchanges.",
            "**Reliable Outbound Calls** (System Design): timeouts, retries with backoff, circuit breakers.",
            "**Idempotency and Webhooks** (System Design): idempotency keys, HMAC signatures, out-of-order events.",
            "**Transactions and Locking** (System Design): `SKIP LOCKED` for the outbox relay and conditional updates for claiming work.",
            "**State Machines for Business Workflows** (System Design): delivery statuses that only move forward.",
            "**Multithreading and Concurrency**: consumer concurrency and thread pools.",
            "`java.time`: `ZoneId`, `ZonedDateTime` and what happens on a DST change.",
          ],
        },
      ],
    },
  ],
};
