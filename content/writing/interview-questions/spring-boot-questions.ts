import type { Lesson } from "../types";

export const springBootQuestions: Lesson = {
  slug: "spring-boot-interview-questions",
  date: "2026-10-29",
  title: "Spring and Spring Boot Interview Questions",
  description:
    "The Spring and Spring Boot questions that come up in almost every Java backend interview, from IoC, bean lifecycle and proxies to auto-configuration, scheduling, MVC, validation and the embedded Tomcat thread model, answered in plain words.",
  tags: ["Interview", "Spring", "Spring Boot", "Spring MVC", "Java"],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the Spring questions I prepared for, written the way I'd actually say them in an interview. Before opening an answer, I try to answer it out loud in under 90 seconds. If I can't, that's the one to come back to.",
        },
        {
          type: "paragraph",
          text: "A ⭐ in front of a question means it's one of the most asked. If time is short, I do only the starred ones. Most answers start with a small everyday picture, because if I can explain a proxy with a receptionist, I understand it well enough to explain it with code too.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "The shape of a good answer",
          text: "One-line definition, a simple example, how it works underneath, and the trade-off: when I would not use it. Interviewers dig into the trade-off more than the definition.",
        },
      ],
    },
    {
      title: "IoC and Dependency Injection",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What are IoC and DI? Why use them?",
              answer:
                "Think of a restaurant. The chef doesn't go out to buy vegetables; the kitchen manager delivers them. **Inversion of Control** is that idea: my class doesn't create the things it needs, the container does, and hands them in. **Dependency Injection** is the delivery mechanism.\n\nSo a `FareService` doesn't call `new FareRepository()`. It declares a constructor parameter of type `FareRepository`, and Spring passes one in. The benefits are loose coupling, easy testing (I pass a mock or a fake), and one place where wiring is decided.",
            },
            {
              question: "⭐ Constructor vs field vs setter injection: which do you prefer?",
              answer:
                "Constructor injection. The dependencies can be `final`, the object can never exist half-built, and I can test it with plain `new FareService(fakeRepo)` without starting Spring. It also gives an honest smell: a constructor with nine parameters is a class doing too much.\n\nField injection (`@Autowired` on a field) hides dependencies and needs reflection to set them in tests. Setter injection is only useful for genuinely optional dependencies. With a single constructor, Spring doesn't even need `@Autowired`; Lombok's `@RequiredArgsConstructor` with `final` fields is a common shortcut.",
            },
            {
              question: "`BeanFactory` vs `ApplicationContext`?",
              answer:
                "`BeanFactory` is the basic container: it creates beans lazily when asked. `ApplicationContext` extends it and adds what real apps need: eager creation of singletons at startup (so wiring errors fail fast), events, i18n messages, the `Environment` with profiles and properties, and AOP integration.\n\nIn practice I always work with an `ApplicationContext`; Spring Boot creates one for me.",
            },
            {
              question: "⭐ `@Component` vs `@Bean`?",
              answer:
                "`@Component` goes on my own class, and component scanning finds it. `@Bean` goes on a method inside a `@Configuration` class, and I build the object myself in that method.\n\nI use `@Bean` for third-party classes I can't annotate, or when creating the object needs some logic, like a `RestClient` with timeouts or a `ThreadPoolTaskExecutor` with a bounded queue.",
            },
            {
              question: "`@Component` vs `@Service` vs `@Repository` vs `@Controller`?",
              answer:
                "All four register a bean; the specialised ones signal intent, like labels on kitchen drawers. Two have extra behaviour: `@Repository` turns low-level database exceptions into Spring's `DataAccessException` hierarchy, and `@Controller` / `@RestController` classes are picked up by Spring MVC for request mapping.",
            },
            {
              question: "⭐ Two beans of the same type: how does Spring pick one?",
              answer:
                "It doesn't guess. Startup fails with \"expected single matching bean but found 2\". I have three ways out.\n\nMark one `@Primary` so it's the default. Or name the one I want at the injection point with `@Qualifier(\"sms\")`. Or inject all of them, as `List<NotificationSender>` or `Map<String, NotificationSender>` keyed by bean name, and choose at runtime. The third option is the Strategy pattern without any if/else on type: an OTP goes to the SMS sender, a receipt to the email sender.",
            },
            {
              question: "How does `@Autowired` work internally?",
              answer:
                "A `BeanPostProcessor` called `AutowiredAnnotationBeanPostProcessor` looks at each bean's constructor, fields and setters while the bean is being created. For each dependency it asks the container for a bean **by type**, then narrows down with `@Qualifier`, `@Primary` or the parameter name if there's more than one, and injects it.",
            },
            {
              question: "⭐ What is a circular dependency, and how do you fix it?",
              answer:
                "Two friends each waiting for the other to call first: nobody calls. In code, `OrderService` needs `PaymentService` and `PaymentService` needs `OrderService`. With constructor injection Spring can't build either one, and since Spring Boot 2.6 circular references fail at startup by default.\n\nThe right fix is design: pull the shared logic into a third class both can use, or have one side publish an event instead of calling the other directly. `@Lazy` on one injection point makes it start, but it hides the problem rather than fixing it.",
            },
            {
              question: "How does Spring resolve circular dependencies with the three-level cache, and why does constructor injection still fail?",
              answer:
                "For singletons injected through fields or setters, Spring keeps three maps: fully built singletons, early references to beans still being built, and factories that can produce an early reference (possibly already wrapped in a proxy).\n\nWhile A is being created, Spring exposes an early reference to it. When B asks for A, it gets that half-built reference, B finishes, and then A finishes. With **constructor** injection there's no object to expose until the constructor has run, and the constructor can't run without the other bean, so the cycle can't be broken.",
            },
            {
              question: "`@Value` vs `@ConfigurationProperties`?",
              answer:
                "`@Value(\"${app.otp.length:6}\")` is fine for one or two values. For a group of related settings I use `@ConfigurationProperties(prefix = \"app.sms\")` bound to a record: it's typed, it can be validated with `@Validated`, the IDE autocompletes it, and the settings stay together in one object instead of being scattered across classes.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Typed config with a record",
          code: `@ConfigurationProperties(prefix = "app.sms")
public record SmsProperties(String apiKey, String senderId, Duration timeout) {}

// application.yml
// app:
//   sms:
//     api-key: \${SMS_API_KEY}
//     sender-id: CABAPP
//     timeout: 5s`,
        },
      ],
    },
    {
      title: "Bean Lifecycle and Scopes",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Walk me through the bean lifecycle.",
              answer:
                "Spring instantiates the bean (calls the constructor), injects its dependencies, calls any `Aware` callbacks like `BeanNameAware`, then runs `BeanPostProcessor` before-initialisation hooks. Next comes my init code: `@PostConstruct` or `afterPropertiesSet`. Then the after-initialisation post-processors run, and this is **where proxies are created** for things like `@Transactional` and `@Async`. The bean is now ready. On shutdown, `@PreDestroy` runs.\n\nThe detail interviewers like: the object I get injected is often not my class at all but a proxy wrapping it, created in that last post-processor step.",
            },
            {
              question: "⭐ What bean scopes are there?",
              answer:
                "`singleton` is the default: one instance per container. `prototype` gives a new instance every time it's requested. For web apps there are also `request`, `session` and `application`. Most beans in a normal backend are singletons.",
            },
            {
              question: "What happens if you inject a prototype bean into a singleton?",
              answer:
                "It's injected **once**, when the singleton is created, so the singleton keeps using that same instance forever. The prototype scope is quietly lost.\n\nTo get a fresh one each time, I inject `ObjectProvider<ReceiptBuilder>` and call `getObject()` when I need one. A `@Lookup` method or a scoped proxy also works, but `ObjectProvider` is the simplest.",
            },
            {
              question: "Are singleton beans thread-safe?",
              answer:
                "Spring doesn't make them thread-safe; it only makes sure there's one instance. One instance shared by every request thread is like one billing counter shared by every customer: fine as long as the counter doesn't keep anyone's half-written bill lying around.\n\nSo they're safe when they're **stateless**, holding only `final` injected dependencies. If I store request data in a field, like `this.currentUser = ...`, two users overwrite each other. That's one of the first things I check when \"user A sometimes sees user B's data\".",
            },
            {
              question: "`@Configuration` vs `@Component` holding `@Bean` methods?",
              answer:
                "A `@Configuration` class is proxied with CGLIB, so when one `@Bean` method calls another, the proxy returns the existing singleton instead of building a second object. In a plain `@Component` (called \"lite mode\") that inner call is just a normal Java method call and creates a new object every time.\n\n`@Configuration(proxyBeanMethods = false)` turns the proxying off; Boot's own auto-configurations do this for faster startup when the methods don't call each other.",
            },
            {
              question: "What does `@Lazy` do?",
              answer:
                "It creates the bean the first time it's used instead of at startup. Startup gets faster, but a broken bean now fails on the first request instead of at boot, which is usually the worse time to find out.",
            },
          ],
        },
      ],
    },
    {
      title: "AOP and Proxies",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is AOP?",
              answer:
                "Aspect-Oriented Programming handles cross-cutting concerns, the things every method needs but none of them is about: logging, transactions, security checks, timing. Instead of copying \"start timer, stop timer\" into fifty methods, I write it once and say where it applies.\n\nThe vocabulary: an **aspect** is the module, **advice** is what runs (`@Before`, `@After`, `@AfterReturning`, `@AfterThrowing`, `@Around`), a **pointcut** is the expression saying where, and a **join point** is one method execution. `@Transactional` is itself an around advice: begin, call the method, commit or roll back.",
            },
            {
              question: "JDK dynamic proxy vs CGLIB?",
              answer:
                "Both put a stand-in in front of my bean, like a receptionist who takes every call before passing it to the manager. A JDK proxy implements the bean's **interfaces**; CGLIB generates a **subclass** of the bean's class. Spring Boot defaults to CGLIB.\n\nBecause CGLIB works by subclassing, `final` classes and `final` methods can't be advised, and `private` methods are never intercepted.",
            },
            {
              question: "⭐ Why doesn't `@Transactional` (or `@Async`, `@Cacheable`) work when a method calls another method in the same class?",
              answer:
                "Because the extra behaviour lives in the proxy, and a self-call never goes through the proxy. If `placeOrder()` calls `this.saveOrder()`, the call goes straight to the real object, like the manager walking over to their own desk without passing reception. The annotation on `saveOrder` is simply ignored.\n\nFixes, from cleanest: move the method to another bean; use `TransactionTemplate` in code; or inject the bean into itself (via `ObjectProvider` or `@Lazy`) and call through that reference.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "The self-invocation trap",
          code: `@Service
public class OrderService {

    public void placeOrder(Order order) {
        saveOrder(order);            // this.saveOrder(): skips the proxy
    }

    @Transactional                   // ignored for the call above
    public void saveOrder(Order order) {
        // ...
    }
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Which design patterns does Spring itself use?",
              answer:
                "Singleton for beans, Factory for the `BeanFactory`, Proxy for AOP and transactions, Template Method in `JdbcTemplate` and `TransactionTemplate`, Observer for application events, Front Controller in the `DispatcherServlet`, Adapter in `HandlerAdapter`, and Strategy all over the place in pluggable interfaces.",
            },
            {
              question: "How do Spring events work? Are listeners async?",
              answer:
                "I publish with `ApplicationEventPublisher.publishEvent(new OrderPlaced(id))` and handle with `@EventListener`. Listeners are **synchronous** by default: same thread, same transaction, and an exception in the listener reaches the publisher.\n\n`@TransactionalEventListener(phase = AFTER_COMMIT)` runs only after the transaction commits, so I never send \"your order is confirmed\" for an order that rolled back. Even then it's in-memory: if the app crashes right after commit, the event is lost, which is why important side effects go through an outbox table.",
            },
          ],
        },
      ],
    },
    {
      title: "Spring Boot and Auto-Configuration",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Spring vs Spring Boot?",
              answer:
                "Spring is the framework: DI, MVC, data access, security. Spring Boot is the opinionated setup on top, like a furnished flat compared with an empty one. It gives auto-configuration, starter dependencies, an embedded server so `java -jar` is enough, sensible defaults and Actuator.\n\nBoot doesn't replace Spring; it removes the wiring work.",
            },
            {
              question: "⭐ What is inside `@SpringBootApplication`?",
              answer:
                "Three annotations: `@SpringBootConfiguration` (a `@Configuration`), `@EnableAutoConfiguration`, and `@ComponentScan` of the main class's package and everything under it. That last part is why the main class sits in the root package; a bean in a sibling package outside it is never found.",
            },
            {
              question: "⭐ How does auto-configuration work?",
              answer:
                "Boot ships many configuration classes, listed in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`. Each one is guarded by conditions: `@ConditionalOnClass` (is the library on the classpath?), `@ConditionalOnMissingBean` (did I already define my own?), `@ConditionalOnProperty` (is a property set?).\n\nSo adding the Redis starter makes a `RedisTemplate` appear, and defining my own bean of that type makes Boot's back off. To see what matched and why, I run with `--debug` or look at Actuator's `conditions` endpoint.",
            },
            {
              question: "How do you exclude an auto-configuration?",
              answer:
                "`@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)`, or the `spring.autoconfigure.exclude` property, which is handy when only one profile needs it off.",
            },
            {
              question: "What are starters?",
              answer:
                "Curated dependency bundles with versions that work together. `spring-boot-starter-web` brings Spring MVC, Jackson, embedded Tomcat and logging, so I don't hunt for compatible versions myself.",
            },
            {
              question: "What happens when `SpringApplication.run()` executes?",
              answer:
                "It prepares the `Environment` (properties and profiles), prints the banner, creates the `ApplicationContext`, loads bean definitions from component scanning and auto-configuration, then **refreshes** the context: singletons are instantiated, proxies are created and the embedded web server starts. After that the `CommandLineRunner` / `ApplicationRunner` beans run, and `ApplicationReadyEvent` is published.",
            },
            {
              question: "`CommandLineRunner` vs `ApplicationRunner`?",
              answer:
                "Both run once after startup, for things like creating a first admin user if none exists. The only difference is the arguments: `CommandLineRunner` gets raw `String...` args, `ApplicationRunner` gets them parsed into `ApplicationArguments`.",
            },
            {
              question: "Change the server port, or swap Tomcat for Jetty?",
              answer:
                "`server.port=9090` for the port. To change the server, exclude `spring-boot-starter-tomcat` from the web starter and add `spring-boot-starter-jetty`. Boot's conditions see Jetty on the classpath and configure it instead.",
            },
            {
              question: "What changed in Spring Boot 3?",
              answer:
                "Java 17 became the minimum, `javax.*` packages moved to `jakarta.*`, GraalVM native images became first-class, tracing moved to Micrometer Observation, `ProblemDetail` error bodies got built-in support, and Boot 3.2 added `RestClient` and virtual-thread support (`spring.threads.virtual.enabled`).",
            },
          ],
        },
      ],
    },
    {
      title: "Profiles, Properties and Actuator",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How do profiles work?",
              answer:
                "A profile is a named set of beans and settings, like having a \"weekday\" and a \"weekend\" menu. I put `@Profile(\"demo\")` on a bean, or put properties in `application-demo.yml`, and activate it with `spring.profiles.active=demo`. A demo-data seeder marked `@Profile(\"demo\")` can then never run in production.",
            },
            {
              question: "Property precedence: which value wins?",
              answer:
                "From highest to lowest, roughly: command-line arguments, then environment variables and system properties, then profile-specific `application-{profile}.yml`, then `application.yml`, then defaults in code.\n\nThat's why Docker or Kubernetes can override `spring.datasource.url` with the env var `SPRING_DATASOURCE_URL` without touching the jar. Relaxed binding maps the uppercase, underscore form to the property name.",
            },
            {
              question: "What is Actuator? What do you expose?",
              answer:
                "Actuator adds production endpoints: `/actuator/health`, `info`, `metrics`, `loggers`, `env`, `prometheus` and more. It also provides liveness and readiness health groups for Kubernetes probes.\n\nI expose only what's needed, usually `health` publicly and the rest behind authentication or on a separate management port. `env` and `heapdump` can leak secrets, so they should never be public.",
            },
            {
              question: "How do you change a log level at runtime?",
              answer:
                "`POST /actuator/loggers/com.example.payment` with `{\"configuredLevel\": \"DEBUG\"}`. No restart needed, which is very handy while an incident is still happening. Logging itself is SLF4J as the API and Logback as the default implementation, with parameterised messages like `log.info(\"Order {} placed\", id)`.",
            },
            {
              question: "How does graceful shutdown work?",
              answer:
                "`server.shutdown=graceful` makes the server stop accepting new requests and wait for in-flight ones to finish, up to `spring.lifecycle.timeout-per-shutdown-phase`. Like a shop that pulls down the shutter halfway: no new customers, but the ones inside finish paying. It needs the JVM to actually receive `SIGTERM`, which is why a container's entrypoint should `exec java` rather than wrap it in a shell that swallows the signal.",
            },
          ],
        },
      ],
    },
    {
      title: "@Async, @Scheduled and Caching",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How does `@Async` work, and what are its pitfalls?",
              answer:
                "It's like handing a task to a helper and walking away: signup returns immediately while the helper sends the welcome email. `@EnableAsync` wraps the bean in a proxy, and calling the method through the proxy submits it to a `TaskExecutor`.\n\nPitfalls: self-calls and private methods skip the proxy; exceptions from `void` methods vanish unless I configure an `AsyncUncaughtExceptionHandler` (or return a `CompletableFuture`); the new thread doesn't share the caller's transaction or `SecurityContext`; and the queued work lives in memory, so a restart loses it. For work that must survive restarts I write a row to a table and let a worker pick it up.",
            },
            {
              question: "`fixedRate` vs `fixedDelay` vs `cron` in `@Scheduled`?",
              answer:
                "`fixedRate` starts every N milliseconds, measured from the previous start, regardless of how long the last run took. `fixedDelay` waits N milliseconds after the previous run **ends**, so the same job never overlaps itself; it's the safer choice for jobs that might run long. `cron` runs at clock times, like \"03:30 every day\" for a cleanup.",
            },
            {
              question: "What is the default scheduler pool size, and why does it matter?",
              answer:
                "One thread. Spring Boot's auto-configured `TaskScheduler` has `spring.task.scheduling.pool.size` of 1, so **every** `@Scheduled` job shares a single thread. It's like a lift that can carry one person: if one job is slow, every other job waits in the lobby.\n\nIn RideX this was a real finding: seven scheduled jobs, including a 5-second dispatch sweep and an email outbox, were sharing that one thread, so a slow mail server could delay driver offers. I set `spring.task.scheduling.pool.size: 4`, kept below the database connection pool so jobs don't starve request threads, and re-ran the concurrency tests.",
            },
            {
              question: "`@Scheduled` on several instances: what goes wrong?",
              answer:
                "Every instance runs the job. With three instances, a \"send the daily report\" job sends three reports.\n\nThe fixes are a lock per job (ShedLock), running jobs on one dedicated instance, or making the job safe to run in parallel. RideX takes the third route: workers claim rows with `SELECT ... FOR UPDATE SKIP LOCKED`, so three instances simply split the work instead of repeating it.",
            },
            {
              question: "How do the caching annotations work?",
              answer:
                "`@Cacheable(\"fares\")` returns the cached value if present, otherwise runs the method and stores the result. `@CachePut` always runs the method and updates the cache. `@CacheEvict` removes entries, typically after an update.\n\nEnable it with `@EnableCaching` and pick a backend: Caffeine for a fast local cache, Redis when several instances must share it. These are proxy-based too, so a self-call bypasses the cache. And every cache needs a TTL, so a missed eviction heals itself.",
            },
          ],
        },
        {
          type: "code",
          language: "yaml",
          title: "Giving scheduled jobs more than one thread",
          code: `spring:
  task:
    scheduling:
      pool:
        size: 4   # default is 1: every @Scheduled job shares one thread`,
        },
      ],
    },
    {
      title: "Spring MVC Request Flow",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Walk me through the Spring MVC request flow.",
              answer:
                "Like a letter going through a post office. The request first passes servlet **filters** (security, CORS, rate limiting), then reaches the `DispatcherServlet`, the front desk. `HandlerMapping` finds which controller method handles the URL. **Interceptors** run their `preHandle`. The `HandlerAdapter` resolves the arguments (`@PathVariable`, `@RequestBody` through Jackson, validation) and calls the method. The return value is written as JSON by an `HttpMessageConverter`. If anything throws, `@ControllerAdvice` turns it into an error response.",
            },
          ],
        },
        {
          type: "diagram",
          text: `Client
  |
  v
Filters (security, CORS, rate limit)          <- servlet level
  |
  v
DispatcherServlet
  |-- HandlerMapping      -> which controller method?
  |-- Interceptor.preHandle
  |-- HandlerAdapter      -> resolve args, @Valid, call method
  |       |
  |       v
  |   Controller -> Service (AOP proxy: @Transactional) -> Repository
  |
  |-- HttpMessageConverter -> object to JSON
  |-- @ControllerAdvice    -> exceptions to error JSON
  v
Response`,
          caption: "One request through Spring MVC",
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ `@Controller` vs `@RestController`?",
              answer:
                "`@RestController` is `@Controller` plus `@ResponseBody` on every method, so return values are written as JSON instead of being treated as view names.",
            },
            {
              question: "`@PathVariable` vs `@RequestParam` vs `@RequestBody` vs `@RequestHeader`?",
              answer:
                "In `GET /orders/42?status=PAID`, the `42` is a `@PathVariable` (it identifies the resource) and `status` is a `@RequestParam` (an option or filter). `@RequestBody` is the JSON payload of a POST or PUT. `@RequestHeader` reads a header, like an `Idempotency-Key`.",
            },
            {
              question: "Why return `ResponseEntity`?",
              answer:
                "It gives explicit control over the status and headers: `201 Created` with a `Location` header after creating an order, or `429` with `Retry-After`. For a plain `200` with a body, returning the object directly is fine.",
            },
            {
              question: "Filter vs interceptor vs AOP: when do you use which?",
              answer:
                "A **filter** is the building's security gate: it runs at the servlet level before Spring MVC, sees raw requests, and suits authentication, CORS, rate limiting and request IDs. An **interceptor** is inside MVC and knows which controller method is about to run, so it suits handler-aware logging or timing. **AOP** works on any Spring bean method, so it suits business concerns like transactions, auditing and metrics on services.\n\nOrder: filters, then `DispatcherServlet`, then interceptors, then the controller, with AOP proxies wrapping beans along the way.",
            },
            {
              question: "Spring MVC vs WebFlux?",
              answer:
                "MVC is thread-per-request and blocking: simple to write, debug and test, and the right default. With virtual threads it handles very high concurrency too. WebFlux is non-blocking on Reactor, worth it for huge numbers of mostly idle connections or streaming, but every library in the path must be non-blocking and debugging is harder.",
            },
          ],
        },
      ],
    },
    {
      title: "Validation and Error Handling",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "`@Valid` vs `@Validated`?",
              answer:
                "`@Valid` is the Jakarta annotation: it triggers Bean Validation on a `@RequestBody` and cascades into nested objects. `@Validated` is Spring's: it adds **validation groups** and enables method-parameter validation on non-controller beans.\n\nSince Spring Framework 6.1, controllers validate constrained method parameters (like `@Size` on a header or `@Min` on a path variable) on their own, without `@Validated` on the class.",
            },
            {
              question: "How do you write a custom validation rule?",
              answer:
                "An annotation plus a `ConstraintValidator`. For example `@IndianPhone` on a field, with an `IndianPhoneValidator implements ConstraintValidator<IndianPhone, String>` whose `isValid` checks the pattern. Then it works anywhere `@Valid` does.",
            },
            {
              question: "⭐ How do you do global exception handling?",
              answer:
                "One `@RestControllerAdvice` class with `@ExceptionHandler` methods, like one complaints desk for the whole shop instead of one per counter. It maps `NotFoundException` to 404, a state clash like \"order already cancelled\" to 409, validation errors to 400 with field details, and anything unexpected to 500 with a generic message (and the real error logged, never sent to the client).\n\nFor the body I use `ProblemDetail`, the standard `application/problem+json` shape with `type`, `title`, `status`, `detail` and `instance`, so every error looks the same to clients.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "One place for errors",
          code: `@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound(OrderNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Order not found");
        problem.setDetail(ex.getMessage());
        return problem;
    }
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Who handles 401 and 403 errors, if not `@ControllerAdvice`?",
              answer:
                "Spring Security, because those happen in the filter chain before any controller runs. An `AuthenticationEntryPoint` handles unauthenticated requests (401) and an `AccessDeniedHandler` handles authenticated but forbidden ones (403). I customise both so they return the same Problem Details JSON as the rest of the API.",
            },
          ],
        },
      ],
    },
    {
      title: "Calling Other APIs",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "`RestTemplate` vs `WebClient` vs `RestClient` vs Feign?",
              answer:
                "`RestTemplate` is the old blocking client, now in maintenance mode. `WebClient` is the reactive, non-blocking one from WebFlux. `RestClient` (Spring 6.1, Boot 3.2) is the modern **blocking** client with a fluent API, and it's what I'd pick in a normal MVC app. Feign (via Spring Cloud OpenFeign) is declarative: an annotated interface, popular in microservices. Spring 6 also has HTTP interface clients with `@HttpExchange`, which give the same declarative style natively.",
            },
            {
              question: "Why must every outgoing HTTP call have a timeout?",
              answer:
                "Because without one, a slow partner can take my whole service down. Picture a tea stall where the boy waits forever at the milk shop: no tea is served for anyone. Each request waiting on the slow API holds a Tomcat thread and maybe a database connection; they pile up until the pools run dry, and endpoints that never call that API start failing too.\n\nI set a connect timeout and a read timeout on every client, chosen from what the caller can tolerate. RideX's payment client uses 5 seconds to connect and 10 to read; a maps lookup gets 5 and 5, because a fare estimate slower than that is useless anyway.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "RestClient with explicit timeouts",
          code: `@Bean
RestClient smsClient(SmsProperties props) {
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(5));
    factory.setReadTimeout(Duration.ofSeconds(5));

    return RestClient.builder()
            .baseUrl("https://sms.example.com")
            .requestFactory(factory)
            .build();
}`,
        },
      ],
    },
    {
      title: "Embedded Tomcat and Threads",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How does Spring Boot start the embedded Tomcat?",
              answer:
                "During context refresh, `ServletWebServerApplicationContext` asks the auto-configured `TomcatServletWebServerFactory` to create a Tomcat instance, registers the `DispatcherServlet` and the filters, and starts the connector on `server.port`. There's no WAR and no external server; the app contains Tomcat, which is why `java -jar` is enough.",
            },
            {
              question: "How does Tomcat handle requests? What is the thread model?",
              answer:
                "Think of a bank: a guard at the door, a token display, and a fixed number of tellers. With the NIO connector, an **acceptor** thread accepts connections, a **poller** watches sockets for data, and ready requests go to the **worker pool** (`server.tomcat.threads.max`, default 200). One worker runs the whole request, filters to controller to database and back: thread-per-request.\n\nWhen every worker is busy, connections wait up to `max-connections` (8,192 by default for NIO), and beyond that the OS backlog (`accept-count`, default 100) holds a few more before new connections are refused. That's Tomcat's built-in backpressure. With `spring.threads.virtual.enabled=true`, each request runs on a virtual thread instead of a pooled platform thread.",
            },
            {
              question: "With 200 Tomcat threads and a Hikari pool of 10, what happens under load?",
              answer:
                "Up to 200 requests can be in progress, but only 10 can hold a database connection at once. The rest wait inside Hikari for up to `connectionTimeout` (30 seconds by default) and then fail with \"Connection is not available\".\n\nThat's usually fine, because most requests hold a connection for milliseconds. It goes wrong when requests hold connections for long, for example by calling an external API inside a transaction. The fix is shorter transactions, not a pool of 200: the database can't run 200 queries in parallel anyway.",
            },
            {
              question: "How does `@Transactional` share one connection across several repository calls?",
              answer:
                "When the transaction starts, the transaction manager borrows a connection and binds it to the current thread through `TransactionSynchronizationManager`, which uses `ThreadLocal`s. Every repository call on that thread finds and reuses it. At commit or rollback it's unbound and returned to the pool. That's also why a new thread, like an `@Async` method, does not join the caller's transaction.",
            },
          ],
        },
      ],
    },
    {
      title: "Spring Data Repositories",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How does Spring Data create a repository from just an interface?",
              answer:
                "At startup it creates a **proxy** for each repository interface. CRUD methods like `save` and `findById` are delegated to `SimpleJpaRepository`. For a method like `findByCityAndStatus`, Spring Data **parses the method name** once at startup (`find...By`, properties joined by `And`/`Or`, keywords like `OrderBy`, `Top`, `Between`) and builds the query.\n\nThat's why a typo in a property name fails at boot, not on the first call. Methods with `@Query` use my JPQL or SQL instead.",
            },
            {
              question: "`CrudRepository` vs `JpaRepository`?",
              answer:
                "`JpaRepository` extends `ListCrudRepository` and `ListPagingAndSortingRepository` and adds JPA extras: `flush`, `saveAndFlush`, `saveAllAndFlush`, `getReferenceById` and batch deletes. I usually extend `JpaRepository` unless I want to expose fewer methods on purpose.",
            },
            {
              question: "Where should `@Transactional` go?",
              answer:
                "On **service** methods, where one business unit of work lives, like \"place order\": save the order, reduce stock, write the payment row. On controllers it would be too wide, and on repositories alone too narrow, since each call would commit separately. I keep transactions short and never make network calls inside them.",
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
          text: `IoC / DI        container builds + hands in deps; prefer constructor injection
