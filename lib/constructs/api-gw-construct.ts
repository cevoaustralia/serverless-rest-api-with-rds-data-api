import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import {Construct} from "constructs";
import {DataApiPrivateLinkConstruct} from "./lambda/data-api-private-link-construct";
import {DataApiNatConstruct} from "./lambda/data-api-nat-construct";

export interface ApiGwConstructProps {
    dataApiPrivateLinkLambda: DataApiPrivateLinkConstruct;
    dataApiNatLambda: DataApiNatConstruct
}

export class ApiGwConstruct extends Construct {
    public readonly apiKey: apigateway.IApiKey;

    constructor(scope: Construct, id: string, props: ApiGwConstructProps) {
        super(scope, id);

        const api = new apigateway.RestApi(this, 'DataApiGateway', {
            restApiName: 'Data API Gateway',
            description: 'API Gateway integrated with two Lambda functions',
            deployOptions: {
                stageName: 'prod',
            },
        });

        // Create a Usage Plan (limits requests)
        const usagePlan = api.addUsagePlan('UsagePlan', {
            name: 'BasicUsagePlan',
            throttle: {
                rateLimit: 10,
                burstLimit: 20,
            },
            apiStages: [
                {
                    api,
                    stage: api.deploymentStage,  // Explicitly attach API stage
                },
            ],
        });

        // Create an API Key
        this.apiKey = api.addApiKey('DataApiKey', {
            apiKeyName: 'DataApiKey',
            description: 'API Key for secure access',
        });

        // Attach API Key to Usage Plan
        usagePlan.addApiKey(this.apiKey);

        // Add /nat endpoint
        const natResource = api.root.addResource('nat');
        natResource.addMethod('GET', new apigateway.LambdaIntegration(props.dataApiNatLambda.lambdaFunction), {
            apiKeyRequired: true,
        });

        // Add /private-link endpoint
        const privateLinkResource = api.root.addResource('private-link');
        privateLinkResource.addMethod('GET', new apigateway.LambdaIntegration(props.dataApiPrivateLinkLambda.lambdaFunction), {
            apiKeyRequired: true,
        });
    }
}
