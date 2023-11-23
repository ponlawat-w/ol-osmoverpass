# OpenLayers OSMOverpass

OpenLayers extension for vector source that dynamically pulls data from OpenStreetMap using Overpass API.

---

# Examples

## OSM Nodes

```ts
import VectorLayer from 'ol/layer/Vector';
import { OSMOverpassWaySource } from 'ol-osmoverpass';

const layer = new VectorLayer({
  source: new OSMOverpassWaySource({
    maximumResolution: 5,
    fetchBufferSize: 250,
    overpassEndpointURL: 'https://...', // Choose one instance from https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
    overpassQuery: 'node["amenity"="restaurant"];'
  })
});

map.addLayer(layer);
```

## OSM Ways

```ts

import VectorLayer from 'ol/layer/Vector';
import { OSMOverpassWaySource } from 'ol-osmoverpass';

const layer = new VectorLayer({
  source: new OSMOverpassWaySource({
    maximumResolution: 5,
    fetchBufferSize: 250,
    overpassEndpointURL: 'https://...', // Choose one instance from https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
    overpassQuery: '(way["highway"];>;);'
  })
});

map.addLayer(layer);
```

## Options

### Constructor options

- `cachedFeaturesCount: number` - The number of features to store before getting cleared. This is to prevent heavy memory consumption.
- `fetchBufferSize: number` - Buffer size to apply to the extent of fetching OverpassAPI. This is to prevent excessive call despite slight map view panning. **USE THE SAME PROJECTION WITH THE LAYER**.
- `maximumResolution: number` - Map view resolution to start fetching OverpassAPI. This is to prevent fetching elements in too big extent. **USE THE SAME PROJECTION WITH THE LAYER**
- `overpassQuery: string` - OverpassQL statement(s) to fetch, excluding settings and out statements.
- `overpassEndpointURL?: string` - OverpassAPI endpoint URL (https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances)

---
