const expect = require('chai').expect;

import {generateBatch} from '../sampleEvents.fixture';
import run from '../context.mock';

import {handler as lambda} from '../../src/index';

describe('Auditing lambda', function () {
	it('should do nothing', function () {
		return generateBatch()
		.then(events => {
			return run(lambda, events);
		})
		.then(result => {
			expect(result).to.be.match(/processed 2/i);
		});
	});
});
