import type { Lesson } from "../types";

export const jpaHibernateQuestions: Lesson = {
  slug: "jpa-hibernate-interview-questions",
  date: "2026-10-29",
  title: "Spring Data JPA and Hibernate Interview Questions",
  description:
    "The JPA and Hibernate questions interviewers dig into: entity states, dirty checking, N+1, lazy loading, @Transactional traps, locking, queries, mapping choices and connection pools, each explained with a simple example first.",
  tags: ["Interview", "JPA", "Hibernate", "Spring Data", "Transactions"],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "JPA is where interviews go deep fast, because almost every production bug in a Spring backend ends up touching it: a slow page that turns out to be N+1, a rollback that didn't happen, an exception in the controller about a session being closed. I try to answer each question out loud before opening the answer.",
        },
        {
          type: "paragraph",
          text: "A ⭐ marks the most asked questions. The examples use a small food-ordering model throughout: a `Customer` places `Order`s, and each order has `OrderItem`s.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Turn on SQL logging while practising",
          text: "Most JPA answers become obvious once I watch the SQL Hibernate actually sends. `spring.jpa.show-sql=true` is enough for practice; `logging.level.org.hibernate.SQL=DEBUG` is the better habit.",
        },
      ],
    },
    {
      title: "JPA Basics and Entity States",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ JPA vs Hibernate vs Spring Data JPA?",
              answer:
                "**JPA** is the specification: the interfaces and annotations, like a recipe. **Hibernate** is the most common implementation, the cook who actually follows it. **Spring Data JPA** sits on top and removes boilerplate: I write `interface OrderRepository extends JpaRepository<Order, Long>` and get CRUD, paging and query methods generated.",
            },
            {
              question: "⭐ What are the entity states?",
              answer:
                "**Transient**: created with `new`, Hibernate doesn't know it exists. **Managed**: tracked by the persistence context, so changes are saved automatically at flush. **Detached**: it was managed, but the persistence context closed (the transaction ended), so changes are no longer tracked. **Removed**: scheduled for deletion at flush.\n\nA hotel guest is a good picture: a walk-in (transient), a checked-in guest the front desk tracks (managed), a guest who checked out but still has the key card (detached), and a guest whose checkout is being processed (removed).",
            },
            {
              question: "⭐ What is the persistence context? What are the first-level and second-level caches?",
              answer:
                "The persistence context is the per-`EntityManager` (usually per-transaction) map of managed entities, keyed by type and ID. It's the **first-level cache**: calling `findById(7)` twice in one transaction runs one query and returns the very same object both times.\n\nThe **second-level cache** is shared across transactions and is optional (Ehcache, Caffeine or Infinispan through JCache). It's only worth it for read-mostly reference data like a list of cities, because stale data is a real risk.",
            },
            {
              question: "⭐ What is dirty checking?",
              answer:
                "When Hibernate loads an entity it keeps a snapshot of its values. At flush it compares every managed entity with its snapshot and issues an `UPDATE` for whatever changed. No `save()` call is needed.\n\nIt's why \"I never called save but the database changed\" happens: I loaded an order, set its status inside a transaction, and the commit wrote it.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "No save() needed for a managed entity",
          code: `@Transactional
public void markDelivered(Long orderId) {
    Order order = orderRepository.findById(orderId).orElseThrow();
    order.setStatus(OrderStatus.DELIVERED);
    // no save(): dirty checking issues the UPDATE at commit
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "When does Hibernate flush? What are the flush modes?",
              answer:
                "With the default `FlushMode.AUTO`, Hibernate flushes before a query that could be affected by pending changes, at commit, and when I call `flush()` explicitly. `COMMIT` mode flushes only at commit, so queries may not see my pending changes. `MANUAL` (Hibernate-specific) never flushes unless I ask.\n\nOne nuance: with `GenerationType.IDENTITY`, the `INSERT` happens immediately on `persist`, because Hibernate needs the database to hand back the ID.",
            },
            {
              question: "⭐ `save()` vs `saveAndFlush()`? `persist` vs `merge`?",
              answer:
                "`save` in Spring Data calls `persist` for a new entity and `merge` for an existing one, and the SQL may run later at flush. `saveAndFlush` forces the SQL now, which is useful when I want a unique-constraint violation to surface inside the method rather than at commit, for example two requests racing with the same idempotency key.\n\n`persist` makes the given object managed. `merge` copies a detached object's state onto a managed copy and **returns that copy**; the object I passed in stays detached, which trips people up.",
            },
            {
              question: "`findById` vs `getReferenceById`?",
              answer:
                "`findById` queries now and returns an `Optional`. `getReferenceById` returns a lazy **proxy** that holds only the ID and doesn't query at all.\n\nThe proxy is perfect for setting a foreign key: `order.setCustomer(customerRepository.getReferenceById(customerId))` links the order without loading the customer. If the row doesn't exist, it fails later when the proxy is first used, or at flush with a constraint error.",
            },
          ],
        },
      ],
    },
    {
      title: "N+1 and Lazy Loading",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is the N+1 problem, and how do you fix it?",
              answer:
                "A waiter who takes the table's order, walks to the kitchen, then comes back and walks to the kitchen again for each person's drink. In JPA: one query loads 100 orders, then touching `order.getCustomer().getName()` in a loop fires one more query per order, so 101 queries. In the SQL log it shows up as the same `select` repeated with different IDs.\n\nFixes: a `JOIN FETCH` in JPQL; `@EntityGraph(attributePaths = \"customer\")` on the repository method; batch fetching with `@BatchSize` or `hibernate.default_batch_fetch_size`, which turns N queries into a few `IN (...)` queries; or a DTO projection that selects only the columns the screen needs.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Two ways to load orders with their customers in one query",
          code: `@Query("select o from Order o join fetch o.customer where o.status = :status")
List<Order> findWithCustomer(@Param("status") OrderStatus status);

@EntityGraph(attributePaths = "customer")
List<Order> findByStatus(OrderStatus status);`,
        },
        {
          type: "qa",
          items: [
            {
              question: "What goes wrong with `JOIN FETCH` on a collection plus pagination?",
              answer:
                "Fetching `Order` with its `items` collection multiplies rows (one row per item), so the database can't apply `LIMIT` to orders. Hibernate fetches everything and paginates **in memory**, warning `HHH90003004` in Hibernate 6 (formerly `HHH000104`). On a big table that can load the whole result set.\n\nThe fix is either batch fetching for the collection, or two steps: page the order IDs first, then fetch those orders with their items.",
            },
            {
              question: "⭐ Lazy vs eager: what are the defaults, and what do you use?",
              answer:
                "`@ManyToOne` and `@OneToOne` default to **eager**; `@OneToMany` and `@ManyToMany` default to **lazy**. My rule is to make everything lazy (`@ManyToOne(fetch = FetchType.LAZY)`) and fetch explicitly per use case, because eager loading can't be turned off for one query, while a lazy relation can always be fetched with a join when needed.",
            },
            {
              question: "⭐ What causes `LazyInitializationException`, and how do you fix it properly?",
              answer:
                "It's like trying to order more food after the restaurant has closed. I loaded an entity in a transaction, the transaction ended, and then something touched a lazy relation, typically the controller or Jackson serialising the entity to JSON. The session that could run the query is gone.\n\nThe proper fix is to fetch what the use case needs inside the service (fetch join, entity graph or a projection) and return a DTO, not the entity. Wrong fixes are switching everything to eager or relying on open-in-view.",
            },
            {
              question: "What is open-in-view, and why turn it off?",
              answer:
                "`spring.jpa.open-in-view` keeps the persistence context open for the whole web request, including view rendering and JSON serialisation. Spring Boot enables it by default and logs a warning at startup about it.\n\nIt hides lazy-loading problems instead of fixing them: the controller quietly fires extra queries, N+1 problems sneak in, and a database connection may be held for the whole request. I set `spring.jpa.open-in-view=false` so lazy-loading mistakes fail loudly in development.",
            },
            {
              question: "How does Hibernate lazy loading work internally?",
              answer:
                "For a lazy `@ManyToOne`, Hibernate puts a **proxy** in the field: a generated subclass (built with ByteBuddy) that holds only the ID. The first time I call a getter other than the ID, the proxy's interceptor runs the query, which needs an open session. Lazy collections are Hibernate's own collection types, like `PersistentBag` and `PersistentSet`, that load on first access.",
            },
          ],
        },
      ],
    },
    {
      title: "Relationships",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is the owning side, and what does `mappedBy` mean?",
              answer:
                "In a bidirectional relationship, only one side writes the foreign key, the **owning side**, and it's normally the `@ManyToOne` side: `OrderItem.order` owns the `order_id` column. The other side says `@OneToMany(mappedBy = \"order\")`, which means \"I'm just a mirror; the column is managed over there\".\n\nOnly changes on the owning side are saved. If I only add an item to `order.getItems()` without setting `item.setOrder(order)`, nothing is written. So I keep both sides in sync with a helper like `order.addItem(item)` that sets both.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Keeping both sides in sync",
          code: `@Entity
class Order {
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);      // the owning side: this is what gets saved
    }

    void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);      // orphanRemoval deletes the row
    }
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "⭐ Cascade vs `orphanRemoval`?",
              answer:
                "Cascade passes an operation from parent to children: save an order and its items are saved too. It suits true parent-child aggregates, where items have no life without their order. `orphanRemoval = true` deletes a child when it's removed from the parent's collection, even though the parent itself isn't deleted.\n\nThe difference in one line: `CascadeType.REMOVE` deletes children when the **parent** is deleted; `orphanRemoval` also deletes a child when it's merely **detached** from the parent.",
            },
            {
              question: "Why should you never put `CascadeType.REMOVE` on `@ManyToMany`?",
              answer:
                "Because the other side is shared. If a `Student` has `@ManyToMany` courses with cascade remove, deleting one student deletes the courses, which other students are still enrolled in.",
            },
            {
              question: "What are the problems with `@ManyToMany`, and what do you use instead?",
              answer:
                "The join table can't carry extra columns, like `enrolled_at` or `quantity`, and Hibernate removes items from a `List`-mapped many-to-many inefficiently (it can delete all join rows and re-insert the rest). I usually model the join table as its own entity with two `@ManyToOne` relations, like `Enrollment` between `Student` and `Course`.",
            },
          ],
        },
      ],
    },
    {
      title: "@Transactional",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Explain `@Transactional` propagation.",
              answer:
                "Propagation decides what happens when a transactional method is called while a transaction already exists. `REQUIRED` (the default) joins the current one or starts a new one. `REQUIRES_NEW` suspends the current one and runs in a brand-new transaction that commits or rolls back on its own. `NESTED` creates a savepoint inside the current transaction, so the inner part can roll back alone.\n\nThe rest are rarer: `SUPPORTS` (join if there is one, else run without), `MANDATORY` (fail if there isn't one), `NOT_SUPPORTED` (suspend and run without), `NEVER` (fail if there is one).",
            },
            {
              question: "⭐ When does `@Transactional` roll back?",
              answer:
                "By default only on **unchecked** exceptions (`RuntimeException` and subclasses) and `Error`s. A checked exception, like an `IOException`, commits the transaction, which surprises people. `rollbackFor = Exception.class` changes that.\n\nAnd if I catch the exception inside the method and don't rethrow it, the proxy never sees it, so it commits.",
            },
            {
              question: "⭐ Why doesn't `@Transactional` work on self-invocation or private methods?",
              answer:
                "Transactions are applied by a proxy around the bean. A call from one method to another in the same class, `this.saveOrder()`, goes straight to the object and never passes through the proxy, so the annotation is ignored. Private methods can't be intercepted at all.\n\nFixes: move the method into another bean (cleanest), use `TransactionTemplate` in code, or call through a self-injected reference.",
            },
            {
              question: "An inner `REQUIRED` method throws, the outer method catches it. What happens?",
              answer:
                "The inner method's proxy sees a runtime exception and marks the **shared** transaction rollback-only. The outer method catches the exception, carries on happily and returns, and at commit Spring finds the rollback-only flag and throws `UnexpectedRollbackException`. Nothing is saved, not even the outer method's work.\n\nIt's one shared bill: if one person at the table says \"cancel\", the whole bill is cancelled. If I want the inner step to fail on its own, like writing an audit log that must survive, I use `REQUIRES_NEW` (separate bill) or `NESTED` (a savepoint).",
            },
            {
              question: "What does `readOnly = true` do?",
              answer:
                "It's a hint. Hibernate skips dirty checking and flushing for that transaction, which saves memory and CPU on read paths, and the JDBC connection is marked read-only, which some setups use to route queries to a replica. It doesn't magically block writes in every database, so it's not a security feature.",
            },
            {
              question: "What should never happen inside a transaction?",
              answer:
                "Slow network calls: a payment gateway, an SMS provider, another service. The transaction holds a database connection the whole time, so a slow provider drains the pool, and if the provider fails the exception can roll back work that already succeeded.\n\nIn RideX I hit exactly this: calling the payment gateway inside the trip-completion transaction meant a gateway blip rolled back the trip. I moved the call out: the transaction writes a payment row, and a worker opens the gateway order after commit.",
            },
            {
              question: "Can a new thread join the caller's transaction?",
              answer:
                "No. The transaction and its connection are bound to the current thread through `ThreadLocal`s, so an `@Async` method or an executor task starts with no transaction. If it needs one, it opens its own.",
            },
          ],
        },
      ],
    },
    {
      title: "Locking",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Optimistic vs pessimistic locking in JPA?",
              answer:
                "Optimistic is like editing a shared document that warns \"someone changed this since you opened it\" when you save. Pessimistic is like taking the only key to the room: everyone else waits.\n\n**Optimistic:** a `@Version` column. Every update adds `WHERE version = ?` and increments it; if zero rows change, Hibernate throws an `OptimisticLockException` (wrapped by Spring as `ObjectOptimisticLockingFailureException`) and I retry or tell the user. Best when conflicts are rare. **Pessimistic:** `@Lock(LockModeType.PESSIMISTIC_WRITE)`, which issues `SELECT ... FOR UPDATE` and makes others wait. Best when conflicts are likely or a wrong result is expensive.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Both kinds of lock",
          code: `@Entity
class Order {
    @Version
    private Long version;      // optimistic: UPDATE ... WHERE id = ? AND version = ?
}

interface WalletRepository extends JpaRepository<Wallet, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)   // SELECT ... FOR UPDATE
    Optional<Wallet> findByCustomerId(Long customerId);
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "How do you get `SKIP LOCKED` from JPA without native SQL?",
              answer:
                "Use `@Lock(LockModeType.PESSIMISTIC_WRITE)` together with the query hint `jakarta.persistence.lock.timeout` set to `-2`. Hibernate translates `-2` into `SKIP LOCKED` on databases that support it. RideX's outbox worker claims its batch this way, so several instances can run the worker without picking the same rows.",
            },
            {
              question: "Is there an alternative to locking for \"only one person can win\"?",
              answer:
                "Yes, a conditional update. To let exactly one driver accept a ride, RideX runs one statement: `UPDATE ... SET driver_id = ?, status = 'DRIVER_ASSIGNED' WHERE id = ? AND status = 'SEARCHING'`, as a `@Modifying` query. The database row-locks during the update, so the first request gets 1 row updated and wins; the second re-checks the `WHERE` after the first commits and gets 0, which becomes a 409. A two-thread test proves exactly one winner.",
            },
          ],
        },
      ],
    },
    {
      title: "Queries, Paging and Projections",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Derived queries vs JPQL vs native vs Specifications?",
              answer:
                "**Derived** queries come from the method name: `findByCustomerIdAndStatus(...)`. Great for simple lookups, unreadable past three conditions. **JPQL** with `@Query` is written against entities and fields, and it's portable. **Native** queries (`nativeQuery = true`) are raw SQL for database-specific features like window functions or `FOR NO KEY UPDATE SKIP LOCKED`. **Criteria / Specifications** build the `WHERE` clause at runtime, which suits search screens with optional filters.",
            },
            {
              question: "How do Specifications work for a search screen?",
              answer:
                "Each filter is a small `Specification<Order>`, and I combine only the ones the user filled in. The repository extends `JpaSpecificationExecutor<Order>` and gets `findAll(spec, pageable)`.\n\nIt's like a food app's filter panel: veg only, under 30 minutes, rating above 4. Each toggle adds one condition, and none of them needs its own repository method.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Optional filters with Specifications",
          code: `static Specification<Order> hasStatus(OrderStatus status) {
    return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
}

static Specification<Order> inCity(String city) {
    return (root, query, cb) -> city == null ? null : cb.equal(root.get("city"), city);
}

// null specs are ignored, so unused filters simply drop out
Page<Order> page = orderRepository.findAll(
        hasStatus(status).and(inCity(city)), pageable);`,
        },
        {
          type: "qa",
          items: [
            {
              question: "`Page` vs `Slice`?",
              answer:
                "Both take a `Pageable`. `Page<T>` also runs a **count query** so it knows the total number of elements and pages, which is what a numbered pager needs. `Slice<T>` only fetches one extra row to know whether a next page exists, so it skips the count, which is cheaper and ideal for infinite scroll. On a big table that count query can cost more than the page itself.",
            },
            {
              question: "What are projections, and why use them?",
              answer:
                "A projection selects only the columns a screen needs instead of whole entities. An **interface projection** like `interface OrderSummary { Long getId(); BigDecimal getTotal(); }` as a repository return type, or a **DTO projection** with a record and `select new com.example.OrderSummary(o.id, o.total) from Order o`.\n\nThey're faster (less data, no dirty-check snapshots) and they can't trigger lazy loading, because there are no entities involved.",
            },
            {
              question: "What does `@Modifying` do?",
              answer:
                "It marks an `@Query` as an `UPDATE` or `DELETE` rather than a select, so Spring Data calls `executeUpdate()` and returns the affected row count. Bulk updates bypass the persistence context, so already-loaded entities can be stale afterwards; `clearAutomatically = true` clears the context to avoid that.",
            },
          ],
        },
      ],
    },
    {
      title: "Batching, IDs and Entity Identity",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "How do you make bulk inserts fast? Which ID strategy batches?",
              answer:
                "Set `hibernate.jdbc.batch_size` (say 50) and `hibernate.order_inserts=true`, and save in chunks, clearing the persistence context between chunks so it doesn't grow forever.\n\nThe catch is the ID strategy. `GenerationType.IDENTITY` **disables insert batching**, because Hibernate must run each insert to learn the generated ID. `SEQUENCE` with an `allocationSize` (Hibernate grabs a block of IDs at once) or application-generated IDs like UUIDs or ULIDs batch well.",
            },
            {
              question: "`IDENTITY` vs `SEQUENCE` vs `UUID`?",
              answer:
                "`IDENTITY` uses an auto-increment column: simple, but no insert batching. `SEQUENCE` uses a database sequence with pooled allocation: fast and batch-friendly, the best choice on PostgreSQL. `UUID` is generated in the app, so the ID is known before insert and doesn't reveal row counts, but random UUIDv4s scatter inserts across the index; time-ordered IDs (UUIDv7 or ULID) keep inserts at the end of the B-tree.",
            },
            {
              question: "How should you implement `equals` and `hashCode` on entities?",
              answer:
                "Not with all fields, and not naively with a database-generated ID. That ID is null before persist, so the hash changes after saving, and an entity put in a `HashSet` before saving can't be found in it afterwards.\n\nSafe options: a natural business key that never changes (like an order number); or the ID in `equals` (treating null IDs as unequal) with a constant `hashCode` such as `getClass().hashCode()`; or IDs assigned in the app at construction time, which avoids the problem completely. Lombok's `@Data` on an entity is a trap for the same reason.",
            },
          ],
        },
      ],
    },
    {
      title: "Mapping Choices",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "`@MappedSuperclass` vs entity inheritance?",
              answer:
                "`@MappedSuperclass` shares **fields only**: a `BaseEntity` with `id`, `createdAt` and `updatedAt` whose columns are copied into each subclass's own table. It isn't an entity, so I can't query it or point a relation at it.\n\nEntity inheritance with `@Inheritance` is for when I need **polymorphic queries**: \"give me all payments, whatever kind\".",
            },
            {
              question: "Inheritance strategies: `SINGLE_TABLE` vs `JOINED` vs `TABLE_PER_CLASS`?",
              answer:
                "Take a `Payment` with `CardPayment`, `UpiPayment` and `CashPayment`. **SINGLE_TABLE** (the default) puts everything in one table with a discriminator column: fastest, no joins, but subtype columns must be nullable. **JOINED** has a parent table plus one table per subtype sharing the primary key: normalised and allows NOT NULL, but every polymorphic read joins. **TABLE_PER_CLASS** gives each concrete class a full table: no joins for one type, but polymorphic queries need a `UNION`.\n\nMy default is `SINGLE_TABLE` when subtypes differ by a few columns, `JOINED` when they differ a lot. Often the simplest honest answer is to avoid inheritance: one table with a type enum.",
            },
          ],
        },
        {
          type: "table",
          headers: ["Strategy", "Tables", "Good", "Bad"],
          rows: [
            ["SINGLE_TABLE", "One, with a discriminator column", "No joins, fast polymorphic reads", "Subtype columns must be nullable"],
            ["JOINED", "Parent + one per subtype", "Normalised, NOT NULL possible", "Join on every polymorphic read, 2 inserts"],
            ["TABLE_PER_CLASS", "One full table per concrete class", "No joins for single-type reads", "Polymorphic queries need UNION"],
          ],
        },
        {
          type: "code",
          language: "java",
          title: "SINGLE_TABLE in practice",
          code: `@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "payment_type")
abstract class Payment {
    @Id Long id;
    BigDecimal amount;
}

@Entity @DiscriminatorValue("CARD")
class CardPayment extends Payment { String last4; }

@Entity @DiscriminatorValue("UPI")
class UpiPayment extends Payment { String upiId; }`,
        },
        {
          type: "qa",
          items: [
            {
              question: "What is `@Embeddable`?",
              answer:
                "A value object whose fields live as columns in the owning table, with no table and no identity of its own. An `Address` (street, city, pincode) or `Money` (amount, currency) embedded in `Order` with `@Embedded`. If the same type appears twice, like pickup and drop addresses, `@AttributeOverride` renames the columns. Since Hibernate 6.2, records work as embeddables.",
            },
            {
              question: "How do you map a composite key? `@EmbeddedId` vs `@IdClass`?",
              answer:
                "`@EmbeddedId` uses one key object, an `@Embeddable` like `OrderItemId(orderId, productId)`, as the ID. `@IdClass` keeps the key fields directly on the entity, with a separate class that mirrors them. Either way the key class must implement `equals`, `hashCode` and `Serializable` (a record covers the first two).\n\nMany teams avoid composite keys altogether: a single surrogate ID plus a **unique constraint** on the pair is simpler for JPA, URLs and APIs.",
            },
            {
              question: "`@Enumerated(EnumType.ORDINAL)` vs `STRING`?",
              answer:
                "`ORDINAL` stores the position: 0, 1, 2. If someone later adds `PREPARING` between `PLACED` and `DELIVERED`, every stored `1` now means something else, and existing data is silently corrupted. `STRING` stores the name, `\"DELIVERED\"`, which survives reordering and is readable in SQL. I always use `STRING`; renaming a constant then needs a data migration, which at least is visible.",
            },
            {
              question: "What is `@ElementCollection`?",
              answer:
                "A collection of simple values or embeddables owned by the entity, stored in a separate table with no identity of their own, like a customer's set of saved tags or a user's roles.\n\nThe caveat: when the collection changes, Hibernate often deletes all its rows and re-inserts them. Fine for a handful of roles, bad for a large or frequently changing list, which should be a real `@OneToMany` entity.",
            },
            {
              question: "What is an `AttributeConverter`?",
              answer:
                "It maps one custom Java type to one column. For example, a `Money` value object stored as a `BIGINT` of paise, or a phone number normalised on the way in. With `@Converter(autoApply = true)` it applies to every attribute of that type. It's also the usual way to encrypt a sensitive column transparently.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Money stored as paise",
          code: `@Converter(autoApply = true)
class MoneyConverter implements AttributeConverter<Money, Long> {
    public Long convertToDatabaseColumn(Money money) {
        return money == null ? null : money.paise();
    }
    public Money convertToEntityAttribute(Long paise) {
        return paise == null ? null : Money.ofPaise(paise);
    }
}`,
        },
        {
          type: "qa",
          items: [
            {
              question: "What are entity lifecycle callbacks? How do you do auditing?",
              answer:
                "`@PrePersist`, `@PostPersist`, `@PreUpdate`, `@PostUpdate`, `@PreRemove`, `@PostRemove` and `@PostLoad`, on the entity or in an `@EntityListeners` class. `@PrePersist` is a common place to set an app-generated ID and a created timestamp. For who-and-when auditing, Spring Data's `@EnableJpaAuditing` with `@CreatedDate`, `@LastModifiedDate` and `@CreatedBy` does it declaratively.",
            },
            {
              question: "How do you do soft delete?",
              answer:
                "A `deleted_at` column, `@SQLDelete` to turn `DELETE` into `UPDATE ... SET deleted_at = now()`, and `@SQLRestriction(\"deleted_at is null\")` (Hibernate 6.3+, replacing `@Where`) so normal queries skip deleted rows. Unique constraints then need to account for deleted rows, often with a partial index.",
            },
          ],
        },
      ],
    },
    {
      title: "Schema Migrations and Connection Pools",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Flyway vs `ddl-auto`?",
              answer:
                "`ddl-auto=update` lets Hibernate guess schema changes from the entities. It never drops or renames anything safely, it can't migrate data, and nobody reviews what it does, so it doesn't belong in production. `validate` is the one safe setting there: it only checks that entities match the schema.\n\nFlyway runs versioned SQL files in order (`V12__add_delivery_slot.sql`) and records them in `flyway_schema_history`. Migrations are reviewed like code, run identically everywhere, and are never edited once applied. RideX has 44 of them, and a failed migration fails the deploy instead of leaving a half-migrated app running.",
            },
            {
              question: "How do you change a column without downtime?",
              answer:
                "Expand and contract. Add the new column as nullable and write to both; backfill old rows in batches; switch reads to the new column; and only once nothing uses the old one, drop it in a later release. No single step breaks the version of the app that's currently running.",
            },
            {
              question: "What is HikariCP, and what happens when the pool is exhausted?",
              answer:
                "Hikari is Spring Boot's default connection pool. Opening a database connection is slow (TCP, TLS, authentication), so the pool keeps a few open and lends them out, like a cab stand with a fixed number of cabs.\n\nWhen every connection is in use, callers wait up to `connectionTimeout` (30 seconds by default) and then fail with \"Connection is not available, request timed out after 30000ms\". The usual causes are long transactions, slow queries, network calls inside transactions, or a leak. I watch `hikaricp.connections.pending` and turn on `leakDetectionThreshold` to find who holds connections too long.",
            },
            {
              question: "Is a bigger connection pool better?",
              answer:
                "No. A database with 8 cores can't run 200 queries in parallel; they queue inside the database and fight over locks, and everything gets slower. Hikari's guidance is roughly `cores × 2 + effective disks`, which is often 10 to 20 connections. The pool should match what the database can handle, not the number of Tomcat threads; the fix for exhaustion is usually shorter transactions.",
            },
            {
              question: "Why is Hikari fast at handing out connections?",
              answer:
                "It uses a custom `ConcurrentBag`. A thread first checks a `ThreadLocal` list of connections it used recently, a fast path with no contention, then the shared list using compare-and-swap, and only then waits on a hand-off queue up to `connectionTimeout`. Very little locking is involved.",
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
          text: `JPA / Hibernate / Spring Data   spec / implementation / repository layer
States          transient -> managed -> detached | removed
Persistence ctx 1st-level cache, per tx; same id = same object
Dirty checking  snapshot compare at flush -> UPDATE, no save() needed
Flush (AUTO)    before affected queries, at commit, on flush()
merge           returns the managed COPY; argument stays detached
getReferenceById  proxy, no query; good for setting FKs
N+1             1 query + 1 per row  -> JOIN FETCH | @EntityGraph | batch size | DTO
fetch + page    collection fetch + LIMIT = in-memory paging (HHH90003004)
Defaults        *ToOne EAGER, *ToMany LAZY -> make everything LAZY
LazyInitEx      session closed -> fetch in service, return DTOs
open-in-view    on by default; turn OFF
Owning side     @ManyToOne side holds the FK; mappedBy = mirror; sync both sides
Cascade REMOVE  parent deleted -> children deleted | orphanRemoval: unlinked -> deleted
Propagation     REQUIRED (join) | REQUIRES_NEW (own tx) | NESTED (savepoint)
Rollback        unchecked + Error only; checked commits (rollbackFor)
Self-call       skips proxy -> no transaction
Inner throws,   shared tx rollback-only -> UnexpectedRollbackException
  outer catches
Locking         @Version (optimistic, retry) | PESSIMISTIC_WRITE (FOR UPDATE)
SKIP LOCKED     PESSIMISTIC_WRITE + lock.timeout = -2
Page vs Slice   Page runs COUNT; Slice just checks for a next row
IDs             IDENTITY kills insert batching; SEQUENCE / app IDs batch
equals/hashCode stable key or constant hashCode; never @Data on entities
Inheritance     SINGLE_TABLE (fast, nullable) | JOINED (normalised) | PER_CLASS (UNION)
Enums           ALWAYS EnumType.STRING
Schema          Flyway in prod; ddl-auto=validate at most
Hikari          small pool; exhaustion = long tx / slow query / leak`,
          caption: "JPA and Hibernate on one screen",
        },
      ],
    },
  ],
};
