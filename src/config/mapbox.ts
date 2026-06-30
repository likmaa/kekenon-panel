/**
 * Configuration Mapbox (web). Token PUBLIC (pk.) — destiné à être exposé côté client.
 * Surchargeable via VITE_MAPBOX_TOKEN dans l'env du dashboard ; fallback = token public des apps.
 */
export const MAPBOX_TOKEN: string =
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) || '';

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

/** Centre par défaut : Porto-Novo */
export const PORTO_NOVO: { lng: number; lat: number } = { lng: 2.6283, lat: 6.4969 };

/**
 * Génère l'anneau d'un cercle géographique (rayon en mètres) en coordonnées [lng, lat],
 * pour dessiner une zone via une couche GeoJSON Polygon (Mapbox n'a pas de cercle géo natif).
 */
export function circleRing(lng: number, lat: number, radiusMeters: number, points = 48): [number, number][] {
  const earth = 6378137;
  const coords: [number, number][] = [];
  const latRad = (Math.PI * lat) / 180;
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    const dx = (radiusMeters * Math.cos(theta)) / (earth * Math.cos(latRad));
    const dy = (radiusMeters * Math.sin(theta)) / earth;
    coords.push([lng + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI]);
  }
  return coords;
}
