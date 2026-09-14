FROM golang:1.25.5-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Static binaries so the runtime stage needs no libc.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/boutline cmd/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/boutline /boutline
# The database port is not published, so seeding has to run inside the compose
# network; the `seed` service overrides the entrypoint to reach this.
COPY --from=build /out/seed /seed

EXPOSE 8000

ENTRYPOINT ["/boutline"]
