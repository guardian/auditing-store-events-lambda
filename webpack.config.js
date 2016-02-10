var fs = require('fs');
var path = require('path');

var webpack = require('webpack');

var banner = new webpack.BannerPlugin('var AWS = require("aws-sdk");', {
	raw: true,
	entryOnly: true
});

module.exports = {
	module: {
		loaders: [{
			test: /\.js$/,
			loader: 'babel',
			exclude: /node_modules/,
			query: JSON.parse(fs.readFileSync(path.join(__dirname, '.babelrc')))
		}, {
			test: /\.json$/,
			loader: 'json'
		}]
	},

	entry: './src/index.js',
	plugins: [banner],

	target: 'node',
	output: {
		path: path.join(__dirname, 'tmp'),
		libraryTarget: 'commonjs2',
		filename: 'index.js'
	}
};
