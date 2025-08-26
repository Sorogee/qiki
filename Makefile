.PHONY: build up down logs test sbom sign

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

test:
	(cd server && npm ci && npm run typecheck && npm test) && (cd ui && npm ci && npm run typecheck)

sbom:
	syft packages dir:. -o spdx-json > sbom.json || echo "Install syft to generate SBOM"

sign:
	COSIGN_EXPERIMENTAL=1 cosign sign ghcr.io/your-org/qikiworld-server:latest
