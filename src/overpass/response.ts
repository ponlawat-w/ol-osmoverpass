// Type definition of OverpassAPI response with out:json settings

export type OSMElementType = 'node'|'way'|'relation';

export type OSMElementBase = {
  type: OSMElementType,
  id: number,
  tags: { name?: string } & Record<string, string>
};

export type OSMNode = OSMElementBase & {
  type: 'node',
  lat: number,
  lon: number,
};

export type OSMWay = OSMElementBase & {
  type: 'way',
  nodes: number[]
};

export type OSMRelationMember = {
  type: OSMElementType,
  ref: number,
  role: string
};

export type OSMRelation = OSMElementBase & {
  type: 'relation',
  members: []
};

export type OSMElement = OSMNode | OSMWay | OSMRelation;

export type OverpassResponse = {
  version: number,
  generator: string,
  elements: OSMElement[],
  osm3s: {
    timestamp_osm_base: string,
    copyright: string
  }
};
