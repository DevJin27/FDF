```mermaid
flowchart TB
    subgraph Client[Browser Client]
      Dashboard[Dashboard / Queue / Match pages]
      SocketClient[Socket.IO client]
    end

    subgraph Web[apps/web (Next.js)]
      NextAuthRoute[/api/auth/[...nextauth]]
      InternalTokenRoute[/api/internal/token]
      WebApiLib[lib/api.ts]
      WebAuthLib[lib/auth.ts]
    end

    subgraph Api[apps/api (Express)]
      AuthMW[requireAuth middleware]
      IntentRoute[/api/intents]
      MatchRoute[/api/matches]
      ProfileRoute[/api/profile/upi]
      Services[OrderIntent + Matchmaking + MatchRoom + Settlement + Expiry]
      Repos[User + Intent + MatchRoom + Settlement repositories]
      EventBus[DomainEventBus]
      SocketHub[SocketHub]
    end

    subgraph Data[PostgreSQL]
      AuthTables[(users/accounts/sessions/authenticators)]
      AppTables[(order_intents/match_rooms/members/settlements/payment_events)]
    end

    Google[(Google OAuth)]

    Dashboard --> NextAuthRoute
    NextAuthRoute --> WebAuthLib
    WebAuthLib --> Google

    Dashboard --> InternalTokenRoute
    Dashboard --> WebApiLib
    Dashboard --> SocketClient

    WebApiLib --> IntentRoute
    WebApiLib --> MatchRoute
    WebApiLib --> ProfileRoute

    IntentRoute --> AuthMW
    MatchRoute --> AuthMW
    ProfileRoute --> AuthMW

    AuthMW --> Services
    Services --> Repos
    Repos --> AuthTables
    Repos --> AppTables

    Services --> EventBus
    EventBus --> SocketHub
    SocketHub --> SocketClient
```
