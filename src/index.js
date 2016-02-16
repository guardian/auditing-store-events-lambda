import {read} from 'thrift-serializer';
import {mapSeries} from 'async';
import {Notification} from 'auditing-thrift-model';
import elasticSearch from './elasticSearch';
import indices from './indices';
import {STAGE} from './environment';

exports.handler = function (event, context) {
	mapSeries(event.Records, processRecord, function (err) {
		if (err) {
			console.error('Error processing records', err);
			context.fail('Error when processing records');
		} else {
			console.log('DONE');
			context.succeed('Processed ' + event.Records.length + ' records.');
		}
	});
};

function processRecord (record, callback) {
	read(Notification, record.kinesis.data, function (err, message) {
		console.log('Received notification', JSON.stringify(message));
		if (err) {
			callback(err);
		} else {
			storeOperation(message, callback);
		}
	});
}

function storeOperation (notification, callback) {
	const operationPath = indices.operation(notification.date);
	elasticSearch({
		app: notification.getAppName(),
		stage: STAGE,
		operation: notification.operation,
		date: notification.date,
		resourceId: notification.resourceId,
		message: notification.shortMessage,
		expiryDate: notification.expiryDate
	}, operationPath, function (err, record) {
		if (err) {
			callback(err);
		} else {
			storeAdditionalData(record._id, notification, callback);
		}
	});
}

function storeAdditionalData (id, notification, callback) {
	// Ignore errors for additional sensitive data
	const extraPath = indices.extra(notification.date);
	elasticSearch({
		action: id,
		email: notification.userEmail,
		message: notification.message
	}, extraPath, function (err) {
		if (err) {
			console.error('Error while storing additional data', err);
		}
		callback(null);
	});
}
