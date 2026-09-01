import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TraceCluster } from '../types/trace';
import { createClusterIcon } from './ClusterMarker';
import countryLines from '../data_country_lines.json';
import stateLines from '../data_state_lines.json';
import { GEO_LABELS } from '../data/labels';

export interface WorldMapProps {
  clusters: TraceCluster[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSelectCluster?: (cluster: TraceCluster) => void;
}

// Leaflet custom Canvas Tile Layer: renders 3D shaded mountain relief and deep oceanic blue
const VintageOceanCanvasLayer = L.TileLayer.extend({
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('canvas');
    tile.width = 256;
    tile.height = 256;
    const ctx = tile.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      if (!ctx) {
        done(undefined, tile);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, 256, 256);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];

          const isWater = b > r + 8 && b > g - 12;

          if (isWater) {
            // Subtle oceanic bathymetry relief on maritime slate blue (#516e88)
            const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 175.0;
            const oceanShade = 0.78 + (lum - 1.0) * 0.45; // subtle relief contrast
            d[i] = Math.floor(Math.max(45, Math.min(135, 81 * oceanShade)));
            d[i + 1] = Math.floor(Math.max(65, Math.min(165, 110 * oceanShade)));
            d[i + 2] = Math.floor(Math.max(85, Math.min(195, 136 * oceanShade)));
          } else {
            // Mountain shaded relief on warm antique parchment (#ebe0c8)
            const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 235.0;
            const shade = Math.min(1.20, Math.max(0.5, lum));
            d[i] = Math.floor(Math.max(0, Math.min(255, 235 * shade)));
            d[i + 1] = Math.floor(Math.max(0, Math.min(255, 224 * shade)));
            d[i + 2] = Math.floor(Math.max(0, Math.min(255, 200 * shade)));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {
        // Fallback
      }
      done(undefined, tile);
    };
    img.onerror = (err) => {
      done(err as any, tile);
    };
    img.src = this.getTileUrl(coords);
    return tile;
  },
});

export const WorldMap: React.FC<WorldMapProps> = ({
  clusters,
  zoom,
  onZoomChange,
  onSelectCluster,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const stateBoundariesRef = useRef<L.GeoJSON | null>(null);
  const labelsGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialZoom = zoom || 3;
    const map = L.map(mapContainerRef.current, {
      center: [38.0, -95.0],
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    });
    (window as any).__tempoMap = map;

    // 1. Base Layer: Subtle oceanic bathymetry relief + mountain shaded relief
    new (VintageOceanCanvasLayer as any)(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
      }
    ).addTo(map);

    // 2. National Boundary Lines (Always visible)
    L.geoJSON(countryLines as any, {
      style: {
        color: '#8a7d66',
        weight: 1.2,
        opacity: 0.75,
      },
      interactive: false,
    }).addTo(map);

    // 3. State & Provincial Boundary Lines (Visible at zoom >= 5)
    const stateLayer = L.geoJSON(stateLines as any, {
      style: {
        color: '#9c8f78',
        weight: 1.0,
        dashArray: '3, 4',
        opacity: 0.65,
      },
      interactive: false,
    });
    stateBoundariesRef.current = stateLayer;
    if (initialZoom >= 5) {
      stateLayer.addTo(map);
    }

    // 4. Bespoke American-Centric Vector Labels Layer
    const labelsGroup = L.layerGroup().addTo(map);
    labelsGroupRef.current = labelsGroup;

    const renderLabels = (z: number) => {
      labelsGroup.clearLayers();
      GEO_LABELS.forEach((l) => {
        if (z >= l.minZoom && (!l.maxZoom || z <= l.maxZoom)) {
          const icon = L.divIcon({
            className: 'custom-geo-label-icon',
            html: `<div class="geo-label-${l.type}">${l.name}</div>`,
            iconSize: [200, 24],
            iconAnchor: [100, 12],
          });
          L.marker([l.lat, l.lng], { icon, interactive: false }).addTo(labelsGroup);
        }
      });
    };

    renderLabels(initialZoom);

    // 5. Clusters Marker Group
    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    map.on('zoomend', () => {
      const currentZoom = map.getZoom();
      onZoomChange(currentZoom);

      // Toggle state/provincial boundaries based on zoom
      if (currentZoom >= 5) {
        if (!map.hasLayer(stateLayer)) {
          stateLayer.addTo(map);
        }
      } else {
        if (map.hasLayer(stateLayer)) {
          map.removeLayer(stateLayer);
        }
      }

      // Update American-centric labels
      renderLabels(currentZoom);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync zoom level if changed externally
  useEffect(() => {
    if (mapInstanceRef.current && mapInstanceRef.current.getZoom() !== zoom) {
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // Update markers when clusters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerGroupRef.current) return;

    markerGroupRef.current.clearLayers();

    clusters.forEach((c) => {
      const icon = createClusterIcon(c);
      const marker = L.marker([c.latitude, c.longitude], { icon });

      marker.on('click', () => {
        if (onSelectCluster) {
          onSelectCluster(c);
        }
        if (!mapInstanceRef.current) return;

        // If count > 1, zoom in to reveal distinct traces (down to ~2mi resolution at zoom 13-14)
        if (c.count > 1 || c.isCluster) {
          const latSpan = Math.abs(c.bounds.maxLat - c.bounds.minLat);
          const lngSpan = Math.abs(c.bounds.maxLng - c.bounds.minLng);

          if (latSpan > 0.001 || lngSpan > 0.001) {
            mapInstanceRef.current.fitBounds(
              [
                [c.bounds.minLat, c.bounds.minLng],
                [c.bounds.maxLat, c.bounds.maxLng],
              ],
              { maxZoom: 14, padding: [60, 60], animate: true }
            );
          } else {
            const currentZoom = mapInstanceRef.current.getZoom();
            const targetZoom = Math.min(14, Math.max(currentZoom + 3, 13));
            mapInstanceRef.current.setView([c.latitude, c.longitude], targetZoom, { animate: true });
          }
        } else {
          // Single trace click - center view smoothly
          const currentZoom = mapInstanceRef.current.getZoom();
          if (currentZoom < 10) {
            mapInstanceRef.current.setView([c.latitude, c.longitude], Math.min(14, currentZoom + 2), { animate: true });
          }
        }
      });

      markerGroupRef.current?.addLayer(marker);
    });
  }, [clusters, onSelectCluster]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <div className="orbital-ring" />
    </div>
  );
};
