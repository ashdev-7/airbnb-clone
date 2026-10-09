"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

type Props = { latitude: number | null; longitude: number | null; place: string };

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** The exact address is not shown before booking: a circle marks the area. */
const AREA_RADIUS_M = 700;

/**
 * "Where you'll be" (R-PL-3; capture C1): the place in words and a map of the area, 480 px
 * tall. Leaflet with OpenStreetMap tiles; if the tiles cannot be loaded, the words stand
 * alone over a plain panel (plan §7.2).
 */
export function LocationMap({ latitude, longitude, place }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(latitude === null || longitude === null);

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    let cancelled = false;
    let remove = () => {};

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;
      const map = L.map(container.current, { zoomControl: false, scrollWheelZoom: false }).setView(
        [latitude, longitude],
        13,
      );
      remove = () => map.remove();
      L.control.zoom({ position: "topright" }).addTo(map);

      let loaded = false;
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 })
        .on("tileload", () => {
          loaded = true;
          setFailed(false);
        })
        .on("tileerror", () => {
          if (!loaded) setFailed(true);
        })
        .addTo(map);
      L.circle([latitude, longitude], {
        radius: AREA_RADIUS_M,
        color: "#ff385c",
        weight: 1,
        fillColor: "#ff385c",
        fillOpacity: 0.2,
      }).addTo(map);
    })();

    return () => {
      cancelled = true;
      remove();
    };
  }, [latitude, longitude]);

  return (
    <div className="relative isolate h-[480px] overflow-hidden rounded-xl bg-[#e5e3df]">
      <div ref={container} className="h-full w-full" role="region" aria-label={`Map of the area around ${place}`} />
      {failed && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-control p-6 text-center text-muted">
          The map could not be loaded. This place is in {place}.
        </div>
      )}
    </div>
  );
}
