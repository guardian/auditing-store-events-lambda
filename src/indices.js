import path from 'path';
import {models} from './config';

exports.operation = function (now) {
	const index = padWithDate(models.operations.index, now);

	return path.join('/', index, models.operations.mapping);
};

exports.extra = function (now) {
	const index = padWithDate(models.extra.index, now);

	return path.join('/', index, models.extra.mapping);
};

function padWithDate (baseIndex, now) {
	const when = new Date(now);
	if (!now || isNaN(when.getTime())) {
		throw new TypeError('Invalid date when indexing an operation');
	}

	return [
		baseIndex,
		when.getUTCFullYear(),
		('0' + (when.getUTCMonth() + 1)).slice(-2),
		('0' + when.getUTCDate()).slice(-2)
	].join('_');
}
