import { expect, test, vi } from 'vitest';
import { OVERPASS_API_ENDPOINT, OVERPASS_FETCH_TIMEOUT } from './common';
import { Map, View } from 'ol';
import { boundingExtent, containsCoordinate } from 'ol/extent';
import { Vector as VectorLayer } from 'ol/layer';
import { Projection, transform } from 'ol/proj';
import { Window } from 'happy-dom';
import { OSMOverpassWaySource } from '../dist';

test('Test OSMOverpassWaySource', async() => {
  const epsg4326 = new Projection({ code: 'EPSG:4326' });
  const window = new Window({ width: 1600, height: 900 });
  const document = window.document;
  document.body.innerHTML = '<div id="map" style="width: 1600px; height: 900px;"></div>';

  const view = new View();
  const initialExtent = boundingExtent([
    transform([98.98472, 18.78784], epsg4326, view.getProjection()),
    transform([98.98602, 18.78885], epsg4326, view.getProjection())
  ]);
  view.fit(initialExtent);

  const source = new OSMOverpassWaySource({
    maximumResolution: view.getResolutionForExtentInternal(boundingExtent([
      transform([98.97715, 18.78114], epsg4326, view.getProjection()),
      transform([98.99414, 18.79575], epsg4326, view.getProjection())
    ])),
    fetchBufferSize: 0,
    overpassQuery: '(way["highway"];>;);',
    overpassEndpointURL: OVERPASS_API_ENDPOINT
  });
  let featuresLoaded = false;
  source.on('featuresloadend', () => featuresLoaded = true);
  const layer = new VectorLayer({ source });

  const map = new Map({
    target: 'map',
    view, layers: [layer]
  });

  source.loadFeatures(view.getViewStateAndExtent().extent, map.getView().getResolution()!, view.getProjection());
  await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });

  expect(source.getFeatures().length).toBeGreaterThan(0);
  expect(
    source.getFeatures().map(f => f.getGeometry()!)
      .some(g => g.getCoordinates().some(c => containsCoordinate(initialExtent, c)))
  ).toBeTruthy();
});
