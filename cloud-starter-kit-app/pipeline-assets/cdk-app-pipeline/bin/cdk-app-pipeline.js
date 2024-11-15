#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { CdkAppPipelineStack } = require('../lib/cdk-app-pipeline-stack');

const app = new cdk.App();
new CdkAppPipelineStack(app, 'csk-cdk-app-delivery-pipeline', {
  synthesizer: new cdk.DefaultStackSynthesizer({
    generateBootstrapVersionRule: false
  })
});
