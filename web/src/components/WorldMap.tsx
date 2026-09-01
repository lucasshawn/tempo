import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TraceCluster } from '../types/trace';
import { createClusterIcon } from './ClusterMarker';

export interface WorldMapProps {
  clusters: TraceCluster[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSelectCluster?: (cluster: TraceCluster) => void;
}

// Leaflet custom Canvas Tile Layer: transforms every tile in-memory to guaranteed deep blue oceans and parchment land
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
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (lum < 165) {
            // Country labels, text & international boundaries -> sharp slate navy (#1e2832)
            d[i] = Math.floor(r * 0.25 + 24);
            d[i + 1] = Math.floor(g * 0.25 + 36);
            d[i + 2] = Math.floor(b * 0.25 + 52);
          } else if (b > r + 2 || lum < 230) {
            // Oceans / Sea water -> rich, deep oceanic maritime blue (#3f586f)
            const t = Math.max(0, Math.min(1, (lum - 170) / 60));
            d[i] = Math.floor(52 + t * 20);
            d[i + 1] = Math.floor(74 + t * 24);
            d[i + 2] = Math.floor(102 + t * 28);
          } else {
            // Landmasses -> high-contrast warm antique parchment (#ebe0c7)
            const t = Math.max(0, Math.min(1, (lum - 230) / 25));
            d[i] = Math.floor(232 + t * 8);
            d[i + 1] = Math.floor(220 + t * 8);
            d[i + 2] = Math.floor(196 + t * 6);
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

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [38.0, -95.0],
      zoom: zoom || 3,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    const cartoKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_2orj_1_263a710e118c5efbcc95c551';

    // Canvas Tile Layer with live pixel processing for oceanic blue waters and parchment land
    new (VintageOceanCanvasLayer as any)(
      `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${cartoKey}`,
      {
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    map.on('zoomend', () => {
      onZoomChange(map.getZoom());
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
