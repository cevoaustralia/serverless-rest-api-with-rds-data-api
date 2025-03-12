import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  ApiGwConstruct,
  DataApiNatConstruct,
  DataApiPrivateLinkConstruct,
  NetworkConstruct,
  RdsConstruct
} from "../constructs";

export class RdsDataApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const network = new NetworkConstruct(this, 'NetworkConstruct');
    const rds = new RdsConstruct(this, 'RdsConstruct', {
      vpc: network.vpc,
    });

    const dataApiNatLambda = new DataApiNatConstruct(this, 'DataApiNatConstruct', {
      vpc: network.vpc,
      rds,
    });

    const dataApiPrivateLinkLambda = new DataApiPrivateLinkConstruct(this, 'DataApiPrivateLinkConstruct', {
      vpc: network.vpc,
      rds,
    });

    new ApiGwConstruct(this, 'ApiGwConstruct', {
      dataApiNatLambda,
      dataApiPrivateLinkLambda,
    })
  }
}
