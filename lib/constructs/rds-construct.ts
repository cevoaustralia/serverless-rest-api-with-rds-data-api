import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DatabaseCluster } from 'aws-cdk-lib/aws-rds';

export interface AuroraMysqlDataApiProps {
  vpc: ec2.IVpc;
}

export class RdsConstruct extends Construct {
  public readonly cluster: DatabaseCluster;

  constructor(scope: Construct, id: string, props: AuroraMysqlDataApiProps) {
    super(scope, id);

    // Create Aurora Serverless v2 cluster
    this.cluster = new rds.DatabaseCluster(this, 'DatabaseCluster', {
      engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_08_0 }),
      credentials: rds.Credentials.fromGeneratedSecret('clusteradmin'),
      writer: rds.ClusterInstance.serverlessV2('ServerlessDatabase'),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      vpc: props.vpc,
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 1,
      enableDataApi: true,
      enableClusterLevelEnhancedMonitoring: false,
    });
  }
}
