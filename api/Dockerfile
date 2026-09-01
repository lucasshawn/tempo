FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY cmd/ cmd/
COPY internal/ internal/
RUN CGO_ENABLED=0 GOOS=linux go build -o tempo-api ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/tempo-api /app/tempo-api
EXPOSE 8080
CMD ["/app/tempo-api"]