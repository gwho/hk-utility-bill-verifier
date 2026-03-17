# ADR-006: Polling for OCR Status (Not WebSockets)

**Date:** 2025-03-17
**Status:** Accepted

## Context

OCR extraction is an async operation: the user uploads a document, the backend runs OCR (which can take 5–30 seconds), and the iOS app needs to show progress and then transition to the review screen when done.

Options:
1. **WebSockets**: real-time bidirectional connection; server pushes status updates.
2. **Server-Sent Events (SSE)**: one-way server push; simpler than WebSockets.
3. **Polling**: iOS app periodically calls `GET /documents/:id/status` until status = done.

## Decision

**Polling**, with an exponential back-off: poll every 2s for the first 10s, then every 5s until timeout.

## Consequences

**Good:**
- Simpler to implement and debug. A failed poll is just a failed HTTP request — easy to retry.
- Works through proxies, load balancers, and corporate firewalls (WebSockets often blocked).
- The Express proxy layer does not need WebSocket upgrade handling.
- iOS app can be backgrounded and resume polling when foregrounded.
- Tutorial readers understand HTTP polling immediately. WebSockets require understanding of the upgrade protocol.

**Bad:**
- Slightly less responsive than push-based solutions (up to `poll_interval` delay before UI updates).
- Generates repeated HTTP requests (minor server load).

**Mitigations:**
- 2s initial interval means the typical case feels near-instant.
- Maximum of 60 poll attempts before surfacing an error to the user.
- The `/status` endpoint is a lightweight SELECT query — negligible server cost.

## Tutorial Note

WebSockets are the "cool" solution but polling is the "correct" solution for mobile applications. Mobile networks are unreliable; WebSocket connections drop frequently. A polling client reconnects automatically because each poll is an independent HTTP request. Choose boring reliability over interesting technology when correctness matters.
