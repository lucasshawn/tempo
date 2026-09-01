# Design Specification: Trace Context Bottom Flyout Panel

**Date:** 2026-09-01  
**Status:** Approved  
**Author:** Shawn Lucas & Antigravity  
**Branch:** `feature/trace-flyout`

---

## 1. Overview & Goals

When a user clicks a single-event number bubble (`"1"`) on the Tempo interactive world map, a bottom flyout panel slides up displaying rich details for that specific **Trace Context**.

### Key Objectives:
1. **Time/Place Trace Definition:**
   - **Tier 1 Headline:** Friendly location name (e.g. *Point Reyes Headlands*).
   - **Tier 2 Subheading:** Closest city/town/state/province (e.g. *MARIN COUNTY, CALIFORNIA*).
   - **Tier 3 Meta Information:** Date & time formatted cleanly, accompanied by ambient weather (temperature & condition e.g. *58°F Foggy*).
2. **Chronological Multi-Medium Feed:**
   - A chronologically ordered stream of content items associated with the trace context:
     - **Photos:** High-resolution landscape and environment photography.
     - **Audio & Transcripts:** Waveform player with interactive play/pause and collapsible transcript view.
     - **Notes:** Thoughtful journal entries and field notes.
     - **Video:** Video preview thumbnails with duration and play action.
     - **Connections:** People and collaborators included in the context.
3. **Visual Aesthetic Match:**
   - Replicate the antique warm parchment card aesthetic (`#f5ede0`), serif display headers, uppercase ochre sub-labels, rounded corners, soft shadows, and privacy indicators from the reference design.
4. **Intuitive Dismissal & Pan Interactions:**
   - Smooth slide-up transition, subtle map centering, and multiple dismissal avenues (close button, backdrop click, Escape key, timeline scrubbing).

---

## 2. Architecture & Data Model

### 2.1 Backend Data Structures (`tempo-api`)

#### Models (`internal/models/trace.go`)

```go
type MediaType string

const (
	MediaPhoto       MediaType = "photo"
	MediaVideo       MediaType = "video"
	MediaAudio       MediaType = "audio"
	MediaNote        MediaType = "note"
	MediaConnections MediaType = "connections"
)

type TraceConnection struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl,omitempty"`
	Role      string `json:"role,omitempty"`
}

type TraceMediaItem struct {
	ID         string            `json:"id"`
	Type       MediaType         `json:"type"`
	Timestamp  time.Time         `json:"timestamp"`
	URL        string            `json:"url,omitempty"`
	PosterURL  string            `json:"posterUrl,omitempty"`
	Duration   string            `json:"duration,omitempty"`
	Waveform   []float64         `json:"waveform,omitempty"`
	Transcript string            `json:"transcript,omitempty"`
	Text       string            `json:"text,omitempty"`
	People     []TraceConnection `json:"people,omitempty"`
}

type TraceWeather struct {
	TemperatureF int    `json:"temperatureF"`
	Condition    string `json:"condition"`
	Icon         string `json:"icon,omitempty"`
}

type TraceContext struct {
	ID                 string                 `json:"id"`
	Title              string                 `json:"title"`              // Tier 1 Headline
	LocationSubheading string                 `json:"locationSubheading"` // Tier 2 Subheading
	Latitude           float64                `json:"latitude"`
	Longitude          float64                `json:"longitude"`
	Timestamp          time.Time              `json:"timestamp"`          // Tier 3 Timestamp
	Weather            TraceWeather           `json:"weather"`            // Tier 3 Weather
	IsPrivate          bool                   `json:"isPrivate"`
	Feed               []TraceMediaItem       `json:"feed"`               // Chronological media feed
	Category           string                 `json:"category,omitempty"`
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
}
```

### 2.2 Frontend Data Structures (`tempo-web`)

#### Types (`src/types/trace.ts`)

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
```

---

## 3. UI Component Architecture (`tempo-web`)

### Component Breakdown

1. **`TraceFlyoutPanel` (`src/components/TraceFlyoutPanel.tsx`)**:
   - Master flyout card container.
   - Handles mount/unmount animations, keyboard listeners (`Escape`), backdrop click propagation, and feed scrolling.
   - Header with category overline `TRACE`, Close `✕` button, Tier 1 Title, Tier 2 Subheading, and Tier 3 Meta row (calendar date + weather pill).
   - Feed items renderer with chronological sorting.
   - Footer with `🔒 PRIVATE` / `🌐 PUBLIC` badge and `•••` action button.

2. **Feed Item Components**:
   - **`PhotoFeedItem`**: Renders rounded photographic media with fallback and subtle borders.
   - **`AudioWaveformPlayer`**: Inset player card with play/pause state toggle, animated canvas/SVG waveform bars, duration timer, and expandable transcript accordions.
   - **`NoteFeedItem`**: Inset parchment text card with comfortable typography and quotation styling.
   - **`VideoFeedItem`**: Video preview thumbnail with play button overlay and duration badge.
   - **`ConnectionsFeedItem`**: Inset row of participant avatar badges with names and roles.

3. **Map Integration (`src/components/WorldMap.tsx` & `src/App.tsx`)**:
   - Updates `onSelectCluster` callback when single-item marker (`count === 1`) is clicked.
   - Sets `selectedTrace: TraceContext | null` in `App.tsx` state.
   - Map smoothly offsets or pans to maintain visual hierarchy when flyout is open.
   - Closes flyout when timeline index changes or background map is clicked.

---

## 4. Visual Styling Specifications

- **Card Palette:**
  - Card Background: `#f6efe3` (Warm Antique Parchment)
  - Card Border / Highlights: `1px solid rgba(184, 163, 128, 0.4)`
  - Card Shadow: `0 16px 48px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)`
  - Border Radius: `24px` (top-left & top-right on mobile, fully rounded `24px` floating on desktop)
  - Max Width: `420px`
  - Max Height: `min(80vh, 640px)`
- **Typography:**
  - Category Overline: `font-size: 10px`, `letter-spacing: 0.22em`, `color: #aa8855`, uppercase, bold.
  - Headline (Tier 1): `font-family: var(--font-serif-display)`, `font-size: 24px`, `color: #2c2824`, font-weight 600.
  - Subheading (Tier 2): `font-family: var(--font-sans-body)`, `font-size: 11px`, `letter-spacing: 0.16em`, `color: #857c70`, uppercase, font-weight 600.
  - Meta Row: `font-size: 12px`, `color: #5a5247`, with inline SVG weather/calendar icons.
- **Feed Elements:**
  - Inset Background: `#ede4d7` / `#eae0d1`
  - Inset Border: `1px solid rgba(195, 178, 150, 0.35)`
  - Inset Border Radius: `14px`
- **Animations:**
  - Slide Up / Down: `transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease`

---

## 5. Testing & Verification

1. **Backend Tests (`tempo-api`)**:
   - `internal/generator/seed_test.go`: Verify rich seed traces generate all tiers (Title, Subheading, Timestamp, Weather, Feed items) and validate chronological order of feed items.
   - `internal/clustering/grid_test.go`: Verify single-trace clusters pass the extended `TraceContext` intact.
2. **Frontend Tests & Build (`tempo-web`)**:
   - Verify `npm run build` TypeScript compilation without errors.
   - Verify single-marker click opens the flyout with correct data.
   - Verify audio player play/pause state and transcript toggling.
   - Verify all feed media types (photo, video, audio, notes, connections) render faithfully.
   - Verify dismiss actions (close button, backdrop click, Escape key, timeline change).
