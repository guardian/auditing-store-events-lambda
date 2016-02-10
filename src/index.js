const serializer = require('thrift-serializer');
const async = require('async');
const Notification = require('auditing-thrift-model').Notification;
const elasticSearch = require('./elasticSearch');

exports.handler = function (event, context) {
	async.mapSeries(event.Records, processRecord, function (err) {
		if (err) {
			console.error('Error processing records', err);
			context.fail('Error when processing recors');
		} else {
			console.log('DONE');
			context.succeed('Processed ' + event.Records.length + ' records.');
		}
	});
};

function processRecord (record, callback) {
	serializer.read(Notification, record.kinesis.data, function (err, message) {
		const notification = {};
		for (let key in message) {
			if (message.hasOwnProperty(key)) {
				notification[key] = key === 'app' ? message.getAppName() : message[key];
			}
		}
		console.log('Received notification', JSON.stringify(notification));
		if (err) {
			callback(err);
		} else {
			elasticSearch(notification, callback);
		}
	});
}
