import type { Lesson } from "../types";

export const realtimeChat: Lesson = {
  slug: "realtime-chat",
  date: "2026-10-29",
  title: "Project 7: Real-Time Chat with WebSockets",
  description:
    "A PRD for a chat backend that works across several app instances: Spring WebSocket with STOMP, JWT checked on CONNECT, rooms and direct messages saved in PostgreSQL, Redis pub/sub fan-out, presence with TTL, read receipts and per-user rate limits.",
  difficulty: "Medium",
  tags: ["Backend Project", "PRD", "Java", "Spring Boot", "WebSocket", "STOMP", "Redis", "PostgreSQL"],
  sections: [
    {
      title: "Why Build This",
      blocks: [
        {
          type: "paragraph",
          text: "Every project before this one is request and response: the client asks, the server answers, the connection is gone. Chat is different. The server has to push a message to someone who didn't ask for anything, and that person may be connected to a different server than the sender. That one problem, \"how does instance A reach a socket held by instance B\", is what this project is really about.",
        },
        {
          type: "list",
          items: [
            "**What it proves to an interviewer:** I understand long-lived connections, stateful servers, and how to scale them horizontally without losing messages.",
            "**Job skills it covers:** Spring WebSocket and STOMP, Spring Security on a non-HTTP protocol, Redis (pub/sub, TTL keys, counters), PostgreSQL schema and keyset pagination, message ordering and deduplication, and running two app instances behind a load balancer locally.",
            "**Honest effort:** 3 to 4 weekends. One for a single-instance chat, one for persistence, history and receipts, one for multi-instance fan-out and presence, and one for rate limiting, tests and a load test.",
          ],
        },
      ],
    },
    {
      title: "The Product in One Paragraph",
      blocks: [
        {
          type: "paragraph",
          text: "Picture a family WhatsApp group. Someone posts a photo, and everyone's phone shows it within a second, a green dot shows who's online, and the double blue tick shows who has read it. If I'm offline and come back, the messages I missed are waiting, in the right order. My backend does that for text messages: users join rooms or start direct chats, messages are delivered live over a WebSocket and saved in PostgreSQL, and the system keeps working when I run two or three copies of the app behind a load balancer.",
        },
      ],
    },
    {
      title: "Users and User Stories",
      blocks: [
        {
          type: "list",
          items: [
            "As a **user**, I want to log in and open a live connection, so that I receive messages as they're sent.",
            "As a **user**, I want to create a room and invite people, so that a group can talk together.",
            "As a **user**, I want to start a direct chat with one person, so that we can talk privately.",
            "As a **user**, I want messages I send to appear for everyone in the room within a second, even if they're on a different server.",
            "As a **user**, I want to scroll up and load older messages, so that I can read the history.",
            "As a **user**, I want to see who's online, so that I know if someone will reply soon.",
            "As a **user**, I want to see who has read my message, so that I don't have to ask.",
            "As a **user**, I want my message sent once even if my app resends it after a flaky network.",
            "As an **operator**, I want a spammer limited automatically, so that one account can't flood a room.",
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
            ["FR-01", "Users register and log in over REST and receive a JWT", "Must"],
            ["FR-02", "The WebSocket CONNECT frame must carry a valid JWT; otherwise the connection is refused", "Must"],
            ["FR-03", "A user can create a room, add and remove members, and leave a room", "Must"],
            ["FR-04", "A user can open a direct chat with another user; the same pair always gets the same chat", "Must"],
            ["FR-05", "Only members can send to or subscribe to a room", "Must"],
            ["FR-06", "Every message is saved in PostgreSQL before it's broadcast", "Must"],
            ["FR-07", "Messages are delivered to members connected to any app instance", "Must"],
            ["FR-08", "A client-generated `clientMessageId` makes resends idempotent", "Must"],
            ["FR-09", "History is paged newest first with a cursor", "Must"],
            ["FR-10", "Presence: a user is online while their heartbeat is fresh; offline after a TTL", "Should"],
            ["FR-11", "Read receipts: a member can mark messages read up to a message ID; others see it live", "Should"],
            ["FR-12", "Per-user rate limit on sending; excess messages get an error frame", "Should"],
            ["FR-13", "Unread count per room on the room list", "Should"],
            ["FR-14", "Typing indicator (not saved, best effort)", "Could"],
            ["FR-15", "Edit and delete own message, shown as edited or deleted to others", "Could"],
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
            ["NFR-01", "Concurrent connections", "2 app instances hold 2,000 open WebSocket connections in total on a laptop without errors (k6 WebSocket script)"],
            ["NFR-02", "Delivery latency across instances", "p95 under 150 ms from send to receive when sender and receiver are on different instances, at 50 messages per second (k6, timestamp in the message)"],
            ["NFR-03", "No lost messages", "In a 10-minute run, every message the server acknowledged is in the database and in every member's received set (test harness counts)"],
            ["NFR-04", "No duplicates on resend", "Sending the same `clientMessageId` 5 times stores one row and delivers one message (integration test)"],
            ["NFR-05", "Ordering", "Within a room, every client sees messages in ascending message ID (integration test)"],
            ["NFR-06", "History speed", "p95 under 30 ms for a page of 50, with 1,000,000 messages in one room (k6 plus `EXPLAIN ANALYZE`)"],
            ["NFR-07", "Presence accuracy", "A killed client shows offline within 60 seconds (integration test with a short TTL)"],
            ["NFR-08", "Rate limit", "With a limit of 20 messages per 5-second window, a client sending 100 messages in a burst gets at most 20 accepted in that window (integration test with a fixed clock)"],
          ],
        },
      ],
    },
    {
      title: "Data Model",
      blocks: [
        {
          type: "diagram",
          text: `┌─────────────┐ 1   n ┌──────────────────────┐ n   1 ┌──────────────────┐
│ users       ├───────┤ room_members         ├───────┤ rooms            │
│ id (PK)     │       │ room_id (PK, FK)     │       │ id (PK)          │
│ username    │       │ user_id (PK, FK)     │       │ type GROUP|DIRECT│
│ pass_hash   │       │ role OWNER|MEMBER    │       │ name             │
└──────┬──────┘       │ last_read_message_id │       │ direct_key UNIQUE│
       │ 1            │ joined_at            │       │ created_at       │
       │              └──────────────────────┘       └────────┬─────────┘
       │ n                                                    │ 1
┌──────┴──────────────────────────────┐                       │
│ messages                            │ n                     │
│ id (PK, BIGSERIAL)                  ├───────────────────────┘
│ room_id (FK)                        │
│ sender_id (FK)                      │
│ client_message_id  UNIQUE w/ sender │
│ body, created_at, edited_at         │
└─────────────────────────────────────┘

Redis (not durable, rebuilt from heartbeats)
  presence:{userId}     "1"  EX 60
  rate:{userId}:{epochSecond / 5}  counter  EX 10
  channel chat.room.{roomId}   pub/sub fan-out`,
        },
        {
          type: "code",
          language: "sql",
          title: "V1__chat.sql (messages and receipts)",
          code: `CREATE TABLE rooms (
    id         BIGSERIAL PRIMARY KEY,
    type       VARCHAR(10) NOT NULL CHECK (type IN ('GROUP', 'DIRECT')),
    name       VARCHAR(100),
    direct_key VARCHAR(80) UNIQUE,   -- "smallerUserId:largerUserId" for DIRECT rooms
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_members (
    room_id              BIGINT NOT NULL REFERENCES rooms (id),
    user_id              BIGINT NOT NULL REFERENCES users (id),
    role                 VARCHAR(10) NOT NULL DEFAULT 'MEMBER',
    last_read_message_id BIGINT,
    joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE messages (
    id                BIGSERIAL PRIMARY KEY,
    room_id           BIGINT NOT NULL REFERENCES rooms (id),
    sender_id         BIGINT NOT NULL REFERENCES users (id),
    client_message_id UUID   NOT NULL,
    body              VARCHAR(4000) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at         TIMESTAMPTZ,
    UNIQUE (sender_id, client_message_id)
);

CREATE INDEX messages_by_room ON messages (room_id, id DESC);`,
        },
        {
          type: "paragraph",
          text: "The `direct_key` trick means a direct chat between user 7 and user 3 is always the row with key `3:7`, whoever starts it. The unique constraint stops two rooms being created for the same pair when both people tap \"message\" at the same moment.",
        },
      ],
    },
    {
      title: "API Design",
      blocks: [
        {
          type: "paragraph",
          text: "There are two surfaces. REST for things that are fine to ask for (login, rooms, history), and STOMP over WebSocket for things that are pushed (new messages, presence, receipts).",
        },
        {
          type: "table",
          headers: ["Method", "Path / destination", "Purpose", "Success / failure"],
          rows: [
            ["POST", "/api/v1/auth/login", "Get a JWT", "200 / 401"],
            ["POST", "/api/v1/rooms", "Create a group room", "201 / 400"],
            ["POST", "/api/v1/rooms/{id}/members", "Add a member (owner only)", "201 / 403, 404, 409 already member"],
            ["DELETE", "/api/v1/rooms/{id}/members/{userId}", "Remove a member or leave", "204 / 403, 404"],
            ["POST", "/api/v1/direct-chats", "Get or create the direct room with a user", "200 existing, 201 new / 404 user"],
            ["GET", "/api/v1/rooms", "My rooms with unread counts", "200 / 401"],
            ["GET", "/api/v1/rooms/{id}/messages?before=&limit=", "History page, newest first", "200 / 400, 403"],
            ["GET", "/api/v1/rooms/{id}/presence", "Which members are online", "200 / 403"],
            ["WS", "/ws (STOMP CONNECT with Authorization header)", "Open the live connection", "CONNECTED / ERROR frame"],
            ["SEND", "/app/rooms/{id}/messages", "Send a message", "Broadcast on the room topic / ERROR to `/user/queue/errors`"],
            ["SEND", "/app/rooms/{id}/read", "Mark read up to a message ID", "Receipt broadcast on the room topic"],
            ["SUBSCRIBE", "/topic/rooms/{id}", "Receive messages and receipts for a room", "Membership checked on SUBSCRIBE"],
            ["SUBSCRIBE", "/user/queue/errors", "Errors meant only for me", "-"],
          ],
        },
        {
          type: "code",
          language: "json",
          title: "Client SEND to /app/rooms/42/messages",
          code: `{
  "clientMessageId": "0b5f7c9e-3a41-4d2e-9d67-2c1e5b8f4a10",
  "body": "Reached the station, where are you?"
}`,
        },
        {
          type: "code",
          language: "json",
          title: "What every member receives on /topic/rooms/42",
          code: `{
  "type": "MESSAGE",
  "id": 918273,
  "roomId": 42,
  "senderId": 7,
  "clientMessageId": "0b5f7c9e-3a41-4d2e-9d67-2c1e5b8f4a10",
  "body": "Reached the station, where are you?",
  "createdAt": "2026-10-29T18:02:11.204Z"
}`,
        },
        {
          type: "paragraph",
          text: "The sender also gets this broadcast. The client matches it by `clientMessageId` and turns its grey \"sending\" bubble into a sent one with the server `id`. That's the acknowledgement.",
        },
      ],
    },
    {
      title: "Architecture",
      blocks: [
        {
          type: "paragraph",
          text: "Think of two post offices in the same town. Asha drops a letter at office A, but Ravi collects his mail at office B. Office A can't hand it to Ravi directly. It needs a van that goes between offices. Redis pub/sub is that van. Each app instance keeps its own sockets in memory (Spring's simple broker), and every instance subscribes to Redis. When a message is saved, the instance that received it publishes it to Redis, and every instance, including itself, pushes it to its own local subscribers.",
        },
        {
          type: "diagram",
          text: `  Asha's app                         Ravi's app
      │ WebSocket                          │ WebSocket
      ▼                                    ▼
┌───────────────┐   nginx (round robin) ┌───────────────┐
│ Instance A    │◄─────────────────────►│ Instance B    │
│ STOMP endpoint│                       │ STOMP endpoint│
│ simple broker │                       │ simple broker │
│ (A's sockets) │                       │ (B's sockets) │
└──┬─────────┬──┘                       └──┬─────────┬──┘
   │ 1. save │ 2. PUBLISH                  │         │ 3. message
   │         │    chat.room.42             │         │    arrives
   ▼         ▼                             │         ▼
┌──────────┐ ┌──────────────────────────────────────────┐
│PostgreSQL│ │ Redis: pub/sub, presence keys, rate keys │
└──────────┘ └──────────────────────────────────────────┘
                         4. each instance pushes to its
                            local /topic/rooms/42 subscribers`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Asha's client sends a STOMP frame to `/app/rooms/42/messages`. Instance A checks the rate limit and membership.",
            "A inserts the message. On a duplicate `(sender_id, client_message_id)`, it loads the existing row instead.",
            "After commit, A publishes the JSON to the Redis channel `chat.room.42`.",
            "Both instances receive it from Redis and call `convertAndSend(\"/topic/rooms/42\", json)` on their local broker, which writes it to the sockets they hold.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "WebSocketConfig.java",
          code: `@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtInterceptor;

    public WebSocketConfig(JwtChannelInterceptor jwtInterceptor) {
        this.jwtInterceptor = jwtInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("http://localhost:*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue"); // local sockets only; Redis links instances
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtInterceptor);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "JwtChannelInterceptor.java (auth on CONNECT)",
          code: `@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;

    public JwtChannelInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new MessagingException("Missing bearer token");
            }
            Jwt jwt = jwtDecoder.decode(header.substring(7)); // throws JwtException if invalid or expired
            accessor.setUser(new UsernamePasswordAuthenticationToken(jwt.getSubject(), null, List.of()));
        }
        return message;
    }
}`,
        },
        {
          type: "paragraph",
          text: "Browsers can't set custom headers on the WebSocket upgrade request, which is why the token goes in the STOMP CONNECT frame instead. The user set on CONNECT sticks to the session, so every later SEND and SUBSCRIBE frame knows who it's from. Membership is checked on SUBSCRIBE in the same interceptor, so nobody can listen to `/topic/rooms/42` just by guessing the number.",
        },
        {
          type: "code",
          language: "java",
          title: "RoomFanout.java (Redis to local sockets)",
          code: `@Component
public class RoomFanout implements MessageListener {

    private static final String PREFIX = "chat.room.";
    private final SimpMessagingTemplate broker;

    public RoomFanout(SimpMessagingTemplate broker) {
        this.broker = broker;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) { // org.springframework.data.redis.connection.Message
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        String roomId = channel.substring(PREFIX.length());
        String json = new String(message.getBody(), StandardCharsets.UTF_8);
        broker.convertAndSend("/topic/rooms/" + roomId, json);
    }

    @Bean
    static RedisMessageListenerContainer fanoutContainer(RedisConnectionFactory factory, RoomFanout fanout) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        container.addMessageListener(fanout, new PatternTopic(PREFIX + "*"));
        return container;
    }
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
            ["Java 21 + Spring Boot 3", "Spring WebSocket and Spring Security are what Java chat backends use"],
            ["STOMP over WebSocket", "Gives me destinations, subscriptions and per-user queues instead of inventing my own frame format"],
            ["Spring Security OAuth2 Resource Server (JwtDecoder)", "One JWT validation path for REST and for CONNECT frames"],
            ["PostgreSQL 16", "Durable messages, a unique constraint for dedup, an index for history"],
            ["Redis 7", "Pub/sub between instances, TTL keys for presence, counters for rate limits"],
            ["nginx", "Two instances behind one URL locally, with WebSocket upgrade headers"],
            ["Flyway", "Versioned schema"],
            ["JUnit 5, Testcontainers (PostgreSQL, Redis)", "Real dependencies in tests, including two app contexts for cross-instance tests"],
            ["k6", "Supports WebSocket scripts, so I can measure connection count and latency"],
          ],
        },
      ],
    },
    {
      title: "Key Design Decisions",
      blocks: [
        {
          type: "heading",
          text: "ADR-1: Save first, then broadcast",
        },
        {
          type: "paragraph",
          text: "**Decision:** the message is committed to PostgreSQL before it's published to Redis. **Trade-off:** a few milliseconds slower than broadcasting first. But if the app crashes after broadcasting and before saving, people would see a message that disappears from history. Saving first means anything anyone saw is in the database.",
        },
        {
          type: "heading",
          text: "ADR-2: Redis pub/sub instead of a RabbitMQ STOMP broker relay",
        },
        {
          type: "paragraph",
          text: "**Decision:** each instance runs the simple broker and Redis pub/sub links them. **Trade-off:** Redis pub/sub is fire-and-forget. If an instance is disconnected from Redis for a second, its users miss live messages. That's acceptable because history is in PostgreSQL and the client refetches after a reconnect. The alternative is `enableStompBrokerRelay` with RabbitMQ's STOMP plugin, where RabbitMQ holds the subscriptions and Spring just forwards frames. That removes my fan-out code but adds a broker to run and tune. I'd build the Redis version first and try the relay as a stretch goal, so I can talk about both.",
        },
        {
          type: "heading",
          text: "ADR-3: Order by a database ID, not by timestamps",
        },
        {
          type: "paragraph",
          text: "**Decision:** message order in a room is the `BIGSERIAL` id. **Trade-off:** ids from a sequence can have gaps and, under concurrent inserts, can commit slightly out of order. Clients sort by id and history is always fetched by id, so what everyone sees after a refresh is the same. Client clocks are never trusted for order; phones are often minutes off.",
        },
        {
          type: "heading",
          text: "ADR-4: Read receipts as a high-water mark",
        },
        {
          type: "paragraph",
          text: "**Decision:** store one `last_read_message_id` per member per room, not a row per message per reader. **Trade-off:** I can't say \"read message 5 but not 4\", which nobody needs. A group of 50 with 10,000 messages is 50 rows instead of up to 500,000. The update only moves forward: `GREATEST(last_read_message_id, :id)`.",
        },
        {
          type: "code",
          language: "sql",
          title: "Mark read (never moves backwards)",
          code: `UPDATE room_members
SET last_read_message_id = GREATEST(last_read_message_id, :messageId)
WHERE room_id = :roomId
  AND user_id = :userId;`,
        },
        {
          type: "heading",
          text: "ADR-5: Presence from heartbeats with a TTL",
        },
        {
          type: "paragraph",
          text: "**Decision:** each client sends a heartbeat every 20 seconds; the server does `SET presence:{userId} 1 EX 60`. On a clean disconnect the key is deleted. **Trade-off:** a crashed phone shows online for up to 60 seconds. In exchange there's no cleanup job and no state to fix after an instance dies, because Redis forgets the key by itself.",
        },
      ],
    },
    {
      title: "Edge Cases to Handle",
      blocks: [
        {
          type: "list",
          items: [
            "Expired JWT on a connection that's already open: check `exp` on every SEND, and send an ERROR frame telling the client to reconnect with a fresh token.",
            "Client resends after a timeout: the unique `(sender_id, client_message_id)` returns the existing message, and it's broadcast again so the sender gets its acknowledgement; other clients dedupe by `id`.",
            "A user removed from a room while subscribed: unsubscribe them server-side and reject later SENDs with an error.",
            "Same user on a phone and a laptop: presence counts sessions; they're offline only when both are gone. A per-session key or a Redis set of session IDs handles this.",
            "Instance killed: its sockets drop, clients reconnect through nginx to the other instance and refetch history since their last seen id.",
            "Redis briefly down: messages still save and reach users on the same instance; clients catch up from history on reconnect. Log and alert.",
            "Message body empty, only whitespace or over 4,000 characters: reject with an error frame.",
            "HTML or script in a message: stored as plain text; escaping is the client's job, but never render it server-side.",
            "Two people opening a direct chat at the same moment: the unique `direct_key` makes one insert fail; return the existing room.",
            "History request with a `before` cursor from another room: the query always filters by `room_id`, so it just returns that room's rows.",
            "Slow client that never reads: Spring's send buffer limits (`setSendBufferSizeLimit`, `setSendTimeLimit`) close it instead of letting memory grow.",
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
            "**Single-instance chat.** STOMP endpoint, JWT on CONNECT, one hard-coded room. Demo: two browser tabs chatting. Tests: CONNECT without a token is refused; with a token, a SEND reaches a subscriber (Spring's `WebSocketStompClient` in the test).",
            "**Rooms, members and persistence.** REST for rooms and direct chats, messages saved before broadcast, membership checked on SUBSCRIBE and SEND. Demo: non-member can't subscribe. Tests: dedup by `clientMessageId`, direct chat get-or-create race.",
            "**History and read receipts.** Keyset history, high-water receipts, unread counts. Demo: reload the page, scroll up, see ticks update live. Tests: no gaps or duplicates across pages; receipt never moves backwards.",
            "**Multiple instances.** Redis pub/sub fan-out, nginx in front of two instances. Demo: Asha on instance A, Ravi on instance B, messages flow both ways. Tests: two Spring contexts on random ports sharing Testcontainers Redis and PostgreSQL.",
            "**Presence and rate limits.** TTL presence, per-user fixed window limit. Demo: close a tab and watch the dot go grey; spam and get error frames. Tests: presence expiry with a 2-second TTL; a burst of 100 sends gets at most 20 accepted per window.",
            "**Load test and write-up.** k6 WebSocket script, measured numbers in the README. Demo: k6 summary. Tests: whole suite green in CI.",
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
            "**Unit tests:** `direct_key` building, message validation, rate-limit window math.",
            "**WebSocket integration tests:** `WebSocketStompClient` connects with a real JWT, subscribes, sends, and waits on a `BlockingQueue` for the frame with a timeout. No `Thread.sleep` guessing.",
            "**Cross-instance tests:** start the app twice in one test (two `SpringApplicationBuilder` contexts on random ports), connect one client to each, assert delivery both ways.",
            "**Security tests:** no token, expired token, wrong room on SUBSCRIBE, wrong room on SEND.",
            "**Database tests:** history pagination over 10,000 seeded rows, dedup constraint, receipt `GREATEST` update.",
            "**Load test:** k6 opens 2,000 connections split over two instances; a few senders post 50 messages per second with a send timestamp; receivers compute latency.",
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
            "Swap Redis pub/sub for a RabbitMQ STOMP broker relay behind a config flag and compare the two.",
            "Use Redis Streams instead of pub/sub so an instance that was briefly disconnected can catch up.",
            "Image attachments: upload to MinIO with a pre-signed URL, message carries only the link.",
            "Push notification event for offline users (feeds Project 8).",
            "Message search with PostgreSQL full-text search.",
            "Virtual threads for the REST side and a measurement of whether they help here.",
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
              question: "Why WebSocket and not polling?",
              answer:
                "Polling means every client asks \"anything new?\" every few seconds, and almost every answer is \"no\". That's wasted requests and up to a few seconds of delay.\n\nA WebSocket is one open connection the server can push down at any time, so a message arrives in milliseconds and idle users cost almost nothing.",
            },
            {
              question: "What does STOMP add on top of WebSocket?",
              answer:
                "WebSocket only moves frames of bytes. STOMP gives those frames meaning: CONNECT, SUBSCRIBE to a destination, SEND to a destination, and per-user queues.\n\nSpring maps STOMP SEND frames to `@MessageMapping` methods the same way it maps HTTP requests to controllers, so the code feels familiar.",
            },
            {
              question: "How do you authenticate a WebSocket?",
              answer:
                "The client sends the JWT in the STOMP CONNECT frame's `Authorization` header. A `ChannelInterceptor` validates it with the same `JwtDecoder` the REST API uses and attaches the user to the session.\n\nI don't put the token in the URL query string, because URLs end up in proxy and access logs.",
            },
            {
              question: "How does a message reach a user connected to a different instance?",
              answer:
                "Each instance only knows its own sockets. After saving a message, the receiving instance publishes it to a Redis channel for that room. Every instance subscribes to those channels and pushes the message to its local subscribers.\n\nThe other option is a STOMP broker relay to RabbitMQ, where the broker holds all subscriptions and instances just forward frames.",
            },
            {
              question: "Redis pub/sub doesn't store messages. Isn't that a problem?",
              answer:
                "Only for live delivery during a short Redis or network blip. The message is already in PostgreSQL before it's published, so nothing is lost for good.\n\nClients remember the last message id they saw and fetch history from that id on reconnect. If I needed live catch-up too, I'd move to Redis Streams.",
            },
            {
              question: "How do you guarantee message order?",
              answer:
                "Inside a room, order is the database id. Clients sort by it and history is fetched by it.\n\nI don't use timestamps, because phone clocks are wrong and two messages can share a millisecond. Across rooms I don't promise any order, because nobody needs it.",
            },
            {
              question: "How do you avoid duplicate messages when a client resends?",
              answer:
                "The client creates a UUID per message and keeps it for every resend. There's a unique constraint on `(sender_id, client_message_id)`, so the second insert finds the existing row instead of making a new one.\n\nClients also ignore a broadcast whose `id` they've already shown.",
            },
            {
              question: "How does presence work, and what happens when a phone dies?",
              answer:
                "The client heartbeats every 20 seconds and the server sets a Redis key with a 60-second TTL. If the phone dies, heartbeats stop and Redis deletes the key by itself.\n\nSo a dead phone shows online for at most 60 seconds, and there's no cleanup job that could break.",
            },
            {
              question: "How did you rate limit, and why per user and not per connection?",
              answer:
                "A fixed-window counter in Redis: `INCR rate:{userId}:{window}` with a short expiry, and reject when it's over the limit.\n\nPer user, because a spammer can open ten connections. Keeping the counter in Redis means the limit holds across instances too.",
            },
            {
              question: "What's the main scaling limit of this design?",
              answer:
                "Every instance receives every room's messages from Redis, even rooms with nobody connected to it. That's fine for a portfolio and for a lot of real traffic.\n\nPast that, I'd route by room (consistent hashing so a room lives on fewer instances) or let a dedicated broker handle subscriptions. I'd measure with the load test before choosing.",
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
            "Built a real-time chat backend with Spring WebSocket and STOMP, JWT-authenticated on CONNECT, with rooms, direct messages and history stored in PostgreSQL.",
            "Scaled horizontally with Redis pub/sub fan-out across instances; measured p95 cross-instance delivery of X ms at Y concurrent connections with k6.",
            "Added TTL-based presence, high-water-mark read receipts, idempotent resends and per-user Redis rate limiting, all covered by Testcontainers tests.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Only claim what you built",
          text: "Put in the X and Y your own k6 run printed, on your own machine. If you never ran two instances, don't write \"scaled horizontally\". If you tried the RabbitMQ relay, say so; if not, leave it out of the resume and keep it as something you can explain.",
        },
      ],
    },
    {
      title: "What to Study Before Starting",
      blocks: [
        {
          type: "list",
          items: [
            "**Computer Networks**: TCP, the HTTP upgrade handshake, and why load balancers need sticky handling for long-lived connections.",
            "**Spring & Spring Boot**: Spring Security filters and how a `ChannelInterceptor` differs from a servlet filter.",
            "**Multithreading and Concurrency**: thread pools, `BlockingQueue` for tests, and why a slow consumer must not block a broker thread.",
            "**Kafka and RabbitMQ**: pub/sub versus queues, and what a STOMP broker relay does.",
            "**HLD**: how chat systems are usually drawn in system design interviews (fan-out, presence, storage).",
            "Redis basics: `SET ... EX`, `INCR`, `PUBLISH` and `PSUBSCRIBE`.",
          ],
        },
      ],
    },
  ],
};
