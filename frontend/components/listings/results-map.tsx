"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "@/lib/format";
import type { ListingCard } from "@/types/api";
import { MapCard } from "./map-card";

type Props = {
  listings: ListingCard[];
  /** The address of each listing's page, by listing id. */
  hrefs: Record<number, string>;
  /** Shown over a plain panel if the map tiles cannot be loaded (plan §7.2). */
  placeLabel: string;
};

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const INDIA: [number, number] = [22.5, 79];

/**
 * The map beside the results (plan §6.5): one price marker per listing on the page;
 * clicking a marker opens a small card that links to the listing (capture B4). Leaflet
 * with OpenStreetMap tiles; it is loaded in the browser only, as it needs the window.
 * The map does not search as it moves: that is a placeholder in this project (§3).
 */
export function ResultsMap({ listings, hrefs, placeLabel }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<number, Marker>());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [popupNode, setPopupNode] = useState<HTMLElement | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    const placed = markers.current;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current) return;

      const map = L.map(container.current, { zoomControl: false, attributionControl: true });
      mapRef.current = map;
      L.control.zoom({ position: "topright" }).addTo(map);

      let loaded = false;
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 })
        .on("tileload", () => {
          loaded = true;
          setTilesFailed(false);
        })
        .on("tileerror", () => {
          if (!loaded) setTilesFailed(true);
        })
        .addTo(map);

      const points: [number, number][] = [];
      for (const listing of listings) {
        if (listing.latitude === null || listing.longitude === null) continue;
        const point: [number, number] = [listing.latitude, listing.longitude];
        points.push(point);
        const marker = L.marker(point, {
          icon: L.divIcon({
            className: "map-price",
            html: `<span>${formatMoney(listing.price_per_night_minor)}</span>`,
            iconSize: [0, 0],
          }),
          title: `${listing.property_type.name} in ${listing.city}`,
          keyboard: true,
        }).addTo(map);
        marker.on("click", () => {
          // The card is drawn by React after the popup opens; giving its box a size now
          // lets the map move far enough to show all of it.
          const node = document.createElement("div");
          node.style.cssText = "width:327px;min-height:310px";
          L.popup({ closeButton: false, className: "map-card", offset: [0, -18], minWidth: 327, maxWidth: 327 })
            .setLatLng(point)
            .setContent(node)
            .on("remove", () => setSelectedId((current) => (current === listing.id ? null : current)))
            .openOn(map);
          setPopupNode(node);
          setSelectedId(listing.id);
        });
        placed.set(listing.id, marker);
      }

      if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 12 });
      else map.setView(INDIA, 4);
    })();

    return () => {
      cancelled = true;
      placed.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      setSelectedId(null);
    };
  }, [listings]);

  // The chosen marker turns dark (capture B4).
  useEffect(() => {
    for (const [id, marker] of markers.current) {
      marker.getElement()?.classList.toggle("map-price-selected", id === selectedId);
    }
  }, [selectedId]);

  const selected = listings.find((listing) => listing.id === selectedId);

  return (
    <div className="relative h-full w-full bg-[#e5e3df]">
      <div ref={container} className="h-full w-full" role="region" aria-label={`Map of homes in ${placeLabel}`} />
      {tilesFailed && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-control p-6 text-center text-muted">
          The map could not be loaded. Showing homes in {placeLabel}.
        </div>
      )}
      {selected &&
        popupNode &&
        createPortal(
          <MapCard
            listing={selected}
            href={hrefs[selected.id]}
            onClose={() => mapRef.current?.closePopup()}
          />,
          popupNode,
        )}
    </div>
  );
}
