function createContext () {
	const callbacks = {};
	const promise = new Promise(function (resolve, reject) {
		callbacks.resolve = resolve;
		callbacks.reject = reject;
	});

	function succeed (result) {
		callbacks.resolve(result);
	}

	function fail (error) {
		callbacks.reject(error);
	}

	return [{
		succeed,
		fail,
		done: (err, result) => err ? fail(err) : succeed(result),
		getRemainingTimeInMillis: () => Infinity,
		functionName: 'fakeLambda',
		functionVersion: '0',
		invokedFunctionArn: 'arn:aws:lambda:fake-region:fake-acc:function:fakeLambda',
		memoryLimitInMB: Infinity,
		awsRequestId: 'fakeRequest',
		logGroupName: 'fakeGroup',
		logStreamName: 'fakeStream',
		identity: null,
		clientContext: null
	}, promise];
}

export default function runLambda (lambda, events) {
	const [context, promise] = createContext();
	lambda(events, context);
	return promise;
}
