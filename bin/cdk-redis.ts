#!/usr/bin/env node
import { App } from '@aws-cdk/core';
import { CdkRedisStack } from '../lib/cdk-redis-stack';

const app = new App();
new CdkRedisStack(app, 'ex-cdk-example-redis', { env: {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
}});