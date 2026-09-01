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
      maxZoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    const cartoKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_2orj_1_263a710e118c5efbcc95c551';
    const keyParam = cartoKey ? `?key=${cartoKey}&api_key=${cartoKey}&v=auth_clean` : '';

    // Clean cartographic tile layer with warm parchment filter
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png${keyParam}`, {
      className: 'vintage-parchment-tiles',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Subtle country labels
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png${keyParam}`, {
      className: 'vintage-parchment-tiles',
      subdomains: 'abcd',
      maxZoom: 19,
      opacity: 0.65,
    }).addTo(map);

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
        if (c.isCluster && mapInstanceRef.current) {
          mapInstanceRef.current.setView(
            [c.latitude, c.longitude],
            Math.min(10, mapInstanceRef.current.getZoom() + 1)
          );
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
