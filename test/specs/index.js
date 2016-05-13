/* globals TEST */
const expect = require('chai').expect;
const EventEmitter = require('events').EventEmitter;

const generateBatch = require('../sampleEvents.fixture').generateBatch;
const generateWrongSerialization = require('../sampleEvents.fixture').generateWrongSerialization;

const lambda = require('../../src/index').handler;

after(() => TEST.sandbox.restore());

describe('Auditing lambda', () => {
	it('fails serialization', done => {
		generateWrongSerialization()
		.then(events => {
			lambda(events, {}, error => {
				expect(error).to.match(/unable to understand/i);
				done();
			});
		});
	});

	it('fails on HTTP client error', done => {
		generateBatch()
		.then(events => {
			TEST.handleRequest = (request, _, onData, onError) => {
				process.nextTick(() => {
					onError('invalid anything');
				});
			};

			lambda(events, {}, error => {
				expect(error).to.match(/invalid anything/i);
				done();
			});
		});
	});

	it('fails on AWS exceptions', done => {
		generateBatch()
		.then(events => {
			TEST.handleRequest = () => {
				throw new Error('exception here');
			};

			lambda(events, {}, error => {
				expect(error).to.match(/exception here/i);
				done();
			});
		});
	});

	it('handles the event correctly', done => {
		const handledRequests = [];

		generateBatch()
		.then(events => {
			TEST.handleRequest = (request, _, onData) => {
				handledRequests.push(request);

				const emitter = new EventEmitter();
				emitter.statusCode = 200;
				onData(emitter);

				process.nextTick(() => {
					emitter.emit('data', JSON.stringify({
						_index: request.path.split('/')[1],
						_type: 'action',
						_id: '9876' + handledRequests.length,
						_version: 1,
						_created: true
					}));
					emitter.emit('end');
				});
			};

			lambda(events, {}, (error, result) => {
				expect(error).to.equal(null);
				expect(result).to.match(/processed 2/i);

				// Every record updates two indices
				expect(handledRequests).to.have.length(4);

				expect(handledRequests[0]).to.have.property('path').that.equal('/operations_2016_02_02/action');
				expect(handledRequests[0]).to.have.property('method').that.equal('POST');
				expect(handledRequests[0]).to.have.property('body').that.match(/faciatool.+update/i);
				expect(handledRequests[0]).to.have.property('body').that.match(/two/i);
				expect(handledRequests[0]).to.have.property('body').that.not.match(/email\.com/);

				expect(handledRequests[1]).to.have.property('path').that.equal('/extras_2016_02_02/sensitive');
				expect(handledRequests[1]).to.have.property('method').that.equal('POST');
				expect(handledRequests[1]).to.have.property('body').that.not.match(/two/i);
				expect(handledRequests[1]).to.have.property('body').that.match(/banana@email\.com/);
				expect(handledRequests[1]).to.have.property('body').that.match(/98761/);

				expect(handledRequests[2]).to.have.property('path').that.equal('/operations_2016_02_03/action');
				expect(handledRequests[2]).to.have.property('method').that.equal('POST');
				expect(handledRequests[2]).to.have.property('body').that.match(/faciatool.+remove/i);
				expect(handledRequests[2]).to.have.property('body').that.match(/three/i);
				expect(handledRequests[2]).to.have.property('body').that.not.match(/email\.com/);

				expect(handledRequests[3]).to.have.property('path').that.equal('/extras_2016_02_03/sensitive');
				expect(handledRequests[3]).to.have.property('method').that.equal('POST');
				expect(handledRequests[3]).to.have.property('body').that.not.match(/three/i);
				expect(handledRequests[3]).to.have.property('body').that.match(/apple@email\.com/);
				expect(handledRequests[3]).to.have.property('body').that.match(/98763/);

				done();
			});
		});
	});

	it('ignores errors while storing additional data', done => {
		const handledRequests = [];

		generateBatch()
		.then(events => {
			TEST.handleRequest = (request, _, onData) => {
				handledRequests.push(request);

				const isSensitive = /sensitive/.test(request.path);
				const emitter = new EventEmitter();
				emitter.statusCode = isSensitive ? 400 : 200;
				onData(emitter);

				process.nextTick(() => {
					const message = isSensitive ? {
						message: 'Something bad happened in sensitive'
					} : {
						_index: request.path.split('/')[1],
						_type: 'action',
						_id: '9876' + handledRequests.length,
						_version: 1,
						_created: true
					};
					emitter.emit('data', JSON.stringify(message));
					emitter.emit('end');
				});
			};

			lambda(events, {}, (error, result) => {
				expect(result).to.match(/processed 2/i);

				// Every record updates two indices, but some fail
				expect(handledRequests).to.have.length(4);

				const [errorMessage, exception] = TEST.console.error.lastCall.args;
				expect(errorMessage).to.match(/error .+ storing additional/i);
				expect(exception.message).to.match(/something bad .* sensitive/i);

				done();
			});
		});
	});
});
