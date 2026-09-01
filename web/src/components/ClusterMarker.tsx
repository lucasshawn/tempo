import L from 'leaflet';
import { TraceCluster } from '../types/trace';

export function createClusterIcon(cluster: TraceCluster): L.DivIcon {
  if (!cluster.isCluster) {
    return L.divIcon({
      className: 'custom-single-marker',
      html: '<div class="marker-single-ring" style="width: 22px; height: 22px;"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  // Size badge dynamically according to count magnitude
  const size = Math.min(56, Math.max(34, 30 + Math.floor(Math.log10(cluster.count + 1) * 14)));

  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `<div class="marker-cluster-badge" style="width: ${size}px; height: ${size}px;">${cluster.count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
