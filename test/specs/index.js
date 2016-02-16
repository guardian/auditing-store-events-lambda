/* globals TEST */
import {expect} from 'chai';
import {EventEmitter} from 'events';

import {generateBatch, generateWrongSerialization} from '../sampleEvents.fixture';
import run from '../context.mock';

import {handler as lambda} from '../../src/index';

after(() => TEST.sandbox.restore());

describe('Auditing lambda', () => {
	afterEach(() => {
		TEST.console.error.reset();
		TEST.console.log.reset();
	});

	it('fails serialization', () => {
		return generateWrongSerialization()
		.then(events => {
			return run(lambda, events);
		})
		.catch(error => {
			expect(error).to.match(/when processing/i);
			const [errorMessage, exception] = TEST.console.error.lastCall.args;
			expect(errorMessage).to.match(/error processing/i);
			expect(exception.message).to.match(/unable to understand/i);
		});
	});

	it('fails on HTTP client error', () => {
		const handle = new Promise(resolve => {
			TEST.handleRequest = (request, _, onData, onError) => {
				process.nextTick(() => {
					onError('invalid anything');
					resolve();
				});
			};
		});

		return generateBatch()
		.then(events => {
			return run(lambda, events);
		})
		.then(handle)
		.catch(error => {
			expect(error).to.match(/when processing/i);
			const [errorMessage, exception] = TEST.console.error.lastCall.args;
			expect(errorMessage).to.match(/error processing/i);
			expect(exception.message).to.match(/invalid anything/i);
		});
	});

	it('fails on AWS exceptions', () => {
		const handle = new Promise(resolve => {
			TEST.handleRequest = () => {
				resolve();
				throw new Error('exception here');
			};
		});

		return generateBatch()
		.then(events => {
			return run(lambda, events);
		})
		.then(handle)
		.catch(error => {
			expect(error).to.match(/when processing/i);
			const [errorMessage, exception] = TEST.console.error.lastCall.args;
			expect(errorMessage).to.match(/error processing/i);
			expect(exception.message).to.match(/exception here/i);
		});
	});

	it('handles the event correctly', () => {
		const handledRequests = [];
		const handle = new Promise(resolve => {
			TEST.handleRequest = (request, _, onData) => {
				handledRequests.push(request);

				const emitter = new EventEmitter();
				emitter.statusCode = 200;
				onData(emitter);

				resolve();

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
		});

		return generateBatch()
		.then(events => run(lambda, events))
		.then(result => {
			expect(result).to.match(/processed 2/i);
		})
		.then(handle)
		.then(() => {
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
		});
	});

	it('ignores errors while storing additional data', function () {
		const handledRequests = [];
		const handle = new Promise(resolve => {
			TEST.handleRequest = (request, _, onData) => {
				handledRequests.push(request);

				const isSensitive = /sensitive/.test(request.path);
				const emitter = new EventEmitter();
				emitter.statusCode = isSensitive ? 400 : 200;
				onData(emitter);

				resolve();

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
		});

		return generateBatch()
		.then(events => run(lambda, events))
		.then(result => {
			expect(result).to.match(/processed 2/i);
		})
		.then(handle)
		.then(() => {
			// Every record updates two indices
			expect(handledRequests).to.have.length(4);

			const [errorMessage, exception] = TEST.console.error.lastCall.args;
			expect(errorMessage).to.match(/error .+ storing additional/i);
			expect(exception.message).to.match(/something bad .* sensitive/i);
		});
	});
});
