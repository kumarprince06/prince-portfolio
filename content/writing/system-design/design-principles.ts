import type { Lesson } from "../types";

export const designPrinciples: Lesson = {
  slug: "design-principles",
  date: "2026-10-29",
  title: "Design Principles in Real Backends",
  description:
    "SOLID, DRY, KISS, YAGNI, the Law of Demeter and composition over inheritance, explained with everyday examples and small Java and Spring services: use-case classes instead of God classes, strategy maps instead of if/else chains, small gateway interfaces and clean layer contracts.",
  tags: ["System Design", "SOLID", "Clean Code", "Spring Boot", "Java"],
  sections: [
    {
      title: "What Design Principles Are",
      blocks: [
        {
          type: "paragraph",
          text: "Design principles are rules of thumb for where code should live and what it should know about. They don't make a program faster or add a feature. They decide how painful the **next** change will be.",
        },
        {
          type: "paragraph",
          text: "Most people learn SOLID from shapes and animals: a `Square` that extends `Rectangle`, a `Duck` that can't fly. That never helped me much. What helped was seeing the same five letters in the code I actually write: a payment service with three providers, an OTP sender that times out, a controller that grew to two thousand lines. So every principle in this lesson comes with a backend example, and an everyday picture first.",
        },
        {
          type: "paragraph",
          text: "The list I'll cover: the five SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion), then DRY, KISS, YAGNI, the Law of Demeter, composition over inheritance, and two contracts that keep a layered backend sane: what repositories return, and what shape every API response has.",
        },
      ],
    },
    {
      title: "Why It Matters",
      blocks: [
        {
          type: "paragraph",
          text: "A backend lives for years and gets changed every week. The first version of anything is easy. The tenth change to it is where design shows up.",
        },
        {
          type: "paragraph",
          text: "In a SaaS codebase I've worked on, adding a new payment provider meant touching about a dozen files, because the provider name was checked with `if` statements all over the place: checkout, refunds, webhooks, reports. Each new provider was a small project, and each one broke something in a place nobody remembered. The fix wasn't clever. It was the Open/Closed principle applied once: one interface, one class per provider, one lookup.",
        },
        {
          type: "list",
          items: [
            "**Change cost:** a good design makes the common change touch one place.",
            "**Testing:** a class that receives its dependencies can be tested with fakes in milliseconds. A class that creates them needs a database, a network and patience.",
            "**Onboarding:** a new developer can find `CancelBookingService` faster than the cancel logic hidden at line 1,400 of `BookingService`.",
            "**Fewer surprises:** if every implementation of an interface really behaves like that interface, callers don't need `try/catch` around things that \"should\" work.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Principles, not laws",
          text: "Every principle here has a cost, and I'll point it out. Over-applying SOLID gives you twelve interfaces with one implementation each, which is its own kind of mess. The goal is code that's easy to change, not code that scores well on a checklist.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a busy tea stall that slowly becomes a small restaurant.",
        },
        {
          type: "list",
          items: [
            "**Single Responsibility:** at first one person takes orders, makes tea, washes cups and counts cash. It works until there's a queue. Then you split the jobs: one at the counter, one at the stove. Each person has one reason to be replaced.",
            "**Open/Closed:** the menu board has slots. Adding \"ginger tea\" means writing a new line, not rebuilding the stove.",
            "**Liskov Substitution:** if the menu says \"any tea comes in a cup\", then every tea had better come in a cup. A tea that arrives in a plastic bag breaks the customer's expectations, even if it's technically tea.",
            "**Interface Segregation:** the cashier needs the cash drawer, not the gas knob. Give each person only the controls they use.",
            "**Dependency Inversion:** the stall depends on \"a milk supplier\", not on one specific dairy van. When the van is late, another supplier slots in.",
            "**Law of Demeter:** you pay the cashier. You don't reach into the cashier's pocket to pull out their wallet and put money in it.",
            "**Composition over inheritance:** a masala tea isn't a new kind of stove. It's ordinary tea plus a spice step, added on top.",
          ],
        },
        {
          type: "paragraph",
          text: "Keep that stall in mind. Every principle below is one of those sentences, written in Java.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "table",
          headers: ["Principle", "One-line rule", "Backend smell it fixes"],
          rows: [
            ["Single Responsibility (SRP)", "A class has one reason to change", "A 3,000-line `OrderService` everyone edits"],
            ["Open/Closed (OCP)", "Add behaviour by adding code, not by editing old code", "`if (provider.equals(\"stripe\"))` in ten files"],
            ["Liskov Substitution (LSP)", "Every implementation honours the interface's promise", "An implementation that throws `UnsupportedOperationException`"],
            ["Interface Segregation (ISP)", "Small interfaces shaped by the caller", "A 20-method `PaymentGateway` nobody fully implements"],
            ["Dependency Inversion (DIP)", "Depend on abstractions, have them handed in", "`new StripeClient()` inside a service, untestable"],
          ],
        },
        {
          type: "heading",
          text: "Single Responsibility: one use case per class",
        },
        {
          type: "paragraph",
          text: "\"One reason to change\" is easier to apply as \"one actor or one use case\". In a backend the most practical version I know is a service class per use case: `PlaceOrderService`, `CancelOrderService`, `RefundOrderService`. Each has one public method and only the dependencies that use case needs.",
        },
        {
          type: "diagram",
          text: `GOD CLASS                         ONE CLASS PER USE CASE

┌───────────────────────────┐     ┌──────────────────┐
│ OrderService              │     │ PlaceOrder       │─► repo, pricing
│  place()   cancel()       │     └──────────────────┘
│  refund()  invoicePdf()   │     ┌──────────────────┐
│  exportCsv() sendEmail()  │     │ CancelOrder      │─► repo, refunds
│  14 dependencies          │     └──────────────────┘
│  3,000 lines              │     ┌──────────────────┐
└───────────────────────────┘     │ ExportOrdersCsv  │─► repo
  every change touches it         └──────────────────┘
                                   each change touches one`,
          caption: "Same features. On the right, a change to CSV export can't break order placement.",
        },
        {
          type: "paragraph",
          text: "The giveaway of a God class is its constructor. Fourteen injected dependencies means fourteen reasons to change, and every test has to mock all of them even if the method under test uses two.",
        },
        {
          type: "heading",
          text: "Open/Closed: a registry instead of an if/else chain",
        },
        {
          type: "paragraph",
          text: "Open for extension, closed for modification. When a new payment provider arrives, I want to **add** a class, not edit a `switch` that already works. The usual tool is a strategy map: every provider implements one interface and reports its own code, and a router looks it up by that code.",
        },
        {
          type: "diagram",
          text: `BEFORE                                AFTER

if (p == "card")   { ... }            Map<String, PaymentGateway>
else if (p == "upi") { ... }            "card"   -> CardGateway
else if (p == "wallet") { ... }         "upi"    -> UpiGateway
else throw ...                          "wallet" -> WalletGateway

copied into checkout, refunds,        router.pay(code, amount)
webhooks, reports                     new provider = one new class`,
        },
        {
          type: "heading",
          text: "Liskov Substitution: keep the promise",
        },
        {
          type: "paragraph",
          text: "If code is written against an interface, any implementation must work there without surprises: same kind of inputs accepted, same kind of results, no new exceptions for normal calls. The classic backend violation is an implementation that \"supports\" a method by throwing. Cash on delivery implementing `refund()` with `throw new UnsupportedOperationException()` compiles fine, and fails at 2am when someone cancels a cash order.",
        },
        {
          type: "heading",
          text: "Interface Segregation: small gateway interfaces",
        },
        {
          type: "paragraph",
          text: "Most LSP violations I've seen were really ISP problems. The interface was too big, so some implementations had to fake parts of it. Split it by what callers need: `Payments` for charging, `Refunds` for refunding, `PaymentWebhooks` for verifying callbacks. A provider implements the ones it actually supports, and the type system tells the caller what's possible.",
        },
        {
          type: "heading",
          text: "Dependency Inversion: have things handed in",
        },
        {
          type: "paragraph",
          text: "High-level policy (\"a night ride costs 25% more\") shouldn't depend on low-level details (the system clock, a specific SMS vendor). Both should depend on an abstraction, and the details get **handed in** through the constructor. In Spring that's constructor injection. The two ways to break it are creating the dependency yourself with `new`, and fetching it yourself from a global place (a service locator, like calling `applicationContext.getBean(...)` inside a method).",
        },
        {
          type: "heading",
          text: "DRY, KISS and YAGNI",
        },
        {
          type: "list",
          items: [
            "**DRY (Don't Repeat Yourself)** is about knowledge, not characters. The rule \"refunds are allowed within 7 days\" should live in one place. Two pieces of code that look alike but change for different reasons (a customer address check and a warehouse address check) are fine to keep separate. Merging them couples two things that will drift apart.",
            "**KISS (Keep It Simple)** means picking the boring solution that works: a plain method over a framework of annotations, a `Map` lookup over a rules engine.",
            "**YAGNI (You Aren't Gonna Need It)** means not building for imagined futures: a factory with one product, a cache in front of a query that runs twice a day, a plugin system for one plugin. Each one is code to read, test and debug, and the future it was built for usually arrives looking different.",
          ],
        },
        {
          type: "heading",
          text: "Law of Demeter: talk to your neighbours",
        },
        {
          type: "paragraph",
          text: "A method should call methods on its own fields, its parameters and objects it creates, not on objects reached through them. `order.getCustomer().getWallet().getBalance()` means the caller knows how customers store money. If wallets move to their own service, every chain like that breaks. `walletService.balanceOf(order.customerId())` asks the right object directly.",
        },
        {
          type: "heading",
          text: "Composition over inheritance",
        },
        {
          type: "paragraph",
          text: "Inheritance welds a class to its parent's internals forever. Composition wraps: a `RetryingSmsSender` holds any `SmsSender` and adds retries around it. The same wrapper works for every provider, and I can stack another one (logging, metrics) without a class explosion like `RetryingLoggingTwilioSender`.",
        },
        {
          type: "heading",
          text: "Layer contracts and one response envelope",
        },
        {
          type: "diagram",
          text: `Controller   HTTP in, HTTP out. Validates the request,
    │        calls ONE use case, builds the response.
    ▼
Service      Business rules. Takes and returns plain
    │        objects (records, entities). Knows no HTTP.
    ▼
Repository   Data access. Returns entities or DTOs.
             Never a ResponseEntity, never JSON.`,
          caption: "Each layer only knows the one below it, and only the controller knows it's on the web.",
        },
        {
          type: "paragraph",
          text: "When a repository or service starts returning HTTP status codes or response maps, the same logic can't be reused from a scheduled job, a queue consumer or a CLI command, because those have no HTTP. And when every controller builds its own JSON shape, every client has to handle every shape. One envelope for success and one for errors, built in one place, fixes both.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "How Spring builds the strategy map for you",
        },
        {
          type: "paragraph",
          text: "In the registry example below I build the `Map` by hand from a `List`. In Spring I don't even need to write the list. If a constructor asks for `List<PaymentGateway>`, Spring's `DefaultListableBeanFactory` notices the parameter is a collection, finds **every** bean whose type matches `PaymentGateway`, and injects them all. The order follows `@Order` or the `Ordered` interface when present.",
        },
        {
          type: "paragraph",
          text: "If the constructor asks for `Map<String, PaymentGateway>`, Spring fills the map with **bean name to bean**. That's handy, but bean names are an accident of class names (`cardGateway`), so I prefer each gateway to report its own `code()` and build the map from the list myself. Then renaming a class can't silently change an API value.",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentRouter.java (Spring version)",
          code: `@Service
public class PaymentRouter {
    private final Map<String, PaymentGateway> byCode;

    public PaymentRouter(List<PaymentGateway> gateways) {   // every PaymentGateway bean
        this.byCode = gateways.stream()
                .collect(Collectors.toMap(PaymentGateway::code, Function.identity()));
    }

    public String pay(String provider, int amount) {
        PaymentGateway gateway = byCode.get(provider);
        if (gateway == null) throw new UnknownProviderException(provider);
        return gateway.charge(amount);
    }
}`,
        },
        {
          type: "paragraph",
          text: "`Collectors.toMap` throws `IllegalStateException` on a duplicate key, so two gateways claiming the code `\"upi\"` fail the application at startup instead of picking one at random. That's exactly when I want to find out.",
        },
        {
          type: "heading",
          text: "Why new inside a service hurts",
        },
        {
          type: "paragraph",
          text: "Spring creates a bean, looks at its constructor, and resolves each parameter from the container before calling it. Whatever arrives through the constructor can be swapped: a real `Clock` in production, `Clock.fixed(...)` in a test. Whatever the class builds itself with `new` is invisible to the container. It can't be replaced, it can't be proxied (so no `@Transactional` or `@Retryable` on it), and its configuration is hard-coded.",
        },
        {
          type: "paragraph",
          text: "A service locator looks more flexible, but it hides the same thing. `context.getBean(SmsSender.class)` inside a method means the constructor lies about what the class needs. A test only finds out when that line runs and throws `NoSuchBeanDefinitionException`.",
        },
        {
          type: "heading",
          text: "How one error envelope gets built",
        },
        {
          type: "paragraph",
          text: "When a controller method throws, Spring MVC's `DispatcherServlet` asks its exception resolvers to handle it. `ExceptionHandlerExceptionResolver` looks for a matching `@ExceptionHandler`, first in the controller itself, then in `@RestControllerAdvice` beans. That's the single place to turn exceptions into one consistent error shape.",
        },
        {
          type: "code",
          language: "java",
          title: "ApiErrors.java",
          code: `@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(UnknownProviderException.class)
    ProblemDetail unknownProvider(UnknownProviderException e) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        body.setTitle("Unknown payment provider");
        return body;
    }

    @ExceptionHandler(BookingNotFoundException.class)
    ProblemDetail notFound(BookingNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }
}`,
        },
        {
          type: "paragraph",
          text: "`ProblemDetail` arrived in Spring Framework 6 (Boot 3) and follows the standard \"problem details\" JSON format (RFC 9457, which replaced RFC 7807): `type`, `title`, `status`, `detail`, `instance`. Spring Boot can also use it for its own MVC errors with `spring.mvc.problemdetails.enabled=true`. Whether I use `ProblemDetail` or a custom `{ \"success\": false, \"error\": {...} }` shape matters less than using **one** shape everywhere.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "OCP: a payment router with no if/else",
        },
        {
          type: "paragraph",
          text: "Everyday version: a food court with one billing counter. The counter doesn't know how each stall cooks. It looks up the stall by name and passes the order on. A new stall opening doesn't change the counter.",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentRouter.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class PaymentRouter {
    interface PaymentGateway {
        String code();
        String charge(int amount);
    }

    record CardGateway() implements PaymentGateway {
        public String code() { return "card"; }
        public String charge(int amount) { return "card charged " + amount; }
    }

    record UpiGateway() implements PaymentGateway {
        public String code() { return "upi"; }
        public String charge(int amount) { return "upi charged " + amount; }
    }

    private final Map<String, PaymentGateway> byCode;

    PaymentRouter(List<PaymentGateway> gateways) {     // Spring would inject this list
        this.byCode = gateways.stream()
                .collect(Collectors.toMap(PaymentGateway::code, Function.identity()));
    }

    String pay(String provider, int amount) {
        PaymentGateway gateway = byCode.get(provider);
        if (gateway == null) throw new IllegalArgumentException("unknown provider: " + provider);
        return gateway.charge(amount);
    }

    public static void main(String[] args) {
        PaymentRouter router = new PaymentRouter(List.of(new CardGateway(), new UpiGateway()));
        System.out.println(router.pay("upi", 250));
        System.out.println(router.pay("card", 900));
        try {
            router.pay("cheque", 100);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `upi charged 250
card charged 900
unknown provider: cheque`,
        },
        {
          type: "paragraph",
          text: "Adding a wallet provider means writing `WalletGateway` and nothing else. `PaymentRouter` never changes. The unknown provider fails with a clear message in one place, instead of falling through an `else` somewhere.",
        },
        {
          type: "heading",
          text: "DIP: a fare that depends on the time",
        },
        {
          type: "paragraph",
          text: "Everyday version: a cab charges extra at night. If the fare calculator checks the wall clock itself, the only way to test the night rate is to stay up until 10pm. If it's **handed** a clock, I can give it any time I like.",
        },
        {
          type: "code",
          language: "java",
          title: "FareClock.java",
          code: `import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

public class FareClock {
    static class FareService {
        private final Clock clock;                       // handed in, never created here

        FareService(Clock clock) { this.clock = clock; }

        int fare(int km) {
            int base = 50 + km * 12;
            int hour = LocalTime.now(clock).getHour();
            boolean night = hour >= 22 || hour < 6;
            return night ? base * 125 / 100 : base;      // 25% night surcharge
        }
    }

    public static void main(String[] args) {
        ZoneId india = ZoneId.of("Asia/Kolkata");
        Clock noon = Clock.fixed(Instant.parse("2026-10-29T06:30:00Z"), india);   // 12:00 IST
        Clock late = Clock.fixed(Instant.parse("2026-10-29T17:30:00Z"), india);   // 23:00 IST
        System.out.println("noon fare:  " + new FareService(noon).fare(10));
        System.out.println("night fare: " + new FareService(late).fare(10));
    }
}`,
        },
        {
          type: "output",
          text: `noon fare:  170
night fare: 212`,
        },
        {
          type: "paragraph",
          text: "`LocalTime.now(clock)` reads the time from whatever clock it gets. In production Spring hands in `Clock.systemDefaultZone()` (I declare it as a `@Bean`). In the test, `Clock.fixed` freezes time at exactly 23:00 IST. 170 times 1.25 is 212.5, and integer division drops the half, which is the kind of rounding decision a fixed clock lets me test on purpose.",
        },
        {
          type: "heading",
          text: "LSP gone wrong: the fat gateway",
        },
        {
          type: "paragraph",
          text: "Everyday version: a sign at a shop says \"all items returnable\", but one shelf isn't. You only find out at the returns desk.",
        },
        {
          type: "code",
          language: "java",
          title: "FatGateway.java",
          code: `public class FatGateway {
    interface PaymentGateway {
        String charge(int amount);
        String refund(int amount);
    }

    static class CashOnDelivery implements PaymentGateway {
        public String charge(int amount) { return "collect " + amount + " in cash"; }
        public String refund(int amount) {
            throw new UnsupportedOperationException("cash cannot be refunded online");
        }
    }

    static void cancelOrder(PaymentGateway gateway, int amount) {   // written for "any gateway"
        System.out.println(gateway.refund(amount));
    }

    public static void main(String[] args) {
        try {
            cancelOrder(new CashOnDelivery(), 300);
        } catch (UnsupportedOperationException e) {
            System.out.println("cancel failed: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `cancel failed: cash cannot be refunded online`,
        },
        {
          type: "paragraph",
          text: "`cancelOrder` was written correctly against the interface. The bug is that `CashOnDelivery` claimed to be a `PaymentGateway` while breaking half of its promise. The compiler was happy, and the failure moved to runtime.",
        },
        {
          type: "heading",
          text: "ISP fixes it: split the interface",
        },
        {
          type: "code",
          language: "java",
          title: "RefundCheck.java",
          code: `public class RefundCheck {
    interface Payments { String charge(int amount); }
    interface Refunds  { String refund(int amount); }

    static class CardGateway implements Payments, Refunds {
        public String charge(int amount) { return "card charged " + amount; }
        public String refund(int amount) { return "card refunded " + amount; }
    }

    static class CashOnDelivery implements Payments {      // no refund method to fake
        public String charge(int amount) { return "collect " + amount + " in cash"; }
    }

    static String refundOrFlag(Payments payment, int amount) {
        if (payment instanceof Refunds refunds) {
            return refunds.refund(amount);
        }
        return "no online refund, send to support team";
    }

    public static void main(String[] args) {
        System.out.println(refundOrFlag(new CardGateway(), 300));
        System.out.println(refundOrFlag(new CashOnDelivery(), 300));
    }
}`,
        },
        {
          type: "output",
          text: `card refunded 300
no online refund, send to support team`,
        },
        {
          type: "paragraph",
          text: "Now \"can this provider refund?\" is a question the type answers. `payment instanceof Refunds refunds` is Java 16+ pattern matching: it checks the type and gives me a typed variable in one go. In a Spring app I'd usually skip the `instanceof` entirely and inject `List<Refunds>`, so only refund-capable providers are ever in the refund registry.",
        },
        {
          type: "heading",
          text: "Composition: retries as a wrapper",
        },
        {
          type: "paragraph",
          text: "Everyday version: when a call drops, you redial. Redialling isn't a feature of one phone brand. It's something you do around any phone.",
        },
        {
          type: "code",
          language: "java",
          title: "RetryingSms.java",
          code: `public class RetryingSms {
    interface SmsSender { void send(String phone, String text); }

    static class FlakySender implements SmsSender {      // fails twice, then works
        private int calls = 0;
        public void send(String phone, String text) {
            calls++;
            if (calls < 3) throw new IllegalStateException("provider timeout");
            System.out.println("sent '" + text + "' to " + phone + " on try " + calls);
        }
    }

    static class RetryingSender implements SmsSender {   // wraps any sender
        private final SmsSender inner;
        private final int maxTries;

        RetryingSender(SmsSender inner, int maxTries) {
            this.inner = inner;
            this.maxTries = maxTries;
        }

        public void send(String phone, String text) {
            for (int attempt = 1; ; attempt++) {
                try {
                    inner.send(phone, text);
                    return;
                } catch (IllegalStateException e) {
                    System.out.println("try " + attempt + " failed: " + e.getMessage());
                    if (attempt == maxTries) throw e;
                }
            }
        }
    }

    public static void main(String[] args) {
        SmsSender sender = new RetryingSender(new FlakySender(), 3);
        sender.send("+91-90000-00000", "Your OTP is 4821");
    }
}`,
        },
        {
          type: "output",
          text: `try 1 failed: provider timeout
try 2 failed: provider timeout
sent 'Your OTP is 4821' to +91-90000-00000 on try 3`,
        },
        {
          type: "paragraph",
          text: "`RetryingSender` is itself an `SmsSender`, so callers can't tell the difference. That's the decorator pattern, and it's composition: the retry logic is written once and wraps any provider. With inheritance I'd need `RetryingTwilioSender`, `RetryingVonageSender` and so on. In real code I'd add a backoff delay between tries and only retry errors that are safe to retry, which the reliable-calls lesson covers.",
        },
        {
          type: "heading",
          text: "SRP: splitting a God service",
        },
        {
          type: "code",
          language: "java",
          title: "Before and after (shape only)",
          code: `// Before: one class, every use case, every dependency
@Service
class BookingService {
    BookingService(BookingRepository repo, PricingClient pricing, PaymentRouter payments,
                   RefundPolicy refunds, PdfRenderer pdf, Mailer mailer, CsvWriter csv,
                   DriverClient drivers, AuditLog audit /* ...and five more */) { }
    Booking create(...) { }
    void cancel(...) { }
    byte[] invoicePdf(...) { }
    String exportCsv(...) { }
}

// After: one class per use case, each with only what it uses
@Service
class CancelBookingService {
    CancelBookingService(BookingRepository repo, RefundPolicy refunds, AuditLog audit) { }
    CancelResult cancel(long bookingId, String reason) { return null; }
}`,
        },
        {
          type: "paragraph",
          text: "The test for `CancelBookingService` now needs three fakes instead of fourteen, and a change to PDF invoices can't produce a merge conflict with a change to cancellation.",
        },
        {
          type: "heading",
          text: "Layer contract: who builds the response",
        },
        {
          type: "code",
          language: "java",
          title: "BookingController.java",
          code: `@RestController
@RequestMapping("/bookings")
class BookingController {
    private final CancelBookingService cancelBooking;

    BookingController(CancelBookingService cancelBooking) {
        this.cancelBooking = cancelBooking;
    }

    @PostMapping("/{id}/cancel")
    ResponseEntity<CancelResponse> cancel(@PathVariable long id, @Valid @RequestBody CancelRequest body) {
        CancelResult result = cancelBooking.cancel(id, body.reason());   // plain record back
        return ResponseEntity.ok(CancelResponse.from(result));          // HTTP shape built here only
    }
}`,
        },
        {
          type: "paragraph",
          text: "The service returns a `CancelResult` record and throws domain exceptions like `BookingNotFoundException`. It never sees `ResponseEntity` or a status code. So a nightly job that cancels unpaid bookings can call the exact same `cancel` method.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Interfaces for everything",
        },
        {
          type: "paragraph",
          text: "`OrderService` plus `OrderServiceImpl`, with one implementation forever, is ceremony, not DIP. Spring can proxy and mock concrete classes just fine. I add an interface when there are two real implementations, or when it's a boundary I want to swap (a payment provider, a maps API, an SMS vendor).",
        },
        {
          type: "heading",
          text: "DRY applied to look-alike code",
        },
        {
          type: "paragraph",
          text: "Two validators with the same three lines get merged into a shared helper with a `boolean isWarehouse` flag. Six months later it has four flags. If two pieces of code change for different reasons, the duplication was cheaper than the coupling.",
        },
        {
          type: "heading",
          text: "Speculative generality",
        },
        {
          type: "paragraph",
          text: "A `NotificationChannelFactory` that only ever produces email. A Redis cache in front of a settings table read twice an hour. A config flag nobody has ever flipped. Each one is code that has to be understood and kept working, for a need that hasn't shown up.",
        },
        {
          type: "heading",
          text: "Throwing UnsupportedOperationException from an interface method",
        },
        {
          type: "paragraph",
          text: "It's almost always a sign the interface should be split. If the method genuinely might not apply, make that explicit in the type (a separate interface) or in the result (`Optional`, a `supportsRefunds()` capability check), not in a surprise exception.",
        },
        {
          type: "heading",
          text: "Services that return HTTP",
        },
        {
          type: "paragraph",
          text: "A service returning `ResponseEntity`, or a repository returning a `Map` ready to be serialised. It works until the same logic is needed from a queue consumer. Then someone copies it, and DRY breaks for real.",
        },
        {
          type: "heading",
          text: "Train-wreck calls",
        },
        {
          type: "paragraph",
          text: "`booking.getTrip().getDriver().getVehicle().getType().getRate()`. Besides breaking the Law of Demeter, with JPA each step can trigger a lazy load, so one line can be four SQL queries, or a `LazyInitializationException` outside a transaction.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Constructor injection only, with `final` fields. No field injection, no `getBean` inside methods. The constructor is the honest list of dependencies.",
            "One public method per use-case service, named after the use case (`CancelBookingService.cancel`). If the constructor passes six or seven dependencies, look for a second use case hiding inside.",
            "When you see the same `if/else` on a type code in two places, replace it with an interface and a registry. One place is fine, two is a pattern.",
            "Design interfaces from the caller's side. Ask \"what does checkout need?\", not \"what can the provider SDK do?\".",
            "Inject time (`Clock`), randomness (`Supplier<String>` or `RandomGenerator`) and IDs. They're dependencies too, and they're what makes tests flaky.",
            "Keep HTTP in controllers, SQL in repositories, and rules in services. Return records or entities between layers.",
            "Build every error response in one `@RestControllerAdvice`, and pick one envelope for success responses too.",
            "Prefer wrapping (decorators) over subclassing for cross-cutting behaviour like retries, logging and metrics.",
            "Delete abstractions that never got a second implementation. Removing code is a valid refactor.",
          ],
        },
      ],
    },
    {
      title: "Trade-offs",
      blocks: [
        {
          type: "table",
          headers: ["Choice", "You gain", "You pay"],
          rows: [
            ["One class per use case", "Small classes, focused tests, fewer merge conflicts", "More files, and shared helpers need a home"],
            ["Strategy map over if/else", "New variants without editing old code", "One more indirection; overkill for two stable cases"],
            ["Many small interfaces", "Implementations never fake methods", "More types to name and find"],
            ["Interface for every service", "Easy to swap in theory", "Ceremony and navigation pain if there's only one implementation"],
            ["Strict DRY", "One place to change a rule", "Coupling between code that should evolve separately"],
            ["Composition (decorators)", "Mix and match behaviours at runtime", "Stack traces get deeper; wiring order matters"],
            ["Inheritance", "Less code for a true \"is-a\" with shared state", "Fragile base class: parent changes ripple to every child"],
            ["One response envelope", "Clients parse one shape", "Migrating an existing API is a breaking change"],
          ],
        },
      ],
    },
    {
      title: "Design Principles in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Here's a small, realistic service: send a login OTP by SMS and verify it. It's the kind of thing every app has, and it's where I see God classes start, because \"just add OTP to `UserService`\" is so tempting.",
        },
        {
          type: "paragraph",
          text: "Everyday version: a bank token machine. It prints a number, remembers it for a few minutes, and accepts it once. It doesn't care which printer brand it uses.",
        },
        {
          type: "code",
          language: "java",
          title: "OtpService.java",
          code: `import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Supplier;

public class OtpService {
    interface SmsSender { void send(String phone, String text); }

    record PendingOtp(String code, Instant expiresAt) {}

    private final SmsSender sms;
    private final Supplier<String> codes;           // random in production, fixed in tests
    private final Clock clock;
    private final Map<String, PendingOtp> pending = new HashMap<>();

    OtpService(SmsSender sms, Supplier<String> codes, Clock clock) {
        this.sms = sms;
        this.codes = codes;
        this.clock = clock;
    }

    void sendOtp(String phone) {
        String code = codes.get();
        pending.put(phone, new PendingOtp(code, clock.instant().plusSeconds(300)));
        sms.send(phone, "Your login code is " + code);
    }

    boolean verify(String phone, String code) {
        PendingOtp otp = pending.get(phone);
        boolean ok = otp != null && otp.code().equals(code) && clock.instant().isBefore(otp.expiresAt());
        if (ok) pending.remove(phone);               // a code works once
        return ok;
    }

    public static void main(String[] args) {
        Clock clock = Clock.fixed(Instant.parse("2026-10-29T10:00:00Z"), java.time.ZoneOffset.UTC);
        SmsSender console = (phone, text) -> System.out.println("SMS to " + phone + ": " + text);
        OtpService otp = new OtpService(console, () -> "4821", clock);

        otp.sendOtp("+91-90000-00000");
        System.out.println("wrong code: " + otp.verify("+91-90000-00000", "1111"));
        System.out.println("right code: " + otp.verify("+91-90000-00000", "4821"));
        System.out.println("used again: " + otp.verify("+91-90000-00000", "4821"));
    }
}`,
        },
        {
          type: "output",
          text: `SMS to +91-90000-00000: Your login code is 4821
wrong code: false
right code: true
used again: false`,
        },
        {
          type: "paragraph",
          text: "How the principles show up, line by line:",
        },
        {
          type: "list",
          items: [
            "**SRP:** the class does OTPs and nothing else. User lookup, rate limiting and login sessions live elsewhere.",
            "**DIP:** all three things that make this hard to test are handed in. The SMS vendor is an interface, the code generator is a `Supplier<String>`, and time is a `Clock`. The demo used a lambda that prints instead of sending, the fixed code `4821`, and a frozen clock.",
            "**ISP:** `SmsSender` has one method, because that's all OTP needs. The vendor SDK has fifty.",
            "**KISS/YAGNI:** there's no `OtpStrategyFactory`. If voice OTP arrives later, it's another `SmsSender`-like interface or a wrapper.",
            "**Removing on success** makes each code single-use, which the `used again: false` line proves.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Not production-ready as shown",
          text: "The in-memory `HashMap` is a stand-in. With more than one app instance, the pending codes belong in Redis or a table with an expiry, the map access must be thread-safe, and real OTP code also needs attempt limits, a secure random generator (`SecureRandom`) and constant-time comparison. Those are separate responsibilities, which is a nice way to see SRP: each would be its own small collaborator, not more lines in this class.",
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
              question: "Explain the Single Responsibility Principle with a backend example.",
              answer:
                "A class should have one reason to change, which in practice means it serves one actor or one use case. A common violation is an `OrderService` that places, cancels, refunds, exports and emails orders, with a dozen dependencies in its constructor.\n\nI'd split it into one service per use case, like `PlaceOrderService` and `CancelOrderService`, each with only the dependencies it needs. The constructor length is the quickest smell test: many unrelated dependencies usually means many responsibilities.",
            },
            {
              question: "How would you add a new payment provider without editing existing code?",
              answer:
                "Define a `PaymentGateway` interface with a `code()` and the operations, implement one class per provider, and have a router build a `Map<String, PaymentGateway>` from the injected `List<PaymentGateway>`. A new provider is a new `@Component` class. The router and the existing providers don't change.\n\nThat's the Open/Closed principle. I'd also let `Collectors.toMap` fail on duplicate codes so a clash is caught at startup.",
            },
            {
              question: "How does Spring inject a List or Map of beans?",
              answer:
                "When a constructor or field asks for `List<T>`, Spring's bean factory treats it as a request for every bean assignable to `T` and injects them all, ordered by `@Order` or `Ordered` if present. For `Map<String, T>`, the keys are the bean names.\n\nI prefer the list and an explicit `code()` on each bean, because bean names come from class names and renaming a class shouldn't change what an API accepts.",
            },
            {
              question: "What is the Liskov Substitution Principle, and how is it usually violated in backends?",
              answer:
                "Any implementation of a type must be usable wherever that type is expected, without the caller needing to know which one it got. That covers inputs, outputs and exceptions.\n\nThe usual backend violation is an implementation that throws `UnsupportedOperationException` for a method it can't support, like a cash payment gateway's `refund()`. Code written correctly against the interface then fails at runtime. The fix is usually to split the interface.",
            },
            {
              question: "How do ISP and LSP relate?",
              answer:
                "A fat interface forces implementations to fake methods they can't support, and faking is how LSP gets broken. Splitting the interface by what callers need, like `Payments` and `Refunds`, means each class only promises what it can do.\n\nIn my example, cash on delivery implements only `Payments`, so there's no `refund()` to break, and the code that needs refunds can ask for `Refunds` specifically.",
            },
            {
              question: "What's the difference between Dependency Inversion and dependency injection?",
              answer:
                "Dependency Inversion is the design principle: high-level policy and low-level details both depend on abstractions, and the abstraction is owned by the policy side. Dependency injection is one technique to achieve it: dependencies are passed in, usually through the constructor, instead of being created inside.\n\nSpring is a DI container. You can use Spring and still violate DIP, for example by injecting a concrete vendor SDK client straight into your business service.",
            },
            {
              question: "Why is calling new or getBean inside a service a problem?",
              answer:
                "Both hide a dependency. With `new`, the object can't be swapped in tests, isn't managed by Spring so it gets no proxies (no `@Transactional`, `@Async`, `@Retryable`), and its configuration is hard-coded. With `getBean`, the constructor no longer tells the truth about what the class needs, and failures show up only when that line runs.\n\nConstructor injection makes the dependency list visible and lets a test pass a fake, like the fixed `Clock` I used to test a night fare.",
            },
            {
              question: "Is duplicated code always bad? When is DRY the wrong call?",
              answer:
                "No. DRY is about not duplicating knowledge, a business rule or a fact. Two snippets that look the same but change for different reasons aren't the same knowledge.\n\nMerging them creates coupling, and the shared helper slowly gains flags for each caller's special case. I'd rather have two small, clear copies than one helper with four booleans. The \"rule of three\" is a decent default: extract on the third real repetition, once the shared shape is clear.",
            },
            {
              question: "Give examples of YAGNI violations you've seen.",
              answer:
                "A factory that only ever creates one type. A generic plugin system for one plugin. A cache in front of a query that's already fast and rarely called, which then needs invalidation logic and causes stale-data bugs. Config flags nobody has ever changed.\n\nThe cost isn't just writing them, it's that every reader has to understand them and every change has to keep them working. I add the abstraction when the second real need arrives.",
            },
            {
              question: "What is the Law of Demeter?",
              answer:
                "A method should only talk to its close collaborators: its own fields, its parameters, and objects it creates. Not objects reached through them, like `order.getCustomer().getWallet().getBalance()`.\n\nChains like that spread knowledge of internal structure across the codebase, so a structural change breaks many callers. With JPA they can also trigger hidden lazy loads. Asking the right object directly, like `walletService.balanceOf(customerId)`, keeps the knowledge in one place.",
            },
            {
              question: "Why prefer composition over inheritance? Give a concrete example.",
              answer:
                "Inheritance ties a class to its parent's internals, and you can only extend one class. Composition wraps behaviour around an interface, so it works with any implementation and can be stacked.\n\nA retrying SMS sender is my go-to example: `RetryingSender implements SmsSender` and holds another `SmsSender`. It adds retries to every provider without subclasses per provider, and I can wrap it again for logging or metrics.",
            },
            {
              question: "What should a repository return, and why shouldn't a service return ResponseEntity?",
              answer:
                "A repository returns entities, projections or DTOs, plain data. A service returns domain results and throws domain exceptions. Only the controller turns those into HTTP: status code, headers, JSON shape.\n\nIf HTTP leaks into services, the same logic can't be reused from a scheduled job, a queue consumer or another service, because those have no HTTP request. It also scatters status-code decisions across layers.",
            },
            {
              question: "How do you make API error responses consistent in Spring?",
              answer:
                "Throw domain exceptions from services and map them in one `@RestControllerAdvice` with `@ExceptionHandler` methods. Spring's `ExceptionHandlerExceptionResolver` finds the handler, first in the controller, then in the advice beans.\n\nSince Spring Framework 6 there's `ProblemDetail`, which follows the standard problem-details JSON format, and Boot can use it for built-in errors too. Whether it's `ProblemDetail` or a custom envelope, the point is one shape for every error.",
            },
            {
              question: "When would you NOT create an interface for a service?",
              answer:
                "When there's one implementation and no boundary to swap. Mockito can mock concrete classes, and Spring can proxy them with CGLIB, so an `OrderServiceImpl` next to `OrderService` adds nothing but a jump in the IDE.\n\nI create interfaces at real boundaries: external providers (payments, SMS, maps), and places with more than one implementation today.",
            },
            {
              question: "How do you refactor a 3,000-line God service safely?",
              answer:
                "First, characterization tests around its public methods, so behaviour is pinned. Then move one use case at a time into its own class, keep the old method delegating to the new class, and switch callers over gradually. Each step is a small, reviewable change.\n\nI wouldn't rewrite it in one go. A big-bang rewrite of a class everyone depends on is how regressions ship.",
            },
            {
              question: "Is SOLID still relevant with functional-style Java, records and lambdas?",
              answer:
                "Yes, the ideas just get lighter. A single-method interface can be implemented with a lambda, which makes ISP and DIP cheap: my OTP demo injected a `Supplier<String>` and a lambda `SmsSender`.\n\nRecords make value objects and results easy, which helps keep layers returning plain data. The principles are about where knowledge lives, and that doesn't change with syntax.",
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
            "Take `PaymentRouter` and add a `WalletGateway` with code `\"wallet\"`. Confirm you didn't edit `PaymentRouter` itself. Then add a second gateway that also returns `\"upi\"` and see what `Collectors.toMap` does at construction.",
            "Change `FareClock` so the night surcharge starts at 21:00. Write two fixed clocks, one at 20:59 IST and one at 21:00 IST, and check the boundary.",
            "In `RetryingSms`, add a `LoggingSender` wrapper that prints before and after each send. Wrap the senders in both orders and compare the output.",
            "Find a class in a project you know with more than six constructor dependencies. List which public method uses which dependency. Do the groups suggest separate use-case classes?",
            "Search a codebase for `UnsupportedOperationException`. For each hit, decide whether the interface should be split.",
            "Write a `@RestControllerAdvice` that maps two of your own exceptions to `ProblemDetail`, and call both endpoints with curl to compare the JSON.",
            "Delete one abstraction that has a single implementation and has had it for a year. Run the tests. Did anything get worse?",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `SRP   one class, one use case      PlaceOrder / CancelOrder
OCP   add a class, don't edit      Map<code, Gateway> registry
LSP   keep the interface's promise no UnsupportedOperationException
ISP   small, caller-shaped types   Payments / Refunds / Webhooks
DIP   have dependencies handed in  constructor injection, Clock

DRY    one home per rule (not per look-alike snippet)
KISS   boring code that works
YAGNI  no factory for one product, no cache for no load
LoD    ask your neighbour, not your neighbour's wallet
COMP   wrap (decorator) before you extend

LAYERS controller: HTTP | service: rules | repo: data
ERRORS one @RestControllerAdvice, one envelope`,
          caption: "The one-screen version I'd want before a design interview.",
        },
        {
          type: "list",
          items: [
            "Principles exist to make the next change cheap. If applying one makes the code harder to change, it's being misapplied.",
            "The most useful backend moves: one service per use case, a registry instead of type-code `if` chains, constructor injection for everything including time, and HTTP only in controllers.",
            "Add abstractions when the second real need arrives, and delete the ones that never got it.",
          ],
        },
      ],
    },
  ],
};
