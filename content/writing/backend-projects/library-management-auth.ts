import type { Lesson } from "../types";

export const libraryManagementAuth: Lesson = {
  slug: "library-management-auth",
  date: "2026-10-29",
  title: "Project 3: Library Management with JWT Auth",
  description:
    "A library lending API secured with Spring Security: JWT access tokens with rotating refresh tokens, BCrypt passwords, role-based access with @PreAuthorize, ownership checks against IDOR, due-date rules with java.time, scheduled overdue reminders by email, and an audit log.",
  tags: ["Project", "Spring Boot", "Spring Security", "JWT", "PostgreSQL"],
  difficulty: "Medium",
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "Security is where career switchers get caught out. In Laravel, Sanctum or Passport did most of the work and I mostly configured it. Spring Security is a filter chain I have to understand, and interviewers know it. This project makes me build login, tokens, roles and ownership checks myself, and be able to explain each piece.",
        },
        {
          type: "paragraph",
          text: "The library domain adds real business rules on top: how many books a member can borrow, when they're due, what happens when they're late. Those rules are where `java.time`, scheduled jobs and email come in, and they're the kind of logic that fills most real backend tickets.",
        },
        {
          type: "table",
          headers: ["Job skill", "Where it shows up here"],
          rows: [
            ["Spring Security", "Stateless `SecurityFilterChain`, OAuth2 resource server for JWT validation"],
            ["Token design", "Short-lived access JWT + rotating, hashed refresh token with reuse detection"],
            ["Password storage", "BCrypt via `PasswordEncoder`, no plain text anywhere"],
            ["Authorization", "Roles mapped to authorities, `@PreAuthorize`, ownership checks"],
            ["Business rules", "Loan limits, due dates, renewals, fines using `LocalDate`, `Period`, `Clock`"],
            ["Background jobs", "`@Scheduled` reminders, idempotent per day"],
            ["Email", "Spring Mail against Mailpit in Docker"],
            ["Audit", "Append-only audit table written in the same transaction"],
          ],
        },
        {
          type: "paragraph",
          text: "**Effort:** 3 to 4 weekends. Auth alone is a weekend if I go slowly and test it properly, which I should.",
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Picture the neighbourhood library with a card for every member. The librarian adds books to the shelves, issues them, and stamps a return date on the slip. A member can see only their own borrowing history, not their neighbour's. If a book is late, the library sends a reminder. This API is that library: members sign up and log in, browse the catalogue, borrow and return copies within the rules, and get overdue emails. Librarians manage the catalogue and see everyone's loans. Admins manage staff accounts. Every important action is written to an audit log so we can always answer \"who did this?\".",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a visitor, I want to register with email and password, so that I can become a member.",
            "As a member, I want to log in and stay logged in on my phone for a couple of weeks, so that I don't type my password every day.",
            "As a member, I want to search books by title, author or ISBN and see if a copy is available.",
            "As a member, I want to borrow up to 5 books, each due in 14 days, and renew a book once if nobody has reserved it.",
            "As a member, I want to see my own loans and due dates, and nobody else's.",
            "As a member, I want an email two days before a due date and on each day a book is overdue.",
            "As a librarian, I want to add books and copies, issue and return books for members at the desk, and see all overdue loans.",
            "As an admin, I want to promote a member to librarian and see an audit trail of sensitive actions.",
            "As a user, I want to log out from all devices if I think my account is compromised.",
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
            ["FR-01", "Register with email (unique, case-insensitive) and password (min 10 chars). Passwords stored as BCrypt hashes.", "Must"],
            ["FR-02", "Login returns a 15-minute access JWT and a 14-day opaque refresh token.", "Must"],
            ["FR-03", "Refresh rotates: each refresh token works once and returns a new pair.", "Must"],
            ["FR-04", "Reuse of an already-used refresh token revokes that whole token family (all devices from that login).", "Must"],
            ["FR-05", "Logout revokes the current refresh family; \"logout everywhere\" revokes all of a user's families.", "Must"],
            ["FR-06", "Roles MEMBER, LIBRARIAN, ADMIN, enforced with `@PreAuthorize` on service methods.", "Must"],
            ["FR-07", "Members can read and act only on their own loans; other users' loan ids return 404.", "Must"],
            ["FR-08", "Catalogue: librarians manage books (title, author, ISBN) and physical copies; anyone logged in can search.", "Must"],
            ["FR-09", "Borrow rules: max 5 active loans, no new loans while anything is overdue, due date = today + 14 days.", "Must"],
            ["FR-10", "Renew once, +14 days from the current due date, only if not overdue.", "Must"],
            ["FR-11", "Return a copy; overdue returns record a fine of a fixed amount per late day.", "Should"],
            ["FR-12", "Daily job emails reminders (due in 2 days, overdue), at most one email per loan per day.", "Must"],
            ["FR-13", "Audit log for login, failed login, refresh-reuse, role change, borrow, return, renew.", "Must"],
            ["FR-14", "Lock login for 15 minutes after 5 failed attempts.", "Should"],
            ["FR-15", "Reservations (hold queue) for books with no free copy.", "Could"],
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
            ["NFR-01", "No endpoint except register/login/refresh is reachable without a valid token", "Integration test that calls every mapped route anonymously and expects 401"],
            ["NFR-02", "Every role restriction has a test for allowed and denied", "Test matrix: route × role"],
            ["NFR-03", "Passwords and refresh tokens never appear in logs or DB in plain text", "Grep logs after a test run; DB stores only hashes"],
            ["NFR-04", "BCrypt cost tuned so one hash takes roughly 100–300 ms on my laptop", "Small timing test, cost noted in README"],
            ["NFR-05", "Two concurrent borrows of the last free copy give exactly one loan", "Concurrency test with two threads"],
            ["NFR-06", "Reminder job is idempotent: running it twice in a day sends no duplicates", "Integration test runs the job twice, Mailpit API shows one email"],
            ["NFR-07", "Login p95 under 400 ms at 10 concurrent users (BCrypt dominates)", "k6, 30 s"],
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
            ["users", "`id`, `email`, `password_hash`, `role`, `failed_logins`, `locked_until`, `created_at`", "Unique on `lower(email)`"],
            ["refresh_tokens", "`id`, `user_id FK`, `family_id UUID`, `token_hash CHAR(64)`, `expires_at`, `used_at`, `revoked_at`", "Store SHA-256 of the token, never the token"],
            ["books", "`id`, `isbn` unique, `title`, `author`, `published_year`", "Index for title/author search"],
            ["book_copies", "`id`, `book_id FK`, `barcode` unique, `status` (AVAILABLE, ON_LOAN, LOST)", ""],
            ["loans", "`id`, `copy_id FK`, `member_id FK`, `borrowed_on`, `due_on`, `returned_on NULL`, `renewals`, `fine_amount`, `last_reminder_on`", "Partial unique index: one open loan per copy"],
            ["audit_log", "`id`, `actor_id NULL`, `action`, `target_type`, `target_id`, `details JSONB`, `ip`, `created_at`", "Insert-only"],
          ],
        },
        {
          type: "diagram",
          text: `+-------------+ 1     * +----------------+
|   users     |---------| refresh_tokens |
|-------------|         |----------------|
| id      PK  |         | family_id      |
| email       |         | token_hash     |
| password_.. |         | used_at        |
| role        |         | revoked_at     |
+------+------+         +----------------+
       | 1
       |            +-------------+ 1     * +--------------+
       | *          |   books     |---------| book_copies  |
+------+------+     |-------------|         |--------------|
|   loans     |     | id      PK  |         | id       PK  |
|-------------| *   | isbn        |         | book_id  FK  |
| member_id   |-----+-------------+    1    | barcode      |
| copy_id  FK |-----------------------------| status       |
| due_on      |                             +--------------+
| returned_on |
+-------------+            audit_log (actor_id -> users, insert-only)`,
          caption: "A book is the title; a copy is the physical item on the shelf. Loans point at copies.",
        },
        {
          type: "code",
          language: "sql",
          title: "One open loan per copy, enforced by the database",
          code: `CREATE UNIQUE INDEX ux_loans_open_copy
    ON loans (copy_id)
    WHERE returned_on IS NULL;`,
        },
      ],
    },
    {
      title: "API Design",
      blocks: [
        {
          type: "table",
          headers: ["Method", "Path", "Purpose", "Who", "Success", "Failure"],
          rows: [
            ["POST", "/api/v1/auth/register", "Create member account", "Anyone", "201", "400, 409"],
            ["POST", "/api/v1/auth/login", "Get token pair", "Anyone", "200", "401, 423 (locked)"],
            ["POST", "/api/v1/auth/refresh", "Rotate refresh token", "Anyone with a refresh token", "200", "401"],
            ["POST", "/api/v1/auth/logout", "Revoke current family", "Logged in", "204", "401"],
            ["POST", "/api/v1/auth/logout-all", "Revoke all families", "Logged in", "204", "401"],
            ["GET", "/api/v1/books?q=", "Search catalogue", "Any role", "200", "401"],
            ["POST", "/api/v1/books", "Add a book", "LIBRARIAN", "201", "400, 403, 409"],
            ["POST", "/api/v1/books/{id}/copies", "Add a copy", "LIBRARIAN", "201", "403, 404"],
            ["POST", "/api/v1/loans", "Borrow a copy (member for self, librarian for anyone)", "MEMBER, LIBRARIAN", "201", "403, 404, 409, 422"],
            ["GET", "/api/v1/me/loans", "My loans", "MEMBER", "200", "401"],
            ["GET", "/api/v1/loans/{id}", "One loan", "Owner or LIBRARIAN", "200", "404"],
            ["POST", "/api/v1/loans/{id}/renew", "Renew", "Owner", "200", "404, 422"],
            ["POST", "/api/v1/loans/{id}/return", "Return", "LIBRARIAN", "200", "403, 404, 409"],
            ["GET", "/api/v1/loans?status=OVERDUE", "All overdue", "LIBRARIAN", "200", "403"],
            ["PUT", "/api/v1/users/{id}/role", "Change role", "ADMIN", "200", "403, 404"],
            ["GET", "/api/v1/audit?actorId=&action=", "Audit log", "ADMIN", "200", "403"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/auth/login → 200",
          code: `{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMiIsInJvbGVzIjpbIk1FTUJFUiJdLCJleHAiOjE3OTk5OTk5OTl9.c2lnbmF0dXJl",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "q7Jx1v0yB3nS9aW2kE5tR8mZ4cH6pL0uD1fG3jK7sA"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "POST /api/v1/loans with 5 books already out → 422",
          code: `{
  "type": "https://example.com/problems/loan-limit",
  "title": "Loan limit reached",
  "status": 422,
  "detail": "You already have 5 books on loan. Return one to borrow another.",
  "activeLoans": 5,
  "limit": 5
}`,
        },
        {
          type: "paragraph",
          text: "401 means \"I don't know who you are\", 403 means \"I know who you are and you're not allowed\". For someone else's loan I return 404, not 403, so the API doesn't even confirm that loan id exists.",
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "diagram",
          text: `Request with "Authorization: Bearer <jwt>"
        |
        v
+----------------------------------------------------+
| Spring Security filter chain                       |
|  BearerTokenAuthenticationFilter                   |
|   -> JwtDecoder (HS256 key)  -> verify sig + exp   |
|   -> JwtAuthenticationConverter: roles -> ROLE_*   |
|  AuthorizationFilter: /auth/** permitAll, rest auth|
+---------------------------+------------------------+
                            v
+----------------------------------------------------+
| Controllers (auth, books, loans, users, audit)     |
+---------------------------+------------------------+
                            v
+----------------------------------------------------+
| Services with @PreAuthorize                        |
|  AuthService: BCrypt, issue JWT, rotate refresh    |
|  LoanService: rules, ownership, Clock              |
|  AuditService: insert in same transaction          |
+-------------+-------------------------+------------+
              v                         v
        PostgreSQL               ReminderJob (@Scheduled 08:00)
                                   -> JavaMailSender -> Mailpit`,
        },
        {
          type: "paragraph",
          text: "I use Spring's OAuth2 resource server support only to validate JWTs; my own `AuthService` issues them. That way I don't hand-write a JWT filter (where most security bugs live) but I still understand the whole flow: who signs, who verifies, what's in the claims.",
        },
        {
          type: "code",
          language: "java",
          title: "SecurityConfig.java",
          code: `@Configuration
@EnableMethodSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login",
                                "/api/v1/auth/refresh").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("\${app.jwt.secret}") String secret) {
        SecretKey key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(key).build();
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("roles");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}`,
        },
        {
          type: "paragraph",
          text: "CSRF is off because the API is stateless and reads the token from the `Authorization` header, not a cookie. If I ever move the refresh token into a cookie, CSRF protection has to come back for that endpoint. The HMAC secret must be at least 256 bits and comes from an environment variable, never from the repo.",
        },
        {
          type: "code",
          language: "java",
          title: "Refresh rotation with reuse detection (AuthService)",
          code: `@Transactional(noRollbackFor = InvalidTokenException.class)
public TokenPair refresh(String rawRefreshToken) {
    String hash = sha256Hex(rawRefreshToken);
    RefreshToken token = refreshTokens.findByTokenHash(hash)
            .orElseThrow(InvalidTokenException::new);

    if (token.getUsedAt() != null || token.getRevokedAt() != null) {
        // A used token came back: someone has a stolen copy. Kill the whole family.
        refreshTokens.revokeFamily(token.getFamilyId(), clock.instant());
        audit.record(token.getUserId(), "REFRESH_TOKEN_REUSE", "user", token.getUserId());
        throw new InvalidTokenException();
    }
    if (token.getExpiresAt().isBefore(clock.instant())) {
        throw new InvalidTokenException();
    }

    // Conditional update so two parallel refreshes can't both succeed.
    int updated = refreshTokens.markUsed(token.getId(), clock.instant());
    if (updated == 0) {
        throw new InvalidTokenException();
    }
    return issuePair(token.getUserId(), token.getFamilyId());
}`,
        },
        {
          type: "paragraph",
          text: "`markUsed` is `UPDATE refresh_tokens SET used_at = :now WHERE id = :id AND used_at IS NULL`. The family revoke must survive even though I throw right after it, which is why `InvalidTokenException` is excluded from rollback. Without `noRollbackFor`, the exception would roll back the revoke and the attacker's token family would live on. That detail is easy to miss and worth its own test.",
        },
        {
          type: "code",
          language: "java",
          title: "Ownership and due dates (LoanService)",
          code: `@PreAuthorize("hasAnyRole('MEMBER', 'LIBRARIAN')")
@Transactional(readOnly = true)
public LoanView getLoan(long loanId, AuthUser user) {
    Optional<Loan> loan = user.isLibrarian()
            ? loans.findById(loanId)
            : loans.findByIdAndMemberId(loanId, user.id());
    return loan.map(LoanView::from)
            .orElseThrow(() -> new NotFoundException("Loan " + loanId + " not found"));
}

static final Period LOAN_PERIOD = Period.ofDays(14);

LocalDate dueDateFor(LocalDate borrowedOn) {
    return borrowedOn.plus(LOAN_PERIOD);
}

long daysOverdue(Loan loan, LocalDate today) {
    LocalDate end = loan.getReturnedOn() != null ? loan.getReturnedOn() : today;
    return Math.max(0, ChronoUnit.DAYS.between(loan.getDueOn(), end));
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
            ["Java 21 + Spring Boot 3.x", "Same base as before"],
            ["Spring Security 6 + `spring-boot-starter-oauth2-resource-server`", "Battle-tested JWT validation and method security"],
            ["Nimbus JOSE + JWT (comes with the starter)", "Signing tokens in `AuthService` via `NimbusJwtEncoder`"],
            ["BCrypt (`BCryptPasswordEncoder`)", "Slow, salted password hashing; cost factor is tunable"],
            ["PostgreSQL 16 + Flyway", "Partial unique index for open loans, JSONB for audit details"],
            ["Spring Mail + Mailpit", "Real SMTP in dev; Mailpit catches every email and has a web UI and API for tests"],
            ["`@Scheduled` + `Clock`", "Daily reminder job; `Clock` makes dates testable"],
            ["Testcontainers, `spring-security-test`", "Real DB in tests; `jwt()` request post-processor to fake tokens in web tests"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Short JWT access token + opaque rotating refresh token",
        },
        {
          type: "paragraph",
          text: "Like a cinema wristband that's only valid for today's show, plus a membership card kept at home. The access JWT is checked without a DB call, so it's fast, but it can't be revoked, so it lives 15 minutes. The refresh token is a random string stored as a hash in the DB, so I can revoke it. Trade-off: a stolen access token works until it expires; I accept 15 minutes of exposure for no DB lookup per request.",
        },
        {
          type: "heading",
          text: "ADR-2: Rotation with family-wide revocation on reuse",
        },
        {
          type: "paragraph",
          text: "If a used refresh token shows up again, either the attacker or the real user is replaying it, and I can't tell which. Revoking the whole family logs out both, and the real user just logs in again. Trade-off: a flaky mobile network that retries a refresh can log a user out. A short grace window is a possible fix, but I'd rather start strict.",
        },
        {
          type: "heading",
          text: "ADR-3: Return 404 for other people's resources",
        },
        {
          type: "paragraph",
          text: "IDOR (insecure direct object reference) is changing `/loans/41` to `/loans/42` and seeing someone else's data. I scope the query itself (`findByIdAndMemberId`) so the wrong row can't even be loaded. Returning 404 instead of 403 also avoids confirming the id exists. Trade-off: debugging is slightly harder because \"not found\" can mean \"not yours\".",
        },
        {
          type: "heading",
          text: "ADR-4: Inject a Clock everywhere dates matter",
        },
        {
          type: "paragraph",
          text: "Due dates, overdue checks and the reminder job all call `LocalDate.now(clock)`. Tests use `Clock.fixed(...)`, so \"14 days later\" is tested without waiting 14 days or breaking at midnight. Trade-off: one more constructor argument in a few services.",
        },
        {
          type: "heading",
          text: "ADR-5: Audit log in the same transaction",
        },
        {
          type: "paragraph",
          text: "If the borrow commits, the audit row commits; if it rolls back, there's no misleading audit row. Trade-off: audit writes add a little latency to each action, and the failed-login and token-reuse events must not be rolled back with the failure, so they use `noRollbackFor` or a separate `REQUIRES_NEW` transaction.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Login with an unknown email must take about as long as a wrong password (run BCrypt against a dummy hash) so attackers can't detect which emails exist.",
            "Same error message for unknown email and wrong password: \"Invalid email or password\".",
            "Two parallel refresh calls with the same token → only one succeeds thanks to the conditional update.",
            "JWT with `alg: none` or signed with another key → 401 (the decoder only accepts my HS256 key).",
            "Role changed by an admin → takes effect at the next refresh, at most 15 minutes later. Documented, and \"logout everywhere\" forces it.",
            "Member tries `POST /loans` with someone else's `memberId` → the member id is taken from the token for MEMBER, the body field is ignored.",
            "Two members borrow the last free copy at the same moment → the partial unique index and a conditional update on `book_copies.status` allow one.",
            "Due date falls on a day the library is closed → stretch goal; for now documented as \"calendar days\".",
            "Renewing an overdue book or renewing twice → 422 with the reason.",
            "Returning an already returned loan → 409.",
            "Reminder job runs twice (restart, or two instances) → `last_reminder_on = today` check makes it a no-op.",
            "Mail server down during the job → log, leave `last_reminder_on` unchanged, retry tomorrow; one failure doesn't stop the batch.",
            "Timezones: due dates are `LocalDate` in the library's zone, configured once, and the cron uses the same zone.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "ReminderJob.java",
          code: `@Component
class ReminderJob {

    private static final Logger log = LoggerFactory.getLogger(ReminderJob.class);

    private final LoanRepository loans;
    private final ReminderMailer mailer;
    private final Clock clock;

    ReminderJob(LoanRepository loans, ReminderMailer mailer, Clock clock) {
        this.loans = loans;
        this.mailer = mailer;
        this.clock = clock;
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "\${app.library.zone}")
    void sendReminders() {
        LocalDate today = LocalDate.now(clock);
        for (Loan loan : loans.findOpenLoansNeedingReminder(today, today.plusDays(2))) {
            try {
                mailer.send(loan, today);
                loans.markReminded(loan.getId(), today);
            } catch (MailException e) {
                log.warn("Reminder failed for loan {}", loan.getId(), e);
            }
        }
    }
}`,
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
            "**Users and BCrypt.** Register endpoint, `users` table, `PasswordEncoder`. Demo: register, and show the DB has a `$2a$12$...` hash. Tests: duplicate email 409, weak password 400, hash ≠ password.",
            "**Login and access tokens.** `NimbusJwtEncoder` issues tokens with `sub` and `roles`; resource server validates them. Demo: call `/api/v1/me/loans` with and without the token. Tests: 401 anonymous, 401 expired token, 401 wrong signature.",
            "**Refresh rotation.** Hashed refresh tokens, families, reuse detection, logout and logout-all. Demo: refresh twice with the same token and watch the second fail and the family die. Tests: rotation, reuse revokes family, parallel refresh gives one winner.",
            "**Roles and catalogue.** `@PreAuthorize` on services, books and copies CRUD, search. Demo: member gets 403 adding a book, librarian succeeds. Tests: the route × role matrix with `spring-security-test`.",
            "**Loans and rules.** Borrow, renew, return, ownership scoping, `Clock`. Demo: borrow 5, fail on the 6th, try to read another member's loan and get 404. Tests: every rule with a fixed clock, IDOR test, last-copy concurrency test.",
            "**Reminders, audit, lockout.** Scheduled job, Mailpit, audit log, failed-login lockout. Demo: move the clock forward, run the job, open Mailpit UI at localhost:8025 and see the email. Tests: job idempotent, audit rows written, lockout after 5 failures.",
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
            "**Unit:** due date and overdue math with `Clock.fixed`, fine calculation, loan rule checks, refresh rotation logic with mocked repository.",
            "**Web/security slice:** `@WebMvcTest` with `jwt().authorities(...)` for each role; one test per protected route for allowed and denied; anonymous gets 401.",
            "**Integration (Testcontainers + Mailpit container):** full login → refresh → reuse flow against PostgreSQL; reminder job sends exactly one email (checked through Mailpit's HTTP API); audit rows exist.",
            "**Concurrency:** two threads borrowing the last copy; two threads refreshing the same token.",
            "**Load (k6):** login at 10 users to see BCrypt cost; authenticated `GET /books` at 50 users to show JWT validation is cheap.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "Ownership test with spring-security-test",
          code: `@Test
void memberCannotReadAnotherMembersLoan() throws Exception {
    long othersLoanId = fixtures.loanFor(otherMember).getId();

    mockMvc.perform(get("/api/v1/loans/{id}", othersLoanId)
                    .with(jwt().jwt(j -> j.subject(String.valueOf(member.getId())))
                            .authorities(new SimpleGrantedAuthority("ROLE_MEMBER"))))
            .andExpect(status().isNotFound());
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
            "Reservations queue: when a reserved book is returned, hold it for the first person in line for 48 hours.",
            "Switch to RS256 with a public JWKS endpoint so another service can verify tokens without the secret.",
            "Refresh token in an `HttpOnly`, `SameSite=Strict` cookie, with CSRF protection on the refresh endpoint.",
            "Fine-grained permissions (`books:write`, `loans:return`) instead of just roles.",
            "Library holiday calendar so due dates skip closed days.",
            "Email via a queue so the job only enqueues and a worker sends with retries.",
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
              question: "Walk me through how a request with a JWT is authenticated in your app.",
              answer:
                "The `BearerTokenAuthenticationFilter` in the security filter chain reads the `Authorization` header and passes the token to the `JwtDecoder`, which checks the signature with my HMAC key and checks `exp`.\n\nThen my `JwtAuthenticationConverter` turns the `roles` claim into `ROLE_` authorities, and the result is stored in the `SecurityContext`. After that, URL rules and `@PreAuthorize` checks read from that context.",
            },
            {
              question: "Why both an access token and a refresh token?",
              answer:
                "The access token is a JWT that can be verified without a database call, which is fast but means I can't revoke it. So it's short-lived, 15 minutes.\n\nThe refresh token is long-lived but stored (as a hash) in the database, so I can revoke it. Short access plus revocable refresh gives speed on every request and control over sessions.",
            },
            {
              question: "What is refresh token rotation and what does reuse detection protect against?",
              answer:
                "Every refresh token works once. Using it returns a new access token and a new refresh token, and marks the old one used.\n\nIf a used token is presented again, someone has a copy they shouldn't, maybe stolen from a device. I can't tell the attacker from the real user, so I revoke the whole family of tokens from that login. Both are logged out, and the real user just logs in again.",
            },
            {
              question: "Why BCrypt, and why not SHA-256 for passwords?",
              answer:
                "SHA-256 is designed to be fast, which helps attackers try billions of guesses per second. BCrypt is deliberately slow, salted per password, and has a cost factor I can raise as hardware gets faster.\n\nI do use SHA-256 for refresh tokens, because those are long random strings, not human-chosen passwords, so brute force isn't realistic.",
            },
            {
              question: "What's IDOR and how did you prevent it?",
              answer:
                "Insecure direct object reference: changing an id in the URL and getting someone else's data because the code only checked that you're logged in.\n\nI scope the query: members fetch with `findByIdAndMemberId(id, currentUserId)`, so another member's loan can't be loaded at all and returns 404. The member id for borrowing also comes from the token, never from the request body. I have tests that try exactly this.",
            },
            {
              question: "URL rules vs @PreAuthorize: where do you put authorization?",
              answer:
                "URL rules in the filter chain are coarse: public auth endpoints versus everything else. Role checks go on service methods with `@PreAuthorize`, so they still apply if a second controller or a job calls the same service.\n\nOwnership checks that depend on data live in the service and the query itself.",
            },
            {
              question: "Why did you disable CSRF? Isn't that insecure?",
              answer:
                "CSRF attacks work because browsers attach cookies automatically. My API authenticates with a bearer token in the `Authorization` header, which the browser never sends on its own, so a forged cross-site request has no credentials.\n\nIf I moved tokens into cookies, I'd have to turn CSRF protection back on.",
            },
            {
              question: "How do you test date logic like overdue loans?",
              answer:
                "Every service takes a `java.time.Clock`. Production uses the system clock in the library's zone; tests use `Clock.fixed` at a chosen instant. So I can create a loan \"today\", build a service with a clock 16 days later, and assert it's 2 days overdue, with no sleeping and no midnight flakiness.",
            },
            {
              question: "How do you make sure the reminder job doesn't spam people?",
              answer:
                "Each loan stores `last_reminder_on`. The job's query skips loans already reminded today, and it updates that column right after a successful send. Running the job twice, or on two instances, sends nothing extra.\n\nWith two instances there's still a small race, so for multiple instances I'd add ShedLock or a `SELECT ... FOR UPDATE SKIP LOCKED` claim.",
            },
            {
              question: "What happens when an admin demotes a librarian who's already logged in?",
              answer:
                "Their current access token still says LIBRARIAN until it expires, at most 15 minutes. At the next refresh, the new token carries the new role. If that window is too long, the admin can revoke all their refresh tokens, or I'd shorten the access token lifetime. It's a conscious trade-off of stateless JWTs.",
            },
            {
              question: "How do you stop someone discovering which emails are registered?",
              answer:
                "Login returns the same message for unknown email and wrong password, and for an unknown email I still run BCrypt against a dummy hash so the response time is similar. Registration still has to say the email is taken, so I'd rate limit it.",
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
            "Secured a Spring Boot library API with Spring Security 6: stateless JWT access tokens, rotating hashed refresh tokens with reuse detection, BCrypt, and role-based `@PreAuthorize` rules covered by a route × role test matrix.",
            "Prevented IDOR by scoping data access to the token's user and returning 404 for foreign resources, verified with dedicated security tests.",
            "Implemented loan rules with `java.time` and an injectable `Clock`, plus an idempotent `@Scheduled` overdue-reminder job sending email through SMTP (tested end to end with Mailpit).",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Be precise about security claims",
          text: "Only claim what's in the repo and tested. \"Implemented refresh token rotation with reuse detection\" is something I must be able to demo live. If I quote a number (like BCrypt cost or login p95), it's the one I measured, with the machine named.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "Projects 1 and 2 finished",
            "Java → Date and Time API (`LocalDate`, `Period`, `ChronoUnit`, `ZoneId`, `Clock`)",
            "Java → Optional and Lambda Expressions (security config is all lambdas)",
            "Spring Boot: filter chain basics, `@Scheduled`, profiles and secrets in environment variables",
            "Interview Questions → REST API Security (JWT structure, 401 vs 403, CSRF, CORS)",
            "Interview Questions → Spring Boot (method security, proxies, why `@PreAuthorize` needs a Spring bean call)",
            "PostgreSQL: partial unique indexes, conditional updates",
            "System Design → Transactions and Locking (for the last-copy race)",
          ],
        },
      ],
    },
  ],
};
