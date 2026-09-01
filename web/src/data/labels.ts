export interface GeoLabel {
  name: string;
  lat: number;
  lng: number;
  minZoom: number;
  maxZoom?: number;
  type: 'ocean' | 'country' | 'state' | 'water';
}

export const GEO_LABELS: GeoLabel[] = [
  // --- Major Oceans & Seas ---
  { name: 'G U L F   O F   A M E R I C A', lat: 25.5, lng: -90.0, minZoom: 3, maxZoom: 10, type: 'water' },
  { name: 'L A K E   A M E R I C A', lat: 43.65, lng: -77.8, minZoom: 4, maxZoom: 14, type: 'water' },
  { name: 'N O R T H   A T L A N T I C   O C E A N', lat: 32.0, lng: -48.0, minZoom: 2, maxZoom: 6, type: 'ocean' },
  { name: 'N O R T H   P A C I F I C   O C E A N', lat: 32.0, lng: -145.0, minZoom: 2, maxZoom: 6, type: 'ocean' },
  { name: 'C A R I B B E A N   S E A', lat: 14.8, lng: -75.0, minZoom: 3, maxZoom: 8, type: 'water' },
  { name: 'H U D S O N   B A Y', lat: 60.0, lng: -85.5, minZoom: 3, maxZoom: 8, type: 'water' },
  { name: 'L A K E   S U P E R I O R', lat: 47.7, lng: -87.5, minZoom: 5, maxZoom: 12, type: 'water' },
  { name: 'L A K E   M I C H I G A N', lat: 43.8, lng: -87.1, minZoom: 5, maxZoom: 12, type: 'water' },
  { name: 'L A K E   H U R O N', lat: 44.9, lng: -82.4, minZoom: 5, maxZoom: 12, type: 'water' },
  { name: 'L A K E   E R I E', lat: 42.2, lng: -81.2, minZoom: 5, maxZoom: 12, type: 'water' },

  // --- Countries (Zoom 2 to 7) ---
  { name: 'U N I T E D   S T A T E S', lat: 39.8, lng: -98.5, minZoom: 2, maxZoom: 6, type: 'country' },
  { name: 'C A N A D A', lat: 56.5, lng: -106.0, minZoom: 2, maxZoom: 6, type: 'country' },
  { name: 'M E X I C O', lat: 23.5, lng: -102.5, minZoom: 2, maxZoom: 6, type: 'country' },
  { name: 'G R E E N L A N D', lat: 72.0, lng: -40.0, minZoom: 2, maxZoom: 6, type: 'country' },
  { name: 'B R A Z I L', lat: -10.0, lng: -53.0, minZoom: 2, maxZoom: 6, type: 'country' },
  { name: 'C O L O M B I A', lat: 4.0, lng: -73.0, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'V E N E Z U E L A', lat: 8.0, lng: -66.0, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'P E R U', lat: -9.5, lng: -75.0, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'C U B A', lat: 21.8, lng: -79.5, minZoom: 3, maxZoom: 8, type: 'country' },
  { name: 'U N I T E D   K I N G D O M', lat: 54.5, lng: -2.5, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'F R A N C E', lat: 46.5, lng: 2.5, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'G E R M A N Y', lat: 51.0, lng: 10.0, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'S P A I N', lat: 40.0, lng: -3.7, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'I T A L Y', lat: 42.5, lng: 12.5, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'J A P A N', lat: 36.5, lng: 138.0, minZoom: 3, maxZoom: 7, type: 'country' },
  { name: 'A U S T R A L I A', lat: -25.0, lng: 134.0, minZoom: 2, maxZoom: 6, type: 'country' },

  // --- States & Provinces (Zoom 5+) ---
  { name: 'T E X A S', lat: 31.0, lng: -99.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'C A L I F O R N I A', lat: 36.8, lng: -119.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'F L O R I D A', lat: 28.0, lng: -81.8, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'N E W   Y O R K', lat: 42.8, lng: -75.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'I L L I N O I S', lat: 40.0, lng: -89.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'P E N N S Y L V A N I A', lat: 41.0, lng: -77.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'O H I O', lat: 40.2, lng: -82.7, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'G E O R G I A', lat: 32.7, lng: -83.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'N O R T H   C A R O L I N A', lat: 35.5, lng: -79.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'M I C H I G A N', lat: 44.3, lng: -85.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'W A S H I N G T O N', lat: 47.4, lng: -120.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'C O L O R A D O', lat: 39.0, lng: -105.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'A R I Z O N A', lat: 34.0, lng: -111.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'O N T A R I O', lat: 48.0, lng: -85.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Q U E B E C', lat: 52.0, lng: -71.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'A L B E R T A', lat: 54.0, lng: -115.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'B R I T I S H   C O L U M B I A', lat: 54.0, lng: -124.0, minZoom: 5, maxZoom: 12, type: 'state' },
];
