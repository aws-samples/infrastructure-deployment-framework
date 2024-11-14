#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { QueueStack } from '../lib/queue-stack';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AwsSolutionsChecks } from 'cdk-nag'
import { Aspects } from 'aws-cdk-lib';

const params = JSON.parse(readFileSync(resolve(__dirname, '../', 'parameters.json')).toString());

export const app = new cdk.App();
const queueStack = new QueueStack(app, 'queue-stack', {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

cdk.Tags.of(queueStack).add('KitId', params["kitId"]);
cdk.Tags.of(queueStack).add('AppKey', params["appKey"]);
cdk.Tags.of(queueStack).add('CreatedBy', params["businessName"]);
