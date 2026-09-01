# Trace Context Bottom Flyout Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bottom flyout panel for single Trace Contexts ("1" bubbles) on the Tempo map matching the reference clipboard design, with a 3-tier header (Friendly Name, Region/State, Date/Time + Weather) and a chronological multi-medium feed (photos, audio + transcript, notes, video, connections).

**Architecture:** Extend backend Go `TraceContext` models and deterministic generator with rich media feeds and weather; update TypeScript interfaces in the frontend; build a bespoke `TraceFlyoutPanel` React component with animated transitions, audio player, and feed renderers; wire selection and pan state into `WorldMap` and `App`.

**Tech Stack:** Go (Standard Library `net/http`), React 18, Vite, TypeScript, Leaflet, Lucide React icons.

## Global Constraints

- Backend must compile cleanly with `go test ./...` in `api/`.
- Frontend must build cleanly with `npm run build` in `web/` without TypeScript or lint errors.
- Visual styling must faithfully match the clipboard screenshot: warm parchment background (`#f6efe3`), serif title typography (`Cinzel` / `Georgia`), tracked ochre labels, rounded cards, and inset feed item containers.
- All media items in a trace context must be sorted strictly in chronological order (`timestamp`).
- Dismiss interactions: Close button `✕`, backdrop click outside card, `Escape` key, or scrubbing timeline.

---

### Task 1: Extend Backend Trace Context Models & Seed Generator

**Files:**
- Modify: `api/internal/models/trace.go`
- Modify: `api/internal/generator/seed.go`
- Test / Modify: `api/internal/generator/seed_test.go`
- Test / Modify: `api/internal/clustering/grid_test.go`

**Interfaces:**
- Produces:
  - `models.MediaType` enum (`"photo"`, `"video"`, `"audio"`, `"note"`, `"connections"`)
  - `models.TraceConnection` struct (`ID`, `Name`, `AvatarURL`, `Role`)
  - `models.TraceMediaItem` struct (`ID`, `Type`, `Timestamp`, `URL`, `PosterURL`, `Duration`, `Waveform`, `Transcript`, `Text`, `People`)
  - `models.TraceWeather` struct (`TemperatureF`, `Condition`, `Icon`)
  - Updated `models.TraceContext` struct with `LocationSubheading`, `Weather`, `IsPrivate`, and `Feed []TraceMediaItem`

- [ ] **Step 1: Write the failing unit tests for extended trace model and feed chronology**

In `api/internal/generator/seed_test.go`:
```go
package generator

import (
	"testing"
	"tempo-api/internal/models"
)

func TestGenerateSeedTracesRichFields(t *testing.T) {
	traces := GenerateSeedTraces(20)
	if len(traces) == 0 {
		t.Fatalf("expected traces, got 0")
	}

	for i, tr := range traces {
		if tr.Title == "" {
			t.Errorf("trace %d missing Title", i)
		}
		if tr.LocationSubheading == "" {
			t.Errorf("trace %d missing LocationSubheading", i)
		}
		if tr.Weather.TemperatureF == 0 && tr.Weather.Condition == "" {
			t.Errorf("trace %d missing Weather", i)
		}
		if len(tr.Feed) == 0 {
			t.Errorf("trace %d missing Feed items", i)
		}

		// Verify feed is sorted chronologically
		for j := 1; j < len(tr.Feed); j++ {
			if tr.Feed[j].Timestamp.Before(tr.Feed[j-1].Timestamp) {
				t.Errorf("trace %d feed item %d (%v) is before item %d (%v)",
					i, j, tr.Feed[j].Timestamp, j-1, tr.Feed[j-1].Timestamp)
			}
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/generator -v` in `api/`  
Expected: FAIL with compilation errors (unknown fields `LocationSubheading`, `Weather`, `Feed`).

- [ ] **Step 3: Update models and seed generator implementation**

In `api/internal/models/trace.go`, define `MediaType`, `TraceConnection`, `TraceMediaItem`, `TraceWeather`, and update `TraceContext`.
In `api/internal/generator/seed.go`, populate realistic Tier 1 friendly names, Tier 2 location subheadings, Tier 3 timestamps & weather, and chronological feed items (photos, audio + transcript, notes, video, connections).

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test ./...` in `api/`  
Expected: PASS for all tests across `api/internal/generator`, `api/internal/clustering`, `api/internal/store`, `api/internal/handlers`, and `api/internal/telemetry`.

- [ ] **Step 5: Commit**

```bash
git add api/internal/models/trace.go api/internal/generator/seed.go api/internal/generator/seed_test.go api/internal/clustering/grid_test.go
git commit -m "feat(api): enrich TraceContext with weather, location subheading, and chronological media feed"
```

---

### Task 2: Update Frontend TypeScript Types

**Files:**
- Modify: `web/src/types/trace.ts`
- Test: `web/src/types/trace.ts` (typecheck via `npm run build`)

**Interfaces:**
- Consumes: JSON responses from `api/internal/models/trace.go`
- Produces: TypeScript types `MediaType`, `TraceConnection`, `TraceMediaItem`, `TraceWeather`, and updated `TraceContext`

- [ ] **Step 1: Update `web/src/types/trace.ts`**

```typescript
export type MediaType = 'photo' | 'video' | 'audio' | 'note' | 'connections';

