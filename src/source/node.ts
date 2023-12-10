import { Feature } from 'ol';
import { Projection } from 'ol/proj';
import OSMOverpass from '../overpass/osm.js';
import OSMOverpassSourceBase from './base.js';
import type { Extent } from 'ol/extent';
import type { Point } from 'ol/geom';

/**
 * OSMOverpassSource for Nodes
 */
export default class OSMOverpassNodeSource extends OSMOverpassSourceBase<Point> {
  /**
   * Fetch nodes from OSM OverpassAPI
   * @param extent fetch extent
   * @param projection projection
   * @returns fetched feature points
   */
  protected fetchOSMOverpass(extent: Extent, projection: Projection): Promise<Feature<Point>[]> {
    return OSMOverpass.fetchNodes(extent, projection, this.options.overpassQuery, this.options.overpassEndpointURL);
  }
};
