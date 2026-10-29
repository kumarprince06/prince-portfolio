import type { Lesson } from "../types";

export const orderPaymentService: Lesson = {
  slug: "order-payment-service",
  date: "2026-10-29",
  title: "Project 5: E-commerce Orders and Payments",
  description:
    "A cart-to-order-to-payment backend against a mock payment gateway: a gateway interface with adapters, an enum state machine for orders, idempotency keys, HMAC-signed webhooks with dedupe, a transactional outbox for order events, refunds, and timeouts and retries on the gateway client.",
  tags: ["Project", "Spring Boot", "PostgreSQL", "Payments", "Webhooks"],
  difficulty: "Medium",
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "Money is where backend mistakes get expensive. Charging a customer twice, marking an order paid when the payment failed, or losing the \"order paid\" event that tells the warehouse to ship: these are the bugs that reach the CEO. Interviewers for product companies, fintech and e-commerce love this area because it tests whether I think about failure, not just the happy path.",
        },
        {
          type: "paragraph",
          text: "This project combines everything from Projects 1 to 4 and adds the hard part of talking to an external system I don't control: it can be slow, time out, succeed without telling me, or tell me twice. I build a fake gateway that does all of those on purpose.",
        },
        {
          type: "table",
          headers: ["Job skill", "Where it shows up here"],
          rows: [
            ["Design patterns", "`PaymentGateway` interface with adapters (Strategy/Adapter) for a mock gateway and a test fake"],
            ["State machines", "Order status as an enum with explicit allowed transitions"],
            ["Idempotency", "`Idempotency-Key` on checkout; the same key passed on to the gateway"],
            ["Webhooks", "HMAC-SHA256 signature check, timestamp tolerance, event dedupe table"],
            ["Reliable events", "Transactional outbox + relay with `SKIP LOCKED`"],
            ["Resilient HTTP clients", "Connect/read timeouts, retries with backoff only where safe, \"unknown\" outcomes"],
            ["Money handling", "Minor units (`long` cents), partial refunds that can't exceed the captured amount"],
          ],
        },
        {
          type: "paragraph",
          text: "**Effort:** 4 to 5 weekends. The fake gateway is a weekend on its own, but it's what makes every failure test possible.",
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Think of ordering at a restaurant that uses a card machine. I pick dishes (the cart), the waiter writes a bill with the prices at that moment (the order), and I tap my card (the payment). Sometimes the machine says \"processing\" and freezes; the waiter must not charge me again just because he pressed the button twice. Later the bank sends a slip confirming the payment, and the kitchen only starts cooking when the bill is marked paid. If a dish never arrives, the restaurant refunds that dish. This service is that restaurant's backend: carts, orders with frozen prices, payments through a gateway, signed confirmations from the gateway, events to the \"kitchen\" (fulfilment), and full or partial refunds.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a shopper, I want to add products to a cart and change quantities, so that I can review before paying.",
            "As a shopper, I want the price I see at checkout to be the price I'm charged, even if the catalogue changes a minute later.",
            "As a shopper on a bad connection, I want pressing Pay twice to charge me once.",
            "As a shopper, I want to see clearly whether my order is waiting for payment, paid, cancelled or refunded.",
            "As a support agent, I want to refund a whole order or one item, and never refund more than was paid.",
            "As the fulfilment team, I want an `OrderPaid` event exactly when an order is paid, and never lost even if a server crashes.",
            "As the operator, I want unpaid orders cancelled automatically after 30 minutes so that stock is released.",
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
            ["FR-01", "Products with price in minor units and stock count; cart add/update/remove; one cart per user.", "Must"],
            ["FR-02", "Checkout turns the cart into an order with price snapshots per line, reserves stock, status PENDING_PAYMENT.", "Must"],
            ["FR-03", "Checkout requires `Idempotency-Key`; repeats return the same order.", "Must"],
            ["FR-04", "Pay an order through the `PaymentGateway` interface; the gateway call carries the same idempotency key.", "Must"],
            ["FR-05", "Order status changes only through `OrderStatus.canMoveTo`; illegal transitions return 409.", "Must"],
            ["FR-06", "Webhook endpoint verifies HMAC-SHA256 signature and timestamp (±5 min); invalid → 401.", "Must"],
            ["FR-07", "Webhook events are deduplicated by provider event id; duplicates return 200 and do nothing.", "Must"],
            ["FR-08", "Order and outbox row are written in the same transaction; a relay publishes outbox rows at least once.", "Must"],
            ["FR-09", "Full and partial refunds; total refunded ≤ captured amount; order becomes PARTIALLY_REFUNDED or REFUNDED.", "Must"],
            ["FR-10", "Gateway client has connect and read timeouts; retries only on timeouts, 5xx and 429, max 3 attempts with backoff.", "Must"],
            ["FR-11", "A timed-out charge leaves the payment PENDING; a reconciliation job asks the gateway for the real status.", "Should"],
            ["FR-12", "Unpaid orders auto-cancel after 30 minutes and release stock.", "Should"],
            ["FR-13", "Coupons and tax lines.", "Could"],
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
            ["NFR-01", "Zero double charges: 20 parallel pay requests with one key → 1 gateway charge", "Concurrency integration test counting calls on the fake gateway"],
            ["NFR-02", "Zero lost events: kill the app between commit and publish, restart, the event is still delivered", "Manual chaos test documented in README + relay integration test"],
            ["NFR-03", "Duplicate webhooks (same event sent 5×) change state once", "Integration test"],
            ["NFR-04", "A gateway that hangs never blocks a request thread for more than 6 s (2 s connect + 4 s read)", "Fake gateway with a 30-s delay; assert response time"],
            ["NFR-05", "Checkout + pay p95 under 300 ms at 30 virtual users with the fake gateway at 50 ms latency", "k6"],
            ["NFR-06", "Stock never goes negative under concurrent checkouts", "Concurrency test + `CHECK (stock >= 0)`"],
            ["NFR-07", "Outbox relay lag under 2 s in normal operation", "Log publish time minus created time during the k6 run"],
          ],
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "table",
          headers: ["Table", "Key columns", "Notes"],
          rows: [
            ["products", "`id`, `sku` unique, `name`, `price_cents BIGINT`, `currency`, `stock INT CHECK (stock >= 0)`", ""],
            ["carts / cart_items", "`cart.user_id` unique; `cart_items (cart_id, product_id) PK`, `quantity`", "Prices are not stored in the cart"],
            ["orders", "`id`, `user_id`, `status`, `total_cents`, `currency`, `idempotency_key`, `version`, `created_at`", "Unique `(user_id, idempotency_key)`"],
            ["order_items", "`order_id`, `product_id`, `quantity`, `unit_price_cents`, `refunded_quantity`", "Price snapshot at checkout"],
            ["payments", "`id`, `order_id`, `provider`, `provider_payment_id` unique NULL, `idempotency_key` unique, `amount_cents`, `refunded_cents`, `status` (PENDING, SUCCEEDED, FAILED)", "One successful payment per order (partial unique index)"],
            ["refunds", "`id`, `payment_id`, `amount_cents`, `reason`, `status`, `provider_refund_id`, `idempotency_key` unique", ""],
            ["webhook_events", "`provider`, `event_id`, `type`, `received_at`, `payload JSONB`", "PK `(provider, event_id)` for dedupe"],
            ["outbox", "`id BIGINT`, `aggregate_type`, `aggregate_id`, `event_type`, `payload JSONB`, `created_at`, `published_at NULL`, `attempts`", "Partial index on `id WHERE published_at IS NULL`"],
          ],
        },
        {
          type: "diagram",
          text: `+---------+ 1   1 +-------+ 1   * +------------+ *   1 +-----------+
|  users  |-------| carts |-------| cart_items |-------| products  |
+----+----+       +-------+       +------------+       +-----+-----+
     | 1                                                     | 1
     | *                                                     | *
+----+-----------+ 1                         * +-------------+-----+
|    orders      |-----------------------------|   order_items     |
|----------------|                             | unit_price_cents  |
| status         |                             | refunded_quantity |
| total_cents    |                             +-------------------+
| version        |
+----+-----------+
     | 1
     | *
+----+-----------+ 1       * +-----------+
|   payments     |-----------|  refunds  |
| provider_pay_id|           +-----------+
| refunded_cents |
+----------------+

webhook_events (provider, event_id) PK      outbox (unpublished rows -> relay)`,
          caption: "Orders hold the business state; payments hold the gateway's view; outbox and webhook_events are plumbing for reliability.",
        },
        {
          type: "code",
          language: "sql",
          title: "Safety constraints",
          code: `CREATE UNIQUE INDEX ux_orders_user_key ON orders (user_id, idempotency_key);

CREATE UNIQUE INDEX ux_payments_one_success_per_order
    ON payments (order_id)
    WHERE status = 'SUCCEEDED';

ALTER TABLE payments
    ADD CONSTRAINT ck_refunded_not_more_than_paid
    CHECK (refunded_cents >= 0 AND refunded_cents <= amount_cents);

CREATE INDEX ix_outbox_unpublished ON outbox (id) WHERE published_at IS NULL;`,
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
            ["GET", "/api/v1/products", "Catalogue", "200", "-"],
            ["PUT", "/api/v1/cart/items/{productId}", "Set quantity (0 removes)", "200", "400, 404, 409 (not enough stock)"],
            ["GET", "/api/v1/cart", "Cart with current prices", "200", "401"],
            ["POST", "/api/v1/orders", "Checkout (needs `Idempotency-Key`)", "201 (replay: 201 same body)", "400, 409 (empty cart / stock), 422 (key reused)"],
            ["GET", "/api/v1/orders/{id}", "Order with status and payments", "200", "404"],
            ["POST", "/api/v1/orders/{id}/payments", "Pay (needs `Idempotency-Key`)", "201 SUCCEEDED, 202 PENDING", "402 (declined), 404, 409 (wrong state), 503 (gateway down)"],
            ["POST", "/api/v1/orders/{id}/refunds", "Refund amount or items (support role)", "201, 202 PENDING", "403, 404, 409, 422 (exceeds paid)"],
            ["POST", "/api/v1/webhooks/fakepay", "Gateway events", "200", "400 (bad payload), 401 (bad signature)"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/orders/481/payments, Idempotency-Key: pay-481-1 → 201",
          code: `{
  "paymentId": 9012,
  "orderId": 481,
  "status": "SUCCEEDED",
  "amountCents": 259900,
  "currency": "INR",
  "provider": "fakepay",
  "providerPaymentId": "fp_pay_8Kq2LmZ1",
  "orderStatus": "PAID"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "Webhook from the gateway (headers: X-Signature-Timestamp: 1793260800, X-Signature: <hex HMAC>)",
          code: `{
  "id": "evt_3Fh7Qa9",
  "type": "payment.succeeded",
  "createdAt": "2026-10-29T11:20:00Z",
  "data": {
    "paymentId": "fp_pay_8Kq2LmZ1",
    "idempotencyKey": "pay-481-1",
    "amountCents": 259900,
    "currency": "INR"
  }
}`,
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "diagram",
          text: `  Shopper / k6                                  FakePay (separate Spring Boot app)
       |                                          ^  simulates delay, decline,
       v                                          |  timeout, duplicate webhooks
+------------------------------------------------+-+-----------------------+
| order-service                                   |                         |
|                                                 |                         |
|  CartController  OrderController  PaymentController   WebhookController   |
|        |               |                |                  |              |
|        v               v                v                  v              |
|  CartService --> CheckoutService   PaymentService     WebhookService      |
|                  (snapshot prices,  |  uses           (verify HMAC,       |
|                   reserve stock)    |  PaymentGateway   dedupe event,      |
|                                     v  (interface)      apply transition)  |
|                          +---------------------+                          |
|                          | FakePayAdapter      |---- HTTP, timeouts, -----+
|                          | (RestClient)        |     retries
|                          +---------------------+
|                                                                           |
|  Every state change: UPDATE orders + INSERT outbox  (one transaction)    |
|                                                                           |
|  OutboxRelay (@Scheduled 500 ms): SELECT ... FOR UPDATE SKIP LOCKED      |
|     -> EventPublisher (log/in-memory now, Kafka later) -> mark published  |
|  Reconciler (@Scheduled 1 min): PENDING payments older than 2 min        |
|     -> gateway.getPayment(...)                                            |
+---------------------------------+-----------------------------------------+
                                  v
                            PostgreSQL 16`,
        },
        {
          type: "paragraph",
          text: "The core of the design is that the order service never trusts a single message. The synchronous response from the gateway, the webhook and the reconciler can all report the same payment; whichever arrives first moves the state, and the state machine plus dedupe make the others harmless.",
        },
        {
          type: "code",
          language: "java",
          title: "OrderStatus.java",
          code: `public enum OrderStatus {
    PENDING_PAYMENT,
    PAID,
    SHIPPED,
    CANCELLED,
    PARTIALLY_REFUNDED,
    REFUNDED;

    public boolean canMoveTo(OrderStatus next) {
        return switch (this) {
            case PENDING_PAYMENT -> next == PAID || next == CANCELLED;
            case PAID -> next == SHIPPED || next == PARTIALLY_REFUNDED || next == REFUNDED;
            case SHIPPED -> next == PARTIALLY_REFUNDED || next == REFUNDED;
            case PARTIALLY_REFUNDED -> next == PARTIALLY_REFUNDED || next == REFUNDED;
            case CANCELLED, REFUNDED -> false;
        };
    }
}`,
        },
        {
          type: "paragraph",
          text: "The switch has no `default`, so if I add a new status the compiler forces me to decide its transitions. A failed payment doesn't change the order: it stays PENDING_PAYMENT so the shopper can try another card, and the payment row records FAILED.",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentGateway.java (the port) and its value types",
          code: `public interface PaymentGateway {

    String name();

    ChargeResult charge(ChargeRequest request);

    ChargeResult getPayment(String idempotencyKey);

    RefundResult refund(RefundRequest request);
}

public record ChargeRequest(String idempotencyKey, long amountCents, String currency, String orderRef) {}

public record ChargeResult(Outcome outcome, String providerPaymentId, String declineReason) {
    public enum Outcome { SUCCEEDED, DECLINED, UNKNOWN }
}

public record RefundRequest(String idempotencyKey, String providerPaymentId, long amountCents) {}

public record RefundResult(Outcome outcome, String providerRefundId) {
    public enum Outcome { SUCCEEDED, FAILED, UNKNOWN }
}`,
        },
        {
          type: "paragraph",
          text: "`UNKNOWN` is the important value. A timeout doesn't mean the charge failed; the money may already have moved. So a timeout leaves the payment PENDING, the API answers 202, and the webhook or the reconciler settles it later.",
        },
        {
          type: "code",
          language: "java",
          title: "WebhookSignatureVerifier.java",
          code: `@Component
class WebhookSignatureVerifier {

    private static final Duration TOLERANCE = Duration.ofMinutes(5);

    private final byte[] secret;
    private final Clock clock;

    WebhookSignatureVerifier(@Value("\${fakepay.webhook-secret}") String secret, Clock clock) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    boolean isValid(String rawBody, String timestampHeader, String signatureHex) {
        long timestamp;
        byte[] given;
        try {
            timestamp = Long.parseLong(timestampHeader);
            given = HexFormat.of().parseHex(signatureHex);
        } catch (RuntimeException e) {
            return false;
        }

        Instant sentAt = Instant.ofEpochSecond(timestamp);
        if (Duration.between(sentAt, clock.instant()).abs().compareTo(TOLERANCE) > 0) {
            return false; // too old or from the future: possible replay
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] expected = mac.doFinal(
                    (timestampHeader + "." + rawBody).getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(expected, given); // constant-time compare
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC not available", e);
        }
    }
}`,
        },
        {
          type: "paragraph",
          text: "The controller takes the body as a raw `String` (`@RequestBody String body`), verifies it, and only then parses it with Jackson. Parsing first and re-serialising would change whitespace or key order and break the signature.",
        },
        {
          type: "code",
          language: "java",
          title: "WebhookService.java (dedupe + transition + outbox in one transaction)",
          code: `@Transactional
public void handle(WebhookEvent event) {
    int inserted = webhookEvents.insertIfAbsent("fakepay", event.id(), event.type(), event.rawJson());
    if (inserted == 0) {
        return; // already processed: duplicate delivery
    }
    if (!event.type().equals("payment.succeeded")) {
        return;
    }

    Payment payment = payments.findByIdempotencyKey(event.data().idempotencyKey())
            .orElseThrow(() -> new UnknownPaymentException(event.data().idempotencyKey()));
    if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
        return; // the synchronous response got here first
    }
    payment.markSucceeded(event.data().paymentId());

    Order order = orders.findById(payment.getOrderId()).orElseThrow();
    order.moveTo(OrderStatus.PAID); // throws IllegalTransitionException if not allowed
    outbox.add("Order", order.getId(), "OrderPaid", OrderPaidPayload.from(order));
}`,
        },
        {
          type: "paragraph",
          text: "`insertIfAbsent` is `INSERT INTO webhook_events ... ON CONFLICT (provider, event_id) DO NOTHING`. Because it's in the same transaction, a crash halfway rolls back the dedupe row too, and the gateway's retry will process the event again. That's the property I want: processed exactly once from the outside, delivered at least once underneath.",
        },
        {
          type: "code",
          language: "sql",
          title: "Outbox relay: claim a batch without blocking other relays",
          code: `SELECT id, aggregate_type, aggregate_id, event_type, payload
FROM outbox
WHERE published_at IS NULL
ORDER BY id
LIMIT 100
FOR UPDATE SKIP LOCKED;

-- after publishing each row successfully, in the same transaction:
UPDATE outbox SET published_at = now() WHERE id = :id;`,
        },
        {
          type: "code",
          language: "java",
          title: "Gateway HTTP client with explicit timeouts",
          code: `@Bean
RestClient fakePayClient(RestClient.Builder builder, @Value("\${fakepay.base-url}") String baseUrl) {
    HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
    factory.setReadTimeout(Duration.ofSeconds(4));
    return builder
            .baseUrl(baseUrl)
            .requestFactory(factory)
            .build();
}`,
        },
        {
          type: "paragraph",
          text: "Retries wrap the adapter with Spring Retry or Resilience4j: up to 3 attempts, exponential backoff with jitter (200 ms, 400 ms, 800 ms ± random), and only for connection errors, timeouts, 5xx and 429. A 4xx decline is never retried. Retrying a charge is only safe because every attempt sends the same idempotency key, so FakePay returns the first result instead of charging again.",
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
            ["Java 21 + Spring Boot 3.x", "Records for gateway DTOs, exhaustive `switch` for the state machine"],
            ["PostgreSQL 16 + Flyway", "Constraints for money rules, `ON CONFLICT` for dedupe, `SKIP LOCKED` for the outbox"],
            ["Spring `RestClient` + JDK `HttpClient`", "Modern synchronous HTTP client with explicit timeouts"],
            ["Spring Retry or Resilience4j", "Declarative retries with backoff; Resilience4j also gives a circuit breaker later"],
            ["`javax.crypto.Mac` (HmacSHA256)", "Standard library is enough for webhook signatures"],
            ["FakePay (second Spring Boot app)", "A controllable gateway: latency, decline rate, timeouts, duplicate and out-of-order webhooks"],
            ["WireMock", "Precise failure scenarios in adapter tests (500 then 200, slow responses)"],
            ["Testcontainers, k6, Docker Compose", "Real DB in tests, load numbers, one-command stack with both apps"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Gateway behind an interface (Strategy + Adapter)",
        },
        {
          type: "paragraph",
          text: "Like a phone charger with swappable plugs: the phone (my service) has one socket, and each country's plug (gateway) adapts to it. `PaymentService` talks to `PaymentGateway`; `FakePayAdapter` translates to FakePay's HTTP API. Adding a real provider later is a new adapter, not a rewrite. Trade-off: the interface must be generic enough for several providers, and provider-specific features (like 3-D Secure) don't fit neatly.",
        },
        {
          type: "heading",
          text: "ADR-2: Money as long minor units",
        },
        {
          type: "paragraph",
          text: "₹2,599.00 is stored as `259900`. Integers add exactly, match how gateways send amounts, and avoid `BigDecimal` scale surprises. Trade-off: currencies with 0 or 3 decimal places need a per-currency exponent when displaying. I store `currency` on every amount for that reason.",
        },
        {
          type: "heading",
          text: "ADR-3: Transactional outbox instead of publishing directly",
        },
        {
          type: "paragraph",
          text: "Like writing \"tell the kitchen\" in the same order book as \"bill paid\", and a runner checking the book. If I publish to a broker after commit and crash in between, the event is lost; if I publish before commit and then roll back, I announced something that didn't happen. Writing the event in the same transaction makes both-or-neither. Trade-off: delivery is at-least-once, so consumers must dedupe by event id, and there's a small delay from polling.",
        },
        {
          type: "heading",
          text: "ADR-4: Treat timeouts as UNKNOWN, not FAILED",
        },
        {
          type: "paragraph",
          text: "A timeout means \"I don't know\". Marking it failed invites the shopper to pay again and get charged twice. Keeping it PENDING and reconciling costs a slower answer for the shopper (202, then a status check). Trade-off: the UI must handle a \"we're confirming your payment\" state.",
        },
        {
          type: "heading",
          text: "ADR-5: Order state machine as an enum, not a library",
        },
        {
          type: "paragraph",
          text: "Six states and a handful of transitions fit in one readable `switch`, and the compiler checks it's complete. Spring Statemachine would add configuration and concepts I don't need yet. Trade-off: no built-in transition history; I get that from the outbox events.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Pay button pressed twice → same `Idempotency-Key`, second request replays the first (or 409 while in progress); FakePay sees one charge.",
            "Gateway charges successfully but the response times out → payment PENDING, 202 to the client, webhook or reconciler marks it SUCCEEDED.",
            "Webhook arrives before the synchronous response → webhook marks it paid; the late response finds SUCCEEDED and does nothing.",
            "Same webhook delivered 5 times → dedupe table, processed once.",
            "Webhook with a valid signature but a timestamp 1 hour old → rejected as a possible replay.",
            "Webhook for an unknown payment → log and return 200 after storing it, so the gateway stops retrying; alert on it.",
            "Payment succeeds after the order was auto-cancelled → can't move CANCELLED → PAID; trigger an automatic refund and an alert.",
            "Price changes between add-to-cart and checkout → the order uses the price at checkout and the response shows it; the cart never stores prices.",
            "Two checkouts racing for the last unit → `UPDATE products SET stock = stock - :q WHERE id = :id AND stock >= :q`, row count decides (Project 4's lesson).",
            "Refund of ₹500 on a ₹400 payment, or two parallel refunds that together exceed it → lock the payment row (`SELECT ... FOR UPDATE`) before checking, and the `CHECK` constraint backs it up.",
            "Gateway returns 429 → retry after `Retry-After` if it's short, otherwise fail with 503 and let the client retry.",
            "Outbox relay crashes after publishing but before marking published → the event is published again; consumers dedupe by outbox id.",
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
            "**Catalogue, cart, checkout.** Products, cart, order with price snapshots, stock reservation, checkout idempotency. Demo: checkout twice with one key, get one order. Tests: price snapshot, stock never negative under parallel checkouts, key replay.",
            "**State machine.** `OrderStatus.canMoveTo`, `Order.moveTo`, 409 on illegal moves, auto-cancel job. Demo: try to ship an unpaid order and get 409. Tests: a parameterised test over every (from, to) pair.",
            "**FakePay + adapter.** Second app with `/charges`, `/charges/{key}`, `/refunds`, configurable latency and decline rate; `FakePayAdapter` with timeouts and retries. Demo: pay with a 10% decline rate. Tests: WireMock adapter tests (500 then 200 retried; 402 not retried; slow → UNKNOWN).",
            "**Webhooks.** FakePay signs and sends events (sometimes twice, sometimes late); verifier, dedupe, transitions. Demo: tamper with one byte of the body and get 401. Tests: valid, bad signature, stale timestamp, duplicate, webhook-before-response.",
            "**Outbox and reconciler.** Outbox writes, relay with `SKIP LOCKED`, `OrderPaid` consumer that logs, reconciler for PENDING payments. Demo: kill the app right after payment, restart, see the event delivered. Tests: relay publishes and marks rows; reconciler settles a PENDING payment.",
            "**Refunds and proof.** Full and partial refunds with row locking, k6 run, README with failure scenarios and numbers. Demo: refund one item, then the rest; a third refund gets 422. Tests: parallel refunds never exceed the paid amount.",
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
            "**Unit:** `OrderStatus` transition table, refund math (partial, full, over-limit), HMAC verifier (valid, tampered body, wrong secret, stale timestamp, non-hex signature), retry classification (which errors are retryable).",
            "**Adapter (WireMock):** timeouts produce UNKNOWN, retries send the same idempotency key every time, 4xx isn't retried, 429 respects `Retry-After`.",
            "**Integration (Testcontainers):** checkout → pay → webhook → outbox flow; webhook dedupe; webhook-before-response ordering; refund row locking; outbox relay with two relays running.",
            "**Concurrency:** 20 parallel pays with one key → one gateway charge; 10 parallel refunds → total ≤ paid.",
            "**Load (k6):** checkout + pay at 30 users with FakePay at 50 ms latency and 5% declines; record p95, error rate and outbox lag.",
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
            "Replace the in-process publisher with Kafka (or RabbitMQ) and a consumer service that dedupes by event id.",
            "Circuit breaker on the gateway client (Resilience4j) with a fallback \"payments temporarily unavailable\" response.",
            "A second adapter for a real provider's sandbox, chosen by configuration per order.",
            "Saga for checkout across separate inventory and payment services, with compensating actions.",
            "Daily settlement report comparing my payments table with the gateway's list.",
            "OpenTelemetry tracing across order-service and FakePay to show one request end to end.",
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
              question: "How do you make sure a customer is never charged twice?",
              answer:
                "Three layers. The client sends an `Idempotency-Key`, and I store it with a unique constraint, so a repeated request replays the first result. I pass the same key to the gateway, so even my own retries are deduplicated on their side. And a partial unique index allows only one SUCCEEDED payment per order.\n\nI also treat timeouts as unknown rather than failed, so the shopper isn't invited to pay again while the first charge might have gone through.",
            },
            {
              question: "What happens if the gateway call times out?",
              answer:
                "I don't know whether the money moved, so I keep the payment PENDING and return 202. Then either the gateway's webhook arrives and settles it, or my reconciler job asks the gateway for the status by idempotency key after a couple of minutes.\n\nRetries happen only with the same idempotency key, and only for timeouts, 5xx and 429, never for declines.",
            },
            {
              question: "How do you verify a webhook really came from the gateway?",
              answer:
                "The gateway signs `timestamp + \".\" + rawBody` with HMAC-SHA256 using a shared secret. I compute the same HMAC over the raw body exactly as received and compare with `MessageDigest.isEqual`, which runs in constant time so attackers can't learn the signature byte by byte from response timings.\n\nI also reject timestamps more than 5 minutes off, so a captured webhook can't be replayed later.",
            },
            {
              question: "Webhooks can arrive twice or out of order. How do you handle that?",
              answer:
                "Twice: I insert the event id into a `webhook_events` table with `ON CONFLICT DO NOTHING` in the same transaction as the state change. If nothing was inserted, it's a duplicate and I return 200 without doing anything.\n\nOut of order: the state machine decides. A `payment.succeeded` for an order that's already PAID is a no-op; one for a CANCELLED order can't move it to PAID, so I trigger a refund and alert instead.",
            },
            {
              question: "What is the transactional outbox and why not just publish to Kafka after saving?",
              answer:
                "Saving the order and publishing the event are two separate systems, so there's no single transaction. If I crash after commit but before publishing, the event is lost; if I publish first and the commit fails, I've announced a payment that didn't happen.\n\nWith the outbox, I insert the event into an `outbox` table in the same database transaction as the order change. A relay polls unpublished rows, publishes them, and marks them published. It's at-least-once, so consumers dedupe by event id.",
            },
            {
              question: "Why is the order state machine an enum and not a set of if statements?",
              answer:
                "All allowed transitions live in one place, `canMoveTo`, so every caller (API, webhook, reconciler, auto-cancel job) goes through the same rules. The exhaustive `switch` means adding a status won't compile until I define its transitions.\n\nScattered if statements are how you end up with a refunded order being shipped.",
            },
            {
              question: "How do you stop refunds from exceeding the amount paid?",
              answer:
                "In the refund transaction I lock the payment row with `SELECT ... FOR UPDATE`, check `refunded_cents + amount <= amount_cents`, call the gateway with an idempotency key, and update `refunded_cents`. Two parallel refunds queue on the lock, so the second sees the first one's total.\n\nA `CHECK` constraint on the payments table is the final guard.",
            },
            {
              question: "Why did you use the Strategy/Adapter pattern for the gateway? Isn't one implementation enough?",
              answer:
                "I actually have two from day one: the FakePay HTTP adapter and an in-memory fake used in unit tests. The interface also keeps the domain clean: `PaymentService` speaks in my terms (`ChargeRequest`, `Outcome.UNKNOWN`), and only the adapter knows FakePay's JSON and status codes.\n\nWhen a real provider comes, it's a new adapter with its own tests, and nothing in the order logic changes.",
            },
            {
              question: "Why store money as long cents and not BigDecimal?",
              answer:
                "Payment gateways work in minor units, integer addition is exact, and there's no scale to manage. `BigDecimal` is also correct, and I used it in Project 1, but here every amount crosses an API boundary as an integer anyway.\n\nThe catch is currencies without two decimal places, so I keep the currency with every amount and convert only for display.",
            },
            {
              question: "Which timeouts did you set on the gateway client, and why those values?",
              answer:
                "A 2-second connect timeout and a 4-second read timeout. Connecting to a healthy service takes milliseconds, so 2 seconds only trips when it's down. The read timeout is above FakePay's normal latency with room for slow moments, but low enough that one stuck gateway can't hold all my request threads.\n\nWith 3 attempts and backoff, the worst case stays bounded, and I measured it in a test with a gateway that never answers.",
            },
            {
              question: "What did you learn from building FakePay?",
              answer:
                "That most of the work in payments is the unhappy paths. Being able to switch on a 30% timeout rate, duplicate webhooks, or webhooks that arrive before the API response turned vague worries into failing tests. Several bugs, like marking timeouts as FAILED, only showed up because the fake could produce those situations on demand.",
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
            "Built an order and payment service in Spring Boot and PostgreSQL with an enum-based order state machine, idempotent checkout and payment APIs, and a pluggable payment gateway adapter with timeouts and safe retries.",
            "Implemented HMAC-SHA256 webhook verification with replay protection and event dedupe, plus a transactional outbox, verified by failure tests for duplicate, late and out-of-order events and app crashes mid-flow.",
            "Load-tested checkout and payment at [N] concurrent users against a fault-injecting fake gateway: p95 [X] ms, zero double charges across [M] requests.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "No invented scale",
          text: "This is a portfolio project against a fake gateway, and the resume should say so if asked. [N], [X] and [M] are my measured numbers from the k6 summary in the repo. \"Processed payments\" means test payments; never imply real money or real customers.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "Projects 1 to 4 finished, especially the idempotency and locking parts of Project 4",
            "System Design → State Machines",
            "System Design → Idempotency and Webhooks",
            "System Design → Reliable Outbound Calls (timeouts, retries, backoff, jitter)",
            "System Design → Transactions and Locking",
            "Java → Java 8 Features: Optional, Lambda Expressions; plus records and switch expressions",
            "Interview Questions → Microservices and Messaging (outbox, at-least-once delivery, consumers that dedupe)",
            "Spring Boot: `RestClient`, `@Scheduled`, `@Transactional` propagation",
            "PostgreSQL: `ON CONFLICT`, `FOR UPDATE SKIP LOCKED`, partial unique indexes, `CHECK` constraints",
            "REST API Design: 201 vs 202, 402, 409, 422, 503",
          ],
        },
      ],
    },
  ],
};
