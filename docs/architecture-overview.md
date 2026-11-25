# Promenade — architecture overview

One picture of the components and the data that moves between them, as decided in the [Architecture Decision Records](adr/README.md). Numbers in brackets are ADR numbers. Terms are those of the [glossary](../GLOSSARY.md).

```mermaid
flowchart TB
  subgraph CLIENTS["Clients"]
    PHONE["<b>Mobile app</b> — Expo, iOS and Android [5]<br/>Outing engine: location session, trigger rules, audio<br/>planner, verifier, routing — shared packages [6][9]<br/>SQLite: journal [17], Outing state, Route Packs<br/>MapLibre Native with local PMTiles [8]"]
    WEB["<b>Public web</b> — the same screens<br/>in a browser [7]"]
    CONSOLE["<b>Internal console</b> —<br/>React app, static hosting [7]"]
  end

  subgraph GCP["Google Cloud and Firebase [1] — one container image, several entry points [2][3]"]
    AUTH["Firebase Authentication<br/>Guest = anonymous user [19]"]
    API["<b>API</b> — modular monolith on Cloud Run [3]<br/>modules: places, knowledge, planning, outings,<br/>party, catalog, entitlements [22], identity, console<br/>renders the public web pages [7]<br/>realtime: WebSocket gateway, fan-out in memory [18]<br/>planner in worker threads, verifier, routing [6][9]<br/>notification outbox, delivered in the request [20]"]
    WORKER["<b>Worker job</b> — started by the API,<br/>exits when its queue is empty [12]<br/>one durable workflow per Place"]
    JOBS["<b>Batch jobs</b><br/>base of Places: gather, match [30]<br/>Freshness Checks [31]<br/>city-data build [8][9][29]<br/>event export and DuckDB [21]<br/>backup [10]"]
    TICK(["Hourly trigger —<br/>the only schedule [24]"])
    OPS["Logs, metrics, traces<br/>OpenTelemetry [21]"]
  end

  subgraph DATA["Data [10]"]
    PG[("Postgres + PostGIS on Neon<br/>system of record: Places with their<br/>change records [30][31], workflow state,<br/>cost ledger, event staging")]
    R2[("Cloudflare R2<br/>public bucket: maps, photos, city versions<br/>private bucket: Narrations, event files,<br/>snapshots of sources [30], backups")]
  end

  subgraph EXT["External sources and services"]
    SOURCES["OpenStreetMap, Wikidata,<br/>Wikipedia, Commons,<br/>state heritage bank, page views [11]<br/>websites of Places [31]<br/>Protomaps builds [8]"]
    LLM["Language models in the cloud [4]<br/>Vertex AI and a host of open models"]
    SPEECH["Speech [14]<br/>synthesis: Google Cloud<br/>recognition: hosted Whisper"]
    NOTIFY["Firebase Cloud Messaging,<br/>e-mail provider [20]"]
  end

  PHONE -- "HTTPS: requests, journal [17]<br/>start sent as a coarse cell [6]<br/>WebSocket in live Party phases:<br/>Chat, progress, positions relayed [18]" --> API
  WEB -- "HTTPS, WebSocket" --> API
  CONSOLE -- "HTTPS, internal role [19]<br/>Proposed Changes accepted<br/>or rejected [31]" --> API
  PHONE -. "sign in" .-> AUTH
  WEB -. "sign in" .-> AUTH
  AUTH -. "token verified by" .-> API

  TICK -- "what is due [24]" --> API
  API -- "enqueues a workflow,<br/>starts the job [12]" --> WORKER
  API -- "starts [24]" --> JOBS
  API <--> PG
  WORKER <--> PG
  JOBS <--> PG

  API -- "reads a city version,<br/>signs links to private files [10]" --> R2
  WORKER -- "Narrations, photos" --> R2
  JOBS <--> R2
  PHONE -- "downloads Route Pack blobs,<br/>verifies each by hash [10]" --> R2
  WEB -- "reads PMTiles by HTTP range [8]" --> R2

  API -- "Wish interpretation [4]" --> LLM
  API -- "push and e-mail [20]" --> NOTIFY
  WORKER -- "facts, Stories, judge [4][13]" --> LLM
  WORKER -- "Narration and<br/>back-transcription [14]" --> SPEECH
  WORKER -- "sources with revisions [11]" --> SOURCES
  JOBS -- "re-reads on a schedule [31]:<br/>extract, revisions, websites;<br/>tiles, graph, matrix" --> SOURCES

  API -.-> OPS
  WORKER -.-> OPS
```

## How to read it

- **Solid arrows** carry product data and point from the side that starts the exchange; **dotted arrows** carry identity and telemetry. Firebase Cloud Messaging is drawn with the delivery services for readability, although it belongs to Firebase.
- **One language and one image.** The API, the worker and the batch jobs are entry points of the same TypeScript container image; the planner, the verifier and the routing code are the same packages on the server and on the phone.
- **What stays on the device:** the track of movement, arrival detection, Visit detection and replanning. The server receives the fact of a Visit through the journal, never coordinates, and a start taken from the person's position only as a cell of 100–150 m (`NFR-14`). Positions shared before a Party gathers are relayed through the memory of one instance and are not written anywhere.
- **Nothing runs in the background of a service.** Work happens inside a request, in a job that is started and exits, or on the single hourly trigger; nothing polls the database while nobody uses the product ([ADR-0024](adr/0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).
- **What the planner reads:** a published, immutable version of a city — Places, theme scores, opening hours resolved into intervals, pedestrian graph, matrix of travel times — never the live tables. The verifier checks every result on the server and on the phone.
- **How the base of Places is made and kept true:** a job gathers the map and Wikidata for the whole of Belarus, matches their records to Places with identifiers of our own, and never overrides a Curator ([ADR-0030](adr/0030-base-of-places-gathered-ahead-of-time-and-matched.md)). Afterwards Freshness Checks re-read the Sources on a schedule — and, in Minsk, the websites of Places. Whatever they find is a change record with its evidence: applied by stated rules, or put to the Curator as a Proposed Change. The records are the history of a Place ([ADR-0031](adr/0031-keeping-the-base-of-places-current.md)).
- **How content is made:** the API enqueues one durable workflow per Place and starts the worker job — sources, facts, Stories, statement check, Narration, back-transcription. Every step writes its cost to a ledger whose monthly budgets are hard stops.
- **How a Route Pack reaches the phone:** the API returns a manifest with signed links; the phone downloads content-addressed blobs straight from object storage, verifies every hash and marks the Pack usable only when complete.
- **Delivery:** GitHub Actions builds the image once, pushes it to GitHub Container Registry, runs the migrations and deploys with Terraform; `docker compose up` starts the same image locally next to emulators and recorded responses of the paid services ([ADR-0002](adr/0002-terraform-github-actions-and-local-environment.md)).
