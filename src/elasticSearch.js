/* globals AWS */
import {elasticSearch as config} from './config';

module.exports = function (message, path, callback) {
	try {
		const endpoint = new AWS.Endpoint(config.endpoint);

		const req = new AWS.HttpRequest(endpoint);
		req.method = 'POST';
		req.path = path;
		req.region = config.region;
		req.headers['presigned-expires'] = false;
		req.headers['Host'] = endpoint.host;
		req.body = JSON.stringify(message);

		const creds = new AWS.EnvironmentCredentials('AWS');

		const signer = new AWS.Signers.V4(req , 'es');
		signer.addAuthorization(creds, new Date());

		const send = new AWS.NodeHttpClient();
		console.log('Sending Elastic search request to ' + req.path + '\n' + req.body);
		send.handleRequest(req, null, function (httpResp) {
			let respBody = '';
			httpResp.on('data', function (chunk) {
				respBody += chunk;
			});
			httpResp.on('end', function () {
				console.log('Response from ElasticSearch: [' + httpResp.statusCode + '] ' + respBody);
				try {
					const response = JSON.parse(respBody);
					if (httpResp.statusCode >= 200 && httpResp.statusCode < 400) {
						process.nextTick(() => {
							callback(null, response);
						});
					} else {
						process.nextTick(() => {
							callback(new Error(response.message));
						});
					}
				} catch (ex) {
					callback(new Error(respBody));
				}
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
