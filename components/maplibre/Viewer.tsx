'use client';

import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; 

interface MapLibreProps {
  styleUrl?: string;
  style?: string | maplibregl.StyleSpecification;
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
  onMapLoad?: (map: maplibregl.Map) => void; 
  children?: React.ReactNode; 
  options?: Partial<maplibregl.MapOptions>; 
}

const MapLibreViewer: React.FC<MapLibreProps> = ({
  styleUrl = 'https://demotiles.maplibre.org/style.json', 
  initialCenter = [106.8456, -6.2088], 
  initialZoom = 12,
  className = '',
  onMapLoad,
  children,
  options,
  style,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return; 
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style || styleUrl,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false, 
      ...options
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.current.on('load', () => {
      setIsLoaded(true);
      if (onMapLoad && map.current) {
        onMapLoad(map.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {isLoaded && children}
    </div>
  );
};

export default MapLibreViewer;
