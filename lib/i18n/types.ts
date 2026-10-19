// Supported locales
export type Locale = "en" | "id";

// Translation structure - single source of truth
// TypeScript will enforce that all translation files implement this interface
export interface Translations {
  navbar: {
    title: string;
    subtitle: string;
  };
  nav: {
    home: string;
    digitalTwin: string;
    sliceComparison: string;
  };
  landing: {
    badge: string;
    heroTitle: string;
    heroHighlight: string;
    heroDescription: string;
    openDigitalTwin: string;
    openSliceComparison: string;
    statVolcanoes: string;
    statEpochs: string;
    statLayers: string;
    modulesTitle: string;
    modulesSubtitle: string;
    digitalTwinTitle: string;
    digitalTwinDescription: string;
    digitalTwinPoints: string[];
    sliceTitle: string;
    sliceDescription: string;
    slicePoints: string[];
    open: string;
    featuresTitle: string;
    features: { title: string; description: string }[];
    volcanoesTitle: string;
    epochs: string;
    elevation: string;
    footer: string;
    scrollHint: string;
    storyKicker: string;
    storyTitle: string;
    storyBody: string;
    explore: string;
    datasetCodes: string;
    photoCredits: string;
  };
  viewer: {
    loadingViewer: string;
    loadingSplat: string;
    tilesPending: string;
    splatReady: string;
    splatUnavailable: string;
    layers: string;
    tools: string;
    analysis: string;
    about: string;
  };
  twin: {
    search: string;
    noResults: string;
    volcano: string;
    epoch: string;
    epochs: string;
    sources: { terrain: string; ortho: string; splat: string };
    layers: string;
    layerNames: { terrain: string; hillshade: string; ortho: string; splat: string; lst: string };
    layerHints: { terrain: string; hillshade: string; ortho: string; splat: string; lst: string };
    notInEpoch: string;
    basemap: string;
    basemaps: { map: string; satellite: string; osm: string };
    compare: string;
    compareHint: string;
    compareModes: { ortho: string; splat: string };
    left: string;
    right: string;
    tools: string;
    ruler: string;
    depth: string;
    measureHint: string;
    distance: string;
    heightDiff: string;
    clear: string;
    simulations: string;
    lahar: {
      name: string;
      title: string;
      description: string;
      start: string;
      pickStart: string;
      picking: string;
      pickHint: string;
      volume: string;
      confidence: string;
      resolution: string;
      resolutions: { coarse: string; fine: string };
      run: string;
      rerun: string;
      reset: string;
      computing: string;
      zones: { upper: string; central: string; lower: string };
      steps: string;
      cell: string;
      truncated: string;
      splatHidden: string;
      note: string;
      modes: { primary: string; secondary: string };
      descriptionSecondary: string;
      clearStart: string;
      earlier: string;
      later: string;
      stemShare: string;
      corridor: string;
      sources: string;
      sourcesNote: string;
      totalDeposit: string;
      needEpochs: string;
      registrationCaveat: string;
      lod: string;
      verticalBias: string;
    };
    crater: {
      name: string;
      title: string;
      level: string;
      water: string;
      lava: string;
      volume: string;
      filled: string;
    };
    view2d: string;
    view3d: string;
    loadingSplat: string;
    splatUnplaced: string;
    hidePanel: string;
    showPanel: string;
    environment: string;
    lstOpacity: string;
    lstDate: string;
  };
  slice: {
    title: string;
    loading: string;
    filesLoaded: string;
    layers: string;
    verticalExaggeration: string;
    layerSpacing: string;
    showAll: string;
    hideAll: string;
    hint: string;
  };
  common: {
    loading: string;
    error: string;
    height: string;
  };
  mountain: string;
  mountainCard: {
    elevation: string;
    series: string;
  };
  timeSeries: {
    title: string;
    current: string;
    play: string;
    pause: string;
    comparison: string;
    comparisonModes: {
      ortho: string;
      terrain: string;
      gaussianSplat: string;
    };
    leftYear: string;
    rightYear: string;
  };
  displayMode: {
    title: string;
    terrain: string;
    ortho: string;
    tiles3d: string;
    gaussianSplat: string;
  };
  sensor: {
    title: string;
    thermal: string;
    wind: string;
    seismic: string;
    gas: string;
    deformation: string;
  };
  basemap: {
    title: string;
    osm: string;
    cesium: string;
    esri: string;
  };
  dimension: {
    title: string;
    calculate: string;
    diameter: string;
    depth: string;
    volumeDelta: string;
    pointA: string;
    pointB: string;
    depthDifference: string;
  };
  weather: {
    title: string;
    temperature: string;
    wind: string;
    humidity: string;
  };
  airQuality: {
    title: string;
    so2: string;
    pm25: string;
    pm10: string;
    noStations: string;
    station: string;
    lastUpdated: string;
    safe: string;
    moderate: string;
    unhealthy: string;
  };
  fire: {
    title: string;
    hotspots: string;
    noHotspots: string;
    brightness: string;
    frp: string;
    satellite: string;
    instrument: string;
    distance: string;
    detected: string;
    lastDays: string;
  };
  earthquake: {
    title: string;
    events: string;
    noEvents: string;
    magnitude: string;
    depth: string;
    distance: string;
    recorded: string;
    lastDays: string;
  };
  lst: {
    title: string;
    show: string;
    date: string;
    opacity: string;
    legend: string;
    noDates: string;
    description: string;
  };
}

// Context value type
export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}
