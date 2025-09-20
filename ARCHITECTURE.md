# Architecture & Design
- poll-service: write path, talks to Postgres.
- results-service: read/aggregate path, calls poll-service for metadata.
- frontend: serves UI and proxies to both services.
- postgres: single DB (tables: polls, options, votes).

Patterns: microservices, REST, reverse proxy, env-config, horizontal scaling.
K8s: 4 Deployments, 4 Services (ClusterIP internal; NodePort for frontend), Secret for DB cred.
