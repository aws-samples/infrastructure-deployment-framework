#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { Ec2Stack } = require('../lib/example-stack');

const fs = require("fs");
const path = require("path");
const params = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
new Ec2Stack(app, `csk-ec2-${params["ec2Name"]}-stack`, {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

cdk.Tags.of(app).add("KitId", params["kitId"]);
cdk.Tags.of(app).add("AppKey", params["appKey"]);
cdk.Tags.of(app).add("BusinessName", params["businessName"]);