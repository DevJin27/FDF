```mermaid
erDiagram
    USERS ||--o{ ACCOUNTS : has
    USERS ||--o{ SESSIONS : has
    USERS ||--o{ AUTHENTICATORS : has

    USERS ||--o{ ORDER_INTENTS : creates
    USERS ||--o{ MATCH_ROOMS : leads
    USERS ||--o{ MATCH_ROOM_MEMBERS : participates
    USERS ||--o{ SETTLEMENTS : has_balance
    USERS ||--o{ PAYMENT_EVENTS : marks_or_marked

    MATCH_ROOMS ||--|{ MATCH_ROOM_MEMBERS : contains
    MATCH_ROOMS ||--|{ SETTLEMENTS : tracks
    MATCH_ROOMS ||--o{ PAYMENT_EVENTS : emits
    MATCH_ROOMS ||--o{ ORDER_INTENTS : aggregates

    ORDER_INTENTS ||--o| MATCH_ROOM_MEMBERS : member_source

    USERS {text id PK;text email UK;text name;varchar upi_id}
    ACCOUNTS {text user_id FK;text provider PK;text provider_account_id PK}
    SESSIONS {text session_token PK;text user_id FK;timestamp expires}
    AUTHENTICATORS {text credential_id PK;text user_id FK;integer counter}

    ORDER_INTENTS {uuid id PK;text user_id FK;integer amount;timestamp latest_checkout_at;varchar delivery_cluster;varchar status;uuid room_id FK;timestamp cancelled_at;timestamp expired_at}
    MATCH_ROOMS {uuid id PK;text leader_user_id FK;varchar delivery_cluster;varchar status;integer minimum_amount;integer total_amount;timestamp latest_checkout_at;timestamp locked_at;timestamp completed_at;timestamp expired_at}
    MATCH_ROOM_MEMBERS {uuid id PK;uuid room_id FK;text user_id FK;uuid order_intent_id FK;integer amount}
    SETTLEMENTS {uuid id PK;uuid room_id FK;text user_id FK;integer amount_owed;varchar status;timestamp marked_paid_at}
    PAYMENT_EVENTS {uuid id PK;uuid room_id FK;text member_user_id FK;text marked_by_user_id FK;varchar type;text metadata}
```
