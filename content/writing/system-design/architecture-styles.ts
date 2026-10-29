import type { Lesson } from "../types";

export const architectureStyles: Lesson = {
  slug: "architecture-styles",
  date: "2026-10-29",
  title: "Architecture Styles: Layered, Modular Monolith, Hexagonal, Event-Driven",
  description:
    "The common backend architecture styles, what each one looks like in a Spring codebase, how to enforce module boundaries, when events and microservices are worth it, and how to tidy an older codebase that mixes them all.",
  tags: ["System Design", "Architecture", "Modular Monolith", "Hexagonal", "Events", "Spring Boot"],
  sections: [
    {
      title: "What Architecture Styles Are",
      blocks: [
        {
          type: "paragraph",
          text: "An architecture style is the big-picture rule for how a backend is cut into parts and how those parts talk. Design principles (the previous lesson) are about classes. Architecture styles are about the layers, modules and services that the classes live in.",
        },
        {
          type: "paragraph",
          text: "Four styles cover almost every Java backend I've seen:",
        },
        {
          type: "list",
          items: [
            "**Layered:** controller, then service, then repository. Every request flows down and back up.",
            "**Modular monolith:** one deployable application, split inside into modules (booking, billing, drivers) that only talk through each other's public API.",
            "**Hexagonal (ports and adapters):** the business core defines the interfaces it needs, and the outside world (HTTP, databases, payment providers, maps APIs) plugs in through adapters.",
            "**Event-driven:** parts announce \"this happened\" and other parts react, either inside one process or across services through a message broker.",
          ],
        },
        {
          type: "paragraph",
          text: "They aren't rivals. A healthy system usually combines them: a modular monolith, layered inside each module, with hexagonal adapters at the edges and events between modules. Microservices are a deployment choice on top: some modules get pulled out into their own processes.",
        },
      ],
    },
    {
      title: "Why It Matters",
      blocks: [
        {
          type: "paragraph",
          text: "Style decides how far a change spreads. In a codebase with no boundaries, changing how a refund is stored can break a report three folders away, because the report was reading the refund table directly. With boundaries, it can only break the refund module's own tests.",
        },
        {
          type: "list",
          items: [
            "**Team scaling:** two developers can work on billing and dispatch without stepping on each other if those are real modules.",
            "**Testing:** a core that talks to ports can be tested with fakes. A core that calls a maps SDK directly needs the network.",
            "**Splitting later:** a module with a clean API can become a microservice in weeks. A tangle can't, no matter how long you try.",
            "**Reading old code:** knowing the styles lets you name what you're looking at, which is the first step to cleaning it up.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Most codebases are mixed",
          text: "Older codebases rarely follow one style. You'll find a layered core, a few classes that call the database from controllers, one module that publishes events and another that calls everything directly. That's normal. Part of this lesson is how to spot it and standardise gradually.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of these styles as ways of running food in a big building.",
        },
        {
          type: "list",
          items: [
            "**Layered** is a single restaurant: the waiter takes the order, the chef cooks, the storeroom supplies ingredients. The waiter never walks into the storeroom. When the waiter does start grabbing things from the storeroom to save time, that's a skipped layer, and soon nobody knows what stock is left.",
            "**Modular monolith** is a food court: one building, one electricity bill, but separate stalls. The pizza stall can buy cheese from the sandwich stall at the counter, but it can't walk into their kitchen.",
            "**Microservices** are separate restaurants across the city. Total independence, but every order between them needs a delivery rider, and riders get stuck in traffic.",
            "**Hexagonal** is a travel adapter. My laptop has one plug shape. In each country, an adapter fits it to the local socket. The laptop doesn't change.",
            "**Event-driven** is the order-ready bell. The kitchen rings it and doesn't care who listens. The waiter, the billing desk and the loyalty-card stamp all react on their own.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Layered",
        },
        {
          type: "diagram",
          text: `      HTTP request
           │
┌──────────▼──────────┐
│ Controller          │  parse, validate, call one use case
├──────────┬──────────┤
│ Service  ▼          │  business rules, transactions
├──────────┬──────────┤
│ Repository ▼        │  SQL / JPA
└──────────┬──────────┘
           ▼
        Database

skipped layer:  Controller ──────────► Repository
                (rules bypassed, no transaction boundary)`,
          caption: "Calls only go down, one layer at a time.",
        },
        {
          type: "paragraph",
          text: "Layering is the default for Spring apps, and it's fine. It goes wrong in two ways. Layers get **skipped**: a controller injects a repository \"just to load one thing\", and now a business rule (like \"hide cancelled bookings\") is bypassed. And layers are **horizontal only**: one giant `service` package with 200 classes for every feature, so the layers are clean but the features are tangled.",
        },
        {
          type: "heading",
          text: "Modular monolith",
        },
        {
          type: "diagram",
          text: `one Spring Boot app, one deploy, one database (separate tables per module)

┌─────────────── booking ───────────────┐   ┌──────────── billing ────────────┐
│ BookingApi (public)                   │◄──│ uses BookingApi only            │
│ internal/                             │   │ BillingApi (public)             │
│   controller, service, repository     │   │ internal/ ...                   │
└───────────────────────────────────────┘   └─────────────────────────────────┘
                 ▲                                       │
                 └──── billing must NOT import ──────────┘
                       booking.internal.*`,
          caption: "Modules are vertical slices. Each is layered inside, and only its public API is visible to others.",
        },
        {
          type: "paragraph",
          text: "A modular monolith keeps the operational simplicity of one app (one deploy, one transaction when needed, in-process calls) and gets most of the structure people want from microservices. The hard part is that Java packages don't enforce much on their own. A `public` class in `booking.internal` can be imported from anywhere. So boundaries need a check: ArchUnit or Spring Modulith tests that fail the build, or Java modules (JPMS), which few Spring apps use.",
        },
        {
          type: "paragraph",
          text: "When a module has to talk to something whose model doesn't fit (a legacy module, an external provider), an **anti-corruption layer** translates at the border. The billing module doesn't use the legacy `TripRecord` with its forty nullable columns. It calls an adapter that turns it into billing's own small `BillableTrip` record.",
        },
        {
          type: "heading",
          text: "Satellite microservices",
        },
        {
          type: "paragraph",
          text: "A common real-world shape: a main application, plus a few small services next to it that do one specialised job, called over HTTP. A pricing engine, a chat service, a notification sender, a PDF renderer. The main app treats each one like any external provider: a client interface, a timeout, a fallback, and no shared database tables.",
        },
        {
          type: "heading",
          text: "Hexagonal: ports and adapters",
        },
        {
          type: "diagram",
          text: `             driving side                     driven side
          (who calls the core)            (what the core calls)

   REST controller ─┐                    ┌─► JPA repository adapter
   queue consumer  ─┼─► [ port ] CORE [ port ] ─┼─► payment gateway adapter
   scheduled job   ─┘     business rules  └─► maps API adapter
                          no Spring, no SDKs     (or a fake in tests)`,
          caption: "The core owns the port interfaces. Adapters live outside and depend on the core, never the other way round.",
        },
        {
          type: "paragraph",
          text: "The key point is **who owns the interface**. In plain layering, the service often depends on a vendor's SDK client directly. In hexagonal, the core says \"I need a `RouteDistance` that gives me kilometres\" in its own words, and a maps adapter implements it. That's Dependency Inversion at the architecture level. I don't make every class hexagonal. I use ports at the edges that change or fail: payments, maps, SMS, other services.",
        },
        {
          type: "heading",
          text: "Event-driven: in-process versus a broker",
        },
        {
          type: "table",
          headers: ["", "In-process events (Spring)", "Message broker (Kafka, RabbitMQ, SQS)"],
          rows: [
            ["Where listeners run", "Same JVM, same thread by default", "Other processes, any time later"],
            ["If the app crashes mid-way", "Events in memory are lost", "Events are stored until consumed"],
            ["Transactions", "Can join the publisher's transaction", "Separate; needs an outbox for safety"],
            ["Failure of one listener", "Synchronous: the exception reaches the publisher", "Retried by the consumer; publisher unaffected"],
            ["Ops cost", "None", "A cluster to run, monitor and upgrade"],
            ["Good for", "Decoupling modules inside one app", "Decoupling services, buffering load, fan-out"],
          ],
        },
        {
          type: "heading",
          text: "CQRS and the outbox, briefly",
        },
        {
          type: "list",
          items: [
            "**CQRS (Command Query Responsibility Segregation)** separates the write model from the read model. In its lightest form, commands go through rich entities while a dashboard query reads a flat SQL view or projection. In its heaviest form, the read side is a different database updated by events. The light form is worth using often; the heavy form rarely.",
            "**Transactional outbox** solves \"save to the DB and publish a message\" without losing one of them. The event is written to an `outbox` table **in the same transaction** as the business change, and a separate relay publishes outbox rows to the broker and marks them sent. Delivery is at-least-once, so consumers must be idempotent.",
          ],
        },
        {
          type: "heading",
          text: "When to split into microservices",
        },
        {
          type: "paragraph",
          text: "I split a module out when there's a concrete reason: it needs to scale very differently (a CPU-heavy route optimiser), it needs a different runtime or language, it has a separate team and release cadence, or its failure must not take down the main app. \"Microservices are modern\" isn't a reason. A split adds network failures, distributed transactions, versioned APIs and more things to deploy. If the module boundary isn't already clean inside the monolith, splitting just turns in-process tangles into network tangles.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "How Spring delivers an in-process event",
        },
        {
          type: "paragraph",
          text: "Calling `applicationEventPublisher.publishEvent(new OrderPlaced(...))` hands the object to the context's `ApplicationEventMulticaster`. The default, `SimpleApplicationEventMulticaster`, finds every listener whose parameter type matches (methods annotated `@EventListener` are registered as listeners at startup) and calls them **one by one, on the publisher's thread**. So by default an event is just an indirect method call: if a listener throws, the exception travels back to `publishEvent`, and if the publisher's transaction rolls back, the listener's work in that transaction rolls back too.",
        },
        {
          type: "paragraph",
          text: "`@TransactionalEventListener` changes the timing. Instead of calling the listener immediately, Spring registers a `TransactionSynchronization` on the current transaction and calls the listener at the chosen phase, `AFTER_COMMIT` by default. So \"send the confirmation email\" only runs if the order was actually saved. If there's no transaction at all, the listener is skipped unless `fallbackExecution = true`. Adding `@Async` moves the listener onto an executor thread so a slow listener doesn't block the request.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "AFTER_COMMIT listeners can still lose work",
          text: "If the app crashes between the commit and the listener finishing, the event is gone, because it only lived in memory. For work that must happen, store it: the outbox pattern, a jobs table, or Spring Modulith's event publication registry, which records events for `@ApplicationModuleListener` methods in the database and can resubmit incomplete ones.",
        },
        {
          type: "heading",
          text: "How ArchUnit checks package rules",
        },
        {
          type: "paragraph",
          text: "ArchUnit doesn't read source code. `ClassFileImporter` reads the compiled `.class` files (using the ASM bytecode library) and builds an in-memory graph: every class, and every dependency between classes, including field types, method parameters, return types, method calls, annotations and inheritance. A rule like \"classes in `..billing..` must not depend on `..booking.internal..`\" is just a query over that graph. Any matching edge becomes a violation with the exact class and line, and the test fails.",
        },
        {
          type: "code",
          language: "java",
          title: "ArchitectureTest.java",
          code: `@AnalyzeClasses(packages = "com.example.shop")
class ArchitectureTest {

    @ArchTest
    static final ArchRule modulesUseOnlyPublicApis =
            noClasses().that().resideOutsideOfPackage("..booking..")
                    .should().dependOnClassesThat().resideInAPackage("..booking.internal..");

    @ArchTest
    static final ArchRule layers = layeredArchitecture()
            .consideringAllDependencies()
            .layer("Web").definedBy("..web..")
            .layer("Service").definedBy("..service..")
            .layer("Persistence").definedBy("..repository..")
            .whereLayer("Web").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Web")
            .whereLayer("Persistence").mayOnlyBeAccessedByLayers("Service");
}`,
        },
        {
          type: "paragraph",
          text: "The second rule is what catches a skipped layer: a controller in `..web..` that injects a repository depends on `Persistence`, which only `Service` may access. Because it runs as a normal JUnit 5 test, the build fails on the pull request that adds the shortcut, not months later in a code review of something else.",
        },
        {
          type: "paragraph",
          text: "Spring Modulith takes a more opinionated route. It treats each direct sub-package of the main application package as a module, treats nested packages as internal, and `ApplicationModules.of(ShopApplication.class).verify()` fails on cycles between modules or on access to another module's internals.",
        },
        {
          type: "heading",
          text: "How an adapter gets chosen",
        },
        {
          type: "paragraph",
          text: "In a Spring app the core asks for a `RouteDistance`, and the container decides which adapter bean fills it. Usually exactly one adapter is active per environment, chosen with `@Profile(\"test\")` or `@ConditionalOnProperty(name = \"maps.provider\", havingValue = \"osm\")`. If two match, startup fails with `NoUniqueBeanDefinitionException`, which is the right moment to find out. In unit tests I skip Spring and pass a fake adapter to the constructor.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "In-process events are just synchronous calls",
        },
        {
          type: "paragraph",
          text: "Everyday version: the shop rings the order-ready bell, but the person ringing it has to wait until everyone who heard the bell has finished reacting. If one of them trips, the bell-ringer is stuck too. That's what default in-process events are. I built a tiny event bus that behaves like Spring's default multicaster:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderEvents.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class OrderEvents {
    record OrderPlaced(long orderId, String city) {}

    static final List<Consumer<OrderPlaced>> listeners = new ArrayList<>();

    static void publish(OrderPlaced event) {
        for (Consumer<OrderPlaced> listener : listeners) {
            listener.accept(event);                        // same thread, one after another
        }
    }

    static void placeOrder(long id, String city) {
        System.out.println("saved order " + id);
        publish(new OrderPlaced(id, city));
        System.out.println("order " + id + " done");
    }

    public static void main(String[] args) {
        listeners.add(e -> System.out.println("  email: receipt for " + e.orderId()));
        listeners.add(e -> {
            if (e.city().equals("Pune")) throw new IllegalStateException("loyalty service down");
            System.out.println("  loyalty: +10 points for " + e.orderId());
        });

        placeOrder(1, "Kolkata");
        try {
            placeOrder(2, "Pune");
        } catch (IllegalStateException e) {
            System.out.println("placeOrder(2) failed: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `saved order 1
  email: receipt for 1
  loyalty: +10 points for 1
order 1 done
saved order 2
  email: receipt for 2
placeOrder(2) failed: loyalty service down`,
        },
        {
          type: "paragraph",
          text: "Order 2 shows all three problems at once. The loyalty listener's failure became `placeOrder`'s failure. The receipt email had **already gone out** for an order that then \"failed\". And `order 2 done` never printed. In Spring, if `placeOrder` were `@Transactional`, the order row would roll back too, while the email stays sent. That's why emails and other side effects belong in `@TransactionalEventListener(phase = AFTER_COMMIT)` listeners, and why a listener that can fail independently should be async or go through an outbox.",
        },
        {
          type: "heading",
          text: "The same thing with Spring annotations",
        },
        {
          type: "code",
          language: "java",
          title: "OrderListeners.java",
          code: `@Service
class PlaceOrderService {
    private final OrderRepository orders;
    private final ApplicationEventPublisher events;

    PlaceOrderService(OrderRepository orders, ApplicationEventPublisher events) {
        this.orders = orders;
        this.events = events;
    }

    @Transactional
    public long place(NewOrder request) {
        Order order = orders.save(Order.from(request));
        events.publishEvent(new OrderPlaced(order.getId(), order.getCity()));
        return order.getId();
    }
}

@Component
class ReceiptEmails {
    @Async
    @TransactionalEventListener                      // phase = AFTER_COMMIT by default
    void on(OrderPlaced event) {
        // runs only if the order really committed, on another thread
    }
}`,
        },
        {
          type: "paragraph",
          text: "`PlaceOrderService` doesn't know emails exist. Adding a loyalty listener is a new class, and the order code doesn't change. Remember `@Async` needs `@EnableAsync` somewhere in the configuration.",
        },
        {
          type: "heading",
          text: "The outbox: save and publish without losing either",
        },
        {
          type: "paragraph",
          text: "Everyday version: a restaurant writes every delivery order in a notebook as it takes the payment. A runner checks the notebook every few minutes and calls the delivery company for anything not ticked. If the delivery company's phone is busy, nothing is lost; the runner tries again next round.",
        },
        {
          type: "code",
          language: "java",
          title: "OutboxDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class OutboxDemo {
    static class OutboxRow {
        final String payload;
        boolean sent = false;
        OutboxRow(String payload) { this.payload = payload; }
    }

    static final List<String> orders = new ArrayList<>();
    static final List<OutboxRow> outbox = new ArrayList<>();
    static boolean brokerUp = false;

    static void placeOrder(long id) {                    // one DB transaction in real life
        orders.add("order-" + id);
        outbox.add(new OutboxRow("OrderPlaced " + id));
    }

    static void relay() {                                // a scheduled job, every few seconds
        for (OutboxRow row : outbox) {
            if (row.sent) continue;
            if (!brokerUp) {
                System.out.println("broker down, will retry " + row.payload);
                continue;
            }
            System.out.println("published " + row.payload);
            row.sent = true;
        }
    }

    public static void main(String[] args) {
        placeOrder(41);
        placeOrder(42);
        relay();
        brokerUp = true;
        relay();
        relay();                                         // nothing left to send
        System.out.println("orders saved: " + orders);
    }
}`,
        },
        {
          type: "output",
          text: `broker down, will retry OrderPlaced 41
broker down, will retry OrderPlaced 42
published OrderPlaced 41
published OrderPlaced 42
orders saved: [order-41, order-42]`,
        },
        {
          type: "paragraph",
          text: "The order and its outbox row are saved together, so there's never an order without an event or an event without an order. The broker being down only delays publishing. The third `relay()` printed nothing because every row was marked sent. In a real database the relay would `SELECT ... FOR UPDATE SKIP LOCKED` a batch of unsent rows so two app instances don't publish the same row at once, and a crash between \"published\" and \"marked sent\" means one duplicate, which is why consumers deduplicate by event id.",
        },
        {
          type: "heading",
          text: "An anti-corruption adapter",
        },
        {
          type: "code",
          language: "java",
          title: "LegacyTripAdapter.java",
          code: `// billing's own model: small and exactly what billing needs
public record BillableTrip(long tripId, long distanceMeters, Instant endedAt) {}

@Component
class LegacyTripAdapter implements BillableTrips {        // port owned by billing
    private final LegacyTripClient legacy;                // old model, 40 nullable fields

    LegacyTripAdapter(LegacyTripClient legacy) { this.legacy = legacy; }

    @Override
    public Optional<BillableTrip> find(long tripId) {
        return legacy.fetch(tripId)
                .filter(t -> "COMPLETED".equals(t.getStatusText()))
                .map(t -> new BillableTrip(t.getId(),
                        Math.round(t.getDistanceKm() * 1000),   // legacy uses km as double
                        t.getEndTime().toInstant()));
    }
}`,
        },
        {
          type: "paragraph",
          text: "All the oddities of the old model (status as text, distance in kilometres as a `double`, a `java.util.Date` end time) are handled in this one class. Billing never imports the legacy types, so when the legacy module is cleaned up, only this adapter changes.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Controllers that call repositories",
        },
        {
          type: "paragraph",
          text: "It saves a few lines and quietly bypasses every rule the service enforces: tenant filters, soft-delete checks, permission checks. Make the service the only door, and add an ArchUnit rule so the shortcut fails the build.",
        },
        {
          type: "heading",
          text: "Modules that share tables",
        },
        {
          type: "paragraph",
          text: "If billing reads `booking`'s tables directly, the module boundary is fiction. Booking can't change its schema without breaking billing. Cross-module reads go through the other module's API, or through a read model that module publishes.",
        },
        {
          type: "heading",
          text: "Ports that mirror the vendor SDK",
        },
        {
          type: "paragraph",
          text: "A port named `GoogleMapsPort` with methods shaped like Google's request objects isn't a port. It's the SDK with an extra hop. Name ports after what the core needs (`RouteDistance.km(from, to)`), so a second provider fits without changing the core.",
        },
        {
          type: "heading",
          text: "Treating in-process events as reliable messaging",
        },
        {
          type: "paragraph",
          text: "As `OrderEvents` showed, default events are synchronous and live in memory. They decouple code, not failure. If losing the reaction would matter (a payout, a driver notification), persist it.",
        },
        {
          type: "heading",
          text: "Splitting into microservices to fix a tangle",
        },
        {
          type: "paragraph",
          text: "A tangled monolith split into services becomes a distributed tangle: the same coupling, plus timeouts, retries and version skew. Draw the module boundaries inside the monolith first. Split only the modules whose boundaries have held for a while.",
        },
        {
          type: "heading",
          text: "Satellite services with no timeout",
        },
        {
          type: "paragraph",
          text: "An HTTP call to a pricing or chat service with the default (often infinite or very long) read timeout. When that service hangs, request threads pile up in the main app until it stops responding too. Every outbound call needs a timeout and a decision about what happens when it fails.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Package by feature first, then by layer inside it: `booking/web`, `booking/service`, `booking/repository`, not one global `service` package.",
            "Give each module one small public API (a facade or a few interfaces and records) and put everything else in `internal`.",
            "Enforce boundaries with tests (ArchUnit or Spring Modulith `verify()`), not with wiki pages.",
            "Use ports for the edges that are slow, flaky or likely to change: payments, maps, SMS, email, other services.",
            "Publish domain events for side effects. Use `@TransactionalEventListener(AFTER_COMMIT)` for anything that talks to the outside world, and an outbox for anything that must not be lost.",
            "Make event consumers idempotent from day one. At-least-once delivery is the realistic guarantee.",
            "Treat satellite services exactly like third-party APIs: typed client, timeout, retry policy for safe calls, fallback, metrics.",
            "Write down architecture decisions in short ADRs (Architecture Decision Records): context, decision, consequences. Future you will want to know why.",
          ],
        },
      ],
    },
    {
      title: "Trade-offs",
      blocks: [
        {
          type: "table",
          headers: ["Style", "Strengths", "Costs", "Fits when"],
          rows: [
            ["Layered", "Familiar, simple, every Spring dev knows it", "Features tangle across layers as the app grows", "Small apps, or inside each module"],
            ["Modular monolith", "One deploy, real boundaries, easy refactors", "Boundaries need tooling to stay real; one scaling unit", "Most product backends, most of the time"],
            ["Microservices", "Independent deploy and scale, fault isolation", "Network failures, data consistency, ops cost", "Clear boundaries plus a concrete scaling or team reason"],
            ["Hexagonal", "Testable core, swappable providers", "More interfaces and mapping code", "Edges that change or fail: payments, maps, messaging"],
            ["In-process events", "Decoupled modules, no infrastructure", "Synchronous by default, lost on crash", "Side effects inside one app"],
            ["Broker events", "Buffering, fan-out, cross-service decoupling", "Eventual consistency, duplicates, a cluster to run", "Cross-service workflows, high volume"],
            ["CQRS (light)", "Fast, simple read queries", "Two models to keep in sync", "Dashboards and reports on a write-heavy model"],
          ],
        },
      ],
    },
    {
      title: "Architecture Styles in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small, realistic example: calculate a cab fare. The fare depends on the road distance, which comes from a maps API. That API costs money, is sometimes slow, and is a vendor the business might switch. That makes it a perfect place for a port.",
        },
        {
          type: "paragraph",
          text: "Everyday version: the fare meter doesn't care whether the distance comes from the car's odometer or a GPS. It just needs kilometres.",
        },
        {
          type: "code",
          language: "java",
          title: "CabFare.java",
          code: `public class CabFare {
    // Port: what the core needs, in its own words
    interface RouteDistance { double km(String from, String to); }

    // Core: knows nothing about any maps vendor
    static class FareCalculator {
        private final RouteDistance distance;
        FareCalculator(RouteDistance distance) { this.distance = distance; }

        long fare(String from, String to) {
            double km = distance.km(from, to);
            return Math.round(50 + km * 14);              // base 50 + 14 per km
        }
    }

    // Adapter for tests: fixed answers, no network
    static class FixedDistance implements RouteDistance {
        public double km(String from, String to) { return 8.5; }
    }

    public static void main(String[] args) {
        FareCalculator calculator = new FareCalculator(new FixedDistance());
        System.out.println("Park Street -> Airport: " + calculator.fare("Park Street", "Airport"));

        RouteDistance downMaps = (from, to) -> { throw new IllegalStateException("maps API 503"); };
        try {
            new FareCalculator(downMaps).fare("Park Street", "Airport");
        } catch (IllegalStateException e) {
            System.out.println("fare failed: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Park Street -> Airport: 169
fare failed: maps API 503`,
        },
        {
          type: "paragraph",
          text: "50 plus 8.5 times 14 is 169. The second call shows the other thing a port gives me: I can simulate the maps API being down with a one-line lambda and decide what the product should do. In production the real adapter is a Spring bean that calls the vendor with a timeout:",
        },
        {
          type: "code",
          language: "java",
          title: "MapsApiDistance.java",
          code: `@Component
@ConditionalOnProperty(name = "maps.provider", havingValue = "vendor-a")
class MapsApiDistance implements RouteDistance {
    private final RestClient http;

    MapsApiDistance(RestClient.Builder builder, MapsProperties props) {
        var timeouts = new SimpleClientHttpRequestFactory();
        timeouts.setConnectTimeout(Duration.ofSeconds(1));
        timeouts.setReadTimeout(Duration.ofSeconds(2));
        this.http = builder.baseUrl(props.baseUrl()).requestFactory(timeouts).build();
    }

    @Override
    public double km(String from, String to) {
        DistanceResponse body = http.get()
                .uri("/distance?from={from}&to={to}", from, to)
                .retrieve()
                .body(DistanceResponse.class);
        return body.meters() / 1000.0;                    // vendor speaks meters, core speaks km
    }
}`,
        },
        {
          type: "paragraph",
          text: "`RestClient` is Spring Framework 6.1's synchronous HTTP client (Boot 3.2+). The adapter is the only class that knows the vendor's URL, its units and its JSON shape. Switching vendors means a new adapter and a property change. The `FareCalculator` and its tests stay untouched.",
        },
        {
          type: "heading",
          text: "Spotting mixed styles in an older codebase",
        },
        {
          type: "paragraph",
          text: "In older SaaS codebases I've worked on, the styles are usually mixed in recognisable ways. These are the signs I look for:",
        },
        {
          type: "list",
          items: [
            "The same kind of thing done three ways: one provider behind an interface, one called through a static helper, one with its SDK used inline in a service.",
            "Controllers that inject repositories next to controllers that call services.",
            "Some features publish events, others call five services in a row from one method.",
            "Packages organised by layer at the top, then by feature in newer folders.",
            "Two \"core\" services for the same concept, an old one and a v2, both still called.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is never a rewrite. My order of work: write down the target style in a short ADR; add ArchUnit rules for the new structure but scoped to new packages (or using ArchUnit's frozen rules, which record existing violations and only fail on new ones); move one feature at a time when it's being changed anyway; put a port in front of each external provider as it gets touched; and keep the old path working behind the new interface until every caller has moved.",
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
              question: "What's the difference between a layered architecture and a modular monolith?",
              answer:
                "Layered architecture cuts the app horizontally: web, service, persistence. A modular monolith cuts it vertically into business modules like booking and billing, each with its own layers inside and a small public API.\n\nThey combine well. The problem with layers alone is that a big app ends up with one huge service layer where every feature can call every other feature, so the layers are clean but the business logic is tangled.",
            },
            {
              question: "How do you enforce module boundaries in a Java monolith?",
              answer:
                "Packages alone don't, since any `public` class can be imported anywhere. I use architecture tests: ArchUnit rules like \"nothing outside booking depends on `..booking.internal..`\", or Spring Modulith's `ApplicationModules.of(App.class).verify()`, which treats sub-packages of the main package as modules and nested packages as internal.\n\nBoth run as normal JUnit tests, so a violating pull request fails the build. Java modules (JPMS) can enforce it at compile time, but they're rarely used with Spring Boot apps.",
            },
            {
              question: "How does ArchUnit work under the hood?",
              answer:
                "It imports compiled class files with `ClassFileImporter`, using ASM to read the bytecode, and builds a graph of classes and their dependencies: field types, method signatures, calls, annotations and inheritance. Rules are queries over that graph.\n\nBecause it reads bytecode, it sees dependencies the source might hide, like a type used only in a method call. A violation reports the exact class and line.",
            },
            {
              question: "What are ports and adapters?",
              answer:
                "Ports are interfaces owned by the business core that describe what it needs (driven ports, like `RouteDistance`) or what it offers (driving ports, like a use case). Adapters connect those ports to the real world: a REST controller drives the core, a maps HTTP client implements a driven port.\n\nThe dependency points inward: adapters depend on the core, the core depends on nothing technical. That's what makes the core testable with fakes and the providers swappable.",
            },
            {
              question: "Would you make every class in a Spring app hexagonal?",
              answer:
                "No. Wrapping JPA repositories in hand-written ports, mapping entities to domain objects and back for every simple CRUD feature, is a lot of code for little gain.\n\nI use ports where they pay off: external providers that are slow, flaky, paid or likely to change, and other services. Simple internal CRUD can stay plainly layered.",
            },
            {
              question: "How do Spring application events work, and are they asynchronous?",
              answer:
                "`publishEvent` hands the event to the `ApplicationEventMulticaster`, which by default calls each matching listener synchronously on the publisher's thread. An exception in a listener propagates back to the publisher, and listeners join the publisher's transaction.\n\nThey become asynchronous only with `@Async` on the listener (and `@EnableAsync`), or a multicaster configured with an executor. My small event-bus demo showed the synchronous behaviour: one failing listener made `placeOrder` fail after the receipt email had already been sent.",
            },
            {
              question: "What does @TransactionalEventListener do differently from @EventListener?",
              answer:
                "It defers the listener to a transaction phase, `AFTER_COMMIT` by default, by registering a transaction synchronization. So side effects like emails run only if the data actually committed. If no transaction is active, the listener doesn't run unless `fallbackExecution = true`.\n\nIt doesn't make the event durable. If the app dies after the commit and before the listener runs, the event is lost.",
            },
            {
              question: "What is the transactional outbox pattern and why is it needed?",
              answer:
                "Saving to the database and publishing to a broker are two systems, so you can't do both atomically. Publish first and the DB write can fail; write first and the publish can fail. The outbox writes the event into an outbox table in the same transaction as the business change, and a relay publishes unsent rows and marks them sent.\n\nIt gives at-least-once delivery, since a crash between publishing and marking can send a row twice, so consumers must deduplicate by event id. Change data capture tools like Debezium can replace the polling relay.",
            },
            {
              question: "When would you split a monolith into microservices?",
              answer:
                "When there's a concrete reason that outweighs the cost: very different scaling needs, a different runtime, an independent team and release cycle, or a need for fault isolation. And only for a module whose boundary is already clean inside the monolith.\n\nThe costs are network failures, eventual consistency, distributed debugging, API versioning and more deployments. A tangled monolith split into services becomes a distributed tangle.",
            },
            {
              question: "What's an anti-corruption layer?",
              answer:
                "A translation layer at the border between two models, so a messy or foreign model doesn't leak into yours. The adapter calls the legacy module or external system and converts its data into your module's own small types.\n\nIn my billing example, the adapter turns a legacy trip with text statuses, kilometres as `double` and a `Date` into a small `BillableTrip` record. Billing never imports the legacy types.",
            },
            {
              question: "What is CQRS, and when is it worth it?",
              answer:
                "Command Query Responsibility Segregation: separate the model you write through from the model you read from. The light version is common and cheap, like writing through JPA entities and reading dashboards from a flat SQL query or view.\n\nThe heavy version, with a separate read database updated by events, adds eventual consistency and sync code. I'd use it only when reads and writes have truly different shapes or scale.",
            },
            {
              question: "How should a main app call a satellite microservice?",
              answer:
                "Like any third-party API: behind a typed client interface, with connect and read timeouts, retries only for safe or idempotent calls, a fallback decision, and metrics on latency and errors. No sharing of database tables.\n\nThe main app shouldn't hang because a pricing or chat service hangs. Timeouts plus a circuit breaker for repeated failures keep that from cascading.",
            },
            {
              question: "How do you recognise a skipped layer, and why is it harmful?",
              answer:
                "Typically a controller that injects a repository, or a scheduled job that writes SQL directly. It's harmful because the service layer is where rules live: permission checks, tenant filters, soft-delete handling, transactions. The shortcut silently skips them.\n\nAn ArchUnit `layeredArchitecture()` rule makes it a failing test.",
            },
            {
              question: "You join a team with a codebase mixing three architecture styles. What do you do?",
              answer:
                "Not a rewrite. I'd first map what exists and agree on a target in a short ADR. Then add architecture tests for new code only, or use ArchUnit's frozen rules so existing violations are recorded and only new ones fail.\n\nFrom there, I migrate one feature at a time when it's being changed for a business reason anyway, put ports in front of external providers as they're touched, and keep old paths working behind the new interfaces until callers have moved.",
            },
            {
              question: "Can a modular monolith use a single database?",
              answer:
                "Yes, and usually it does. The rule is ownership, not separate servers: each table belongs to one module, and other modules go through that module's API instead of reading its tables.\n\nSome teams go further with a schema per module in the same database, which makes ownership visible and makes a later split easier.",
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
            "Run `OrderEvents` and change the publish loop so each listener's exception is caught and logged instead of rethrown. What does `placeOrder(2)` print now, and what is the risk of swallowing errors like that?",
            "In `OutboxDemo`, simulate a crash: after `published ...` but before `row.sent = true`, throw on the first try only. Run `relay()` again and count how many times the event was published.",
            "Add a second adapter to `CabFare` that calculates straight-line distance from two coordinates. Swap it in without touching `FareCalculator`.",
            "Add ArchUnit to a small Spring Boot project and write the `layeredArchitecture()` rule. Make a controller inject a repository and watch the test fail.",
            "Draw the modules of an app you know as boxes. For each arrow between boxes, write whether it's a method call, a shared table, or an event. Circle the shared tables.",
            "Write a half-page ADR for one decision in your project (for example \"we use in-process events, not a broker\"): context, decision, consequences.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `LAYERED      controller -> service -> repository, never skip
MODULAR      one deploy, vertical modules, public API + internal/
  enforce    ArchUnit rules / Spring Modulith verify()
  borders    anti-corruption adapter for foreign models
HEXAGONAL    core owns ports, adapters plug in at the edges
  use for    payments, maps, SMS, other services
EVENTS       Spring: sync, same thread, same transaction
  side fx    @TransactionalEventListener(AFTER_COMMIT) + @Async
  must-not-  outbox table in the same transaction + relay
  lose       consumers idempotent (at-least-once)
MICROSVC     split for scale / team / isolation, not fashion
  calls      typed client, timeouts, fallback, no shared tables
CQRS         light: separate read queries; heavy: rarely
OLD CODE     ADR -> rules for new code -> migrate as you touch`,
          caption: "The one-screen version I'd want before a design interview.",
        },
        {
          type: "list",
          items: [
            "Styles combine: a modular monolith, layered inside, with ports at the edges and events between modules covers most backends.",
            "Boundaries are only real if a test enforces them.",
            "In-process events decouple code, not failures. Use an outbox for anything that must survive a crash.",
            "Split into services only along boundaries that already hold inside the monolith.",
          ],
        },
      ],
    },
  ],
};
