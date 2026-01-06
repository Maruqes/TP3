FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/processador_dados .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /out/processador_dados /app/processador_dados
EXPOSE 8080
USER app
ENTRYPOINT ["./processador_dados"]
