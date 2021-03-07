import { CfnSubnetGroup, CfnCacheCluster, CfnReplicationGroup, CfnUser, CfnUserGroup } from '@aws-cdk/aws-elasticache';
import { Vpc, SubnetType, SecurityGroup, BastionHostLinux, InstanceType, InstanceClass, InstanceSize, SubnetSelection, AmazonLinuxImage, Peer, Port } from '@aws-cdk/aws-ec2';
import { StringParameter } from '@aws-cdk/aws-ssm';
import * as cdk from '@aws-cdk/core';

export class CdkRedisStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lookup the VPC created by the bootstrap project
    const vpcId = StringParameter.valueFromLookup(this,  "ex-ssm-vpc-id");
    const vpc = Vpc.fromLookup(this, "vpc-import", { vpcId: vpcId })

    // Create a security group for the example redis
    const exampleRedisSg = new SecurityGroup(this, "sg-example-redis", {
      vpc: vpc,
      securityGroupName: "ex-sg-example-redis",
      allowAllOutbound: false
    });

    // Find all the isolated subnets in this VPC
    const subnets = vpc.selectSubnets({
      subnetType: SubnetType.ISOLATED
    });

    // Randomly select one subnet from each AZ
    // This may not work if the selection changes between deployments because
    // more than one per AZ is available
    const selectedSubnetMap = new Map<string, string>();
    subnets.subnets.forEach(subnet => {
      selectedSubnetMap.set(subnet.availabilityZone, subnet.subnetId);
    });

    // Create subnet group for the cluster
    const subnetGroup = new CfnSubnetGroup(this, "sng-example-redis", {
      cacheSubnetGroupName: "ex-sng-example-redis",
      subnetIds: Array.from(selectedSubnetMap.values()),
      description: "Subnet group for example Redis cluster"
    });

    // A default user is mandatory, so provide a disabled one
    const userDefault = new CfnUser(this, "u-example-redis-default", {
      engine: "redis",
      userId: "ex-u-example-redis-default",
      userName: "default",
      passwords: ["12345678901234567890"],
      accessString: "off +get ~keys*"
    });

    // Example user for a client with RO access
    const userRO = new CfnUser(this, "u-example-redis-ro-client", {
      engine: "redis",
      userId: "ex-u-example-redis-ro-client",
      userName: "ro-client",
      passwords: ["12345678901234567890"],
      accessString: "on ~* -@all +@read"
    });

    // Example user for a client with RW access
    const userRW = new CfnUser(this, "u-example-redis-rw-client", {
      engine: "redis",
      userId: "ex-u-example-redis-rw-client",
      userName: "rw-client",
      passwords: ["12345678901234567890"],
      accessString: "on ~* +@all"
    });

    // Create the user group with all three users
    const userGroup = new CfnUserGroup(this, "ug-example-redis", {
      engine: "redis",
      userGroupId: "ex-ug-example-redis",
      userIds: [userDefault.userId, userRO.userId, userRW.userId]
    })
    userGroup.addDependsOn(userDefault);
    userGroup.addDependsOn(userRO);
    userGroup.addDependsOn(userRW);

    // Create the redis cluster
    // For high availability, enable automaticFailover and multiAz, and increase numCacheClusters
    const redis = new CfnReplicationGroup(this, "elc-example-redis", {
      replicationGroupId: "ex-elc-example-redis",
      replicationGroupDescription: "Redis cluster",
      autoMinorVersionUpgrade: true,
      automaticFailoverEnabled: false,
      engine: "redis",
      engineVersion: "6.x",
      cacheNodeType: "cache.t2.micro",
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      multiAzEnabled: false,
      numCacheClusters: 1,
      cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
      securityGroupIds: [exampleRedisSg.securityGroupId],
      userGroupIds: [userGroup.userGroupId]
    });
    redis.addDependsOn(subnetGroup);
    redis.addDependsOn(userGroup);

    // Security group for bastion host, allowing outbound but no inbound because SSM will be used
    const bastionSg = new SecurityGroup(this, "sg-example-redis-bastion", {
      securityGroupName: "ex-sg-example-redis-bastion",
      description: "Security group for redis bastion host",
      vpc: vpc,
      allowAllOutbound: true
    });

    // Bastion host
    const bastion = new BastionHostLinux(this, "ec2-example-redis-bastion", {
      instanceName: "ex-ec2-example-redis-bastion",
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.NANO),
      machineImage: new AmazonLinuxImage(),
      vpc: vpc,
      securityGroup: bastionSg,
      subnetSelection: { subnetType: SubnetType.PRIVATE }
    });

    // Allow the bastion to connect to the database
    exampleRedisSg.connections.allowFrom(bastionSg, Port.tcp(6379))

  }
}
