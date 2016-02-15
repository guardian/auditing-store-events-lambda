require('es6-promise').polyfill();
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(chaiAsPromised);
chai.use(sinonChai);

const sandbox = sinon.sandbox.create();
global.TEST = {
	sandbox: sandbox,
	handleRequest: null,
	console: {
		log: sandbox.spy(console, 'log'),
		error: sandbox.spy(console, 'error')
	}
};

global.AWS = {
	Endpoint: sandbox.stub(),
	HttpRequest: function () {
		this.headers = {};
	},
	EnvironmentCredentials: sandbox.stub(),
	Signers: {
		V4: sandbox.stub().returns({ addAuthorization: sandbox.stub() })
	},
	NodeHttpClient: function () {
		this.handleRequest = function (request, _, onData, onError) {
			global.TEST.handleRequest(request, _, onData, onError);
		};
	}
};
