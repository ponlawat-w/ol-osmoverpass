import { beforeAll, beforeEach, describe, expect, it, vi, test } from 'vitest';
import { Map, View } from 'ol';
import { boundingExtent, buffer, containsCoordinate } from 'ol/extent';
import { Vector as VectorLayer } from 'ol/layer';
import { Projection, transform, transformExtent } from 'ol/proj';
import { Window } from 'happy-dom';
import { OVERPASS_API_ENDPOINT, OVERPASS_FETCH_TIMEOUT } from './common';
import { OSMOverpassNodeSource, Overpass } from '../dist';

describe('Test OSMOverpassNodeSource', () => {
  const epsg4326 = new Projection({ code: 'EPSG:4326' });

  let window: Window;
  let map: Map;
  let view: View;

  beforeAll(() => {
    Overpass.endpointURL = OVERPASS_API_ENDPOINT;
  });

  beforeEach(() => {
    window = new Window({
      width: 1600,
      height: 900
    });
    const document = window.document;

    document.body.innerHTML = '<div id="map" style="width: 1600px; height: 900px;"></div>';

    view = new View();
    view.fit(boundingExtent([
      transform([98.97670, 18.78093], epsg4326, view.getProjection()),
      transform([98.99458, 18.79623], epsg4326, view.getProjection())
    ]));

    map = new Map({
      target: 'map',
      view,
      layers: []
    });
  });

  it('fetches nodes', async() => {
    const source = new OSMOverpassNodeSource({
      maximumResolution: view.getResolutionForExtent(boundingExtent([
        transform([98.97102, 18.77532], epsg4326, map.getView().getProjection()),
        transform([99.00217, 18.80194], epsg4326, map.getView().getProjection())
      ])),
      overpassQuery: 'node["amenity"="restaurant"];'
    });
    let featuresLoaded = false;
    let featuresLoadStarted = false;
    source.on('featuresloadstart', () => featuresLoadStarted = true);
    source.on('featuresloadend', () => featuresLoaded = true);

    const layer = new VectorLayer<OSMOverpassNodeSource>({ source });
    map.addLayer(layer);

    const extent = view.getViewStateAndExtent().extent;
    source.loadFeatures(extent, view.getResolution()!, view.getProjection());
    
    expect(featuresLoadStarted).toBeTruthy();

    await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });
    expect(source.getFeatures().length).toBeGreaterThan(0);
    expect(source.getFeatures().map(f => f.getGeometry()!).every(g => containsCoordinate(extent, g.getFirstCoordinate())));
  });

  it('does not fetch node when the map view is too big (options.maximumResolution)', () => {
    const source = new OSMOverpassNodeSource({
      maximumResolution: view.getResolutionForExtent(boundingExtent([
        transform([98.98231, 18.78593], epsg4326, map.getView().getProjection()),
        transform([98.98752, 18.78972], epsg4326, map.getView().getProjection())
      ])),
      overpassQuery: 'node["amenity"="restaurant"];'
    });
    let featuresLoadStarted = false;
    source.on('featuresloadstart', () => featuresLoadStarted = true);

    const layer = new VectorLayer<OSMOverpassNodeSource>({ source });
    map.addLayer(layer);

    const extent = view.getViewStateAndExtent().extent;
    source.loadFeatures(extent, view.getResolution()!, view.getProjection());
    
    expect(featuresLoadStarted).toBeFalsy();
  });

  it('fetches node with buffered extent (options.fetchBufferSize)', async() => {
    const source = new OSMOverpassNodeSource({
      maximumResolution: view.getResolutionForExtent(boundingExtent([
        transform([98.97102, 18.77532], epsg4326, map.getView().getProjection()),
        transform([99.00217, 18.80194], epsg4326, map.getView().getProjection())
      ])),
      fetchBufferSize: 150,
      overpassQuery: 'node["amenity"="restaurant"];'
    });
    const viewExtent = view.getViewStateAndExtent().extent;
    const bufferedExtent = buffer([...viewExtent], source.options.fetchBufferSize);

    let featuresLoaded = false;
    source.on('featuresloadend', () => featuresLoaded = true);

    const layer = new VectorLayer<OSMOverpassNodeSource>({ source });
    map.addLayer(layer);

    source.loadFeatures(viewExtent, view.getResolution()!, view.getProjection());

    await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });

    expect(source.getFeatures().length).toBeGreaterThan(0);
    expect(
      source.getFeatures()
        .map(f => f.getGeometry()!.getFirstCoordinate())
        .every(c => containsCoordinate(bufferedExtent, c))
    ).toBeTruthy();
    expect(
      source.getFeatures()
        .map(f => f.getGeometry()!.getFirstCoordinate())
        .some(c => !containsCoordinate(viewExtent, c))
    ).toBeTruthy();
  });

  it('does not fetch when map panned within buffer', async() => {
    const source = new OSMOverpassNodeSource({
      maximumResolution: view.getResolutionForExtent(boundingExtent([
        transform([98.97713, 18.78098], epsg4326, view.getProjection()),
        transform([98.99402, 18.79558], epsg4326, view.getProjection())
      ])),
      fetchBufferSize: 500,
      overpassQuery: 'node["amenity"="restaurant"];'
    });
    let featuresLoadEnded = false;
    let featuresLoadStarted = false;
    let featuresLoadedCount = 0;
    source.on('featuresloadstart', () => featuresLoadStarted = true);
    source.on('featuresloadend', () => { featuresLoadEnded = true; featuresLoadedCount++; });

    const layer = new VectorLayer<OSMOverpassNodeSource>({ source });
    map.addLayer(layer);

    // initial view, should fetch
    view.fit(boundingExtent([
      transform([98.98471, 18.78555], epsg4326, view.getProjection()),
      transform([98.98814, 18.78836], epsg4326, view.getProjection())
    ]));

    source.loadFeatures(view.getViewStateAndExtent().extent, view.getResolution()!, view.getProjection());
    
    expect(featuresLoadStarted).toBeTruthy();
    await vi.waitUntil(() => featuresLoadEnded, { timeout: OVERPASS_FETCH_TIMEOUT });
    expect(featuresLoadedCount).toEqual(1);
    
    // moved view within fetched buffer, should not fetch
    view.fit(boundingExtent([
      transform([98.98355, 18.78620], epsg4326, view.getProjection()),
      transform([98.98455, 18.78720], epsg4326, view.getProjection())
    ]));

    featuresLoadStarted = false;
    featuresLoadEnded = false;
    source.loadFeatures(view.getViewStateAndExtent().extent, view.getResolution()!, view.getProjection());

    expect(featuresLoadStarted).toBeFalsy();
    expect(featuresLoadedCount).toEqual(1);

    // moved view outside fetched buffer, should fetch
    view.fit(boundingExtent([
      transform([98.96144, 18.78716], epsg4326, view.getProjection()),
      transform([98.96415, 18.78950], epsg4326, view.getProjection())
    ]));

    featuresLoadStarted = false;
    featuresLoadEnded = false;
    source.loadFeatures(view.getViewStateAndExtent().extent, view.getResolution()!, view.getProjection());

    expect(featuresLoadStarted).toBeTruthy();
    await vi.waitUntil(() => featuresLoadEnded, { timeout: OVERPASS_FETCH_TIMEOUT });
    expect(featuresLoadedCount).toEqual(2);
  });

  it('stores caches', async() => {
    const initialExtent = boundingExtent([
      transform([98.98148, 18.78811], epsg4326, view.getProjection()),
      transform([98.98234, 18.78882], epsg4326, view.getProjection())
    ]);
    const movedExtent = boundingExtent([
      transform([98.97928, 18.78822], epsg4326, view.getProjection()),
      transform([98.98015, 18.78880], epsg4326, view.getProjection())
    ]);
    const initialExtentNodesCount = (await Overpass.fetchInExtent(
      transformExtent(initialExtent, view.getProjection(), epsg4326), 'node;')
    ).elements.length;
    const movedExtentNodesCount = (await Overpass.fetchInExtent(
      transformExtent(movedExtent, view.getProjection(), epsg4326), 'node;')
    ).elements.length;
    const source = new OSMOverpassNodeSource({
      maximumResolution: view.getResolutionForExtent(boundingExtent([
        transform([98.97713, 18.78098], epsg4326, view.getProjection()),
        transform([98.99402, 18.79558], epsg4326, view.getProjection())
      ])),
      fetchBufferSize: 0,
      overpassQuery: 'node;',
      cachedFeaturesCount: (initialExtentNodesCount + movedExtentNodesCount) * 2
    });
    let featuresLoaded = false;
    source.on('featuresloadend', () => featuresLoaded = true);
    const layer = new VectorLayer<OSMOverpassNodeSource>({ source });
    map.addLayer(layer);

    view.fit(initialExtent);
    source.loadFeatures(view.getViewStateAndExtent().extent, view.getResolution()!, view.getProjection());
    await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });

    const selectedId = source.getFeatures()[0].getId();

    featuresLoaded = false;
    view.fit(movedExtent);
    source.loadFeatures(view.getViewStateAndExtent().extent, view.getResolution()!, view.getProjection());
    await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });

    expect(source.getFeatures().some(f => f.getId() === selectedId)).toBeTruthy();
  });

  it('clears caches when exceeds', async() => {
    const initialExtent = boundingExtent([
      transform([98.98148, 18.78811], epsg4326, view.getProjection()),
      transform([98.98234, 18.78882], epsg4326, view.getProjection())
    ]);
    const movedExtent = boundingExtent([
      transform([98.97928, 18.78822], epsg4326, view.getProjection()),
      transform([98.98015, 18.78880], epsg4326, view.getProjection())
    ]);
    const initialExtentNodesCount = (await Overpass.fetchInExtent(
      transformExtent(initialExtent, view.getProjection(), epsg4326), 'node;')
    ).elements.length;
    const source = new OSMOverpassNodeSource({
      maximumResolution: view.getResolutionForExtent(boundingExtent([
        transform([98.97713, 18.78098], epsg4326, view.getProjection()),
        transform([98.99402, 18.79558], epsg4326, view.getProjection())
      ])),
      fetchBufferSize: 0,
      overpassQuery: 'node;',
      cachedFeaturesCount: initialExtentNodesCount - 1
    });
    let featuresLoaded = false;
    source.on('featuresloadend', () => featuresLoaded = true);
    const layer = new VectorLayer<OSMOverpassNodeSource>({ source });
    map.addLayer(layer);

    view.fit(initialExtent);
    source.loadFeatures(view.getViewStateAndExtent().extent, view.getResolution()!, view.getProjection());
    await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });

    const selectedId = source.getFeatures()[0].getId();

    featuresLoaded = false;
    view.fit(movedExtent);
    source.loadFeatures(view.getViewStateAndExtent().extent, view.getResolution()!, view.getProjection());
    await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });

    expect(source.getFeatures().every(f => f.getId() !== selectedId)).toBeTruthy();
  });
});

