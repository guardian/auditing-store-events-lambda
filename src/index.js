console.log('Loading function');

exports.handler = function (event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    event.Records.forEach(record => {
        var payload = decodeRecordPayload(record);
        console.log('Decoded payload:', payload);
    });
    context.succeed('Successfully processed ' + event.Records.length + ' records.');
};

function decodeRecordPayload (record) {
    // Kinesis data is base64 encoded so decode here
	return new Buffer(record.kinesis.data, 'base64').toString('ascii');
}