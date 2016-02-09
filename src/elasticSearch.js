/* globals AWS */
import path from 'path';
import {elasticSearch as config} from './config';

module.exports = function (message, callback) {
	try {
		const endpoint = new AWS.Endpoint(config.endpoint);

		const req = new AWS.HttpRequest(endpoint);
		req.method = 'POST';
		req.path = path.join('/', config.index, config.document);
		req.region = config.region;
		req.headers['presigned-expires'] = false;
		req.headers['Host'] = endpoint.host;
		req.body = JSON.stringify(message);

		const creds = new AWS.EnvironmentCredentials('AWS');

		const signer = new AWS.Signers.V4(req , 'es');
		signer.addAuthorization(creds, new Date());

		const send = new AWS.NodeHttpClient();
		send.handleRequest(req, null, function (httpResp) {
			let respBody = '';
			httpResp.on('data', function (chunk) {
				respBody += chunk;
			});
			httpResp.on('end', function (chunk) {
				console.log('Response from ElasticSearch: ' + respBody);
				console.log('last chunk: ' + chunk);
				process.nextTick(() => callback(null));
			});
		}, function (err) {
			const error = typeof err === 'string' ? new Error(err) : err;
			console.error('Error in ElasticSearch', error);
			process.nextTick(() => callback(error));
		});
	} catch (ex) {
		callback(ex);
	}
};
