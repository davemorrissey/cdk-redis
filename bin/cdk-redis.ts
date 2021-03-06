#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { CdkRedisStack } from '../lib/cdk-redis-stack';

const app = new cdk.App();
new CdkRedisStack(app, 'CdkRedisStack');
