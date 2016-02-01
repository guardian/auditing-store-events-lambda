var gulp = require('gulp');
var yaml = require('gulp-yaml');
var mocha = require('gulp-spawn-mocha');
var eslint = require('gulp-eslint');
var webpack = require('webpack-stream');
var zip = require('gulp-zip');
var AWS = require('aws-sdk');
var data = require('gulp-data');
var template = require('gulp-template');
var rename = require('gulp-rename');
process.env.ARTEFACT_PATH = __dirname;
var riffraff = require('node-riffraff-artefact');
var path = require('path');

gulp.task('default', ['cloudformation']);
gulp.task('dev', ['cloudformation-dev', 'test-dev']);


/* Cloudformation tasks */

gulp.task('cloudformation', function () {
	return gulp.src('cloudformation/*.yml')
		.pipe(yaml({ space: 4 }))
		.pipe(gulp.dest('./tmp/riffraff/packages/cloudformation'));
});

gulp.task('cloudformation-dev', ['cloudformation'], function () {
	gulp.watch('cloudformation/*.yml', ['cloudformation']);
});


/* Validation tasks */

gulp.task('test', ['lint', 'mocha']);

gulp.task('mocha', function () {
	return gulp.src('test/specs/*.js', {read: false})
		.pipe(mocha({
			opts: 'test/mocha.opts'
		}));
});

gulp.task('test-dev', ['test'], function () {
	gulp.watch('test/*.js', ['test']);
});

gulp.task('lint', function () {
	return gulp.src(['src/*.js'])
		.pipe(eslint())
		.pipe(eslint.formatEach('compact', process.stderr))
		.pipe(eslint.failAfterError());
});

/* Deploy tasks */

gulp.task('riffraff', function () {
	return gulp.src('deploy.yml')
		.pipe(data(function () {
			return fetchFromS3('lambda-private', 'auditing-lambda.secrets.json')
			.then(function (secrets) {
				return { secrets: secrets };
			});
		}))
		.pipe(template())
		.pipe(yaml({ space: 4 }))
		.pipe(rename('deploy.json'))
		.pipe(gulp.dest('tmp/riffraff'));
});

gulp.task('compile', function () {
	return gulp.src(['src/index.js'])
		.pipe(webpack( require('./webpack.config') ))
		.pipe(gulp.dest('tmp/'));
});

gulp.task('archive', ['compile', 'cloudformation'], function () {
	return gulp.src(['tmp/index.js'])
		.pipe(zip('artifact.zip'))
		.pipe(gulp.dest('tmp/riffraff/packages/lambda'))
		.pipe(gulp.dest('tmp/riffraff/packages/s3'));
});

gulp.task('package', ['archive', 'riffraff'], function () {
	return gulp.src(['tmp/riffraff/**/*'])
		.pipe(zip('artifacts.zip'))
		.pipe(gulp.dest('tmp'));
});

gulp.task('deploy', ['package'], function (cb) {
	riffraff.settings.leadDir = path.join(__dirname, 'tmp/');

	riffraff.s3Upload().then(function () {
		cb();
	}).catch(function (error) {
		cb(error);
	});
});


function fetchFromS3 (bucket, path) {
	return new Promise(function (resolve, reject) {
		var s3 = new AWS.S3();
		s3.getObject({
			Bucket: bucket,
			Key: path
		}, function (err, data) {
			if (err) {
				reject(err);
			} else {
				resolve(JSON.parse(data.Body.toString()));
			}
		});
	});
}