#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsDemoStack } from '../lib/aws-demo-stack';

const app = new cdk.App();
new AwsDemoStack(app, 'AwsDemoStack', {
  env: {
    account: '975050266733',
    region: 'us-east-1',
  },
});
