# Security, Benefits & Challenges
- Secrets for DB creds; only frontend exposed; health probes.
- Benefit: independent scaling; clear separation of concerns.
- Challenge: shared DB couples services; cross-service calls add latency.
- Mitigations: timeouts/retries, DB indexes, future: NetworkPolicies, Ingress+TLS, PVC for DB.
