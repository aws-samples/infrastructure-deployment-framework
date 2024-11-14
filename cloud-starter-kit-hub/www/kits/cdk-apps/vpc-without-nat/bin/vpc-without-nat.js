#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { CdkAppStack } = require('../lib/vpc-without-nat');

const fs_1 = require("fs");
const path_1 = require("path");
const params = JSON.parse((0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
new CdkAppStack(app, 'csk-vpc-without-nat-stack', {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

cdk.Tags.of(app).add("KitId", params["kitId"]);
cdk.Tags.of(app).add("AppKey", params["appKey"]);
cdk.Tags.of(app).add("BusinessName", params["businessName"]);

app.synth();