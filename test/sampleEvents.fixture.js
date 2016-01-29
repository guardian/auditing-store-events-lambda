function kinesisRecord (data) {
	return {
		kinesis: {
			data: new Buffer(data, 'ascii').toString('base64')
		}
	};
}
const batch = {
	Records: [
		kinesisRecord('event 1'),
		kinesisRecord('event 2')
	]
};

export default {
	batch
};
