import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: 'production',
  entry: './dist/index.js',
  module: {
    rules: [{
      test: /\.(js)$/,
      exclude: /node_modules/,
      resolve: {
        fullySpecified: false
      }
    }]
  },
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
    path: path.resolve(__dirname, 'dist', 'bundle'),
    filename: 'index.js',
    library: {
      type: 'var',
      name: 'OSMOverpass'
    }
  },
};
