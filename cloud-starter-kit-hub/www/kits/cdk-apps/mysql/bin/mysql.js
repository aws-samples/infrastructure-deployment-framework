#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { MySqlStack } = require('../lib/mysql-stack');
const cdk_nag = require("cdk-nag");

const fs = require("fs");
const path = require("path");
const params = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
//make a unique stack name using mysqlName as input
let stackNameModifier = params["dbName"].replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase().substring(0, 100);
const mysqlStack = new MySqlStack(app, `csk-mysql-${stackNameModifier}-stack`, {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

cdk.Aspects.of(app).add(new cdk_nag.AwsSolutionsChecks({ verbose: true }));

cdk_nag.NagSuppressions.addStackSuppressions(mysqlStack, [
  {
    id: 'AwsSolutions-RDS11',
    reason: 'DB instance is not exposed to public Internet so benefits are outweighed by complexity'
  },
])

cdk.Tags.of(app).add("KitId", params["kitId"]);
cdk.Tags.of(app).add("AppKey", params["appKey"]);
cdk.Tags.of(app).add("BusinessName", params["businessName"]);