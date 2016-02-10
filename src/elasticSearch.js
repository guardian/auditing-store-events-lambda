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
			console.log('status code', httpResp.statusCode);
			let respBody = '';
			httpResp.on('data', function (chunk) {
				respBody += chunk;
			});
			httpResp.on('end', function () {
				console.log('Response from ElasticSearch: ' + respBody);
				process.nextTick(() => {
					if (httpResp.statusCode >= 200 && httpResp.statusCode < 400) {
						let error;
						try {
							error = new Error(JSON.parse(respBody).message);
						} catch (ex) {
							error = new Error(respBody);
						}
						callback(error);
					} else {
						callback(null);
					}
				});
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
