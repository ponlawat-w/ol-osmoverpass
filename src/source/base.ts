import { buffer, containsExtent } from 'ol/extent';
import { LineString, Point, Polygon } from 'ol/geom';
import { bbox } from 'ol/loadingstrategy';
import { Vector as VectorSource } from 'ol/source';
import { Style } from 'ol/style';
import OSMOverpass from '../overpass/osm.js';
import type { Feature } from 'ol';
import type RBush from 'ol/structs/RBush';
import type { Projection } from 'ol/proj';
import type { Extent } from 'ol/extent';

export type LoaderSuccessFn<GeometryType extends OSMGeometryType> = (features: Feature<GeometryType>[]) => void;
export type LoaderFailedFn = () => void;

export type OSMOverpassSourceOptions = {
  /** The number of features to store before getting cleared. This is to prevent heavy memory consumption. (Default: 20000) */
  cachedFeaturesCount: number,

  /** Buffer size to apply to the extent of fetching OverpassAPI. This is to prevent excessive call despite slight map view panning. (Default: 0) */
  fetchBufferSize: number,

  /** Map view resolution to start fetching OverpassAPI. This is to prevent fetching elements in too big extent. */
  maximumResolution: number,

  /** OverpassQL statement for ways to fetch, default to OSM highways. */
  overpassQuery: string

  /** OverpassAPI endpoint URL (https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances) */
  overpassEndpointURL?: string
};

type OSMGeometryType = Point | LineString | Polygon;

/**
 * VectorSource that automatically fetching OSM elements from OverpassAPI
 */
export default abstract class OSMOverpassSourceBase<GeometryType extends OSMGeometryType> extends VectorSource<Feature<GeometryType>> {
  /** Source options */
  public options: OSMOverpassSourceOptions;

  /** Indicating if the source is busy fetching data. This is to prevent excessive call to the API. */
  private _busy: boolean = false;

  /** Extents in which data were fetched. Inherited from VectorSource class. */
  private get loadedExtents(): RBush<{ extent: Extent }> {
    return (this as any).loadedExtentsRtree_;
  }

  /**
   * Constructor
   * @param options Options
   */
  public constructor(options?: Partial<OSMOverpassSourceOptions>) {
    super({ strategy: bbox });
    this.options = {
      cachedFeaturesCount: 20000,
      maximumResolution: 0,
      fetchBufferSize: 0,
      overpassQuery: '',
      ...(options ?? {})
    };
    this.setLoader(this.fetchFeatures);
  }

  /**
   * Load features in the specified extents
   * @param extent Extent to load features
   * @param resolution Resolution
   * @param projection Projection
   */
  public loadFeatures(extent: Extent, resolution: number, projection: Projection) {
    if (this._busy) return;
    if (resolution > this.options.maximumResolution) return;
    if (this.loadedExtents.getAll().some(e => containsExtent(e.extent, extent))) return;
    super.loadFeatures(extent, resolution, projection);
    this.removeLoadedExtent(extent);
  }

  /**
   * Abstract method to fetch data from OSMOverpass
   * @param extent fetch extent
   * @param projection projection
   * @returns
   */
  protected async fetchOSMOverpass(extent: Extent, projection: Projection): Promise<Feature<GeometryType>[]> {
    if (!this.options.overpassQuery) {
      console.warn('EMPTY OVERPASS QUERY');
      return [];
    }
    return OSMOverpass.fetch(extent, projection, this.options.overpassQuery, () => []);
  }

  /**
   * Fetch features from OverpassAPI
   * @param extent Extent to fetch (before buffering)
   * @param resolution Resolution
   * @param projection Projection
   * @param success Callback success function
   * @param failure Callback failure function
   */
  private async fetchFeatures(
    extent: Extent,
    resolution: number,
    projection: Projection,
    success?: LoaderSuccessFn<GeometryType>,
    failure?: LoaderFailedFn
  ) {
    const fetchExtent = this.options.fetchBufferSize ? buffer(extent, this.options.fetchBufferSize) : extent;
    try {
      this._busy = true;
      if (this.getFeatures().length > this.options.cachedFeaturesCount) {
        this.clear(true);
      }
      const features = await this.fetchOSMOverpass(fetchExtent, projection);
      this.addFeatures(features.filter(x => !this.getFeatureById(x.getId()!)));
      this.loadedExtents.insert(fetchExtent, { extent: fetchExtent });
      return success && success(features);
    } catch (ex) {
      failure && failure();
      throw ex;
    } finally {
      this._busy = false;
    }
  }

  public clear(fast?: boolean | undefined): void {
    this.loadedExtents.clear();
    super.clear(fast);
  }

  /**
   * Get default style of OSM source to the layer, default to be invisible as it is used for snapping only.
   * @returns Style
   */
  public static getDefaultStyle(): Style {
    return new Style({
      stroke: undefined
    });
  }
}