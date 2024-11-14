#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackupStack } from '../lib/aws-backup-stack';

import { readFileSync } from 'fs';
import { resolve } from 'path';

const params = JSON.parse(readFileSync(resolve(__dirname, '../', 'parameters.json')).toString());
const stackNameModifier = params["vaultName"].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 100);
params["stackNameModifier"] = stackNameModifier;

const app = new cdk.App();
const backupStack = new BackupStack(app, `csk-backup-${stackNameModifier}-stack`, {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

cdk.Tags.of(backupStack).add('KitId', params["kitId"]);
cdk.Tags.of(backupStack).add('AppKey', params["appKey"]);
cdk.Tags.of(backupStack).add('CreatedBy', params["businessName"]);

app.synth();