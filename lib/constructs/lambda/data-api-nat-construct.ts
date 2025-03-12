import path from 'path';
import { Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { RdsConstruct } from '../rds-construct';

export interface DataApiConstructProps {
  vpc: ec2.IVpc;
  rds: RdsConstruct;
}

export class DataApiNatConstruct extends Construct {
  readonly lambdaFunction: NodejsFunction;
  constructor(scope: Construct, id: string, props: DataApiConstructProps) {
    super(scope, id);

    const dataApiLambdaSecurityGroup = new ec2.SecurityGroup(this, 'DataApiNatSG', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    const dataApiLambdaRole = new iam.Role(this, 'DataApiNatRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        vpcPolicy: new iam.PolicyDocument({
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
              effect: Effect.ALLOW,
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
              effect: Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue'],
              resources: [props.rds.cluster.secret?.secretArn!],
            }),
          ],
        }),
      },
    });

    this.lambdaFunction = new NodejsFunction(this, 'DataApiNatLambda', {
      functionName: 'DataApiNatFunction',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(10),
      memorySize: 256,
      handler: 'handler',
      entry: path.join(__dirname, './data-api/index.js'),
      role: dataApiLambdaRole,
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }),
      securityGroups: [dataApiLambdaSecurityGroup],
      logRetention: RetentionDays.THREE_MONTHS,
      bundling: {
        minify: true,
      },
      environment: {
        TASK_TIMEOUT: Duration.seconds(5).toMilliseconds().toString(),
        CLUSTER_ARN: props.rds.cluster.clusterArn,
        SECRET_ARN: props.rds.cluster.secret?.secretArn!,
        DATABASE_NAME: 'Library',
      },
    });
  }
}
