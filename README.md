> Lambda to store in DynamoDB auditing events coming from a Kinesis stream

# Architecture

AWS Lambda runs on node.js 0.10. This package allows you to write ES6 code, compile, package and deploy through RiffRaff.

Compilation is done with `babel` and packaging with `webpack`.

`src/index.js` is the entry point of your lambda function. Because AWS already provides you with `aws-sdk` you don't need to depend on it, it's already available on the global variable `AWS`.
Any other dependency must be declared in `package.json` inside `dependencies` and will be packaged by `webpack`.

# Test

You can test the lambda with `mocha` running `npm test`.

`test/specs/index.js` is the main spec file, the lambda will be called with sample events defined in `sampleEvents.fixture.js`

# Deploy

You can use Travis to automatically build deployable packages for you. If you want to test your code using AWS console, run `npm run build` and upload the file generated in `tmp/riffraff/packages/lambda/artifact.zip`.

# Secrets

This lambda includes secrets. They are pulled from S3 during a build and injected in RiffRaff `build.json`. When building locally, you need valid credentials to read from that bucket. Please use Janus.
