import { parse } from 'path';
import { hmrPlugin } from '@open-wc/dev-server-hmr';
import { fromRollup } from '@web/dev-server-rollup';
import { createFilter, dataToEsm } from '@rollup/pluginutils';

const myElementPatch = `
import { MsBaseElement } from '../../src/base-element.js';
MsBaseElement.prototype.hotReplacedCallback = function hotReplacedCallback() {
  console.log('Hot cakes incoming!');
  this.render();
};
`;

export default {
  // open: true,
  nodeResolve: true,
  appIndex: 'index.html',
  mimeTypes: {
    // serve all src files as js
    'src/**/*': 'js',
  },
  plugins: [
    fromRollup(importAsTextPlugin)(),
    hmrPlugin({
      exclude: ['**/*/node_modules/**/*'],
      baseClasses: [{ name: 'MsBaseElement', import: './src/base-element.js' }],
      patches: [myElementPatch],
    }),
  ],
};

// Inspiration from https://github.com/rollup/plugins/blob/master/packages/json/src/index.js
export function importAsTextPlugin(options = {}) {
  options = {
    exts: ['.html', '.svg', '.css'],
    transform: (content) => content,
    ...options,
  };
  const filter = createFilter(options.include, options.exclude);
  const indent = 'indent' in options ? options.indent : '\t';

  return {
    name: 'import-as-text',
    transform(content, id) {
      const { ext } = parse(id);
      if (!options.exts.some((t) => ext === t) || !filter(id)) return null;

      try {
        const parsed = options.transform(content, id) ?? content;
        return {
          code: dataToEsm(parsed, {
            preferConst: options.preferConst,
            compact: options.compact,
            namedExports: options.namedExports,
            indent,
          }),
          map: { mappings: '' },
        };
      } catch (err) {
        const message = `Could not parse ${ext} file`;
        const position = parseInt(/[\d]/.exec(err.message)[0], 10);
        this.warn({ message, id, position });
        return null;
      }
    },
  };
}
