const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (_env, argv) => {
    const isDev = argv.mode !== 'production';
    return {
        entry: path.join(__dirname, 'src/index.js'),
        output: {
            path: path.join(__dirname, 'dist/'),
            filename: 'index.js',
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.js/,
                    exclude: /node_modules/,
                },
                {
                    test: /\.css/,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        performance: { hints: false },
        stats: 'minimal',
        devtool: isDev ? 'source-map' : false,
        // SillyTavern loads a single JS file per manifest.json `js` entry.
        // We inline all dynamic imports into the main bundle so no chunk
        // files need to be fetched at runtime.
        optimization: {
            minimize: !isDev,
            usedExports: true,
            splitChunks: false,
            runtimeChunk: false,
            minimizer: [new TerserPlugin({ extractComments: false })],
        },
    };
};
