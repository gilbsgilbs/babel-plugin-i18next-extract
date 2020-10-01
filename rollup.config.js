import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';

import pkg from './package.json';

const extensions = ['.js', '.ts'];

export default {
  input: {
    index: 'src/index.ts',
  },
  output: [
    {
      dir: 'lib/',
      format: 'cjs',
      exports: 'named',
    },
    {
      dir: 'lib/es/',
      format: 'es',
      exports: 'named',
    },
  ],
  external: [
    'fs',
    'path',
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    resolve({ extensions }),
    babel({
      include: 'src/**/*',
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
      extensions,
    }),
  ],
};