export interface TraceConnection {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface TraceMediaItem {
  id: string;
  type: MediaType;
  timestamp: string;
  url?: string;
  posterUrl?: string;
  duration?: string;
  waveform?: number[];
  transcript?: string;
  text?: string;
  people?: TraceConnection[];
}

export interface TraceWeather {
  temperatureF: number;
  condition: string;
  icon?: string;
}

export interface TraceContext {
  id: string;
  title: string;
  locationSubheading: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  weather: TraceWeather;
  isPrivate: boolean;
  feed: TraceMediaItem[];
  category?: string;
  metadata?: Record<string, any>;
}

export interface ClusterBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface TraceCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  isCluster: boolean;
  bounds: ClusterBounds;
  event?: TraceContext;
}

export interface ClusteredResponse {
  time: string;
  totalEvents: number;
  clusters: TraceCluster[];
}

export interface TimelineSummary {
  startTime: string;
  endTime: string;
  timeSlices: string[];
  totalEvents: number;
}
```

- [ ] **Step 2: Run typecheck build**

Run: `npm run build` in `web/`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add web/src/types/trace.ts
git commit -m "feat(web): update TraceContext and media feed TypeScript interfaces"
```

---

### Task 3: Build the `TraceFlyoutPanel` Component & Feed Medium Renderers

**Files:**
- Create: `web/src/components/TraceFlyoutPanel.tsx`
- Modify: `web/src/styles/theme.css`

**Interfaces:**
- Consumes: `TraceContext`, `TraceMediaItem`, `TraceWeather`
- Produces: `<TraceFlyoutPanel trace={trace} onClose={() => void} />`

- [ ] **Step 1: Implement `TraceFlyoutPanel.tsx` with all feed renderers**

Implement:
- Top Header:
  - Category `TRACE` in tracked golden ochre
  - Close `✕` icon button
  - Tier 1 Headline (Serif `Cinzel`/`Georgia`, 22px)
  - Tier 2 Subheading (Tracked uppercase `MARIN COUNTY, CALIFORNIA`)
  - Tier 3 Meta row: Calendar icon + formatted date/time + cloud/sun icon + temperature & condition
- Feed Mediums:
  - **Photos**: Rounded photographic image with subtle border.
  - **Audio Player**: Inset player card with circular play/pause button, animated interactive waveform bars, duration counter (`0:45`), and collapsible transcript accordions.
  - **Notes**: Inset journal text card with quotation marks and atmospheric typography.
  - **Video**: Video card with play button badge overlay and duration.
  - **Connections**: Participant avatar chips and names.
- Footer:
  - `🔒 PRIVATE` / `🌐 PUBLIC` badge
  - `•••` action button with subtle golden ring
- Keyboard listener for `Escape` to close.

- [ ] **Step 2: Add theme styles in `web/src/styles/theme.css`**

Add CSS classes for:
- `.trace-flyout-container` (slide-up animation `cubic-bezier(0.16, 1, 0.3, 1)`, scrollbar styling)
- `.waveform-bar` (animated audio bars with heights and gold/slate gradient)
- Inset cards and typography rules.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run build` in `web/`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/components/TraceFlyoutPanel.tsx web/src/styles/theme.css
git commit -m "feat(web): create TraceFlyoutPanel with rich media feed and audio player"
```

---

### Task 4: Integrate Flyout with World Map and Application State

**Files:**
- Modify: `web/src/components/WorldMap.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Consumes: `<TraceFlyoutPanel />`, `TraceCluster.event`, `onSelectCluster`
- Produces: Interactive click on `1` bubble opens flyout; map centers nicely; timeline changes auto-dismiss; backdrop click dismisses.

- [ ] **Step 1: Update `WorldMap.tsx` to handle single-trace selection**

Ensure marker clicks pass the entire cluster/event through `onSelectCluster`.
When a single trace (`count === 1`) is clicked, trigger `onSelectCluster(cluster)`.

- [ ] **Step 2: Update `App.tsx` to manage `selectedTrace` state**

In `App.tsx`:
- Add `selectedTrace: TraceContext | null` state.
- When `onSelectCluster` is called on a cluster where `count === 1 && cluster.event`, set `selectedTrace(cluster.event)`.
- When `currentIndex` (timeline scrub) changes, dismiss open flyout (`setSelectedTrace(null)`).
- Render `<TraceFlyoutPanel trace={selectedTrace} onClose={() => setSelectedTrace(null)} />` when `selectedTrace` is not null.

- [ ] **Step 3: Run build to verify clean compilation**

Run: `npm run build` in `web/`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/components/WorldMap.tsx web/src/App.tsx
git commit -m "feat(web): wire single marker clicks to TraceFlyoutPanel and manage selection lifecycle"
```

---

### Task 5: End-to-End Verification & Interactive Testing

**Files:**
- Create / Run: `web/verify-flyout.cjs` (Automated Puppeteer/Playwright or Node script to verify DOM rendering, flyout emergence, audio player interaction, and dismissal)

- [ ] **Step 1: Write an automated verification script `web/verify-flyout.cjs`**

Script starts local Vite dev server / uses existing build, loads page, triggers marker click on a `1` badge, checks DOM for:
- Flyout container existence
- Tier 1 Headline (*Point Reyes Headlands* or location title)
- Tier 2 Subheading (City/State)
- Tier 3 Meta row (Date/Time + Weather)
- Feed items (photo, audio waveform, note, video, connections)
- Audio play button toggle interaction
- Dismissal via close button `✕`

- [ ] **Step 2: Run verification script**

Run: `node web/verify-flyout.cjs`  
Expected: All assertions pass with screenshot artifact generated.

- [ ] **Step 3: Run full backend and frontend builds**

Run: `go test ./...` in `api/`  
Run: `npm run build` in `web/`  
Expected: All tests and builds pass.

- [ ] **Step 4: Commit verification tests**

```bash
git add web/verify-flyout.cjs
git commit -m "test(web): add automated end-to-end verification for trace context flyout"
```
