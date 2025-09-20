# MiniPolls — Two Microservices + PostgreSQL (Docker & Kubernetes)

MiniPolls lets users create polls, vote, and view results.

## Services
- **poll-service** (Node/Express) — create polls, fetch, vote (port 8080)
- **results-service** (FastAPI) — aggregate results (port 8081)
- **frontend** (Nginx) — static UI + reverse proxy (port 80 / NodePort 30080)
- **postgres** — stores polls/options/votes

## Run (Docker Compose)
docker compose up --build
# UI: http://localhost:8082

## Run (Kubernetes / Minikube)
minikube start --driver=docker --memory=3000 --cpus=2
kubectl apply -f k8s/
minikube service frontend -n minipolls
