const fs = require('fs');

const escapeXml = (unsafe) => {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
};

const erDiagram = `erDiagram
    USERS {
        text id PK "gen_random_uuid()::text"
        text name
        text email UK
        timestamp email_verified
        text image
        varchar upi_id
        timestamp created_at
        timestamp updated_at
    }

    ACCOUNTS {
        text user_id FK "users.id CASCADE"
        text type
        text provider PK
        text provider_account_id PK
        text refresh_token
        text access_token
        integer expires_at
        text token_type
        text scope
        text id_token
        text session_state
    }

    SESSIONS {
        text session_token PK
        text user_id FK "users.id CASCADE"
        timestamp expires
    }

    VERIFICATION_TOKEN {
        text identifier PK
        text token PK
        timestamp expires
    }

    AUTHENTICATORS {
        text credential_id UK
        text user_id FK "users.id CASCADE"
        text provider_account_id
        text credential_public_key
        integer counter
        text credential_device_type
        boolean credential_backed_up
        text transports
    }

    ORDER_INTENTS {
        uuid id PK "defaultRandom()"
        text user_id FK "users.id CASCADE"
        integer amount
        timestamp latest_checkout_at
        varchar delivery_cluster "hostel-a | hostel-b | main-gate | library"
        varchar status "open | reserved | matched | cancelled | expired"
        uuid room_id FK "match_rooms.id (nullable)"
        timestamp created_at
        timestamp updated_at
        timestamp cancelled_at
        timestamp expired_at
    }

    MATCH_ROOMS {
        uuid id PK "defaultRandom()"
        text leader_user_id FK "users.id CASCADE"
        varchar delivery_cluster "hostel-a | hostel-b | main-gate | library"
        varchar status "pending_confirmation | active | locked | completed | cancelled | expired"
        integer minimum_amount
        integer total_amount
        timestamp latest_checkout_at
        timestamp created_at
        timestamp updated_at
        timestamp locked_at
        timestamp completed_at
        timestamp expired_at
    }

    MATCH_ROOM_MEMBERS {
        uuid id PK "defaultRandom()"
        uuid room_id FK "match_rooms.id CASCADE"
        text user_id FK "users.id CASCADE"
        uuid order_intent_id FK "order_intents.id CASCADE"
        integer amount
        timestamp created_at
    }

    SETTLEMENTS {
        uuid id PK "defaultRandom()"
        uuid room_id FK "match_rooms.id CASCADE"
        text user_id FK "users.id CASCADE"
        integer amount_owed
        varchar status "pending | paid"
        timestamp marked_paid_at
        timestamp created_at
        timestamp updated_at
    }

    PAYMENT_EVENTS {
        uuid id PK "defaultRandom()"
        uuid room_id FK "match_rooms.id CASCADE"
        text member_user_id FK "users.id CASCADE"
        text marked_by_user_id FK "users.id CASCADE"
        varchar type "marked_paid"
        timestamp created_at
        text metadata
    }

    USERS ||--o{ ACCOUNTS : "has"
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ AUTHENTICATORS : "has"
    USERS ||--o{ ORDER_INTENTS : "places"
    USERS ||--o{ MATCH_ROOM_MEMBERS : "participates as"
    USERS ||--o{ SETTLEMENTS : "owes"
    USERS ||--o{ PAYMENT_EVENTS : "triggers / receives"
    MATCH_ROOMS ||--|{ MATCH_ROOM_MEMBERS : "contains"
    MATCH_ROOMS ||--|{ SETTLEMENTS : "tracks"
    MATCH_ROOMS ||--o{ PAYMENT_EVENTS : "records"
    MATCH_ROOMS }o--|| USERS : "led by (leader_user_id)"
    ORDER_INTENTS }o--|| USERS : "belongs to"
    ORDER_INTENTS }o--o| MATCH_ROOMS : "grouped into (room_id)"
    ORDER_INTENTS ||--o| MATCH_ROOM_MEMBERS : "represented by"
`;

