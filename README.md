> Lambda to store auditing events coming from a Kinesis stream

# Architecture

AWS Lambda runs on node.js 4.3. This package allows you to write ES6 code, compile, package and deploy through RiffRaff.

Compilation is done with `babel` and packaging with `webpack`.

`src/index.js` is the entry point of your lambda function. Because AWS already provides you with `aws-sdk` you don't need to depend on it, it's already available on the global variable `AWS`.

Any other dependency must be declared in `package.json` inside `dependencies` and will be packaged by `webpack`.

# Elastic search

This lamba sends events to elasticsearch, you can configure the endpoint in `src/config.json` and the elasticsearch domain by sending `POST` request to the endpoints inside folder `elasticsearch`

```
curl -XPOST https://endpoint.es.amazonaws.com/_template/operations -d @elasticsearch/_template/operations
```

# Test

You can test the lambda with `mocha` running `npm test`.

`test/specs/index.js` is the main spec file, the lambda will be called with sample events defined in `sampleEvents.fixture.js`

While developing you can run `mocha --watch`

# Deploy

You can use Travis to automatically build deployable packages for you. If you want to test your code using AWS console, run `npm run build` and upload the file generated in `tmp/riffraff/packages/lambda/artifact.zip`.

# Secrets

This lambda includes secrets. They are pulled from S3 during a build and injected in RiffRaff `build.json`. When building locally, you need valid credentials to read from that bucket. Please use Janus.
