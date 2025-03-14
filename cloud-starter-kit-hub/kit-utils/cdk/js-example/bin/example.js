#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { ExampleStack } = require('../lib/example-stack');

const fs = require("fs");
const path = require("path");
const params = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
new ExampleStack(app, `csk-example-${params["example"]}-stack`, {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

cdk.Tags.of(app).add("KitId", params["kitId"]);
cdk.Tags.of(app).add("AppKey", params["appKey"]);
cdk.Tags.of(app).add("BusinessName", params["businessName"]);