const classDiagram = `classDiagram
    class AuthenticatedUser {
        +String id
        +String email
        +String name
        +String image
    }

    class OrderIntentSummary {
        +String id
        +String userId
        +Number amount
        +String latestCheckoutAt
        +DeliveryCluster deliveryCluster
        +OrderIntentStatus status
        +String createdAt
        +String roomId
    }

    class MatchRoomSummary {
        +String id
        +String leaderUserId
        +Number memberCount
        +Number totalAmount
        +Number minimumAmount
        +String latestCheckoutAt
        +MatchRoomStatus status
        +DeliveryCluster deliveryCluster
        +String createdAt
    }

    class SettlementView {
        +LeaderInfo leader
        +SettlementMemberView[] members
    }

    class SettlementMemberView {
        +String userId
        +String name
        +String image
        +Number amountOwed
        +SettlementStatus paymentStatus
        +String upiId
        +Boolean isLeader
    }

    class QueueSnapshot {
        +DeliveryCluster deliveryCluster
        +Number openIntentCount
        +Number totalOpenAmount
        +Number amountToMinimum
        +Number minimumAmount
    }

    class DomainEventBus {
        <<Observer Pattern — Subject>>
        +subscribe(subscriber) Function
        +emit(name, payload) Promise
    }

    class SocketHub {
        <<Observer Pattern — Concrete Subscriber>>
        +register() void
        +onEvent(name, payload) Promise
    }

    class OrderIntentRepository {
        <<Repository Pattern>>
        +create(input) Promise
        +listForUser(userId) Promise
        +listOpenByCluster(cluster, now) Promise
        +cancel(intentId, userId) Promise
        +markMatched(intentIds, roomId, status) Promise
    }

    class MatchRoomRepository {
        <<Repository Pattern>>
        +createFromIntents(input) Promise
        +getCurrentForUser(userId) Promise
        +findById(roomId) Promise
        +lockRoom(roomId) Promise
        +getSettlementView(roomId) Promise
    }

    class OrderIntentService {
        <<Service Layer Pattern>>
        +createIntent(user, input) Promise
        +listMyIntents(userId) Promise
        +cancelIntent(userId, intentId) Promise
        +publishQueue(cluster) Promise
    }

    class MatchmakingService {
        <<Strategy Pattern>>
        +tryMatchCluster(cluster) Promise
    }

    class MatchRoomService {
        <<Service Layer Pattern>>
        +getCurrentForUser(userId) Promise
        +getById(roomId) Promise
        +lockRoom(user, roomId) Promise
    }

    class SettlementService {
        <<Service Layer Pattern>>
        +markPaid(user, roomId, memberUserId) Promise
    }

    OrderIntentService --> OrderIntentRepository : uses
    OrderIntentService --> MatchmakingService : delegates match
    OrderIntentService --> DomainEventBus : emits

    MatchmakingService --> OrderIntentRepository : reads open intents
    MatchmakingService --> MatchRoomRepository : creates rooms
    MatchmakingService --> DomainEventBus : emits match.formed

    MatchRoomService --> MatchRoomRepository : uses
    MatchRoomService --> DomainEventBus : emits match.locked

    SettlementService --> MatchRoomRepository : validates room
    SettlementService --> DomainEventBus : emits payment.updated

    SocketHub ..|> DomainEventBus : subscribes to
`;

