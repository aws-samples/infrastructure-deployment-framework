#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { Ec2Stack } = require('../lib/ec2-stack');

const fs = require("fs");
const path = require("path");
const params = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
//make a unique stack name using ec2Name as input
let stackNameModifier = params["ec2Name"].replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase().substring(0, 100);
new Ec2Stack(app, `csk-ec2-${stackNameModifier}-stack`, {
  params: params,
  env: { account: params["account"], region: params["region"] },
});


cdk.Tags.of(app).add("KitId", params["kitId"]);
cdk.Tags.of(app).add("AppKey", params["appKey"]);
cdk.Tags.of(app).add("BusinessName", params["businessName"]);