const serializer = require('thrift-serializer');
const Notification = require('auditing-thrift-model').Notification;
const App = require('auditing-thrift-model').App;

function kinesisRecord (index, data) {
	return new Promise((resolve, reject) => {
		serializer.write(new Notification(data), serializer.Compression.Gzip, (err, message) => {
			if (err) {
				reject(err);
			} else {
				resolve({
					kinesis: {
						kinesisSchemaVersion: '1.0',
						partitionKey: 'partition-one',
						sequenceNumber: '1234567890' + index,
						data: message.toString('base64')
					},
					eventSource: 'aws:kinesis',
					eventVersion: '1.0',
					eventID: 'shardId-000000000000:1234567890' + index,
					eventName: 'aws:kinesis:record',
					invokeIdentityArn: 'arn:aws:iam::1234:role/auditing-lambda-ExecutionRole',
					awsRegion: 'eu-west-1',
					eventSourceARN: 'arn:aws:kinesis:eu-west-1:1234:stream/auditing-stream'
				});
			}
		});
	});
}

export function generateBatch () {
	return Promise.all([
		kinesisRecord(0, {
			app: App.FaciaTool,
			operation: 'Update',
			userEmail: 'banana@email.com',
			date: new Date('2016-2-2').toISOString(),
			resourceId: 'front',
			shortMessage: JSON.stringify({ collections: ['one', 'two'] })
		}),
		kinesisRecord(1, {
			app: App.FaciaTool,
			operation: 'Remove',
			userEmail: 'apple@email.com',
			date: new Date('2016-2-3').toISOString(),
			resourceId: 'front',
			shortMessage: JSON.stringify({ collections: ['three'] })
		})
	]).then(records => {
		return {
			Records: records
		};
	});
};

export function generateWrongSerialization () {
	return Promise.resolve({
		Records: [{
			kinesis: {
				data: 'random bytes'.toString('base64')
			}
		}]
	});
};
