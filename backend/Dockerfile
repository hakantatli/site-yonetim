# ── Stage 1: Build binary & tools ──
FROM golang:alpine AS builder

WORKDIR /app

# Install build tools and goose migration CLI
RUN apk add --no-cache git ca-certificates tzdata && \
    go install github.com/pressly/goose/v3/cmd/goose@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# ── Stage 2: Minimal runtime image ──
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Europe/Istanbul

# Copy binaries
COPY --from=builder /app/server /app/server
COPY --from=builder /go/bin/goose /usr/local/bin/goose

# Copy migrations and entrypoint
COPY migrations /app/migrations
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
