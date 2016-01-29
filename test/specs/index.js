const expect = require('chai').expect;

import events from '../sampleEvents.fixture';
import run from '../context.mock';

import {handler as lambda} from '../../src/index';

describe('Auditing lambda', function () {
	it('should do nothing', function () {
		return run(lambda, events.batch)
		.then(result => {
			expect(result).to.be.match(/success/i);
		});
	});
});
