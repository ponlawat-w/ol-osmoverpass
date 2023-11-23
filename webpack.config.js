const path = require('path');

module.exports = {
  mode: 'production',
  entry: './dist/index.js',
  resolve: {
    alias: { ol: false }
  },
  externalsType: 'var',
  externals: {
    'ol': 'ol',
    'ol/geom': 'ol.geom',
    'ol/extent': 'ol.extent',
    'ol/loadingstrategy': 'ol.loadingstrategy',
    'ol/proj': 'ol.proj',
    'ol/source': 'ol.source',
    'ol/style': 'ol.style'
  },
  output: {
    path: path.resolve(__dirname, 'dist', 'webpack'),
    filename: 'index.js',
    library: {
      type: 'var',
      name: 'OSMOverpass'
    }
  },
};
