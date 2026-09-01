import L from 'leaflet';
import { TraceCluster } from '../types/trace';

export function createClusterIcon(cluster: TraceCluster): L.DivIcon {
  const count = cluster.count || 1;

  if (count === 1) {
    const size = 26;
    return L.divIcon({
      className: 'custom-single-marker',
      html: `<div class="marker-single-badge" style="width: ${size}px; height: ${size}px;">1</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  // Size badge dynamically according to count magnitude (2 -> 32px, 100 -> 52px)
  const size = Math.min(54, Math.max(32, 28 + Math.floor(Math.log10(count + 1) * 14)));
  const fontSize = count >= 100 ? 12 : count >= 10 ? 14 : 15;

  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `<div class="marker-cluster-badge" style="width: ${size}px; height: ${size}px; font-size: ${fontSize}px;">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
