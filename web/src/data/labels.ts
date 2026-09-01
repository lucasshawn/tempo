export interface GeoLabel {
  name: string;
  lat: number;
  lng: number;
  minZoom: number;
  maxZoom?: number;
  type: 'ocean' | 'country' | 'state' | 'water';
}

export const GEO_LABELS: GeoLabel[] = [
  // --- Major Water Bodies & Seas (Visible at balanced regional zoom) ---
  { name: 'Gulf of America', lat: 25.8, lng: -90.0, minZoom: 4, maxZoom: 10, type: 'water' },
  { name: 'Lake America', lat: 43.65, lng: -77.8, minZoom: 5, maxZoom: 14, type: 'water' },
  { name: 'North Atlantic Ocean', lat: 32.0, lng: -48.0, minZoom: 2, maxZoom: 5, type: 'ocean' },
  { name: 'North Pacific Ocean', lat: 32.0, lng: -145.0, minZoom: 2, maxZoom: 5, type: 'ocean' },
  { name: 'Caribbean Sea', lat: 14.8, lng: -75.0, minZoom: 4, maxZoom: 8, type: 'water' },
  { name: 'Hudson Bay', lat: 60.0, lng: -85.5, minZoom: 4, maxZoom: 8, type: 'water' },
  { name: 'Lake Superior', lat: 47.7, lng: -87.5, minZoom: 5, maxZoom: 12, type: 'water' },
  { name: 'Lake Michigan', lat: 43.8, lng: -87.1, minZoom: 5, maxZoom: 12, type: 'water' },
  { name: 'Lake Huron', lat: 44.9, lng: -82.4, minZoom: 5, maxZoom: 12, type: 'water' },
  { name: 'Lake Erie', lat: 42.2, lng: -81.2, minZoom: 5, maxZoom: 12, type: 'water' },

  // --- Countries ---
  { name: 'United States', lat: 39.8, lng: -98.5, minZoom: 2, maxZoom: 5, type: 'country' },
  { name: 'Canada', lat: 56.5, lng: -106.0, minZoom: 2, maxZoom: 5, type: 'country' },
  { name: 'Mexico', lat: 23.5, lng: -102.5, minZoom: 2, maxZoom: 5, type: 'country' },
  { name: 'Greenland', lat: 72.0, lng: -40.0, minZoom: 2, maxZoom: 5, type: 'country' },
  { name: 'Brazil', lat: -10.0, lng: -53.0, minZoom: 2, maxZoom: 5, type: 'country' },
  { name: 'Colombia', lat: 4.0, lng: -73.0, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Venezuela', lat: 8.0, lng: -66.0, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Peru', lat: -9.5, lng: -75.0, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Cuba', lat: 21.8, lng: -79.5, minZoom: 4, maxZoom: 8, type: 'country' },
  { name: 'United Kingdom', lat: 54.5, lng: -2.5, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'France', lat: 46.5, lng: 2.5, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Germany', lat: 51.0, lng: 10.0, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Spain', lat: 40.0, lng: -3.7, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Italy', lat: 42.5, lng: 12.5, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Japan', lat: 36.5, lng: 138.0, minZoom: 3, maxZoom: 6, type: 'country' },
  { name: 'Australia', lat: -25.0, lng: 134.0, minZoom: 2, maxZoom: 5, type: 'country' },

  // --- States & Provinces (Zoom 5+) ---
  { name: 'Texas', lat: 31.0, lng: -99.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'California', lat: 36.8, lng: -119.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Florida', lat: 28.0, lng: -81.8, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'New York', lat: 42.8, lng: -75.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Illinois', lat: 40.0, lng: -89.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Pennsylvania', lat: 41.0, lng: -77.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Ohio', lat: 40.2, lng: -82.7, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Georgia', lat: 32.7, lng: -83.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'North Carolina', lat: 35.5, lng: -79.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Michigan', lat: 44.3, lng: -85.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Washington', lat: 47.4, lng: -120.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Colorado', lat: 39.0, lng: -105.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Arizona', lat: 34.0, lng: -111.5, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Ontario', lat: 48.0, lng: -85.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Quebec', lat: 52.0, lng: -71.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'Alberta', lat: 54.0, lng: -115.0, minZoom: 5, maxZoom: 12, type: 'state' },
  { name: 'British Columbia', lat: 54.0, lng: -124.0, minZoom: 5, maxZoom: 12, type: 'state' },
];
