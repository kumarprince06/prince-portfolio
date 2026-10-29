import type { Lesson } from "../types";

export const expenseTrackerApi: Lesson = {
  slug: "expense-tracker-api",
  date: "2026-10-29",
  title: "Project 1: Expense Tracker REST API",
  description:
    "A small but production-shaped Spring Boot REST API for tracking personal expenses: layered architecture, JPA with PostgreSQL and Flyway, validation, ProblemDetail errors, pagination and filtering, and real database tests with Testcontainers.",
  tags: ["Project", "Spring Boot", "PostgreSQL", "REST API", "Testing"],
  difficulty: "Easy",
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "Every Java backend job description has the same core: build REST APIs with Spring Boot, store data in a relational database, validate input, return clean errors, and write tests. I've done all of that for two years in Laravel. This project is where I prove I can do the same things the Spring way, without the Laravel muscle memory doing the work for me.",
        },
        {
          type: "paragraph",
          text: "The domain is deliberately boring. Nobody needs another expense tracker, and that's the point: when the business logic is simple, every interview question lands on the engineering. Why this layer? Why `BigDecimal`? Why Flyway instead of `ddl-auto`? Why Testcontainers instead of H2? Those are exactly the questions a Spring interviewer asks a career switcher.",
        },
        {
          type: "table",
          headers: ["Job skill", "Where it shows up here"],
          rows: [
            ["Spring Boot basics", "Starters, auto-configuration, `application.yml`, profiles"],
            ["Layered architecture", "Controller → service → repository, DTOs at the edge"],
            ["Spring Data JPA", "Entities, relationships, derived queries, Specifications"],
            ["PostgreSQL + Flyway", "Versioned migrations, constraints, indexes"],
            ["Validation and errors", "Bean Validation on DTOs, one `@RestControllerAdvice` returning `ProblemDetail`"],
            ["Pagination and filtering", "`Pageable`, sorting whitelist, optional filters"],
            ["Testing", "JUnit 5 + Mockito unit tests, Testcontainers integration tests"],
            ["Tooling", "Docker Compose, OpenAPI docs via springdoc"],
          ],
        },
        {
          type: "paragraph",
          text: "**Effort:** about 2 weekends for the Must items if I already know basic Java, plus one more weekend for tests, Docker and polish. If it's taking longer, I'm probably gold-plating.",
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the small notebook my dad keeps in his shirt pocket: every time he spends money he writes the date, the amount, what it was for, and a word like \"groceries\" or \"fuel\". At the end of the month he adds up each word and sees where the money went. This API is that notebook. A client (a mobile app, a web page, or just Postman) can create categories, record expenses against them, list and filter expenses page by page, and ask for a monthly summary per category. It is a single-user API on purpose; login and ownership come in Project 3.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a user, I want to create categories like Food, Rent and Travel, so that I can group my spending.",
            "As a user, I want to record an expense with an amount, date, category and an optional note, so that nothing is forgotten.",
            "As a user, I want to fix a wrong amount or delete a duplicate expense, so that my totals stay correct.",
            "As a user, I want to list my expenses newest first, a page at a time, so that the app stays fast even after a year of data.",
            "As a user, I want to filter by date range, category and amount range, so that I can answer \"how much did I spend on food in March?\".",
            "As a user, I want a monthly summary grouped by category, so that I see where my money goes.",
            "As a frontend developer, I want consistent error responses and OpenAPI docs, so that I can integrate without reading the backend code.",
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
            ["FR-01", "Create, list, rename and delete categories. Names are unique (case-insensitive).", "Must"],
            ["FR-02", "Deleting a category that still has expenses is rejected with 409.", "Must"],
            ["FR-03", "Create an expense with amount (> 0, max 2 decimals), currency (ISO 4217), date (not in the future), category and optional note (max 500 chars).", "Must"],
            ["FR-04", "Get, update (PUT) and delete a single expense by id.", "Must"],
            ["FR-05", "List expenses with pagination (`page`, `size` max 100) and sorting on a whitelist of fields (`spentOn`, `amount`, `createdAt`).", "Must"],
            ["FR-06", "Filter the list by `from`/`to` date, `categoryId`, `minAmount`/`maxAmount`. All filters are optional and combine with AND.", "Must"],
            ["FR-07", "Monthly summary: total per category for a given `YYYY-MM`, plus a grand total.", "Must"],
            ["FR-08", "All errors are returned as RFC 9457 `ProblemDetail` JSON with field-level validation messages.", "Must"],
            ["FR-09", "OpenAPI spec and Swagger UI available in the dev profile.", "Should"],
            ["FR-10", "Partial update with PATCH (only the fields sent change).", "Could"],
            ["FR-11", "Export a month as CSV.", "Could"],
          ],
        },
      ],
    },
    {
      title: "Non-Functional Requirements",
      blocks: [
        {
          type: "paragraph",
          text: "Every target here is something I can measure on my own laptop. I'll write the measured value next to each one in the README.",
        },
        {
          type: "table",
          headers: ["ID", "Target", "How I verify it"],
          rows: [
            ["NFR-01", "List endpoint p95 under 100 ms with 50,000 seeded expenses and 20 concurrent users", "k6 run for 30 s against the Docker Compose stack"],
            ["NFR-02", "Filtered list uses an index, not a sequential scan", "`EXPLAIN ANALYZE` on the generated SQL, screenshot in the README"],
            ["NFR-03", "Full test suite (unit + Testcontainers) finishes in under 2 minutes", "`./mvnw verify` timing on my laptop"],
            ["NFR-04", "At least 80% line coverage on the service layer", "JaCoCo report"],
            ["NFR-05", "`docker compose up` gives a working API in under 60 seconds from a cold start (images already pulled)", "Stopwatch, documented"],
            ["NFR-06", "No money stored as `double`; totals are exact to the cent", "Unit test summing 0.10 ten times equals 1.00"],
            ["NFR-07", "Zero schema changes made outside Flyway (`ddl-auto=validate`)", "App fails to start if entities and schema drift"],
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
            ["categories", "`id BIGINT identity PK`, `name VARCHAR(50)`, `created_at TIMESTAMPTZ`", "Unique index on `lower(name)`"],
            ["expenses", "`id BIGINT identity PK`, `category_id FK`, `amount NUMERIC(12,2)`, `currency CHAR(3)`, `spent_on DATE`, `note VARCHAR(500)`, `created_at`, `updated_at`", "`CHECK (amount > 0)`; index on `(spent_on DESC, id DESC)` and on `category_id`"],
          ],
        },
        {
          type: "diagram",
          text: `+------------------+          +---------------------------+
|   categories     |          |         expenses          |
+------------------+          +---------------------------+
| id          PK   |1       * | id              PK        |
| name  (unique)   |----------| category_id     FK        |
| created_at       |          | amount   NUMERIC(12,2)    |
+------------------+          | currency CHAR(3)          |
                              | spent_on DATE             |
                              | note                      |
                              | created_at / updated_at   |
                              +---------------------------+`,
          caption: "One category has many expenses. Deleting a category with expenses is blocked by the FK (ON DELETE RESTRICT).",
        },
        {
          type: "code",
          language: "sql",
          title: "src/main/resources/db/migration/V1__create_categories_and_expenses.sql",
          code: `CREATE TABLE categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_categories_name ON categories (lower(name));

CREATE TABLE expenses (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT        NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency    CHAR(3)       NOT NULL,
    spent_on    DATE          NOT NULL,
    note        VARCHAR(500),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_expenses_spent_on ON expenses (spent_on DESC, id DESC);
CREATE INDEX ix_expenses_category ON expenses (category_id);`,
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
            ["POST", "/api/v1/categories", "Create a category", "201 + Location", "400, 409 (duplicate name)"],
            ["GET", "/api/v1/categories", "List all categories", "200", "-"],
            ["PUT", "/api/v1/categories/{id}", "Rename a category", "200", "400, 404, 409"],
            ["DELETE", "/api/v1/categories/{id}", "Delete an unused category", "204", "404, 409 (has expenses)"],
            ["POST", "/api/v1/expenses", "Record an expense", "201 + Location", "400, 404 (category)"],
            ["GET", "/api/v1/expenses", "Paged, filtered, sorted list", "200", "400 (bad filter or sort)"],
            ["GET", "/api/v1/expenses/{id}", "One expense", "200", "404"],
            ["PUT", "/api/v1/expenses/{id}", "Replace an expense", "200", "400, 404"],
            ["DELETE", "/api/v1/expenses/{id}", "Delete an expense", "204", "404"],
            ["GET", "/api/v1/reports/monthly?month=2026-10", "Totals per category for a month", "200", "400 (bad month)"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/expenses (request)",
          code: `{
  "amount": "249.50",
  "currency": "INR",
  "spentOn": "2026-10-28",
  "categoryId": 3,
  "note": "Weekly vegetables"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "201 Created, Location: /api/v1/expenses/42",
          code: `{
  "id": 42,
  "amount": "249.50",
  "currency": "INR",
  "spentOn": "2026-10-28",
  "category": { "id": 3, "name": "Groceries" },
  "note": "Weekly vegetables",
  "createdAt": "2026-10-28T18:04:11Z"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/expenses with bad input → 400 (application/problem+json)",
          code: `{
  "type": "https://example.com/problems/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "2 fields are invalid",
  "instance": "/api/v1/expenses",
  "errors": [
    { "field": "amount", "message": "must be greater than 0" },
    { "field": "spentOn", "message": "must not be in the future" }
  ]
}`,
        },
        {
          type: "paragraph",
          text: "I send `amount` as a string on purpose. JSON numbers become doubles in many clients, and `0.1 + 0.2` is not `0.3` in a double. Jackson reads the string straight into a `BigDecimal`.",
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "diagram",
          text: `  HTTP client (Postman / k6 / Swagger UI)
                 |
                 v
 +-------------------------------+
 |  web: Controllers + DTOs      |  @Valid, maps DTO <-> domain
 |  ApiExceptionHandler          |  every error -> ProblemDetail
 +---------------+---------------+
                 |
                 v
 +-------------------------------+
 |  service: ExpenseService,     |  @Transactional, business rules
 |  CategoryService, Reports     |  (future date? category exists?)
 +---------------+---------------+
                 |
                 v
 +-------------------------------+
 |  repository: Spring Data JPA  |  derived queries, Specifications,
 |  interfaces                   |  one JPQL projection for reports
 +---------------+---------------+
                 |
                 v
        PostgreSQL 16  <-- Flyway runs V1, V2... on startup`,
          caption: "Package by feature inside, layers per feature: expense/web, expense/service, expense/repository.",
        },
        {
          type: "paragraph",
          text: "The rule I hold myself to: controllers never touch repositories, entities never leave the service layer, and the service layer knows nothing about HTTP. In Laravel terms, the controller is thin, the service plays the role of an action class, and the repository is what Eloquent did for me implicitly.",
        },
        {
          type: "code",
          language: "java",
          title: "ApiExceptionHandler.java",
          code: `@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource not found");
        return problem;
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail handleConflict(ConflictException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Conflict");
        return problem;
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ex.getBody();
        problem.setTitle("Validation failed");
        problem.setProperty("errors", ex.getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", String.valueOf(e.getDefaultMessage())))
                .toList());
        return ResponseEntity.badRequest().body(problem);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "ExpenseSpecs.java (optional filters, each one null-safe)",
          code: `final class ExpenseSpecs {

    private ExpenseSpecs() {}

    static Specification<Expense> spentFrom(LocalDate from) {
        return (root, query, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("spentOn"), from);
    }

    static Specification<Expense> spentTo(LocalDate to) {
        return (root, query, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("spentOn"), to);
    }

    static Specification<Expense> inCategory(Long categoryId) {
        return (root, query, cb) -> categoryId == null ? null
                : cb.equal(root.get("category").get("id"), categoryId);
    }
}

// in ExpenseService
Page<Expense> search(ExpenseFilter f, Pageable pageable) {
    return expenseRepository.findAll(
            Specification.allOf(spentFrom(f.from()), spentTo(f.to()), inCategory(f.categoryId())),
            pageable);
}`,
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
            ["Java 21", "Current LTS; records for DTOs, text blocks, pattern matching"],
            ["Spring Boot 3.x (Web, Validation, Data JPA)", "What most Java backend jobs use; built-in `ProblemDetail` support"],
            ["PostgreSQL 16", "Real constraints, `NUMERIC`, good `EXPLAIN` output; same DB in tests and prod"],
            ["Flyway", "Versioned, reviewable SQL migrations, like Laravel migrations but plain SQL"],
            ["springdoc-openapi", "Generates OpenAPI 3 + Swagger UI from controllers"],
            ["JUnit 5, Mockito, AssertJ", "Standard unit testing stack"],
            ["Testcontainers", "Integration tests against a real PostgreSQL in Docker"],
            ["Docker Compose", "One command to run app + DB for anyone reviewing the repo"],
            ["Maven (wrapper)", "Most common build tool in job postings; `./mvnw` needs no install"],
            ["k6", "Tiny scripted load test to back up NFR-01 with a real number"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: BigDecimal and NUMERIC(12,2) for money",
        },
        {
          type: "paragraph",
          text: "Like counting coins instead of weighing them: exact, never \"about\" right. `double` can't represent 0.10 exactly, so sums drift. Trade-off: `BigDecimal` is more verbose (`a.add(b)` instead of `a + b`) and must be compared with `compareTo`, not `equals` (`2.0` and `2.00` are not `equals`).",
        },
        {
          type: "heading",
          text: "ADR-2: Flyway owns the schema, Hibernate only validates",
        },
        {
          type: "paragraph",
          text: "`spring.jpa.hibernate.ddl-auto=validate`. Auto-generated DDL is fine for a demo but silently does the wrong thing on rename. Trade-off: I write SQL by hand, which is slower at first but exactly what teams do in production.",
        },
        {
          type: "heading",
          text: "ADR-3: DTO records at the edge, entities inside",
        },
        {
          type: "paragraph",
          text: "Returning entities from controllers leaks lazy-loading exceptions and lets clients set fields like `id`. Records (`CreateExpenseRequest`, `ExpenseResponse`) make the contract explicit. Trade-off: some mapping code; I'll write it by hand first and only consider MapStruct if it gets repetitive.",
        },
        {
          type: "heading",
          text: "ADR-4: Offset pagination, not cursor",
        },
        {
          type: "paragraph",
          text: "`Pageable` gives page numbers and total counts, which a simple UI wants. Trade-off: deep pages get slower and the `count(*)` costs extra. Fine for one person's expenses; cursor pagination appears in a later project.",
        },
        {
          type: "heading",
          text: "ADR-5: Testcontainers instead of H2",
        },
        {
          type: "paragraph",
          text: "H2 pretends to be PostgreSQL but differs on functional indexes, `NUMERIC` behaviour and error codes. Testing against a fake database tests the fake. Trade-off: tests need Docker and the first run is slower.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Amount with 3 decimals (`10.999`) → 400, not silently rounded. Use `@Digits(integer = 10, fraction = 2)`.",
            "Amount `0` or negative → 400 from validation, and the DB `CHECK` is the last line of defence.",
            "`spentOn` in the future → 400. \"Today\" comes from an injected `Clock`, so the test doesn't break at midnight.",
            "`from` after `to` → 400 with a clear message, not an empty page.",
            "`size=100000` → capped at 100 (`spring.data.web.pageable.max-page-size`).",
            "`sort=password,asc` or any unknown field → 400, not a 500 from Hibernate.",
            "Category name `Food` vs `food` → treated as the same name (409).",
            "Deleting a category in use → 409 with how many expenses use it.",
            "Malformed JSON or wrong type (`\"amount\": \"abc\"`) → 400 ProblemDetail, not a stack trace.",
            "Unknown id on GET/PUT/DELETE → 404. Deleting twice → second call is 404, which is fine.",
            "Month `2026-13` in the report → 400.",
            "A month with no expenses → 200 with an empty list and total `0.00`, not 404.",
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
            "**Skeleton.** Spring Initializr project, Docker Compose with PostgreSQL, Flyway V1, `/actuator/health` green. Demo: `docker compose up` then `curl` health. Test: context-loads test with Testcontainers.",
            "**Categories CRUD.** Entity, repository, service, controller, DTOs, unique-name rule. Demo: create and list categories in Swagger UI. Tests: service unit tests with Mockito, one integration test for the 409 on duplicates.",
            "**Expenses CRUD + validation.** Bean Validation, `ProblemDetail` handler, `Clock` injection. Demo: create a valid expense and show a 400 with field errors. Tests: one test per validation rule, 404 path, delete-category-in-use 409.",
            "**List, filter, sort, paginate.** Specifications, page size cap, sort whitelist. Demo: filter October groceries over 100. Tests: integration test seeding 30 rows and asserting page 2 contents and total count.",
            "**Monthly report.** JPQL constructor projection or interface projection with `GROUP BY`. Demo: report for a seeded month. Tests: totals are exact (`compareTo`), empty month returns zero.",
            "**Polish and proof.** OpenAPI descriptions, README with run steps, seed script for 50,000 rows, k6 run, `EXPLAIN ANALYZE` screenshot, JaCoCo report. Demo: the README alone gets a stranger to a running API.",
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
            "**Unit tests (JUnit 5 + Mockito):** service rules in isolation. Future date rejected, category must exist, duplicate name conflict, report math. Fast, no Spring context.",
            "**Web slice tests (`@WebMvcTest`):** request validation and the exact `ProblemDetail` shape for 400/404/409, with the service mocked.",
            "**Repository/integration tests (`@SpringBootTest` + Testcontainers + `@ServiceConnection`):** Flyway migrations run, Specifications produce correct results, the unique index and `CHECK` constraint actually fire.",
            "**End-to-end API tests:** a few `TestRestTemplate` or `MockMvc` flows covering create → list → update → delete.",
            "**Load test (k6):** 20 virtual users for 30 seconds on the list endpoint with 50,000 rows; record p95 and requests per second in the README.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "ExpenseApiIT.java",
          code: `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class ExpenseApiIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    TestRestTemplate rest;

    @Test
    void rejectsZeroAmountWithProblemDetail() {
        var body = Map.of("amount", "0", "currency", "INR",
                "spentOn", "2026-10-01", "categoryId", 1);

        ResponseEntity<String> response = rest.postForEntity("/api/v1/expenses", body, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getHeaders().getContentType())
                .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response.getBody()).contains("amount");
    }
}`,
        },
      ],
    },
    {
      title: "Stretch Goals",
      blocks: [
        {
          type: "list",
          items: [
            "Monthly budgets per category with a \"you're at 80%\" flag in the report.",
            "Recurring expenses (rent on the 1st) created by a scheduled job.",
            "CSV import with a per-row error report.",
            "Multi-currency totals with a stored exchange rate per day.",
            "GitHub Actions pipeline running `./mvnw verify` with Testcontainers on every push.",
            "Swap offset pagination for keyset (cursor) pagination and compare deep-page timings.",
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
              question: "Why did you use BigDecimal instead of double for amounts?",
              answer:
                "Because `double` is binary floating point and can't represent most decimal fractions exactly. Adding 0.10 ten times as a double doesn't give exactly 1.0, and those errors pile up in totals.\n\n`BigDecimal` is exact decimal arithmetic. I pair it with `NUMERIC(12,2)` in PostgreSQL and compare values with `compareTo`, because `equals` also compares scale, so `2.0` and `2.00` aren't equal.",
            },
            {
              question: "Walk me through what happens when a POST /api/v1/expenses request arrives.",
              answer:
                "The `DispatcherServlet` finds my controller method, Jackson turns the JSON into a `CreateExpenseRequest` record, and `@Valid` runs Bean Validation. If that fails, Spring throws `MethodArgumentNotValidException` and my advice turns it into a 400 `ProblemDetail`.\n\nIf it passes, the controller calls the service. The service method is `@Transactional`, checks the category exists, builds the entity and saves it through the repository. On commit Hibernate flushes the insert. The controller maps the entity to a response DTO and returns 201 with a `Location` header.",
            },
            {
              question: "Why Flyway instead of letting Hibernate create the tables?",
              answer:
                "`ddl-auto=update` guesses. It never drops or renames columns safely, and it has no history. Flyway gives me ordered, versioned SQL files that run the same way on every environment and get reviewed like code.\n\nI set Hibernate to `validate`, so if my entity and the schema disagree, the app refuses to start instead of failing at runtime.",
            },
            {
              question: "Why Testcontainers and not H2?",
              answer:
                "H2 is a different database. My schema uses a functional unique index on `lower(name)` and a `CHECK` constraint, and the error codes differ. A test that passes on H2 can fail on PostgreSQL.\n\nTestcontainers starts a real PostgreSQL in Docker, and with `@ServiceConnection` Spring Boot wires the datasource automatically. The cost is a few seconds of startup, which I reduce by sharing one container across the test class.",
            },
            {
              question: "How does your filtering work when all filters are optional?",
              answer:
                "Each filter is a small `Specification` that returns `null` when its value is missing, and `Specification.allOf` ignores null predicates. So I build the query from only the filters the client actually sent, with no string concatenation and no SQL injection risk.",
            },
            {
              question: "How do you stop someone requesting size=1000000?",
              answer:
                "I cap it with `spring.data.web.pageable.max-page-size=100`, so larger values are clamped. Sort fields are checked against a whitelist, because sorting by an unknown property would otherwise surface as a 500.",
            },
            {
              question: "Why not return the JPA entity directly from the controller?",
              answer:
                "Three reasons. Lazy relationships can throw `LazyInitializationException` during serialization or cause extra queries. It exposes internal fields and lets clients mass-assign things like `id`. And it ties my API contract to my table design, so any schema change becomes a breaking API change.\n\nDTO records keep the contract explicit and stable.",
            },
            {
              question: "What is ProblemDetail and why use it?",
              answer:
                "It's Spring's implementation of RFC 9457, a standard JSON shape for HTTP errors with `type`, `title`, `status`, `detail` and `instance`, plus custom properties like my `errors` list.\n\nThe point is consistency: every error from every endpoint has the same shape, so the frontend writes one error handler.",
            },
            {
              question: "Where does @Transactional go and why?",
              answer:
                "On service methods, because a transaction should wrap one business operation, which may touch several repositories. Controllers shouldn't know about transactions, and repositories are already transactional per call.\n\nRead-only methods get `@Transactional(readOnly = true)`, which lets Hibernate skip dirty checking.",
            },
            {
              question: "How did you check your list query is efficient?",
              answer:
                "I seeded 50,000 rows, turned on SQL logging to get the generated query, and ran it with `EXPLAIN ANALYZE`. I added the index on `(spent_on DESC, id DESC)` to match the default sort. Then a k6 run gave me the p95 latency, which is the number in my README.",
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
            "Built a Spring Boot 3 / Java 21 REST API for expense tracking with PostgreSQL, Flyway migrations, Bean Validation and RFC 9457 error responses, documented with OpenAPI.",
            "Implemented paginated, multi-filter search with JPA Specifications and a matching composite index; measured p95 of [X] ms at [Y] concurrent users over 50k rows with k6.",
            "Wrote unit and Testcontainers-based integration tests ([N]% service-layer coverage) and packaged the stack with Docker Compose for one-command setup.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Only claim what I built",
          text: "Replace every [X], [Y] and [N] with the number I actually measured, and keep the k6 output or JaCoCo report in the repo so I can show it. If I didn't finish a stretch goal, it doesn't go on the resume. An interviewer will open the repo and ask about the one line I exaggerated.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "Java → Methods, Data Types and Type Casting (especially why `double` is wrong for money)",
            "Java → Java 8 Features: Lambda Expressions, Streams API, Optional",
            "Java → Date and Time API (`LocalDate`, `YearMonth`, `Clock`)",
            "Spring Boot: dependency injection, auto-configuration, profiles, `@RestController`, `@Transactional`",
            "Interview Questions → JPA and Hibernate (entities, relationships, lazy loading)",
            "PostgreSQL: data types, constraints, indexes, `EXPLAIN ANALYZE`",
            "REST API Design: resource naming, status codes, pagination, error format",
            "Testing basics: JUnit 5, Mockito, Testcontainers",
          ],
        },
      ],
    },
  ],
};