test('Test OSMOverpassNodeSource on ESPG:4326', async() => {
  const window = new Window({ width: 1600, height: 900 });
  const document = window.document;
  document.body.innerHTML = '<div id="map" style="width: 1600px; height: 900px;"></div>';

  const view = new View({ projection: 'EPSG:4326' });
  view.setViewportSize([1600, 900]);
  view.fit(boundingExtent([
    [98.98190, 18.78549],
    [98.98904, 18.79184]
  ]));
  const source = new OSMOverpassNodeSource({
    maximumResolution: view.getResolutionForExtent(boundingExtent([
      [98.97217, 18.77835],
      [98.99875, 18.79946]
    ])),
    fetchBufferSize: 0.0001,
    overpassEndpointURL: OVERPASS_API_ENDPOINT,
    overpassQuery: 'node["amenity"="restaurant"];'
  });
  const layer = new VectorLayer<OSMOverpassNodeSource>({ source });

  const map = new Map({
    target: 'map',
    view,
    layers: [layer]
  });

  let featuresLoaded = false;
  source.on('featuresloadend', () => featuresLoaded = true);

  source.loadFeatures(view.getViewStateAndExtent().extent, map.getView().getResolution()!, view.getProjection());
  await vi.waitUntil(() => featuresLoaded, { timeout: OVERPASS_FETCH_TIMEOUT });

  expect(source.getFeatures().length).toBeGreaterThan(0);
  const bufferedExtent = buffer(view.getViewStateAndExtent().extent, source.options.fetchBufferSize);
  expect(
    source.getFeatures()
      .map(f => f.getGeometry()!.getFirstCoordinate())
      .every(c => containsCoordinate(bufferedExtent, c))
  ).toBeTruthy();
});
