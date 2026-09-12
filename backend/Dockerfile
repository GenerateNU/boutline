FROM golang:1.25.5-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Static binary so the runtime stage needs no libc.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/boutline cmd/main.go

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/boutline /boutline

EXPOSE 8000

ENTRYPOINT ["/boutline"]
