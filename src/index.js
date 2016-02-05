/* globals AWS */
const serializer = require('thrift-serializer');
const async = require('async');
const Notification = require('auditing-thrift-model').Notification;

exports.handler = function (event, context) {
	// console.log('Received event:', JSON.stringify(event, null, 2));
	async.mapSeries(event.Records, processRecord, function (err) {
		if (err) {
			console.error('Error processing records', err);
		} else {
			console.log('DONE');
		}

		context.succeed('Processed ' + event.Records.length + ' records.');
	});
};

function processRecord (record, callback) {
	serializer.read(Notification, record.kinesis.data, function (err, message) {
		console.log('Received notification', message);

		callback(err);
	});
}
