import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class AwsDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // Security group for RDS
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for RDS instance',
      allowAllOutbound: true,
    });

    // Security group for Bastion Host
    const bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      vpc,
      description: 'Security group for Bastion Host',
      allowAllOutbound: true,
    });

    // Allow bastion to connect to RDS
    dbSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Postgres access from Bastion'
    );

    // Create RDS Instance
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_2,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [dbSecurityGroup],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Don't use this in production
      deletionProtection: false, // Don't disable this in production
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 30,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      databaseName: 'mydatabase',
    });

    // Create Bastion Host
    const bastion = new ec2.Instance(this, 'BastionHost', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: bastionSecurityGroup,
    });

    // Add SSM policy to Bastion Host
    bastion.role.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // Security group for Web Server
    const webServerSecurityGroup = new ec2.SecurityGroup(this, 'WebServerSecurityGroup', {
      vpc,
      description: 'Security group for Web Server',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic to web server
    webServerSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    // Allow web server to connect to RDS
    dbSecurityGroup.addIngressRule(
      webServerSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Postgres access from Web Server'
    );

    // Create EC2 Instance for Web Server
    const webServer = new ec2.Instance(this, 'WebServer', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: webServerSecurityGroup,
    });

    // Add IAM role to allow EC2 instance to access RDS
    webServer.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSFullAccess')
    );

    // User data script to install a web server and connect to RDS
    webServer.addUserData(
      `#!/bin/bash`,
      `yum update -y`,
      `yum install -y httpd postgresql`,
      `systemctl start httpd`,
      `systemctl enable httpd`,
      `echo "<html><body><h1>Welcome to the Web Server</h1></body></html>" > /var/www/html/index.html`,
      `echo "Connecting to RDS..."`,
      `psql -h ${database.instanceEndpoint.hostname} -U postgres -d mydatabase -c "SELECT 1"`
    );

    // Output the database endpoint and bastion instance ID
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
    });

    new cdk.CfnOutput(this, 'BastionInstanceId', {
      value: bastion.instanceId,
    });

    // Output the web server public IP
    new cdk.CfnOutput(this, 'WebServerPublicIP', {
      value: webServer.instancePublicIp,
    });
  }
}
