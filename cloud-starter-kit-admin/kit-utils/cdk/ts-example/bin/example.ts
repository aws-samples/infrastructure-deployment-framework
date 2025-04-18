#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAppStack } from '../lib/example-stack';

import { readFileSync } from 'fs';
import { resolve } from 'path';

const params = JSON.parse(readFileSync(resolve(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
const backupStack = new CdkAppStack(app, 'csk-example-stack', {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

cdk.Tags.of(backupStack).add('KitId', params["kitId"]);
cdk.Tags.of(backupStack).add('AppKey', params["appKey"]);
cdk.Tags.of(backupStack).add('CreatedBy', params["businessName"]);

app.synth();