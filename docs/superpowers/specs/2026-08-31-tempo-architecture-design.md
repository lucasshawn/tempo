# Tempo: Global Trace Contexts Visualization System Specification

**Date:** 2026-08-31  
**Status:** Approved  
**Repository:** `lucasshawn/tempo`

---

## 1. Overview & Goals

Tempo is an interactive temporal-spatial visualization platform for "Trace Contexts" (events across geographical space and time). The initial implementation delivers a responsive web application designed with a decoupled microservice architecture, built to run locally on Minikube and architected for clean future porting to iOS and Android native apps.

### Core Goals:
1. **Interactive Global Map:** Pan and zoom capabilities with a bespoke vintage parchment cartographic aesthetic matching the design reference.
2. **Dynamic Trace Context Clustering:** Automatic aggregation of events at variable zoom levels (e.g. 500 sq mi resolution at global zoom), rendering single-event gold rings or dark charcoal/gold numbered cluster badges (1 to N).
3. **Temporal Scrubber & Playback:** A sleek bottom timeline overlay that slices and filters events across time with snapping to event timestamps, play/pause controls, and formatted time displays.
4. **Decoupled Architecture:** High-performance Go microservice API + React TypeScript frontend + Kubernetes manifests ready for Minikube deployment.

---

## 2. Architecture & Components

```
+-------------------------------------------------------------------------+
|                              MINIKUBE CLUSTER                           |
|                                                                         |
|  +---------------------------+             +--------------------------+ |
|  |     tempo-web (React)     |   HTTP      |     tempo-api (Go)       | |
|  | - Vintage Parchment Map   | ----------> | - In-Memory Trace Store  | |
|  | - Leaflet / Canvas Layers |   /api/v1   | - Grid Clustering Engine | |
|  | - Timeline Scrubber & UI  |             | - Time-slice Indexer     | |
|  | - Playback Controller     |             | - Realistic Mock Seeder  | |
|  +---------------------------+             +--------------------------+ |
|               |                                                         |
|               v (Port 3000 / Service NodePort)                          |
+---------------+---------------------------------------------------------+
                |
                v
        Browser / Host Client
```

### Component Breakdown

1. **`tempo-api` (Go Backend Service)**
   - **Language/Framework:** Go (Standard Library `net/http` + lightweight routing / CORS).
   - **Data Store:** In-memory thread-safe spatial/temporal store with deterministic mock generator simulating global distributed events across a multi-day timeline.
   - **Clustering Engine:** Grid-based spatial binning algorithm converting raw geographic coordinates `(lat, lng)` into resolution buckets based on current map zoom level and viewport.
   - **API Endpoints:**
     - `GET /api/v1/timeline` — Returns start date, end date, available time slices, and total event counts.
     - `GET /api/v1/traces?time=<iso8601>&zoom=<int>&bounds=<minLat,minLng,maxLat,maxLng>` — Returns clustered markers and single events for the selected time slice.
     - `POST /api/v1/traces` — Ingests new trace context events.
     - `GET /healthz` — Kubernetes liveness/readiness probe.

2. **`tempo-web` (React TypeScript Frontend)**
   - **Framework:** React 18 + Vite + TypeScript.
   - **Map Engine:** Leaflet + custom vintage cartography layers with SVG/Canvas overlays and celestial orbital ring markings.
   - **UI Layers:**
     - **Header Bar:** Compass/astronomical icon `(·)`, tracked uppercase title `"W O R L D"`, and settings/options button `(•••)`.
     - **Map Canvas:** Beige/sand terrain relief styling with muted slate-blue oceans.
     - **Cluster Badges:** Charcoal circles bounded by dual metallic gold rings displaying event counts, and golden concentric rings for individual events.
     - **Timeline Control Overlay:** Glassmorphism date/time badge (e.g., `JUN 7, 2024 2:41 PM`), interactive horizontal scrubber with event tick indicators, and circular playback button (`<<` / `▶` / `⏸`).

3. **`k8s` (Kubernetes Manifests for Minikube)**
   - `api-deployment.yaml` + `api-service.yaml` (Exposes API internally on port 8080).
   - `web-deployment.yaml` + `web-service.yaml` (Exposes Web frontend via NodePort on port 30080 or port-forwarding).
   - `kustomization.yaml` for unified cluster deployment.

---

## 3. Data Model

### Trace Context Entity
```json
{
  "id": "tc-e4b2a8",
  "title": "Global Gateway Probe #104",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2024-06-07T14:41:00Z",
  "region": "North America",
  "category": "deployment",
  "metadata": {
    "node": "us-east-1",
    "latencyMs": 42,
    "status": "healthy"
  }
}
```

### Clustered Response Format
```json
{
  "time": "2024-06-07T14:41:00Z",
  "totalEvents": 48,
  "clusters": [
    {
      "id": "cluster-na-east",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "count": 12,
      "isCluster": true,
      "bounds": { "minLat": 38.0, "minLng": -76.0, "maxLat": 42.0, "maxLng": -72.0 }
    },
    {
      "id": "tc-individual-01",
      "latitude": 30.2672,
      "longitude": -97.7431,
      "count": 1,
      "isCluster": false,
      "event": {
        "id": "tc-individual-01",
        "title": "Austin Edge Worker",
        "timestamp": "2024-06-07T14:41:00Z"
      }
    }
  ]
}
```

---

## 4. UI / Visual Styling Reference Specification

Based on the provided reference design:
* **Color Palette:**
  * Background / Water: Muted Slate Blue (`#7A8B99` / `#5C6D7C`)
  * Landmass / Continents: Vintage Warm Beige / Parchment (`#E8DFC8` / `#DFD4B9`)
  * Border / Coastlines: Soft Ochre (`#C2B290`)
  * Accent Gold / Metallic: Radiant Warm Gold (`#D4AF37` / `#E5C158`)
  * Cluster Background: Dark Charcoal / Slate Navy (`#242D35`)
  * Typography: Serif / Clean geometric sans with high letter spacing (`letter-spacing: 0.25em`)
* **Celestial Overlay:** Thin semi-transparent orbital reference circle (`rgba(255, 255, 255, 0.4)`).
* **Markers:**
  * Single event: concentric outer ring with inner golden core dot.
  * Multi-event cluster: dark charcoal filled circle with outer gold double border and bold white count text.

---

## 5. Portability Strategy (Mobile iOS/Android)

To ensure smooth transition to future native mobile apps:
1. **Zero Server Coupling:** The React frontend interacts with standard REST endpoints with JSON payloads.
2. **Modular State Store:** Frontend state (selected timestamp, active zoom level, map center, playing state) is separated from DOM and mapping components.
3. **Reusable Data Client:** API fetch logic is encapsulated in a pure TypeScript SDK layer usable in React Native or Capacitor wrappers.

---

## 6. Testing & Verification

1. **Backend Unit Tests:**
   - Spatial clustering math & grid resolution tests.
   - Time-slice filtering and edge-case tests (empty traces, single trace, dense multi-cluster).
2. **Frontend Component & Integration Tests:**
   - Timeline scrubber interaction & time synchronization.
   - Cluster marker rendering & formatting.
3. **Kubernetes / Minikube End-to-End Test:**
   - Build container images inside Minikube's Docker daemon.
   - Apply manifests (`kubectl apply -k k8s/`).
   - Validate pod readiness and curl health check endpoints.
