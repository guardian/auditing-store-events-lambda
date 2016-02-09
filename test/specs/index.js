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
		const handle = new Promise(resolve => {
			TEST.handleRequest = (request, _, onData) => {
				expect(request.method).to.equal('POST');
				expect(request.body).to.match(/banana@email.com/);

				const emitter = new EventEmitter();
				onData(emitter);

				resolve();

				process.nextTick(() => {
					emitter.emit('data', 'first chunk');
					emitter.emit('data', ' second chunk');
					emitter.emit('end');
				});
			};
		});

		return generateBatch()
		.then(events => {
			return run(lambda, events);
		})
		.then(result => {
			expect(result).to.match(/processed 2/i);
		})
		.then(handle);
	});
});