const sequenceDiagram = `sequenceDiagram
    autonumber

    participant Browser as Browser
    participant ExpressAPI as Express API
    participant AuthMW as Auth Middleware
    participant OIS as OrderIntentService
    participant MMS as MatchmakingService
    participant MRS as MatchRoomService
    participant OIR as OrderIntentRepository
    participant MRR as MatchRoomRepository
    participant DB as PostgreSQL
    participant EventBus as DomainEventBus
    participant SocketHub as SocketHub

    rect rgb(230, 255, 230)
        Note over Browser, SocketHub: Phase 1 — Socket.IO Realtime Handshake
        Browser->>SocketHub: WS connect { auth: { token } }
        SocketHub-->>Browser: connected
        Browser->>SocketHub: emit "subscribe.cluster" ("hostel-a")
    end

    rect rgb(255, 230, 255)
        Note over Browser, DB: Phase 2 — Create Order Intent
        Browser->>ExpressAPI: POST /api/intents
        ExpressAPI->>AuthMW: Bearer token validation
        ExpressAPI->>OIS: createIntent(user, input)
        OIS->>OIR: create({ userId, amount, latestCheckoutAt, cluster })
        OIR->>DB: INSERT order_intents
        OIS->>EventBus: emit("intent.created", { intent })
        OIS->>EventBus: emit("queue.updated", { cluster, snapshot })
        EventBus->>SocketHub: onEvent("queue.updated", snapshot)
        SocketHub->>Browser: "queue.updated" event
        
        OIS->>MMS: tryMatchCluster(cluster)
        MMS->>OIR: listOpenByCluster(cluster, now)
        MMS->>MMS: selectBestMatch(candidates, config)
        alt Match found
            MMS->>MRR: createFromIntents(input) [DB TRANSACTION]
            MRR->>DB: INSERT match_rooms & members
            MMS->>OIR: markMatched(intentIds, roomId, "reserved")
            MMS->>EventBus: emit("match.formed", { roomId, userIds, cluster })
            EventBus->>SocketHub: onEvent("match.formed", ...)
            SocketHub->>Browser: "match.formed" -> redirect
        end
        OIS-->>ExpressAPI: OrderIntentSummary
        ExpressAPI-->>Browser: 201 Created
    end

    rect rgb(255, 255, 220)
        Note over Browser, DB: Phase 3 — Lock Match Room
        Browser->>ExpressAPI: POST /api/matches/[roomId]/lock
        ExpressAPI->>MRS: lockRoom(user, roomId)
        MRS->>MRR: lockRoom(roomId)
        MRR->>DB: UPDATE match_rooms SET status="locked"
        MRS->>OIR: markMatched(intentIds, roomId, "matched")
        MRS->>EventBus: emit("match.locked", { roomId, leaderUserId })
        EventBus->>SocketHub: onEvent("match.locked", ...)
        SocketHub->>Browser: "match.locked" -> refresh
        ExpressAPI-->>Browser: 200 OK
    end
`;

const architectureDiagram = `graph TB
    subgraph CLIENT["Client Layer"]
        B_DASH["Dashboard"]
        B_MATCH["Match Room"]
    end

    subgraph WEB["Next.js Web App"]
        N_AUTH["Auth API"]
        N_TOKEN["Token Exchange API"]
    end

    subgraph API["Express API"]
        subgraph ROUTES["REST Routes"]
            R_INTENTS["IntentsRouter"]
            R_MATCHES["MatchesRouter"]
        end

        subgraph SERVICES["Domain Services"]
            SVC_OIS["OrderIntentService"]
            SVC_MMS["MatchmakingService"]
            SVC_MRS["MatchRoomService"]
        end

        subgraph EVENTBUS["Event Bus"]
            EB["DomainEventBus"]
        end

        subgraph REALTIME["Realtime Layer"]
            SH["SocketHub (Socket.IO)"]
        end

        subgraph REPOS["Repositories"]
            RP_OI["OrderIntentRepository"]
            RP_MR["MatchRoomRepository"]
        end
    end

    subgraph DB["PostgreSQL Database"]
        TBL_OI["order_intents"]
        TBL_MR["match_rooms"]
        TBL_MRM["match_room_members"]
    end

    B_DASH --> WEB
    B_MATCH --> WEB
    B_DASH -->|"REST"| R_INTENTS
    B_MATCH -->|"REST"| R_MATCHES
    B_DASH -->|"WS"| SH
    B_MATCH -->|"WS"| SH

    R_INTENTS --> SVC_OIS
    R_MATCHES --> SVC_MRS

    SVC_OIS --> SVC_MMS
    SVC_OIS --> RP_OI
    SVC_MMS --> RP_OI
    SVC_MMS --> RP_MR
    SVC_MRS --> RP_MR
    SVC_MRS --> RP_OI

    SVC_OIS --> EB
    SVC_MMS --> EB
    SVC_MRS --> EB

    EB -->|"notifies"| SH

    RP_OI --> DB
    RP_MR --> DB
`;

const generateDiagramXml = (id, name, content) => `
  <diagram id="diag_${id}" name="${name}">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="${escapeXml(content)}" style="shape=mxgraph.mermaid;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="800" height="800" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>`;

const fileContent = `<mxfile version="21.6.8">
${generateDiagramXml("1", "ER Diagram", erDiagram)}
${generateDiagramXml("2", "Class Diagram", classDiagram)}
${generateDiagramXml("3", "Sequence Diagram", sequenceDiagram)}
${generateDiagramXml("4", "Architecture Diagram", architectureDiagram)}
</mxfile>`;

fs.writeFileSync('/Users/Personal/Desktop/EVERYTHING/FDF/FDF_System_Diagrams.drawio', fileContent, 'utf-8');
console.log('Successfully created FDF_System_Diagrams.drawio');
