const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/index.js',
            format: 'commonjs',
            exports: 'auto'
        },
        {
            file: 'dist/index.mjs',
            format: 'esm',
            exports: 'auto'
        }
    ],
    external: ['vue'],
    plugins: [
        nodeResolve(),
        commonjs()
    ]
};