@Component      your class, found by scanning   | @Bean: factory method, 3rd-party/complex
2 beans same    @Primary | @Qualifier | inject List/Map (strategy)
Circular deps   fails by default (Boot 2.6+); fix design, @Lazy only hides it
3-level cache   singletons | early refs | early-ref factories (field/setter only)
Lifecycle       new -> inject -> Aware -> BPP before -> @PostConstruct
                -> BPP after (PROXIES made here) -> ready -> @PreDestroy
Scopes          singleton (default), prototype, request, session, application
Prototype in    injected once -> use ObjectProvider.getObject()
  singleton
Singletons      not thread-safe by magic; keep them stateless
Proxies         CGLIB subclass (default) / JDK interface; no final, no private
Self-invocation this.method() skips proxy: @Transactional/@Async/@Cacheable lost
Auto-config     AutoConfiguration.imports + @ConditionalOnClass/MissingBean/Property
Precedence      CLI args > env vars > application-{profile}.yml > application.yml
Actuator        expose health publicly, secure the rest (env/heapdump leak)
@Async          proxy + TaskExecutor; no tx/SecurityContext; lost on restart
@Scheduled      fixedRate (start-to-start) | fixedDelay (end-to-start) | cron
                DEFAULT POOL SIZE = 1 -> spring.task.scheduling.pool.size
                every instance runs it -> ShedLock / SKIP LOCKED
MVC flow        filters -> DispatcherServlet -> mapping -> interceptor
                -> adapter (args, @Valid) -> controller -> converter -> advice
Filter vs       filter: servlet, raw | interceptor: knows handler | AOP: any bean
Errors          @RestControllerAdvice + ProblemDetail; 401/403 from Security
HTTP clients    RestClient (blocking, modern) | WebClient (reactive); ALWAYS timeouts
Tomcat          acceptor -> poller -> 200 workers; max-connections 8192; accept-count 100
Spring Data     interface -> proxy -> SimpleJpaRepository; method names parsed at boot`,
          caption: "Spring and Spring Boot on one screen",
        },
      ],
    },
  ],
};
