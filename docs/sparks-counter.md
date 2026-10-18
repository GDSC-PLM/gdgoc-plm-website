# Sparks counter architecture

## How the counter works

The feature stores one queue in IndexedDB database `gdgoc-sparks`, store `queue`, key `community`. It contains a persistent UUID, numbered taps, the last acknowledged sequence, the confirmed shared total, an immutable in-flight batch target, and retry/lease timing. Each tap is committed locally before the displayed number increases. Displayed total = confirmed total + (queued sequence − acknowledged sequence). No routine syncing label is shown.

`queueSettings` sets the defaults: 10 taps per batch, a 1000–1250ms collection window, 1000 pending taps maximum, a 20-second sender lease, and 15-second shared refreshes. A local IndexedDB transaction coordinates ownership between tabs; BroadcastChannel wakes peers to reread the same state. Only one tab sends at a time. If it closes, another tab resumes after release or lease expiry. The queue survives ordinary reloads/restarts, but clearing site data or browser eviction can remove it. Loading the website fully offline still depends on the browser's page cache; no service worker is added.

The database allows at most 10 accepted taps per browser in a rolling second. This is burst control, not a count of unique people. Clearing cookies can create a new browser identity. Other visitors' taps appear through a 15-second refresh while the tab is visible and the queue is idle.

Failed batches stay saved and retry with the same stream ID and sequence target. Backoff doubles from about one second to a 30-second cap with jitter, honoring a longer `Retry-After`. The server locks the stream row and adds only unacknowledged sequence numbers. Lost responses and overlapping retries cannot double-count. Throttled batches wait without losing taps. Invalid requests stop automatic sending and offer retry; unavailable local storage prevents unsaved increments and shows an error. Routine browser retries never create a fresh queue identity.

`GET /api/hype?streamId=<uuid>` and `POST /api/hype` with JSON `{ "streamId": "<uuid>", "through": 10 }` return `{ "count": number, "acknowledgedThrough": number }`. GET reads both values in one snapshot. POST derives the increment from the stored checkpoint, accepts at most 10 new taps, and commits the counter and acknowledgement atomically. Plain GET and body-free POST remain compatible with older clients. Invalid/oversized payloads return `400`, foreign origins `403`, missing browser cookies `409`, throttling `429`, and unavailable databases `503`. Responses are not cached.


## Verification record

An isolated database test on 2026-10-19 simulated 100 visitors contributing 100 taps each: exactly 10,000 additions in 1,000 write requests, 90% fewer writes than per-tap requests, zero retries, 37.18 seconds elapsed, 2039.8ms median and 2428.5ms p95 request latency. Duplicate/overlapping batches, invalid sequence rollback, throttling, and acknowledgements passed. Temporary objects were removed without changing the public counter. This is one measured test, not a production capacity guarantee.

Browser tests used mocked responses for batching, offline/reload recovery, response loss after commit, two tabs, storage failure, and outages. Native IndexedDB checks covered the 1000-tap limit, stale acknowledgements, lease expiry/takeover, and browser restart. Future counter verification should also mock writes or use isolated test objects, never inflate the public total.

## One manual recovery check

Open two tabs. Tap several times, switch the browser network offline, tap again, then restore connectivity and reload. Saved taps should remain, the queue should drain in batches, and the displayed total should not count an acknowledgement twice. Site-data removal can delete the local queue; no service worker or fully offline website is provided.
