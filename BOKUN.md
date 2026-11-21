# Bókun fork of soketi

This fork keeps soketi running on a supported Node.js release. Upstream soketi stopped publishing releases after 1.6.1, and its images only ever shipped Node 14 and 16.

The `bokun/node22` branch is soketi 1.6.1 plus:

- uWebSockets.js bumped from v20.10.0 to v20.71.0, which ships binaries for Node 22, 24 and 26
- a shared `WebSocket` type (`src/uws.ts`) for the newer uWebSockets.js typings
- `res.cork()` around HTTP API responses, which newer uWebSockets.js expects
- `Dockerfile.bokun`: Node 22 on Debian trixie, running as a non-root user
- upstream's GitHub Actions workflows removed

To clear the high and critical `npm audit` findings, it also drops features that pulled them in:

- PM2 support: the `soketi-pm2` command and the `cluster` rate limiter (use `local` or `redis`)
- the `redis` (BullMQ) queue driver (use `sync` or `sqs`)
- the `mysql2` driver (`APP_MANAGER_MYSQL_USE_V2`); the default `mysql` driver is unchanged
- `prometheus-query` (unused) and `query-string` (replaced by `URLSearchParams`)

and upgrades axios to 1.20.0 and lodash to 4.18.1.

The HTTP API is cut down to what our backends use. They only call `POST /apps/:appId/events`, so these are no longer served and return 404:

- `GET /apps/:appId/channels`, `/channels/:channelName` and `/channels/:channelName/users`
- `POST /apps/:appId/batch_events`
- `POST /apps/:appId/users/:userId/terminate_connections`
- `GET /accept-traffic` (the `HTTP_ACCEPT_TRAFFIC_MEMORY_THRESHOLD` setting now does nothing)

`/` and `/ready` stay on port 6001, and `/`, `/ready` and `/usage` stay on the metrics port (9601).

Error replies from the HTTP API now carry their real status (400, 401, 404, 413, 429, 500). Upstream wrote the CORS headers before the status, and uWebSockets.js sends `200 OK` as soon as a header is written, so errors went out as 200 with the error in the body. Pusher server libraries now see a refused call as a failure instead of a success.

Otherwise configuration, the Pusher protocol and the MySQL app-manager schema are unchanged from 1.6.1.

## Building

```sh
docker build -f Dockerfile.bokun -t soketi .
```

The image needs glibc 2.38 or newer, which is why it uses Debian trixie rather than bookworm.

## License

soketi is licensed under AGPL-3.0 (see `LICENSE`), and so are the changes in this fork.
