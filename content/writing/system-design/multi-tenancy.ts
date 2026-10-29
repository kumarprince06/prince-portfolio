import type { Lesson } from "../types";

export const multiTenancy: Lesson = {
  slug: "multi-tenancy",
  date: "2026-10-29",
  title: "Multi-Tenancy",
  description:
    "How one SaaS backend serves many customer companies without mixing their data: shared tables versus schema or database per tenant, resolving the tenant safely, isolating caches, files and jobs, and doing it in Spring and Hibernate without leaks.",
  tags: ["System Design", "Multi-Tenancy", "SaaS", "Hibernate", "Spring Boot", "Security"],
  sections: [
    {
      title: "What Multi-Tenancy Is",
      blocks: [
        {
          type: "paragraph",
          text: "A **tenant** is one customer organisation using a SaaS product: a cab company, a clinic, an online shop. **Multi-tenancy** means one running copy of the backend serves many tenants at once, while each tenant sees only its own data, settings and users.",
        },
        {
          type: "paragraph",
          text: "Think of a transport booking SaaS. Two cab companies, \"North Cabs\" and \"City Taxi\" (made-up names), both sign up. They share the same servers and the same code, but North Cabs must never see a City Taxi booking, driver, invoice or even its fare settings. Getting that right everywhere, not just in the main SQL queries, is the whole topic.",
        },
        {
          type: "paragraph",
          text: "Not every product needs it. My own RideX project is a single consumer marketplace: one operator, many riders and drivers. Riders and drivers are users, not tenants, so I deliberately left multi-tenancy out and wrote that down in an ADR. Multi-tenancy is for when you sell the platform itself to many businesses.",
        },
      ],
    },
    {
      title: "Why It Matters",
      blocks: [
        {
          type: "list",
          items: [
            "**Trust:** one cross-tenant leak (a customer seeing another company's invoices) can end a B2B contract and become a legal problem under data-protection laws.",
            "**Cost:** one deployment for 500 tenants is far cheaper to run and upgrade than 500 deployments.",
            "**Operations:** migrations, backups, restores and deletions have to work per tenant, not just for the whole database.",
            "**Fairness:** one huge tenant running a giant export shouldn't slow down everyone else.",
          ],
        },
        {
          type: "paragraph",
          text: "The scary part is that tenant bugs are quiet. A missing `WHERE tenant_id = ?` doesn't throw. It just returns more rows than it should, and the first person to notice is often a customer.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture an apartment building.",
        },
        {
          type: "list",
          items: [
            "**Shared tables with a `tenant_id`** are a shared office with hot desks. Everyone uses the same desks, and every drawer has a name label. Cheap and flexible, but if someone forgets to check the label, they open the wrong drawer.",
            "**A schema per tenant** is one building with separate flats. Same plumbing and lift, but each family has its own door and key.",
            "**A database per tenant** is separate houses on the same street. Strongest privacy, but every house needs its own repairs.",
            "**Tenant resolution** is the security guard at the gate. The visitor says \"I'm going to flat 4B\", but the guard only believes it after checking their ID, not because they said it confidently.",
            "**A leaked ThreadLocal** is a hotel key card that wasn't wiped at checkout. The next guest gets a card that still opens the previous guest's room.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Three ways to store tenant data",
        },
        {
          type: "diagram",
          text: `SHARED TABLES            SCHEMA PER TENANT        DATABASE PER TENANT
one DB, one schema       one DB, many schemas     many DBs

bookings                 north_cabs.bookings      [db north_cabs]
┌────┬───────────┐       city_taxi.bookings         bookings
│ id │ tenant_id │       north_cabs.drivers         drivers
├────┼───────────┤       city_taxi.drivers        [db city_taxi]
│ 1  │ north     │                                  bookings
│ 2  │ city      │       same tables, copied        drivers
└────┴───────────┘       per schema
every query filters      connection picks the     connection picks
WHERE tenant_id = ?      schema                   the database`,
        },
        {
          type: "table",
          headers: ["", "Shared tables + tenant_id", "Schema per tenant", "Database per tenant"],
          rows: [
            ["Isolation", "Weakest: one missing filter leaks", "Good: wrong schema needed to leak", "Strongest: separate DB, can be separate credentials"],
            ["Cost per tenant", "Lowest", "Low to medium", "Highest (connections, instances)"],
            ["Tenants supported", "Thousands to millions", "Hundreds to low thousands", "Tens to hundreds"],
            ["Migrations", "Once", "Once per schema", "Once per database"],
            ["Cross-tenant reporting", "Easy, one query", "Harder, union across schemas", "Hard, needs a warehouse"],
            ["Per-tenant backup/restore", "Hard: rows mixed together", "Possible (schema dump)", "Easy: whole DB"],
            ["Per-tenant deletion", "`DELETE ... WHERE tenant_id`, everywhere", "`DROP SCHEMA`", "Drop the database"],
            ["Noisy neighbours", "Share everything", "Share the server", "Can be fully separated"],
            ["Typical use", "Self-serve SaaS, many small tenants", "B2B with mid-size tenants", "Enterprise or regulated tenants"],
          ],
        },
        {
          type: "paragraph",
          text: "Many products end up **hybrid**: shared tables for the long tail of small tenants, and a dedicated database for the few big or regulated ones who pay for it. The code stays the same if the tenant-to-connection decision lives in one place.",
        },
        {
          type: "heading",
          text: "Resolving the tenant",
        },
        {
          type: "paragraph",
          text: "Every request has to answer \"which tenant is this?\" before touching data. The common sources:",
        },
        {
          type: "table",
          headers: ["Source", "Example", "Trust level"],
          rows: [
            ["Session or JWT claim", "`tenant_id` claim in a signed token", "Trusted, after signature check"],
            ["OAuth client", "Machine-to-machine client registered to one tenant", "Trusted, after client authentication"],
            ["Subdomain", "`northcabs.app.example.com`", "A hint; must match the logged-in user's tenant"],
            ["Header", "`X-Tenant-Id: north-cabs`", "A hint only; never trust on its own"],
            ["URL path (webhooks)", "`/webhooks/payments/{tenantKey}`", "Trusted only after the webhook signature verifies with that tenant's secret"],
          ],
        },
        {
          type: "paragraph",
          text: "The rule I hold onto: **anything the client sends is a claim, not a fact, until authentication proves it.** A header saying `north-cabs` from a user whose token belongs to `city-taxi` must be rejected, not obeyed. For webhooks there's no logged-in user, so the URL picks which tenant's secret to use, and the signature check is what makes the tenant trusted.",
        },
        {
          type: "heading",
          text: "Isolation is more than SQL",
        },
        {
          type: "diagram",
          text: `                 tenant context (set once per request/job)
                               │
   ┌───────────┬───────────────┼──────────────┬──────────────┐
   ▼           ▼               ▼              ▼              ▼
 DB query   cache key      file path      queue message    logs/metrics
 tenant_id  tenant:north:  tenants/north/ { tenantId,      tenant=north
 / schema   settings       invoices/7.pdf   payload }      on every line`,
          caption: "Every place data is stored or carried needs the tenant, not just the database.",
        },
        {
          type: "list",
          items: [
            "**Cache keys** must include the tenant (`tenant:north-cabs:settings`), or the first tenant to warm the cache serves its data to everyone.",
            "**File storage** paths must start with the tenant (`tenants/north-cabs/invoices/...`), and download endpoints must check the path's tenant against the caller's.",
            "**Queues and jobs** run on worker threads with no HTTP request. The tenant must travel inside the message and be restored before the job touches data.",
            "**Logs and metrics** should carry the tenant so you can answer \"which tenant is causing this?\" in an incident.",
          ],
        },
        {
          type: "heading",
          text: "Migrations, noisy neighbours, backups and deletion",
        },
        {
          type: "list",
          items: [
            "**Migrations per tenant:** with schema or database per tenant, a release migrates each one in a loop. Some will fail (a big tenant's table takes too long to alter). The deploy needs to report which tenants are on which version and allow re-running just the failed ones.",
            "**Noisy neighbours:** one tenant's heavy report or bulk import can eat the shared CPU, connection pool or queue. Defences: per-tenant rate limits, per-tenant queue concurrency caps, timeouts on heavy queries, and moving very large tenants to their own database.",
            "**Backups and restore:** \"restore North Cabs to yesterday\" is easy with a database per tenant and painful with shared tables, where you restore a copy elsewhere and copy that tenant's rows back.",
            "**Deletion:** when a tenant leaves, data protection rules may require deleting everything: rows in every table, files, cache entries, search indexes, backups after their retention period. Keep a list of every place tenant data lives, because you'll need it here.",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The tenant context: a ThreadLocal",
        },
        {
          type: "paragraph",
          text: "Most Java backends keep the current tenant in a `ThreadLocal<String>`: a variable where each thread sees its own value. A servlet filter sets it at the start of a request (after authentication) and **removes it in a `finally` block** at the end. Everything in between, including Hibernate, can read it without passing the tenant through every method.",
        },
        {
          type: "paragraph",
          text: "The catch is that servers reuse threads. Tomcat serves request after request on the same pool of threads. If the filter forgets to clear the value, the next request on that thread starts with the previous tenant already set. The `TenantLeak` example below shows exactly that.",
        },
        {
          type: "heading",
          text: "How Hibernate picks a tenant per session",
        },
        {
          type: "paragraph",
          text: "Hibernate has built-in multi-tenancy, and the moving parts are worth knowing because interviewers ask about them:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "When a `Session` (the `EntityManager` underneath) opens, Hibernate asks the configured `CurrentTenantIdentifierResolver` for the tenant id, once. Spring's `OpenEntityManagerInView` or the transaction start is usually when that happens.",
            "The tenant is fixed for the life of that session. Changing the ThreadLocal halfway through a transaction does nothing to the open session.",
            "For **schema or database per tenant**, Hibernate calls `MultiTenantConnectionProvider.getConnection(tenantId)` whenever the session needs a JDBC connection. The provider either picks a different `DataSource` (database per tenant) or takes a pooled connection and switches its schema (schema per tenant). It also has `releaseConnection(tenantId, connection)`, where a schema-switching provider must reset the schema before the connection goes back to the pool.",
            "For **shared tables**, Hibernate 6 added `@TenantId`: put it on an entity field and Hibernate fills it from the resolver on insert and adds the tenant condition to queries it generates for that entity.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Hibernate version caveats",
          text: "In Hibernate 5 you also set `hibernate.multiTenancy` to `SCHEMA` or `DATABASE` (the `MultiTenancyStrategy` enum). Hibernate 6 removed that setting: providing a `MultiTenantConnectionProvider` is what turns on schema or database mode, and `@TenantId` is the shared-table mode. Newer Hibernate 6.x releases also made both interfaces generic over the tenant id type, so older blog posts show the non-generic `String` versions. Spring Boot 3 ships Hibernate 6, and Spring Boot 4 ships Hibernate 7, which keeps the same model.",
        },
        {
          type: "heading",
          text: "AbstractRoutingDataSource: the Spring-only route",
        },
        {
          type: "paragraph",
          text: "Without Hibernate's feature, Spring's `AbstractRoutingDataSource` does database-per-tenant routing at the `DataSource` level. It holds a map of tenant key to real `DataSource`, and every time someone calls `getConnection()` it calls my `determineCurrentLookupKey()` (which reads the ThreadLocal) and delegates to the matching pool. The lookup happens when a connection is **taken**, which with `@Transactional` means at the start of the transaction. Same rule as Hibernate: switching tenants mid-transaction doesn't switch the connection.",
        },
        {
          type: "heading",
          text: "Threads that don't inherit the tenant",
        },
        {
          type: "paragraph",
          text: "A `ThreadLocal` value belongs to one thread. `@Async` methods, `CompletableFuture.supplyAsync`, scheduled jobs and queue consumers all run on **other** threads, which see nothing (or worse, a stale value from their last task). Spring's fix is a `TaskDecorator`: it runs on the submitting thread, captures the tenant, and returns a wrapped `Runnable` that sets it on the worker thread and clears it afterwards. Spring Boot applies a `TaskDecorator` bean to its auto-configured executor. For queues, the tenant goes into the message body or headers and the consumer sets the context before doing anything.",
        },
        {
          type: "paragraph",
          text: "Virtual threads (Java 21) don't change this. Each virtual thread has its own ThreadLocals, and since virtual threads aren't pooled, stale values are less likely, but propagation to child tasks is still manual. `ScopedValue`, a preview API in Java 21 and final in Java 25, is the newer, safer tool: a value bound for the duration of a call and automatically gone afterwards.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Trust the token, not the header",
        },
        {
          type: "paragraph",
          text: "Everyday version: a visitor tells the building guard \"I live in 4B\". The guard checks their ID card first. If the card says 2A, the visitor doesn't get into 4B, however politely they ask.",
        },
        {
          type: "code",
          language: "java",
          title: "TenantFromToken.java",
          code: `import java.util.Map;

public class TenantFromToken {
    record Token(String userId, String tenantId) {}         // already verified by the auth filter

    static final Map<String, Token> validTokens = Map.of("tok-asha", new Token("asha", "north-cabs"));

    static String resolveTenant(String bearer, String tenantHeader) {
        Token token = validTokens.get(bearer);
        if (token == null) return "401 not logged in";
        if (tenantHeader != null && !tenantHeader.equals(token.tenantId())) {
            return "403 header says " + tenantHeader + " but token belongs to " + token.tenantId();
        }
        return "tenant = " + token.tenantId();
    }

    public static void main(String[] args) {
        System.out.println(resolveTenant("tok-asha", null));
        System.out.println(resolveTenant("tok-asha", "north-cabs"));
        System.out.println(resolveTenant("tok-asha", "city-taxi"));
        System.out.println(resolveTenant("tok-forged", "city-taxi"));
    }
}`,
        },
        {
          type: "output",
          text: `tenant = north-cabs
tenant = north-cabs
403 header says city-taxi but token belongs to north-cabs
401 not logged in`,
        },
        {
          type: "paragraph",
          text: "The tenant always comes from the verified token. The header is at most a cross-check. The third call is the attack: a real North Cabs user trying to read City Taxi data by editing a header. A backend that trusted the header would have happily switched tenants. The only exception is platform staff who are allowed to act for several tenants, and then the token must carry that permission and the switch should be audited.",
        },
        {
          type: "heading",
          text: "The ThreadLocal leak",
        },
        {
          type: "paragraph",
          text: "Everyday version: the hotel key card that wasn't wiped. Here one worker thread handles two requests in a row, like a Tomcat thread does all day.",
        },
        {
          type: "code",
          language: "java",
          title: "TenantLeak.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TenantLeak {
    static final ThreadLocal<String> TENANT = new ThreadLocal<>();

    static void handle(String tenantFromLogin, boolean cleanUp) {
        if (tenantFromLogin != null) TENANT.set(tenantFromLogin);
        try {
            System.out.println("  request sees tenant: " + TENANT.get());
        } finally {
            if (cleanUp) TENANT.remove();
        }
    }

    static void twoRequests(boolean cleanUp) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(1);  // one reused worker, like Tomcat's
        pool.submit(() -> handle("north-cabs", cleanUp)).get();  // logged-in request
        pool.submit(() -> handle(null, cleanUp)).get();          // anonymous request, same thread
        pool.shutdown();
    }

    public static void main(String[] args) throws Exception {
        System.out.println("without remove():");
        twoRequests(false);
        System.out.println("with remove() in finally:");
        twoRequests(true);
    }
}`,
        },
        {
          type: "output",
          text: `without remove():
  request sees tenant: north-cabs
  request sees tenant: north-cabs
with remove() in finally:
  request sees tenant: north-cabs
  request sees tenant: null`,
        },
        {
          type: "paragraph",
          text: "Without `remove()`, an anonymous request (say a public page or a health check) ran as North Cabs, purely because it landed on the same thread. With `remove()` in `finally`, it saw `null`, and well-written code would then refuse to touch tenant data. `finally` matters: the cleanup has to run even when the request throws.",
        },
        {
          type: "heading",
          text: "The request filter in Spring",
        },
        {
          type: "code",
          language: "java",
          title: "TenantFilter.java",
          code: `@Component
class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) {
            TenantContext.set(jwt.getToken().getClaimAsString("tenant_id"));
        }
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();                      // always, even on exceptions
        }
    }
}`,
        },
        {
          type: "paragraph",
          text: "This filter must run **after** Spring Security has authenticated the request, otherwise there's no token to read. In practice I register it inside the security filter chain with `http.addFilterAfter(tenantFilter, BearerTokenAuthenticationFilter.class)` (and stop Boot from also registering it as a plain servlet filter), so the order is explicit. `TenantContext` is a tiny class wrapping the `ThreadLocal`.",
        },
        {
          type: "heading",
          text: "Carrying the tenant to async work",
        },
        {
          type: "paragraph",
          text: "Everyday version: a waiter takes an order at table 7 and hands it to the kitchen. If the slip doesn't say \"table 7\", the kitchen has no idea where the food goes.",
        },
        {
          type: "code",
          language: "java",
          title: "TenantAsync.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TenantAsync {
    static final ThreadLocal<String> TENANT = new ThreadLocal<>();

    // Same idea as Spring's TaskDecorator: copy the tenant onto the worker thread
    static Runnable withTenant(Runnable task) {
        String tenant = TENANT.get();                      // read on the caller's thread
        return () -> {
            TENANT.set(tenant);                            // set on the worker thread
            try { task.run(); } finally { TENANT.remove(); }
        };
    }

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newSingleThreadExecutor();
        TENANT.set("city-taxi");
        Runnable sendReceipt = () -> System.out.println("  receipt job sees: " + TENANT.get());

        System.out.println("plain submit:");
        pool.submit(sendReceipt).get();
        System.out.println("wrapped submit:");
        pool.submit(withTenant(sendReceipt)).get();
        pool.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `plain submit:
  receipt job sees: null
wrapped submit:
  receipt job sees: city-taxi`,
        },
        {
          type: "paragraph",
          text: "`withTenant` reads the tenant while still on the caller's thread, which is the important detail: by the time the lambda runs, it's on a different thread. In Spring the same thing is a bean:",
        },
        {
          type: "code",
          language: "java",
          title: "TenantTaskDecorator.java",
          code: `@Bean
TaskDecorator tenantTaskDecorator() {
    return task -> {
        String tenant = TenantContext.get();            // caller's thread
        return () -> {
            TenantContext.set(tenant);                  // worker thread
            try { task.run(); } finally { TenantContext.clear(); }
        };
    };
}`,
        },
        {
          type: "heading",
          text: "A cache key without the tenant",
        },
        {
          type: "paragraph",
          text: "Everyday version: a shared office fridge with a box labelled just \"lunch\". The first person to put their lunch in decides what everyone else eats.",
        },
        {
          type: "code",
          language: "java",
          title: "TenantCache.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class TenantCache {
    static final Map<String, String> cache = new HashMap<>();
    static final Map<String, String> currencyInDb = Map.of("north-cabs", "INR", "city-taxi", "AED");
    static int dbReads = 0;

    static String currency(String tenant, boolean tenantInKey) {
        String key = tenantInKey ? "tenant:" + tenant + ":currency" : "currency";
        return cache.computeIfAbsent(key, k -> {
            dbReads++;
            return currencyInDb.get(tenant);
        });
    }

    public static void main(String[] args) {
        System.out.println("key without tenant:");
        System.out.println("  north-cabs -> " + currency("north-cabs", false));
        System.out.println("  city-taxi  -> " + currency("city-taxi", false));

        cache.clear();
        System.out.println("key with tenant:");
        System.out.println("  north-cabs -> " + currency("north-cabs", true));
        System.out.println("  city-taxi  -> " + currency("city-taxi", true));
        System.out.println("db reads: " + dbReads + ", keys: " + cache.keySet());
    }
}`,
        },
        {
          type: "output",
          text: `key without tenant:
  north-cabs -> INR
  city-taxi  -> INR
key with tenant:
  north-cabs -> INR
  city-taxi  -> AED
db reads: 3, keys: [tenant:north-cabs:currency, tenant:city-taxi:currency]`,
        },
        {
          type: "paragraph",
          text: "With the bare key, City Taxi got North Cabs' currency, and the database was never even asked (only one read in the first half). That's the sneaky part: caching bugs look like performance wins. With Spring's `@Cacheable`, the default key is built from the method arguments only, so a method like `getSettings()` with no tenant parameter has exactly this bug. Either pass the tenant as an argument or write a custom `KeyGenerator` that prefixes it.",
        },
        {
          type: "heading",
          text: "Hibernate, shared tables: @TenantId",
        },
        {
          type: "code",
          language: "java",
          title: "Booking.java",
          code: `@Entity
public class Booking {
    @Id @GeneratedValue
    private Long id;

    @TenantId                                   // Hibernate 6+: filled and filtered automatically
    private String tenantId;

    private String pickup;
    private String dropoff;
}`,
        },
        {
          type: "paragraph",
          text: "With a resolver registered, `session.persist(booking)` stores the current tenant, and HQL or criteria queries on `Booking` get the tenant condition added. Native SQL queries do **not**, which is one reason I like a database-level safety net too (row-level security, below).",
        },
        {
          type: "heading",
          text: "Hibernate, schema per tenant",
        },
        {
          type: "code",
          language: "java",
          title: "SchemaPerTenantConfig.java",
          code: `@Component
class TenantResolver implements CurrentTenantIdentifierResolver<String> {
    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenant = TenantContext.get();
        if (tenant == null) throw new IllegalStateException("no tenant in context"); // fail closed
        return tenant;
    }

    @Override
    public boolean validateExistingCurrentSessions() { return true; }
}

@Component
class SchemaConnectionProvider implements MultiTenantConnectionProvider<String> {
    private final DataSource dataSource;
    SchemaConnectionProvider(DataSource dataSource) { this.dataSource = dataSource; }

    @Override public Connection getAnyConnection() throws SQLException { return dataSource.getConnection(); }
    @Override public void releaseAnyConnection(Connection c) throws SQLException { c.close(); }

    @Override
    public Connection getConnection(String tenant) throws SQLException {
        Connection c = getAnyConnection();
        c.setSchema(TenantIds.requireKnown(tenant));    // e.g. "north_cabs", checked against a list
        return c;
    }

    @Override
    public void releaseConnection(String tenant, Connection c) throws SQLException {
        c.setSchema("public");                          // reset before it goes back to the pool
        c.close();
    }

    @Override public boolean supportsAggressiveRelease() { return false; }
    @Override public boolean isUnwrappableAs(Class<?> type) { return false; }
    @Override public <T> T unwrap(Class<T> type) { throw new UnsupportedOperationException(); }
}

@Configuration
class HibernateTenancyConfig {
    @Bean
    HibernatePropertiesCustomizer tenancy(SchemaConnectionProvider provider, TenantResolver resolver) {
        return props -> {
            props.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, provider);
            props.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, resolver);
        };
    }
}`,
        },
        {
          type: "list",
          items: [
            "`HibernatePropertiesCustomizer` is Spring Boot's hook for passing objects (not just strings) into Hibernate's settings, so both beans keep their Spring wiring.",
            "`setSchema` works with PostgreSQL's driver (it sets `search_path`). With MySQL, a \"schema\" is a database, and the usual call is `setCatalog` instead. Check what your driver actually does.",
            "Resetting the schema in `releaseConnection` matters: the pool hands that same connection to the next request, which could belong to another tenant.",
            "`TenantIds.requireKnown` checks the id against the list of real tenants. The id came from a token, but validating anything used as a database identifier is cheap insurance.",
            "The resolver throws when there's no tenant. Returning a \"default\" tenant instead is how anonymous requests end up reading a real tenant's data.",
          ],
        },
        {
          type: "heading",
          text: "Database per tenant with AbstractRoutingDataSource",
        },
        {
          type: "code",
          language: "java",
          title: "TenantRoutingDataSource.java",
          code: `class TenantRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.get();                     // called on every getConnection()
    }
}

@Bean
DataSource dataSource(Map<String, DataSource> poolsByTenant) {
    TenantRoutingDataSource routing = new TenantRoutingDataSource();
    routing.setTargetDataSources(new HashMap<>(poolsByTenant));
    routing.setLenientFallback(false);                  // unknown tenant = error, not default DB
    routing.afterPropertiesSet();
    return routing;
}`,
        },
        {
          type: "paragraph",
          text: "By default, if the lookup key is `null`, the routing data source falls back to a default target when one is set, and lenient fallback also covers unknown keys. I don't set a default target and I turn lenient fallback off, so a missing or unknown tenant fails loudly instead of quietly reading somebody's database.",
        },
        {
          type: "heading",
          text: "A database safety net: row-level security",
        },
        {
          type: "code",
          language: "sql",
          title: "PostgreSQL",
          code: `ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;      -- apply to the table owner too

CREATE POLICY tenant_isolation ON bookings
    USING (tenant_id = current_setting('app.tenant_id'));

-- at the start of each transaction, from the app:
SELECT set_config('app.tenant_id', 'north-cabs', true);   -- true = transaction-local`,
        },
        {
          type: "paragraph",
          text: "With shared tables, PostgreSQL row-level security makes the database itself add the tenant filter to every query, including native SQL someone writes in a hurry. If the app forgets to set `app.tenant_id`, `current_setting` either raises an error or, on a connection where the setting existed earlier, returns an empty string that matches no rows. Either way it fails closed instead of returning everything. It's defence in depth, not a replacement for filtering in the app.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Trusting a client-supplied tenant",
        },
        {
          type: "paragraph",
          text: "Reading the tenant from `X-Tenant-Id`, a query parameter or the request body, and switching to it without checking the authenticated user belongs there. This is the classic cross-tenant access bug.",
        },
        {
          type: "heading",
          text: "Not clearing the context",
        },
        {
          type: "paragraph",
          text: "A `ThreadLocal` set without a matching `remove()` in `finally`. The next request on that pooled thread inherits the tenant, as `TenantLeak` showed.",
        },
        {
          type: "heading",
          text: "Forgetting background work",
        },
        {
          type: "paragraph",
          text: "`@Async` methods, scheduled jobs and queue consumers running with no tenant (so a resolver that returns a default quietly uses the wrong one) or a stale tenant from the thread's last task. Every job message needs a `tenantId`, and scheduled jobs that serve all tenants should loop over tenants explicitly, setting and clearing the context for each.",
        },
        {
          type: "heading",
          text: "Lookups by id alone",
        },
        {
          type: "paragraph",
          text: "`bookingRepository.findById(id)` with shared tables returns any tenant's booking if the id is guessed. Repository methods should be `findByIdAndTenantId`, or the tenant filter should be automatic (`@TenantId`, Hibernate filters, row-level security).",
        },
        {
          type: "heading",
          text: "Global caches, files and unique constraints",
        },
        {
          type: "list",
          items: [
            "Cache keys without the tenant, like the currency example.",
            "Files stored as `invoices/123.pdf` with sequential ids anyone can guess.",
            "A unique index on `email` alone, so a user can't sign up for two different tenants with the same email. It's usually `UNIQUE (tenant_id, email)`.",
            "Sequences or invoice numbers shared across tenants, which leak how much business other tenants are doing.",
          ],
        },
        {
          type: "heading",
          text: "Schema state left on pooled connections",
        },
        {
          type: "paragraph",
          text: "Calling `setSchema` or `SET search_path` on a pooled connection and not resetting it. The pool doesn't know the connection changed, and hands it to the next tenant.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Resolve the tenant in exactly one place, from authenticated data, right after authentication. Treat headers and subdomains as hints to cross-check.",
            "Fail closed: no tenant means an error, never a default tenant.",
            "Set the context in a filter and clear it in `finally`. Do the same in every job, consumer and `TaskDecorator`.",
            "Make the tenant filter automatic where you can (`@TenantId`, row-level security) and make manual queries obviously tenant-scoped (`findByIdAndTenantId`).",
            "Prefix every cache key, file path and object-storage key with the tenant. Put `tenantId` in every queue message and log line (an MDC field works well).",
            "Write a cross-tenant test for each new endpoint: log in as tenant A, request tenant B's resource by id, expect 404 or 403.",
            "Keep an inventory of every place tenant data lives (tables, buckets, caches, search indexes, third-party tools). Deletion and export requests depend on it.",
            "Add per-tenant limits early: request rate, queue concurrency, export size. They're much harder to add after a big tenant depends on unlimited use.",
            "Record the tenancy model in an ADR, including why. It's one of the hardest decisions to change later.",
          ],
        },
      ],
    },
    {
      title: "Trade-offs",
      blocks: [
        {
          type: "table",
          headers: ["Decision", "Option A", "Option B"],
          rows: [
            ["Storage model", "Shared tables: cheap, scales to many tenants, weakest isolation", "Schema/DB per tenant: strong isolation and easy restore, more ops and migrations"],
            ["Tenant filter", "App-level (`@TenantId`, repository methods): portable", "Database RLS: catches mistakes, PostgreSQL-specific, a little overhead"],
            ["Tenant context", "ThreadLocal: simple, works everywhere", "Passing tenant explicitly: no hidden state, but noisy method signatures"],
            ["Routing", "Hibernate multi-tenancy: per session, integrated", "`AbstractRoutingDataSource`: framework-agnostic, per connection"],
            ["Big tenants", "Keep everyone shared: one code path", "Dedicated DB for big tenants: isolation, but a hybrid to operate"],
            ["Migrations", "Migrate all tenants in one deploy: consistent", "Roll out per tenant: safer, but versions drift"],
          ],
        },
      ],
    },
    {
      title: "Multi-Tenancy in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small, realistic example: quote a cab fare, where each tenant has its own base fare and per-km rate. It's simple, and it's exactly where a tenant bug would charge one company's riders another company's prices.",
        },
        {
          type: "paragraph",
          text: "Everyday version: two cab companies share one booking app. The meter must use the rate card of the company you booked with, and if it can't tell which company that is, it must refuse to quote rather than guess.",
        },
        {
          type: "code",
          language: "java",
          title: "TenantFare.java",
          code: `import java.util.Map;

public class TenantFare {
    static final ThreadLocal<String> TENANT = new ThreadLocal<>();

    record FareRules(int base, int perKm) {}

    // Stand-in for: SELECT base, per_km FROM fare_rules WHERE tenant_id = ?
    static final Map<String, FareRules> rulesTable = Map.of(
            "north-cabs", new FareRules(50, 12),
            "city-taxi", new FareRules(80, 15));

    static String currentTenant() {
        String tenant = TENANT.get();
        if (tenant == null) throw new IllegalStateException("no tenant in context");
        return tenant;
    }

    static int quote(int km) {
        FareRules rules = rulesTable.get(currentTenant());
        return rules.base() + km * rules.perKm();
    }

    static void asTenant(String tenant, Runnable work) {    // what the request filter does
        TENANT.set(tenant);
        try { work.run(); } finally { TENANT.remove(); }
    }

    public static void main(String[] args) {
        asTenant("north-cabs", () -> System.out.println("north-cabs, 10 km: " + quote(10)));
        asTenant("city-taxi", () -> System.out.println("city-taxi,  10 km: " + quote(10)));
        try {
            quote(10);                                       // e.g. a job that forgot the tenant
        } catch (IllegalStateException e) {
            System.out.println("no context: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `north-cabs, 10 km: 170
city-taxi,  10 km: 230
no context: no tenant in context`,
        },
        {
          type: "list",
          items: [
            "`asTenant` is the filter in miniature: set, run, always clear. In the real app it's `TenantFilter` for requests and the same three lines at the top of every job.",
            "`currentTenant()` fails closed. The last call simulates a background job that forgot to set a tenant, and it gets an error instead of a random company's prices.",
            "In the real service, `rulesTable` is a `fare_rules` table with a `tenant_id` column (or one per schema), and the rules would be cached under `tenant:{id}:fare-rules`, never under a bare `fare-rules` key.",
          ],
        },
        {
          type: "paragraph",
          text: "What I'd add before shipping: a test that logs in as North Cabs and asks for a City Taxi quote by sending City Taxi's id in a header (expect 403), a test that the cached rules for one tenant are never returned to another, and a metric of quotes per tenant so a noisy neighbour shows up on a dashboard.",
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
              question: "What is multi-tenancy?",
              answer:
                "One running instance of an application serving many customer organisations (tenants), with each tenant's data, configuration and users isolated from the others.\n\nIt's how most B2B SaaS products work. The alternative is a separate deployment per customer, which is simpler to isolate but far more expensive to run and upgrade.",
            },
            {
              question: "Compare shared tables, schema per tenant and database per tenant.",
              answer:
                "Shared tables put a `tenant_id` on every row: cheapest, scales to huge numbers of tenants, one migration, but isolation depends on every query filtering correctly, and per-tenant restore is painful. Schema per tenant gives each tenant its own copy of the tables in one database: better isolation and `DROP SCHEMA` deletion, but migrations run per schema and the catalog gets big. Database per tenant is the strongest isolation and easiest backup and restore, but the most expensive in connections and operations.\n\nMany products use a hybrid: shared for small tenants, dedicated databases for large or regulated ones.",
            },
            {
              question: "How do you determine the current tenant for a request?",
              answer:
                "From authenticated data: a claim in a verified JWT, the session, or the OAuth client the request authenticated as. Subdomains and headers can be used as hints, but only after checking they match the authenticated identity.\n\nFor webhooks there's no user, so the URL path identifies which tenant's secret to use, and the tenant is trusted only once the signature verifies with that secret.",
            },
            {
              question: "Why can't you trust an X-Tenant-Id header?",
              answer:
                "Because the client controls it. A legitimate user of tenant A can change it to tenant B. If the backend switches context based on it, that user reads B's data with valid credentials.\n\nThe tenant must come from something the server verified, like a signed token. A header that disagrees with the token should get a 403. Platform staff who can act for several tenants need an explicit permission in the token, and those switches should be audited.",
            },
            {
              question: "How does Hibernate's multi-tenancy work?",
              answer:
                "When a session opens, Hibernate asks the `CurrentTenantIdentifierResolver` for the tenant id, and the session keeps it for its lifetime. For schema or database per tenant, Hibernate gets JDBC connections from a `MultiTenantConnectionProvider` via `getConnection(tenantId)`, which picks a data source or switches the schema, and `releaseConnection` gives it back.\n\nFor shared tables, Hibernate 6 added `@TenantId` on an entity field: it's filled on insert and added to generated queries. In Hibernate 5 you also set `hibernate.multiTenancy`; Hibernate 6 removed that setting.",
            },
            {
              question: "What is AbstractRoutingDataSource and when is the tenant decided?",
              answer:
                "A Spring `DataSource` that holds several target data sources and calls `determineCurrentLookupKey()` each time a connection is requested, usually reading the tenant from a ThreadLocal.\n\nThe decision happens when the connection is obtained, which in a `@Transactional` method is at the start of the transaction. Changing the tenant inside the transaction doesn't change the connection. I also disable lenient fallback and avoid a default target so an unknown tenant fails.",
            },
            {
              question: "Why must the tenant ThreadLocal be cleared in a finally block?",
              answer:
                "Servlet containers reuse threads from a pool. If the value isn't removed, the next request on that thread starts with the previous request's tenant.\n\nI reproduced it with a one-thread pool: an anonymous second request saw `north-cabs`. With `remove()` in `finally` it saw `null`. `finally` matters because the cleanup must run even when the request throws.",
            },
            {
              question: "How do you propagate the tenant to @Async methods and queue consumers?",
              answer:
                "For `@Async` and executors, a `TaskDecorator` captures the tenant on the submitting thread and returns a wrapped `Runnable` that sets it on the worker thread and clears it in `finally`. Spring Boot applies a `TaskDecorator` bean to its auto-configured executor.\n\nFor queues, the tenant id goes into the message itself, and the consumer sets the context from the message before doing any work. A ThreadLocal never crosses a process boundary.",
            },
            {
              question: "What are common ways tenant data leaks?",
              answer:
                "Trusting a client-supplied tenant; ThreadLocals not cleared; background jobs with no or stale tenant; `findById` without a tenant filter; native queries that bypass automatic filters; cache keys without the tenant; guessable file paths; pooled connections left on another tenant's schema; and resolvers that return a default tenant when none is set.\n\nMost of them are silent: no exception, just the wrong rows.",
            },
            {
              question: "How do you handle caching in a multi-tenant app?",
              answer:
                "Every key includes the tenant, like `tenant:north-cabs:settings`. With Spring's `@Cacheable`, the default key comes only from method arguments, so either pass the tenant as an argument or use a custom `KeyGenerator` that prefixes the current tenant.\n\nAlso think about eviction per tenant (when one tenant's settings change, evict only theirs) and memory fairness, since one big tenant can fill a shared cache.",
            },
            {
              question: "How do you run database migrations with schema-per-tenant?",
              answer:
                "Run the migration tool once per schema, for example Flyway configured with each tenant's schema in a loop, and track each tenant's version. New tenants get created by running all migrations on a fresh schema.\n\nThe hard parts are partial failure and duration: one tenant's migration can fail or take long, so the deploy must report which tenants are on which version and allow re-running failed ones, and the code must tolerate both versions briefly.",
            },
            {
              question: "What is the noisy-neighbour problem and how do you mitigate it?",
              answer:
                "One tenant's heavy usage, like a giant export or bulk import, consumes shared resources (CPU, DB connections, queue workers) and slows everyone else down.\n\nMitigations: per-tenant rate limits, per-tenant concurrency caps on queues, query timeouts, scheduling heavy jobs off-peak, per-tenant metrics so you can see who's causing load, and moving very large tenants to dedicated resources.",
            },
            {
              question: "How would you delete all of a tenant's data?",
              answer:
                "With database or schema per tenant it's mostly dropping the database or schema. With shared tables it's a delete in every tenant-scoped table, in foreign-key order, in batches to avoid long locks.\n\nThen everything outside the database: files in object storage under the tenant prefix, cache entries, search indexes, analytics, third-party tools, and backups once their retention expires. That's why an inventory of where tenant data lives is essential.",
            },
            {
              question: "What is PostgreSQL row-level security and how does it help?",
              answer:
                "A database feature that applies a policy, like `tenant_id = current_setting('app.tenant_id')`, to every query on a table. The app sets the tenant per transaction, and even a hand-written native query can't see other tenants' rows.\n\nIt's defence in depth for shared tables. Gotchas: table owners bypass it unless you use `FORCE ROW LEVEL SECURITY`, and the setting must be transaction-local so pooled connections don't carry it over.",
            },
            {
              question: "When would you NOT build multi-tenancy?",
              answer:
                "When there's only one customer organisation. A consumer marketplace with many users but one operator, like my RideX project, has users, not tenants, so multi-tenancy would be pure overhead. I recorded that decision in an ADR.\n\nAlso when each customer needs a fully separate, customised deployment, where a deployment per customer can be simpler, at a higher running cost.",
            },
            {
              question: "Do virtual threads change how you store tenant context?",
              answer:
                "Not fundamentally. ThreadLocals work on virtual threads, each virtual thread has its own, and since they're not pooled, stale values are less likely. But child tasks still don't inherit the value automatically.\n\n`ScopedValue` (preview in Java 21, final in Java 25) fits better: a value bound for the duration of a call and gone afterwards, which removes the \"forgot to clear\" class of bugs.",
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
            "Run `TenantLeak`, then change the pool to two threads and submit ten requests alternating logged-in and anonymous. How many anonymous requests see a tenant without `remove()`?",
            "Change `TenantCache` to use a tenant-aware key, then add an `evictTenant(String tenant)` method that removes only that tenant's entries.",
            "In `TenantFare`, add a third tenant with no fare rules. What happens? Make it fail with a clear message instead of a `NullPointerException`.",
            "In a small Spring Boot app with PostgreSQL, add `@TenantId` to an entity, register a resolver, and check the SQL Hibernate logs for a query.",
            "Create two schemas in a local PostgreSQL, implement the schema-switching `MultiTenantConnectionProvider`, and prove that forgetting to reset the schema in `releaseConnection` can leak between requests.",
            "Pick an endpoint in a multi-tenant app you know and write the cross-tenant test: log in as tenant A, request tenant B's resource by id.",
            "List every place a tenant's data lives in an app you know: tables, files, caches, queues, logs, external tools. That list is your deletion checklist.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `MODELS      shared tables + tenant_id | schema/tenant | DB/tenant
            cheap, weakest    ->  middle  ->  isolated, costly
RESOLVE     from verified token / session / OAuth client
            header, subdomain = hints to cross-check
            webhooks: URL picks secret, signature proves tenant
CONTEXT     ThreadLocal set in filter, remove() in finally
            fail closed: no tenant = error, never a default
ASYNC       TaskDecorator copies it; queue messages carry it
HIBERNATE   CurrentTenantIdentifierResolver (once per session)
            MultiTenantConnectionProvider (schema/DB)
            @TenantId (shared tables, Hibernate 6+)
SPRING      AbstractRoutingDataSource, key at getConnection()
ISOLATE     cache keys, file paths, jobs, logs, unique indexes
OPERATE     per-tenant migrations, limits, backups, deletion
SAFETY NET  PostgreSQL row-level security`,
          caption: "The one-screen version I'd want before a design interview.",
        },
        {
          type: "list",
          items: [
            "Pick the storage model by isolation needs, tenant count and ops budget, and record why in an ADR.",
            "The tenant comes from authentication, never from what the client merely says.",
            "Most leaks aren't in the main query: they're in caches, files, background jobs and uncleared ThreadLocals.",
            "Fail closed everywhere. A missing tenant should be an error, not a guess.",
          ],
        },
      ],
    },
  ],
};
