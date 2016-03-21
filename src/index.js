import {read} from 'thrift-serializer';
import {mapLimit} from 'async';
import {Notification} from 'auditing-thrift-model';
import elasticSearch from './elasticSearch';
import indices from './indices';
import {STAGE} from './environment';

exports.handler = function (event, context) {
	const job = { started: 0, completed: 0, total: event.Records.length };

	mapLimit(event.Records, 3, processRecord.bind(job), function (err) {
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
	const job = this;
	const jobId = ++job.started;

	console.log('Process job ' + jobId + ' in ' + record.kinesis.sequenceNumber);

	read(Notification, record.kinesis.data, function (err, message) {
		if (err) {
			job.completed += 1;
			console.error('Unable to read thrift message', err);
			callback(err);
		} else {
			storeOperation(message, (err) => {
				job.completed += 1;
				if (err) {
					console.error('Error while processing ' + jobId + ' in ' + record.kinesis.sequenceNumber, err);
				}
				callback(err);
			});
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
		message: notification.message,
		app: notification.getAppName(),
		stage: STAGE,
		operation: notification.operation,
		date: notification.date,
		resourceId: notification.resourceId
	}, extraPath, function (err) {
		if (err) {
			console.error('Error while storing additional data', err);
		}
		callback(null);
	});
}
