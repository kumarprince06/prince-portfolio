import type { Lesson } from "../types";

export const foodDeliveryMicroservices: Lesson = {
  slug: "food-delivery-microservices",
  date: "2026-10-29",
  title: "Project 10: Food Delivery Platform as Microservices",
  description:
    "The capstone PRD: a food delivery backend split into order, restaurant, payment, delivery and notification services, each with its own database, joined by Kafka events in a choreography saga with compensation, plus an API gateway, outboxes, idempotent consumers, tracing and contract tests.",
  difficulty: "Hard",
  tags: ["Backend Project", "PRD", "Java", "Spring Boot", "Microservices", "Kafka", "RabbitMQ", "Saga", "Kubernetes"],
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "Every earlier project ran as one app with one database, and I said each time that it was the right call. This one is where I finally split things up, on purpose, to learn what that costs. An order now crosses five services that can each be down, slow or behind, and no database transaction covers all of them. Getting an order from \"placed\" to \"rider on the way\", or cleanly back to \"cancelled and refunded\", is the whole project.",
        },
        {
          type: "list",
          items: [
            "**What it proves to an interviewer:** I understand distributed transactions without two-phase commit, eventual consistency, and the operational side of microservices: routing, tracing, config and contracts.",
            "**Job skills it covers:** Spring Cloud Gateway, Kafka event design, the saga pattern with compensation, the outbox per service, idempotent consumers, RabbitMQ work queues, Resilience4j, OpenTelemetry tracing, Spring Cloud Config, Docker Compose, Kubernetes basics, and consumer-driven contract tests.",
            "**Honest effort:** 8 to 12 weekends. Plan on more time for the tooling (Compose, tracing, contracts, Kubernetes) than for the business code.",
          ],
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a food court in a mall. The billing counter takes the order and the money, the kitchen decides whether it can cook it, and a delivery boy takes it upstairs to the office. None of them share a notebook; they shout updates to each other. If the kitchen says \"no paneer today\", the billing counter has to give the money back. My platform works like that food court: a customer places an order, the payment service takes the money, the restaurant accepts or rejects, the delivery service finds a rider, and a notification service keeps everyone informed. Each service owns its own data and reacts to events from the others, and when something fails halfway, the earlier steps are undone with compensating actions.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a **customer**, I want to browse restaurants and menus, so that I can choose food.",
            "As a **customer**, I want to place an order and pay, so that food comes to me.",
            "As a **customer**, I want my money back automatically if the restaurant rejects or no rider is found.",
            "As a **customer**, I want status updates (paid, accepted, rider assigned, picked up, delivered).",
            "As a **restaurant**, I want to accept or reject incoming orders, so that I don't take what I can't cook.",
            "As a **rider**, I want delivery jobs near me and to mark pickup and drop.",
            "As an **operator**, I want to follow one order across every service in a single trace, so that I can find where it got stuck.",
            "As a **developer on one team**, I want to change my service without breaking others, so that contract tests catch breaking changes before deploy.",
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
            ["FR-01", "All client traffic enters through an API gateway that validates the JWT and routes to services", "Must"],
            ["FR-02", "Restaurant service: restaurants, menus, prices, open hours; accept or reject orders", "Must"],
            ["FR-03", "Order service: place an order with an `Idempotency-Key`; prices are checked against the restaurant's menu at placement", "Must"],
            ["FR-04", "Payment service: authorize on `OrderPlaced`, refund or void on compensation; fake PSP", "Must"],
            ["FR-05", "Delivery service: assign a rider after the restaurant accepts; retry assignment through a RabbitMQ work queue", "Must"],
            ["FR-06", "Notification service: send messages on order events (log or fake email)", "Must"],
            ["FR-07", "The order flow is a choreography saga over Kafka events, with compensation for payment failure, restaurant rejection, and no rider found", "Must"],
            ["FR-08", "Each service owns its database; no service reads another's tables", "Must"],
            ["FR-09", "Each service publishes events through its own transactional outbox", "Must"],
            ["FR-10", "Every consumer is idempotent by event ID", "Must"],
            ["FR-11", "An order stuck in an intermediate state longer than a timeout is cancelled and compensated", "Must"],
            ["FR-12", "Customer can query order status and its history", "Must"],
            ["FR-13", "Restaurant acceptance times out to rejection after a set time", "Should"],
            ["FR-14", "Customer can cancel before the restaurant accepts", "Should"],
            ["FR-15", "Rider location updates during delivery", "Could"],
            ["FR-16", "Ratings for restaurant and rider", "Could"],
          ],
        },
      ],
    },
    {
      title: "Non-Functional Requirements",
      blocks: [
        {
          type: "table",
          headers: ["ID", "Requirement", "Target and how I check it"],
          rows: [
            ["NFR-01", "Runs on a laptop", "Whole stack (5 services, gateway, config server, PostgreSQL, Kafka, RabbitMQ, Jaeger) starts with one `docker compose up` within 8 GB of RAM (`docker stats`)"],
            ["NFR-02", "Happy path speed", "Placed to rider assigned p95 under 3 s with the fake restaurant auto-accepting, at 10 orders per second (k6 plus order status timestamps)"],
            ["NFR-03", "No stuck orders", "In a chaos run (stop payment or delivery service for 60 s during load), 100% of orders end in `RIDER_ASSIGNED` or `CANCELLED` (refunded if they were paid) within 5 minutes after restart (test harness)"],
            ["NFR-04", "Money is consistent", "Every cancelled order that was authorized has exactly one refund; no refund without an authorization (reconciliation query across service APIs)"],
            ["NFR-05", "Idempotent consumers", "Injecting each event twice changes nothing compared with once (integration test)"],
            ["NFR-06", "Traceability", "Every test order shows one trace spanning gateway and at least 4 services in Jaeger, including Kafka hops"],
            ["NFR-07", "Isolation", "With the notification service down, orders still complete; notifications catch up when it returns (chaos test)"],
            ["NFR-08", "Contracts", "A breaking change to an event or API fails the producer's build through a contract test"],
            ["NFR-09", "Gateway overhead", "Gateway adds under 15 ms p95 compared with calling the service directly (k6 both ways)"],
          ],
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "paragraph",
          text: "Database per service means five small schemas, not one big one. Services refer to each other's data only by ID, and keep a copy of whatever they need from events (the order service stores the item names and prices it was sold at, it doesn't join to the restaurant tables). Locally they're five databases in one PostgreSQL container; the rule is enforced by separate users and credentials, not separate servers.",
        },
        {
          type: "diagram",
          text: `order_db                         restaurant_db
┌──────────────────────────┐     ┌──────────────────────────┐
│ orders                   │     │ restaurants              │
│ id, customer_id          │     │ id, name, is_open        │
│ restaurant_id (ID only)  │     │ menu_items               │
│ status, total            │     │ id, restaurant_id, price │
│ idempotency_key UNIQUE   │     │ restaurant_orders        │
│ order_items (snapshot)   │     │ order_id, status         │
│ order_status_history     │     │ outbox, processed_events │
│ outbox, processed_events │     └──────────────────────────┘
└──────────────────────────┘
payment_db                       delivery_db
┌──────────────────────────┐     ┌──────────────────────────┐
│ payments                 │     │ riders                   │
│ order_id UNIQUE          │     │ id, status, zone         │
│ status AUTHORIZED|       │     │ deliveries               │
│   REFUNDED|FAILED        │     │ order_id UNIQUE          │
│ psp_reference, amount    │     │ rider_id, status         │
│ outbox, processed_events │     │ attempts                 │
└──────────────────────────┘     │ outbox, processed_events │
notification_db                  └──────────────────────────┘
┌──────────────────────────┐
│ sent_notifications       │
│ event_id UNIQUE, channel │
│ processed_events         │
└──────────────────────────┘`,
          caption: "No foreign keys cross a box. Cross-service links are plain IDs.",
        },
        {
          type: "code",
          language: "sql",
          title: "The two tables every service has",
          code: `CREATE TABLE outbox (
    id           BIGSERIAL PRIMARY KEY,
    event_id     UUID        NOT NULL UNIQUE,
    topic        VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,   -- used as the Kafka key (the order ID)
    event_type   VARCHAR(64) NOT NULL,
    payload      JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

CREATE TABLE processed_events (
    event_id     UUID         NOT NULL,
    consumer     VARCHAR(64)  NOT NULL,
    processed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, consumer)
);`,
        },
      ],
    },
    {
      title: "API Design",
      blocks: [
        {
          type: "paragraph",
          text: "Clients only see the gateway. Services talk to each other through events, not HTTP, for the order flow. The few synchronous reads (menu prices at placement) go through Resilience4j.",
        },
        {
          type: "table",
          headers: ["Method", "Path (via gateway)", "Purpose", "Success / failure"],
          rows: [
            ["GET", "/api/v1/restaurants?near=", "List open restaurants", "200"],
            ["GET", "/api/v1/restaurants/{id}/menu", "Menu with prices", "200 / 404"],
            ["POST", "/api/v1/orders", "Place an order (`Idempotency-Key`)", "202, or 200 on replay / 400, 409 key reused, 422 closed or price changed, 503 restaurant service unavailable"],
            ["GET", "/api/v1/orders/{id}", "Status and history", "200 / 403, 404"],
            ["POST", "/api/v1/orders/{id}/cancel", "Customer cancels before acceptance", "202 / 409 too late"],
            ["POST", "/api/v1/restaurant/orders/{id}/accept", "Restaurant accepts", "200 / 409 already decided"],
            ["POST", "/api/v1/restaurant/orders/{id}/reject", "Restaurant rejects with a reason", "200 / 409"],
            ["POST", "/api/v1/rider/deliveries/{id}/pickup", "Rider picked up", "200 / 409"],
            ["POST", "/api/v1/rider/deliveries/{id}/drop", "Rider delivered", "200 / 409"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/orders  (header Idempotency-Key: 3f8e2b1c-6a0d-4c7e-9b25-71d4e0a9c3f6)",
          code: `{
  "restaurantId": "r-118",
  "items": [
    { "menuItemId": "m-901", "quantity": 2, "expectedPrice": "180.00" },
    { "menuItemId": "m-944", "quantity": 1, "expectedPrice": "60.00" }
  ],
  "deliveryAddress": { "line1": "12 Park Street", "lat": 22.5535, "lng": 88.3520 }
}`,
        },
        {
          type: "code",
          language: "json",
          title: "Event on order.events (Kafka key = orderId)",
          code: `{
  "eventId": "9d6c1f0a-2e7b-4d3a-8f51-c4b2a7e90d13",
  "eventType": "OrderPlaced",
  "occurredAt": "2026-10-29T13:20:05Z",
  "orderId": "o-55012",
  "customerId": "c-77",
  "restaurantId": "r-118",
  "total": "420.00",
  "currency": "INR",
  "schemaVersion": 1
}`,
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "diagram",
          text: `                 Clients (customer, restaurant, rider apps)
                                  │ HTTPS + JWT
                                  ▼
                   ┌──────────────────────────────┐
                   │ Spring Cloud Gateway         │  routes, JWT check,
                   │                              │  rate limit, circuit breaker
                   └──┬───────┬────────┬───────┬──┘
                      ▼       ▼        ▼       ▼
               ┌────────┐ ┌──────────┐ ┌───────┐ ┌──────────┐ ┌──────────────┐
               │ order  │ │restaurant│ │payment│ │ delivery │ │ notification │
               │ svc    │ │ svc      │ │ svc   │ │ svc      │ │ svc          │
               └───┬────┘ └────┬─────┘ └───┬───┘ └──┬───┬───┘ └──────┬───────┘
                   │ own DB    │ own DB    │ own DB │   │ own DB     │ own DB
                   │ + outbox  │ + outbox  │        │   │            │
                   ▼           ▼           ▼        ▼   ▼            ▼
             ┌──────────────────────────────────────────────────────────────┐
             │ Kafka: order.events, payment.events, restaurant.events,      │
             │        delivery.events  (key = orderId)                      │
             └──────────────────────────────────────────────────────────────┘
                                                    │
                                     RabbitMQ: delivery.assign (work queue)
                                     + delivery.assign.retry (TTL, DLX back)

   Config server (git-backed)    Jaeger (OTLP traces)    Prometheus + Grafana`,
        },
        {
          type: "heading",
          text: "The saga, step by step",
        },
        {
          type: "paragraph",
          text: "There's no central coordinator. Each service listens for the event it cares about, does its local work in its own transaction, and publishes the next event through its outbox. That's **choreography**. Like the food court: nobody manages the others, each counter reacts to what it hears.",
        },
        {
          type: "diagram",
          text: `HAPPY PATH
order:      OrderPlaced ─────────────────────────────────────────────┐
payment:        └─► authorize ─► PaymentAuthorized                    │
restaurant:                          └─► accept ─► OrderAccepted     │ order service listens
delivery:                                              └─► assign ─► RiderAssigned
order:                                     status follows each event ◄┘

COMPENSATION
payment fails       PaymentFailed ──────────────────────► order CANCELLED
restaurant rejects  OrderRejected ─► payment refund ─► PaymentRefunded ─► order CANCELLED
no rider found      RiderAssignmentFailed ─► restaurant cancels prep
                                          ─► payment refund ─► PaymentRefunded ─► order CANCELLED`,
          caption: "Compensation doesn't erase history; it adds new events that undo the effect.",
        },
        {
          type: "heading",
          text: "Idempotent consumers",
        },
        {
          type: "paragraph",
          text: "Kafka and the outbox both give at-least-once delivery, so every consumer will sometimes see the same event twice. Each consumer records the event ID in `processed_events` inside the same transaction as its work. A duplicate fails the insert and is skipped.",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentEventsListener.java (in the order service)",
          code: `@Component
public class PaymentEventsListener {

    private final ProcessedEvents processed;
    private final OrderService orders;

    public PaymentEventsListener(ProcessedEvents processed, OrderService orders) {
        this.processed = processed;
        this.orders = orders;
    }

    @KafkaListener(topics = "payment.events", groupId = "order-service")
    @Transactional
    public void on(PaymentEvent event) {
        if (!processed.markIfNew(event.eventId(), "order-service")) {
            return; // already handled this event
        }
        switch (event.eventType()) {
            case "PaymentAuthorized" -> orders.markPaid(event.orderId());
            case "PaymentFailed", "PaymentRefunded" -> orders.cancel(event.orderId(), event.reason());
            default -> { } // events this service doesn't care about
        }
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "ProcessedEvents.java",
          code: `@Repository
public class ProcessedEvents {

    private final JdbcTemplate jdbc;

    public ProcessedEvents(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean markIfNew(UUID eventId, String consumer) {
        int inserted = jdbc.update(
                "INSERT INTO processed_events (event_id, consumer) VALUES (?, ?) ON CONFLICT DO NOTHING",
                eventId, consumer);
        return inserted == 1;
    }
}`,
        },
        {
          type: "paragraph",
          text: "Status changes in the order service are also forward-only (`UPDATE orders SET status = ? WHERE id = ? AND status = ?`), so a late `PaymentAuthorized` arriving after a cancellation doesn't resurrect the order.",
        },
        {
          type: "heading",
          text: "Rider assignment on RabbitMQ",
        },
        {
          type: "paragraph",
          text: "Finding a rider is a job, not a fact to broadcast: one worker should take it, try, and maybe try again in 30 seconds when more riders are free. That's a work queue, so it goes on RabbitMQ. On `OrderAccepted`, the delivery service puts an assignment job on `delivery.assign`. A worker tries to claim a free rider in the zone. If none is free, it sends the job to `delivery.assign.retry`, a queue with a 30-second TTL that dead-letters back to `delivery.assign`. After 5 attempts it publishes `RiderAssignmentFailed` to Kafka and the compensation starts.",
        },
        {
          type: "heading",
          text: "Gateway, discovery and config",
        },
        {
          type: "code",
          language: "yaml",
          title: "gateway application.yml (Spring Cloud 2025.x property names)",
          code: `spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: orders
              uri: http://order-service:8080
              predicates:
                - Path=/api/v1/orders/**
            - id: restaurants
              uri: http://restaurant-service:8080
              predicates:
                - Path=/api/v1/restaurants/**,/api/v1/restaurant/**
            - id: deliveries
              uri: http://delivery-service:8080
              predicates:
                - Path=/api/v1/rider/**`,
        },
        {
          type: "paragraph",
          text: "Older Spring Cloud versions use `spring.cloud.gateway.routes` without `server.webflux`. The URIs are plain hostnames: Docker Compose and Kubernetes both give each service a DNS name, so I don't run Eureka. Config comes from a Spring Cloud Config Server reading a git folder, so all five services' settings (topic names, timeouts, retry counts) are in one place and versioned. On Kubernetes, ConfigMaps can replace it.",
        },
        {
          type: "heading",
          text: "Tracing across services",
        },
        {
          type: "code",
          language: "yaml",
          title: "Each service (Spring Boot 3.x)",
          code: `management:
  tracing:
    sampling:
      probability: 1.0      # trace everything locally; lower it in production
  otlp:
    tracing:
      endpoint: http://jaeger:4318/v1/traces
spring:
  kafka:
    template:
      observation-enabled: true
    listener:
      observation-enabled: true`,
        },
        {
          type: "paragraph",
          text: "With `micrometer-tracing-bridge-otel` and `opentelemetry-exporter-otlp` on the classpath, HTTP calls carry the trace in headers automatically, and the two Kafka switches put it in Kafka record headers too. The outbox relay copies the trace context into the outbox row and back onto the record, otherwise the trace breaks at the database hop. Then one order is one trace in Jaeger, from the gateway to the rider assignment.",
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
            ["Java 21 + Spring Boot 3", "Same base for all services; I only have to learn the distributed parts"],
            ["Spring Cloud Gateway", "One entry point for routing, JWT validation, rate limits and circuit breakers"],
            ["Docker Compose / Kubernetes DNS", "Service discovery by name without running Eureka"],
            ["Spring Cloud Config Server", "Central, versioned config for every service"],
            ["PostgreSQL (one database per service)", "Data ownership with separate credentials"],
            ["Apache Kafka", "Domain events and the saga; replayable, keyed by order ID for per-order ordering"],
            ["RabbitMQ", "Rider assignment work queue with delayed retries"],
            ["Resilience4j", "Circuit breakers and timeouts on the few synchronous calls and the fake PSP"],
            ["Micrometer Tracing + OpenTelemetry + Jaeger", "One trace per order across HTTP and Kafka"],
            ["Prometheus + Grafana", "Per-service metrics and saga outcome counts"],
            ["Spring Cloud Contract", "Consumer-driven contracts for HTTP APIs and Kafka messages"],
            ["Testcontainers", "Each service tested against real PostgreSQL, Kafka and RabbitMQ"],
            ["kind or minikube (optional)", "Run the same images on a local Kubernetes cluster"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Choreography, not orchestration",
        },
        {
          type: "paragraph",
          text: "**Decision:** services react to each other's events; no saga coordinator. **Trade-off:** the flow isn't written down in one place, so it's harder to see and change. With four steps it's manageable, and it's the version that teaches event design best. I document the flow in the README, and if it grew past five or six steps I'd move to an orchestrator (an order saga class in the order service, or a workflow engine like Temporal).",
        },
        {
          type: "heading",
          text: "ADR-2: Authorize first, refund on failure",
        },
        {
          type: "paragraph",
          text: "**Decision:** payment happens before the restaurant sees the order. **Trade-off:** rejections need a refund (or a void of the authorization). The other order, restaurant first and payment last, means restaurants start cooking for orders that never get paid. Money first is how real apps behave.",
        },
        {
          type: "heading",
          text: "ADR-3: Outbox per service, polled",
        },
        {
          type: "paragraph",
          text: "**Decision:** each service has an outbox table and a small polling relay. **Trade-off:** up to a few hundred milliseconds of delay and a query loop per service. Debezium change data capture would remove the polling but adds Kafka Connect to run. Polling first, Debezium as a stretch goal.",
        },
        {
          type: "heading",
          text: "ADR-4: Kafka for facts, RabbitMQ for jobs",
        },
        {
          type: "paragraph",
          text: "**Decision:** domain events go to Kafka; rider assignment attempts go to RabbitMQ. **Trade-off:** two brokers to run. Events like `OrderAccepted` are read by several services and should be replayable, which is Kafka's strength. A retryable job taken by exactly one worker, with a delay between attempts, is RabbitMQ's.",
        },
        {
          type: "heading",
          text: "ADR-5: A saga timeout instead of trusting every event to arrive",
        },
        {
          type: "paragraph",
          text: "**Decision:** the order service runs a sweep that cancels and compensates orders stuck in one state longer than its timeout. **Trade-off:** one more scheduled job and a rare race where the real event arrives just after the timeout (handled by forward-only status updates). Without it, one lost or poison event leaves an order and its money stuck forever.",
        },
      ],
    },
    {
      title: "When NOT to Use Microservices",
      blocks: [
        {
          type: "paragraph",
          text: "I built this as microservices to learn microservices. For a real food delivery startup with one team, I'd start with a modular monolith and I'd say that in an interview without hesitating.",
        },
        {
          type: "list",
          items: [
            "**One small team.** Microservices solve the problem of many teams stepping on each other. With five developers, they mostly add meetings about contracts.",
            "**The domain isn't clear yet.** Service boundaries are expensive to move. Inside a monolith, moving code between modules is a refactor; between services, it's a migration.",
            "**You need transactions across the parts.** If most features need \"update A and B together\", splitting them turns every feature into a saga.",
            "**No platform basics.** Without CI/CD, central logs, tracing and alerts, debugging a request across five services is guesswork.",
            "**Low traffic.** Scaling one part independently only matters when that part actually needs different scale.",
          ],
        },
        {
          type: "table",
          headers: ["", "Modular monolith", "Microservices (this project)"],
          rows: [
            ["Deploy", "One artifact", "One per service"],
            ["Database", "One, with schema or table ownership per module", "One per service, no shared tables"],
            ["Cross-module change", "Local transaction", "Saga with compensation"],
            ["Calls between parts", "Method calls, checked by the compiler", "Events and HTTP, checked by contract tests"],
            ["Failure", "Whole app up or down", "Partial failures, need timeouts, retries, breakers"],
            ["Debugging", "One log, one stack trace", "Correlation IDs and distributed tracing"],
            ["Boundaries enforced by", "Packages and ArchUnit", "Network and separate repos or modules"],
            ["Good when", "One or a few teams, domain still changing", "Many teams, stable boundaries, parts with different scale"],
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "The path I'd actually take",
          text: "Build the modular monolith first (RideX in Project 9 is that style), keep modules talking through interfaces and in-process events, and split out a service only when a team or scaling reason shows up. If the modules are clean, the split is mostly moving code and swapping the in-process event bus for Kafka.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Duplicate `OrderPlaced` (relay published twice): payment's `processed_events` and the unique `order_id` on payments stop a second authorization.",
            "Events arrive out of order across topics (`OrderAccepted` before the order service has seen `PaymentAuthorized`): the order service checks allowed transitions and accepts forward jumps it can explain, or waits for the timeout sweep.",
            "Restaurant rejects after the customer already cancelled: forward-only statuses; the refund happens once because payment refunds are keyed on the order.",
            "Refund fails at the PSP: retry with backoff; after the limit, park it for manual handling and alert. Never mark the order refunded until the PSP confirms.",
            "Menu price changed between browsing and placing: the order service checks `expectedPrice` against the restaurant service and returns 422 if different.",
            "Restaurant service down when placing an order: circuit breaker opens, the gateway returns 503 quickly instead of hanging.",
            "Notification service down: other services don't care; it catches up from its Kafka offset when it returns.",
            "Rider assignment keeps failing: after the retry limit, `RiderAssignmentFailed` starts compensation.",
            "Poison message that can't be parsed: send to a per-topic dead-letter topic after one attempt, don't block the partition.",
            "Schema change: add fields only; a new required field means `schemaVersion` 2 and a period where consumers handle both.",
            "Clock differences between containers: never compare timestamps from different services to decide order; use per-order status rules.",
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
            "**Two services and a gateway.** Restaurant and order services with their own databases, gateway routes, JWT at the gateway, Compose file. Demo: browse a menu and place an order through the gateway. Tests: each service's integration tests on Testcontainers.",
            "**Kafka and the outbox.** Outbox and relay in the order service, `OrderPlaced` on Kafka, idempotent consumer base class. Demo: kill the relay, restart, event still published. Tests: duplicate event injected twice has one effect.",
            "**Payment and the first compensation.** Payment service with a fake PSP behind Resilience4j, `PaymentAuthorized` or `PaymentFailed`. Demo: a card set to fail ends the order `CANCELLED`. Tests: PSP timeout opens the breaker.",
            "**Restaurant decision and refund.** Accept or reject endpoints, acceptance timeout, refund on rejection. Demo: reject and watch the refund event. Tests: reject after cancel refunds once.",
            "**Delivery with RabbitMQ.** Assignment work queue, TTL retry queue, `RiderAssigned` or `RiderAssignmentFailed` with full compensation. Demo: no riders free, retries visible in the RabbitMQ UI, then cancellation and refund. Tests: retry count and final compensation.",
            "**Notifications, tracing, config.** Notification service, OpenTelemetry to Jaeger including Kafka hops, Config Server. Demo: one order as one trace in Jaeger. Tests: notification service down does not block orders.",
            "**Contracts, timeout sweep, chaos.** Spring Cloud Contract for the menu API and the payment events, saga timeout job, chaos script that stops services under load. Demo: k6 load with a service stopped and every order ending in a final state. Tests: contract tests in each producer's build.",
            "**Kubernetes (optional).** Deployments, Services and ConfigMaps on kind or minikube. Demo: the same flow on Kubernetes, scaling the delivery service to 3 replicas. Tests: smoke test script against the cluster.",
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
            "**Unit tests per service:** status transition rules, price checks, compensation decisions.",
            "**Integration tests per service:** Testcontainers PostgreSQL, Kafka and RabbitMQ; each service tested alone with the other services replaced by events the test publishes.",
            "**Contract tests:** Spring Cloud Contract. The consumer writes what it expects; the producer's build generates tests from it and fails on a breaking change. Covers HTTP (menu prices) and messaging (payment events).",
            "**End-to-end tests:** a small suite against the full Compose stack: happy path, payment failure, restaurant rejection, no rider.",
            "**Chaos tests:** a script stops and starts containers during a k6 run; a checker then verifies every order is in a final state and refunds match.",
            "**Load test:** k6 at 10 orders per second through the gateway; measure placed-to-assigned time from order history timestamps.",
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
            "Replace the polling relays with Debezium change data capture.",
            "An orchestrated version of the same saga, then compare the two in the README.",
            "Schema Registry with Avro or JSON Schema for event compatibility checks.",
            "Helm chart and a GitHub Actions pipeline that deploys to a local kind cluster.",
            "Read model (CQRS) for a customer \"my orders\" screen fed from all event topics.",
            "Rider live location over WebSockets (Project 7 again).",
            "Autoscaling the delivery service on RabbitMQ queue depth with KEDA.",
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
              question: "How do you keep data consistent without a distributed transaction?",
              answer:
                "With a saga. Each step is a local transaction in one service that publishes an event. If a later step fails, earlier steps are undone by compensating actions, like a refund for a payment.\n\nThe data is eventually consistent: for a few hundred milliseconds the order may say \"paid\" while the restaurant hasn't heard yet, and the design accepts that.",
            },
            {
              question: "Choreography or orchestration, and why?",
              answer:
                "Choreography: each service reacts to events, with no central coordinator. With four steps it stays readable and the services stay independent.\n\nThe cost is that the flow is spread out, so I documented it and added tracing. If the flow grew much longer or needed complex branching, I'd switch to an orchestrator.",
            },
            {
              question: "Why does every service need its own outbox?",
              answer:
                "Because each service writes to its database and publishes an event, and those are two systems with no shared transaction.\n\nThe outbox puts the event in the same local transaction as the data change, and a relay publishes it afterwards. Without it, a crash at the wrong moment either loses the event or publishes one for a change that rolled back.",
            },
            {
              question: "How are your consumers idempotent?",
              answer:
                "Each consumer inserts the event ID into `processed_events` in the same transaction as its work, with `ON CONFLICT DO NOTHING`. If nothing was inserted, the event was already handled and is skipped.\n\nOn top of that, status updates are conditional on the current status, so even a different event with the same meaning can't apply twice.",
            },
            {
              question: "What happens if the payment service is down when an order is placed?",
              answer:
                "Nothing breaks. `OrderPlaced` waits in Kafka, and the payment service processes it from its committed offset when it comes back.\n\nIf it's down longer than the saga timeout, the order service cancels the order. Since payment never authorized, there's nothing to refund.",
            },
            {
              question: "Why both Kafka and RabbitMQ?",
              answer:
                "Kafka holds the domain events several services read, like `OrderAccepted`, and lets me replay them.\n\nRider assignment is a job one worker should take and retry later if no rider is free. RabbitMQ does that with a work queue and a TTL retry queue, without me building delay logic on Kafka.",
            },
            {
              question: "How do you trace one order across services?",
              answer:
                "Micrometer Tracing with the OpenTelemetry bridge. The trace context travels in HTTP headers and Kafka record headers, and the outbox stores it so it survives the database hop.\n\nIn Jaeger one order is one trace from the gateway to the rider assignment, so I can see which service was slow or where it stopped.",
            },
            {
              question: "Why no Eureka?",
              answer:
                "Docker Compose and Kubernetes both already give each service a stable DNS name and load-balance between replicas.\n\nEureka would be one more thing to run for a problem the platform already solves. I'd use it only outside a container platform.",
            },
            {
              question: "What do contract tests give you that integration tests don't?",
              answer:
                "Integration tests check my service against my own idea of the other service. Contract tests check it against what the consumer actually expects.\n\nThe consumer's expectations become tests in the producer's build, so renaming a field in `PaymentAuthorized` fails the payment service's build before it can break the order service.",
            },
            {
              question: "What would you do differently for a real startup?",
              answer:
                "Start with a modular monolith. One team doesn't need five deployables, and most early features would need sagas across services.\n\nI'd keep module boundaries strict and use in-process events, so splitting a service out later is mostly moving code. This project was about learning the microservice parts, not about that being the best first architecture.",
            },
            {
              question: "How do you change an event schema without breaking consumers?",
              answer:
                "Only add optional fields, never rename or remove in place. Consumers ignore unknown fields.\n\nFor a breaking change, I bump `schemaVersion`, publish both versions for a while or make consumers handle both, and remove the old one after every consumer has moved. Contract tests catch accidental breaks.",
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
            "Designed a food delivery backend as 5 Spring Boot microservices with database-per-service, Spring Cloud Gateway and a Kafka choreography saga with compensating refunds; transactional outbox and idempotent consumers in every service.",
            "Used RabbitMQ TTL queues for rider-assignment retries, Resilience4j around synchronous calls, and OpenTelemetry tracing across HTTP and Kafka; verified in chaos tests that 100% of orders reached a final state with matching refunds.",
            "Guarded APIs and events with Spring Cloud Contract tests; ran locally with Docker Compose and on a kind Kubernetes cluster.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Only claim what you built",
          text: "Keep only the lines you can demo. If you never ran it on Kubernetes, drop that part. The \"100% of orders\" claim must come from your own chaos run, with the order count you used. And be ready to explain why you'd start a real product as a monolith; it shows judgement, not weakness.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "**Microservices**: service boundaries, database per service, API gateway, sagas, and the interview questions in the microservices and messaging set.",
            "**Kafka and RabbitMQ**: partitions and keys for per-order ordering, consumer groups, dead-letter topics, TTL and dead-letter exchanges.",
            "**Architecture Styles** (System Design): modular monolith versus microservices, event-driven design.",
            "**Idempotency and Webhooks** (System Design): idempotent consumers and keys.",
            "**Reliable Outbound Calls** (System Design): timeouts, retries and circuit breakers.",
            "**State Machines for Business Workflows** (System Design): forward-only order statuses.",
            "**HLD**: how food delivery is drawn in system design interviews.",
            "Docker Compose networking and Kubernetes basics: Deployments, Services, ConfigMaps.",
            "Projects 6, 8 and 9 first: locking, the outbox and the saga ideas all build on them.",
          ],
        },
      ],
    },
  ],
};
