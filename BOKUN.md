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

Otherwise configuration, the Pusher protocol and the MySQL app-manager schema are unchanged from 1.6.1.

## Building

```sh
docker build -f Dockerfile.bokun -t soketi .
```

The image needs glibc 2.38 or newer, which is why it uses Debian trixie rather than bookworm.

## License

soketi is licensed under AGPL-3.0 (see `LICENSE`), and so are the changes in this fork.
