"use client";

import { Marker, type PositionAnchor } from "maplibre-gl";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useMapContext } from "./MapContext";

/** DOM marker; children are portalled into the marker element. */
export function MapMarker({
  lngLat,
  anchor = "center",
  children,
}: {
  lngLat: [number, number];
  anchor?: PositionAnchor;
  children: ReactNode;
}) {
  const { map } = useMapContext();
  const [element] = useState(() => document.createElement("div"));
  const [marker, setMarker] = useState<Marker | null>(null);

  useEffect(() => {
    const instance = new Marker({ element, anchor }).setLngLat(lngLat).addTo(map);
    setMarker(instance);
    return () => {
      instance.remove();
    };
    // Re-created only when the anchor changes; position updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, anchor]);

  useEffect(() => {
    marker?.setLngLat(lngLat);
  }, [marker, lngLat]);

  return createPortal(children, element);
}
