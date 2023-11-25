import { describe, beforeAll, it, expect } from 'vitest';
import { boundingExtent, containsXY } from 'ol/extent';
import { Overpass, type OSMNode } from '../dist';
import type { Coordinate } from 'ol/coordinate';


describe('Test OverpassAPI', () => {
  beforeAll(() => {
    Overpass.endpointURL = 'https://overpass-api.de/api/interpreter';
  });

  it('converts OL Extent to OverpassQL bbox', () => {
    const coor1: Coordinate = [11, 91];
    const coor2: Coordinate = [12, 90];
    const extent = boundingExtent([coor1, coor2]);
    expect(Overpass.extentToBBox(extent)).toEqual('[bbox:90,11,91,12]');
  });

  it('is able to fetch data', async() => {
    const response = await Overpass.fetch(
      '[out:json];',
      'relation(1908771);',
      'out;'
    );
    expect(response.elements.length).toEqual(1);
    expect(response.elements[0].id).toEqual(1908771);
  });

  it('is able to fetch data within an extent', async() => {
    const coor1: Coordinate = [98.98507, 18.78762];
    const coor2: Coordinate = [98.98565, 18.78713];
    const extent = boundingExtent([coor1, coor2]);

    const response = await Overpass.fetchInExtent(extent, 'node;');
    expect(
      (response.elements as OSMNode[]).every((e: OSMNode) => containsXY(extent, e.lon, e.lat))
    ).toBeTruthy();
  });
});
