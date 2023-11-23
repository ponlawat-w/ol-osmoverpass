import { Feature } from 'ol';
import { Extent } from 'ol/extent';
import { LineString } from 'ol/geom';
import { Projection } from 'ol/proj';
import OSMOverpass from '../overpass/osm';
import OSMOverpassSourceBase from './base';

/**
 * OSMOverpassSource for Ways
 */
export default class OSMOverpassWaySource extends OSMOverpassSourceBase<LineString> {
  /**
   * Fetch ways from OSMOverpassAPI
   * @param extent fetch extent
   * @param projection projection
   * @returns fetched feature linestring
   */
  protected fetchOSMOverpass(extent: Extent, projection: Projection): Promise<Feature<LineString>[]> {
    return OSMOverpass.fetchWays(extent, projection, this.options.overpassQuery, this.options.overpassEndpointURL);
  }
}
