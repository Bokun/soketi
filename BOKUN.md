# Bókun fork of soketi

This fork keeps soketi running on a supported Node.js release. Upstream soketi stopped publishing releases after 1.6.1, and its images only ever shipped Node 14 and 16.

The `bokun/node22` branch is soketi 1.6.1 plus:

- uWebSockets.js bumped from v20.10.0 to v20.71.0, which ships binaries for Node 22, 24 and 26
- a shared `WebSocket` type (`src/uws.ts`) for the newer uWebSockets.js typings
- `res.cork()` around HTTP API responses, which newer uWebSockets.js expects
- `Dockerfile.bokun`: Node 22 on Debian trixie, running as a non-root user
- upstream's GitHub Actions workflows removed

Configuration, the Pusher protocol and the MySQL app-manager schema are unchanged from 1.6.1.

## Building

```sh
docker build -f Dockerfile.bokun -t soketi .
```

The image needs glibc 2.38 or newer, which is why it uses Debian trixie rather than bookworm.

## License

soketi is licensed under AGPL-3.0 (see `LICENSE`), and so are the changes in this fork.
