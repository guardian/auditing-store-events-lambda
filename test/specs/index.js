const expect = require('chai').expect;
const sinon = require('sinon');

const generateBatch = require('../sampleEvents.fixture').generateBatch;
const generateWrongSerialization = require('../sampleEvents.fixture').generateWrongSerialization;

const lambda = require('../../src/index').processRecordsBatch;

describe('Auditing lambda', () => {
	const logger = {
		info: sinon.spy(),
		error: sinon.spy()
	};
	afterEach(() => {
		logger.info.reset();
		logger.error.reset();
	});

	it('fails serialization', done => {
		generateWrongSerialization()
		.then(event => {
			lambda({event, logger, callback (error) {
				expect(error).to.match(/unable to understand/i);
				done();
			}});
		});
	});

	it('fails on HTTP client error', done => {
		const elastic = {
			send (request, callback) {
				process.nextTick(() => callback(new Error('invalid anything')));
			}
		};

		generateBatch()
		.then(event => {
			lambda({event, logger, elastic, callback (error) {
				expect(error).to.match(/invalid anything/i);
				done();
			}});
		});
	});

	it('handles the event correctly', done => {
		const handledRequests = [];
		const elastic = {
			send (request, callback) {
				handledRequests.push(request);
				process.nextTick(() => callback(null, {
					_index: request.path.split('/')[1],
					_type: 'action',
					_id: '9876' + handledRequests.length,
					_version: 1,
					_created: true
				}));
			}
		};

		generateBatch()
		.then(event => {
			lambda({event, logger, elastic, callback (error, result) {
				expect(error).to.equal(null);
				expect(result).to.match(/processed 2/i);

				// Every record updates two indices
				expect(handledRequests).to.have.length(4);

				expect(handledRequests[0]).to.have.property('path').that.equal('/operations_2016_02_02/action');
				expect(handledRequests[0]).to.have.property('method').that.equal('POST');
				expect(handledRequests[0]).to.have.property('message').that.deep.equal({
					app: 'FaciaTool',
					stage: 'UNKNOWN',
					operation: 'Update',
					date: new Date('2016-2-2').toISOString(),
					resourceId: 'front',
					message: JSON.stringify({ collections: ['one', 'two'] }),
					expiryDate: null
				});

				expect(handledRequests[1]).to.have.property('path').that.equal('/extras_2016_02_02/sensitive');
				expect(handledRequests[1]).to.have.property('method').that.equal('POST');
				expect(handledRequests[1]).to.have.property('message').that.deep.equal({
					app: 'FaciaTool',
					action: '98761',
					stage: 'UNKNOWN',
					operation: 'Update',
					date: new Date('2016-2-2').toISOString(),
					resourceId: 'front',
					message: null,
					email: 'banana@email.com'
				});

				expect(handledRequests[2]).to.have.property('path').that.equal('/operations_2016_02_03/action');
				expect(handledRequests[2]).to.have.property('method').that.equal('POST');
				expect(handledRequests[2]).to.have.property('message').that.deep.equal({
					app: 'FaciaTool',
					stage: 'UNKNOWN',
					operation: 'Remove',
					date: new Date('2016-2-3').toISOString(),
					resourceId: 'front',
					message: JSON.stringify({ collections: ['three'] }),
					expiryDate: null
				});

				expect(handledRequests[3]).to.have.property('path').that.equal('/extras_2016_02_03/sensitive');
				expect(handledRequests[3]).to.have.property('method').that.equal('POST');
				expect(handledRequests[3]).to.have.property('message').that.deep.equal({
					app: 'FaciaTool',
					action: '98763',
					stage: 'UNKNOWN',
					operation: 'Remove',
					date: new Date('2016-2-3').toISOString(),
					resourceId: 'front',
					message: null,
					email: 'apple@email.com'
				});

				done();
			}});
		});
	});

	it('ignores errors while storing additional data', done => {
		const handledRequests = [];
		const elastic = {
			send (request, callback) {
				handledRequests.push(request);
				const isSensitive = /sensitive/.test(request.path);
				// TODO statusCode
				// emitter.statusCode = isSensitive ? 400 : 200;
				const message = isSensitive ? {
					message: 'Something bad happened in sensitive'
				} : {
					_index: request.path.split('/')[1],
					_type: 'action',
					_id: '9876' + handledRequests.length,
					_version: 1,
					_created: true
				};

				process.nextTick(() => {
					if (isSensitive) {
						callback(message);
					} else {
						callback(null, message);
					}
				});
			}
		};

		generateBatch()
		.then(event => {
			lambda({event, logger, elastic, callback (error, result) {
				expect(result).to.match(/processed 2/i);

				// Every record updates two indices, but some fail
				expect(handledRequests).to.have.length(4);

				const [errorMessage, exception] = logger.error.getCall(0).args;
				expect(errorMessage).to.match(/error .+ storing additional/i);
				expect(exception).to.match(/something bad .* sensitive/i);
				done();
			}});
		});
	});
});
