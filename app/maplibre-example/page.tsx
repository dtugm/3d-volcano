'use client';

import MapLibreViewer from '@/components/maplibre/Viewer';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
const TERRAIN_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    // Sumber Peta Dasar (OpenStreetMap Raster)
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
      maxzoom: 19
    },
    // Sumber untuk Data Ketinggian (Terrain)
    demoTerrain: {
      type: 'raster-dem',
      url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
      tileSize: 256
    },
    gunungAgung2017:{
      type: 'raster-dem',
      url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
      tileSize: 256
    },
    // Sumber untuk Bayangan Bukit (Hillshade)
    // Tips: Dipisah agar bisa dikontrol independen layer-nya
    // hillshadeSource: {
    //   type: 'raster-dem',
    //   url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
    //   tileSize: 256
    // },
    terrain: {
      type: 'raster-dem',
      tiles: [
        'http://localhost:3000/test_3d/tiles_4/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      encoding: 'mapbox', // SANGAT PENTING: Memberitahu cara baca warnanya
      maxzoom: 15
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm'
    },
    // {
    //   id: 'hills',
    //   type: 'hillshade',
    //   source: 'hillshadeSource',
    //   layout: { visibility: 'visible' },
    //   paint: { 'hillshade-shadow-color': '#473B24' } // Warna bayangan kecoklatan
    // }
  ],
  // Mengaktifkan Terrain 3D secara global di style
  // terrain: {
  //   source: 'terrainSource',
  //   exaggeration: 1
  // },
  // Mengaktifkan Langit
  sky: {}
};
export default function maplibre() {
  const mapInstance = useRef<maplibregl.Map | null>(null);

  const handleMapLoad = (map: maplibregl.Map) => {
    mapInstance.current = map;
    // map.addSource('terrain-source', {
    //   type: 'raster-dem',
    //   url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',      
    //   tileSize: 256
    // });
    // map.setTerrain({
    //   source: 'terrain-source',
    //   exaggeration: 1.5 
    // });
  };

  const flyToMonas = () => {
    // mapInstance.current?.flyTo({
    //   center: [106.8272, -6.1754],
    //   zoom: 15,
    //   essential: true
    // });
    mapInstance.current?.setTerrain({
      source: 'terrain',
      exaggeration: 1.5
    });
    
  };
  const lepasTerrain = () => {
    mapInstance.current?.setTerrain(null);
  };

  return (
    <main className="flex flex-col h-screen">
      <button onClick={flyToMonas}>Pasang Terrain</button>
      <button onClick={lepasTerrain}>Lepas Terrain</button>
      <div className="flex-grow relative">
        <MapLibreViewer 
          style={TERRAIN_STYLE}
          onMapLoad={handleMapLoad}
          initialZoom={11}
          options={{
            center: [117.5072, 0.125], 
            zoom: 12,
            pitch: 70, 
            maxPitch: 85,
            hash: true,
            maxZoom: 18
          }}
        />
      </div>
    </main>
  );
}
