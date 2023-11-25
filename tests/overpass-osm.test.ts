import { beforeAll, describe, expect, it } from 'vitest';
import { Feature } from 'ol';
import { boundingExtent, containsCoordinate } from 'ol/extent';
import { LineString } from 'ol/geom';
import { Projection } from 'ol/proj';
import { OSMOverpass, Overpass, OSMNode, OSMWay } from '../dist';
import type { OSMElementConverter } from '../dist';
import type { Coordinate } from 'ol/coordinate';

describe('Test OSMOverpass', () => {
  const coor1: Coordinate = [98.98017, 18.78764];
  const coor2: Coordinate = [98.98259, 18.78950];
  const extent = boundingExtent([coor1, coor2]);
  const projection = new Projection({ code: 'EPSG:4326' });

  beforeAll(() => {
    Overpass.endpointURL = 'https://overpass-api.de/api/interpreter';
  });

  it('is able to fetch nodes', async() => {
    const nodes = await OSMOverpass.fetchNodes(extent, projection, 'node["name"];');
    expect(
      nodes.every(n =>
        n.getGeometry()!.getType() === 'Point'
        && containsCoordinate(extent, n.getGeometry()!.getFirstCoordinate()))
    ).toBeTruthy();
  });

  it('is able to fetch ways', async() => {
    const ways = await OSMOverpass.fetchWays(extent, projection, '(way["highway"];>;);');
    expect(
      ways.every(w => w.getGeometry()!.getType() === 'LineString')
    ).toBeTruthy();
    expect(
      ways.every(w =>
        w.getGeometry()!.getCoordinates().some(c => containsCoordinate(extent, c))
      )
    ).toBeTruthy();
  });
});

describe('Test OSMOverpass on a different projection', () => {
  const coor1: Coordinate = [11018965, 2130003];
  const coor2: Coordinate = [11019022, 2130062];
  const extent = boundingExtent([coor1, coor2]);
  const projection = new Projection({ code: 'EPSG:3857' });

  beforeAll(() => {
    Overpass.endpointURL = 'https://overpass-api.de/api/interpreter';
  });

  it('is able to handle a different projection while fetching', async() => {
    const points = (await OSMOverpass.fetchNodes(extent, projection, 'node;'))
      .map(n => n.getGeometry()!);
    expect(points.every(p => containsCoordinate(extent, p.getFirstCoordinate())))
      .toBeTruthy();
  });
});

describe('Test OSMOverpass using custom converter', () => {
  const coor1: Coordinate = [98.98017, 18.78764];
  const coor2: Coordinate = [98.98259, 18.78950];
  const extent = boundingExtent([coor1, coor2]);
  const projection = new Projection({ code: 'EPSG:4326' });

  beforeAll(() => {
    Overpass.endpointURL = 'https://overpass-api.de/api/interpreter';
  });

  it('is able to fetch and convert response to feature using customised converter', async() => {
    const converter: OSMElementConverter<LineString> = response => {
      const nodes: OSMNode[] = response.elements.filter(x => x.type === 'node') as OSMNode[];
      const ways: OSMWay[] = response.elements.filter(x => x.type === 'way' && x.nodes.length > 1) as OSMWay[];
      return ways.map(w => {
        const first = nodes.filter(x => x.id === w.nodes[0])[0];
        const last = nodes.filter(x => x.id === w.nodes[w.nodes.length - 1])[0];
        return new Feature<LineString>(new LineString([
          [first.lon, first.lat],
          [last.lon, last.lat]
        ]));
      });
    };
    const features = await OSMOverpass.fetch(extent, projection, '(way["highway"];>;);', converter);
    expect(features.every(f => f.getGeometry()!.getCoordinates().length === 2))
      .toBeTruthy();
  });
});
