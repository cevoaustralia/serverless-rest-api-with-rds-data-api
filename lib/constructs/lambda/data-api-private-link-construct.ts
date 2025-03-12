import path from 'path';
import { Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { RdsConstruct } from '../rds-construct';
import { Effect } from 'aws-cdk-lib/aws-iam';

export interface LambdaPrivateLinkProps {
  vpc: ec2.IVpc;
  rds: RdsConstruct;
}

export class DataApiPrivateLinkConstruct extends Construct {
  readonly lambdaFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaPrivateLinkProps) {
    super(scope, id);

    // Security group for Lambda (allowed to communicate with endpoint)
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'DataApiPrivateLinkSG', {
      vpc: props.vpc,
      allowAllOutbound: true, // required to access interface endpoint
      description: 'Security group for Lambda accessing RDS Data API via PrivateLink',
    });

    // IAM role Permissions - Only requires RDS Data API & Secrets Manager access
    const lambdaRole = new iam.Role(this, 'DataApiPrivateLinkRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        dataApiAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'ec2:CreateNetworkInterface',
                'ec2:CreateNetworkInterfacePermission',
                'ec2:DescribeNetworkInterfaces',
                'ec2:CreateNetworkInterface',
                'ec2:DeleteNetworkInterface',
                'ec2:DescribeInstances',
                'ec2:AttachNetworkInterface',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              actions: [
                'rds-data:ExecuteStatement',
                'rds-data:BatchExecuteStatement',
                'rds-data:BeginTransaction',
                'rds-data:CommitTransaction',
                'rds-data:RollbackTransaction',
              ],
              resources: [props.rds.cluster.clusterArn],
            }),
            new iam.PolicyStatement({
              actions: ['secretsmanager:GetSecretValue'],
              resources: [props.rds.cluster.secret?.secretArn!],
            }),
          ],
        }),
      },
    });

    // Lambda definition (PrivateLink - no internet)
    this.lambdaFunction = new NodejsFunction(this, 'DataApiPrivateLinkLambda', {
      functionName: 'DataApiPrivateLinkFunction',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, './data-api/index.js'),
      timeout: Duration.seconds(10),
      memorySize: 256,
      role: lambdaRole,
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Important: Use isolated subnet (no NAT)
      }),
      securityGroups: [lambdaSecurityGroup],
      bundling: {
        minify: true,
      },
      environment: {
        DATABASE_NAME: 'Library',
        CLUSTER_ARN: props.rds.cluster.clusterArn,
        SECRET_ARN: props.rds.cluster.secret?.secretArn!,
      },
    });
  }
}
