var fs = require('fs');
var path = require('path');

module.exports = {
	module: {
		loaders: [{
			test: /\.js$/,
			loader: 'babel',
			exclude: /node_modules/,
			query: JSON.parse(fs.readFileSync(path.join(__dirname, '.babelrc')))
		}]
	},

	entry: './src/index.js',

	target: 'node',
	output: {
		path: path.join(__dirname, 'tmp'),
		libraryTarget: 'commonjs2',
		filename: 'index.js'
	}
};
