/* globals AWS */
import {read} from 'thrift-serializer';
import {mapLimit} from 'async';
import {Notification} from 'auditing-thrift-model';
import elasticSearch from 'lambda-elasticsearch';
import {elasticSearch as config} from './config';
import indices from './indices';
import {STAGE} from './environment';

export function handler (event, context, callback) {
	const elastic = elasticSearch(AWS, {
		endpoint: config.endpoint,
		region: config.region
	});

	processRecordsBatch({event, logger: console, elastic, callback});
}

export function processRecordsBatch ({event, logger, elastic, callback}) {
	const job = { started: 0, completed: 0, total: event.Records.length };

	mapLimit(event.Records, 3, (...args) => processRecord(...args, job, logger, elastic), err => {
		callback(err, 'DONE - Processed ' + event.Records.length + ' records.');
	});
}

function processRecord (record, callback, job, logger, elastic) {
	const jobId = ++job.started;

	logger.info('Process job ' + jobId + ' in ' + record.kinesis.sequenceNumber);

	read(Notification, record.kinesis.data, function (err, message) {
		if (err) {
			job.completed += 1;
			logger.error('Unable to read thrift message', err);
			callback(err);
		} else {
			storeOperation(elastic, message, logger, (err) => {
				job.completed += 1;
				if (err) {
					logger.error('Error while processing ' + jobId + ' in ' + record.kinesis.sequenceNumber, err);
				}
				callback(err);
			});
		}
	});
}

function storeOperation (elastic, notification, logger, callback) {
	const operationPath = indices.operation(notification.date);
	elastic.send({
		method: 'POST',
		path: operationPath,
		message: {
			app: notification.getAppName(),
			stage: STAGE,
			operation: notification.operation,
			date: notification.date,
			resourceId: notification.resourceId,
			message: notification.shortMessage,
			expiryDate: notification.expiryDate
		}
	}, function (err, record) {
		if (err) {
			callback(err);
		} else {
			logger.info('Operation stored correctly');
			storeAdditionalData(elastic, record._id, notification, logger, callback);
		}
	});
}

function storeAdditionalData (elastic, id, notification, logger, callback) {
	// Ignore errors for additional sensitive data
	const extraPath = indices.extra(notification.date);
	elastic.send({
		method: 'POST',
		path: extraPath,
		message: {
			action: id,
			email: notification.userEmail,
			message: notification.message,
			app: notification.getAppName(),
			stage: STAGE,
			operation: notification.operation,
			date: notification.date,
			resourceId: notification.resourceId
		}
	}, function (err) {
		if (err) {
			logger.error('Error while storing additional data', err.message);
		} else {
			logger.info('Additional data stored correctly');
		}
		callback(null);
	});
}
