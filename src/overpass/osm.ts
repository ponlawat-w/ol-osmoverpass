import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { transform, transformExtent, Projection } from 'ol/proj';
import OverpassAPI from './api';
import type { Coordinate } from 'ol/coordinate';
import type { Extent } from 'ol/extent';
import type { Geometry } from 'ol/geom';
import type { OSMNode, OSMWay, OverpassResponse } from './response';

/**
 * Function to convert response from OverpassAPI into geometries
 * @param respose Response from OverpassAPI
 * @param projection Target projection (from caller)
 */
export type OSMElementConverter<GeometryType extends Geometry = Geometry> = (response: OverpassResponse, projection: Projection) => Feature<GeometryType>[];

/**
 * OSM way elements fetcher from OverpassAPI
*/
export default class OSMOverpass {
  private constructor() {}

  /**
   * Fetch elements with query and return features converted from response.
   * @param extent fetch extent
   * @param projection projection
   * @param query OverpassQL for querying ways
   * @param converter function to convert response into features
   * @param endpoint OverpassAPI endpoint URL
   * @returns features fetched
   */
  public static async fetch<GeometryType extends Geometry = Geometry>(
    extent: Extent,
    projection: Projection,
    query: string,
    converter: OSMElementConverter<GeometryType>,
    endpoint?: string
  ): Promise<Feature<GeometryType>[]> {
    if (projection.getCode() !== 'EPSG:4326') {
      extent = transformExtent(extent, projection, 'EPSG:4326');
    }
    const response = await OverpassAPI.fetchInExtent(extent, query, 'out;', endpoint);
    return converter(response, projection);
  }

  /**
   * Fetch nodes from OSM in the specified extent and query, transform to geometric objects of points and return the array of their features.
   * @param extent fetch extent
   * @param projection projection
   * @param query OverpassQL for querying nodes (excluding settings and out statements)
   * @param endpoint OverpassAPI endpoint URL
   * @param converter function to convert response into features
   * @returns features fetched
   */
  public static async fetchNodes(
    extent: Extent,
    projection: Projection,
    query: string,
    endpoint?: string,
    converter?: OSMElementConverter<Point>,
  ): Promise<Feature<Point>[]> {
    return await OSMOverpass.fetch(extent, projection, query, converter ?? OSMOverpass.defaultNodesConverter, endpoint);
  }
  
  /**
   * Fetch ways and relevant nodes from OSM in the specified extent and query, transform to geometric objects of linestrings and return the array of their features.
   * @param extent fetch extent
   * @param projection projection
   * @param query OverpassQL for querying nodes (excluding settings and out statements)
   * @param endpoint OverpassAPI endpoint URL
   * @param converter function to convert response into features
   * @returns features fetched
   */
  public static async fetchWays(
    extent: Extent,
    projection: Projection,
    query: string,
    endpoint?: string,
    converter?: OSMElementConverter<LineString>
  ): Promise<Feature<LineString>[]> {
    return await OSMOverpass.fetch(extent, projection, query, converter ?? OSMOverpass.defaultWaysConverter, endpoint);
  }

  /**
   * Default function to convert response from OverpassAPI into Point features.
   * @param response OverpassAPI response
   * @param projection Target projection
   * @returns Point features
   */
  private static defaultNodesConverter(response: OverpassResponse, projection: Projection): Feature<Point>[] {
    const nodeToCoordinate: ((node: OSMNode) => Coordinate) = projection.getCode() === 'EPSG:4326' ?
      node => [node.lon, node.lat] : node => transform([node.lon, node.lat], 'EPSG:4326', projection);
    return (response.elements.filter(x => x.type === 'node') as OSMNode[])
      .map(node => {
        const feature = new Feature<Point>(new Point(nodeToCoordinate(node)));
        feature.setProperties({
          OSM_ID: node.id,
          ...node.tags
        });
        feature.setId(node.id);
        return feature;
      });
  }

  /**
   * Default function to convert response from OverpassAPI into LineString features.
   * @param response OverpassAPI response
   * @param projection Target projection
   * @returns LineString features
   */
  private static defaultWaysConverter(response: OverpassResponse, projection: Projection): Feature<LineString>[] {
    const nodes: { [id: number]: OSMNode } = (response.elements.filter(x => x.type === 'node') as OSMNode[])
    .reduce((dict, node: OSMNode) => {
      dict[node.id] = node;
      return dict;
    }, {} as { [id: number]: OSMNode });

    const nodesToCoordinates: ((nodeIds: number[]) => Coordinate[]) = projection.getCode() === 'EPSG:4326' ?
      nodeIds => nodeIds.map(id => [nodes[id].lon, nodes[id].lat])
      : nodeIds => nodeIds.map(id => transform([nodes[id].lon, nodes[id].lat], 'EPSG:4326', projection));

    return (response.elements.filter(x => x.type === 'way') as OSMWay[])
      .map(way => {
        const coordinates = nodesToCoordinates(way.nodes);
        const feature = new Feature<LineString>(new LineString(coordinates));
        feature.setProperties({
          OSM_ID: way.id,
          ...way.tags
        });
        feature.setId(way.id);
        return feature;
      });
  }
};
