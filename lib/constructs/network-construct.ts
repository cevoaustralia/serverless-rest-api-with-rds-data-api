import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkConstruct extends Construct {
    vpc: ec2.Vpc;
    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr(
                '172.16.0.0/16',
            ),
            natGateways: 1,
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 20,
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 20,
                    name: 'private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 20,
                    name: 'isolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });

        this.vpc.addInterfaceEndpoint('VpcEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA,
            subnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            privateDnsEnabled: true, // Enables DNS resolution to RDS Data API privately
        });
    }
}
