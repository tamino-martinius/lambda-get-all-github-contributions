import {
  CloudFormation,
  Lambda,
  S3,
  config,
  SharedIniFileCredentials,
  STS,
} from 'aws-sdk';
import tsDedent from 'ts-dedent';

const env = process.env;
export const AWS_REGION = env.npm_package_config_awsRegion || '';
export const AWS_PROFILE = env.npm_package_config_awsProfile || '';
export const LOCAL_BUCKET_NAME = env.npm_package_config_localBucketName || '';
export const BUCKET_NAME = env.npm_package_config_bucketName || '';
export const STACK_NAME = env.npm_package_config_stackName || '';
export const FUNCTION_NAME = env.npm_package_config_functionName || '';
export const API_GATEWAY = env.npm_package_config_apiGateway === 'true';
export const API_DOMAIN = env.npm_package_config_apiDomain || '';
export const API_SUBDOMAIN = env.npm_package_config_apiSubdomain || '';
export const GITHUB_TOKEN = env.npm_config_gitHubToken || env.npm_package_config_gitHubToken;

export enum TemplateType {
  INITIAL,
  FUNCTION,
  GATEWAY,
  DOMAIN,
}

export let FINAL_STACK_TYPE = TemplateType.FUNCTION;
if (API_GATEWAY) {
  FINAL_STACK_TYPE = TemplateType.GATEWAY;
  if (API_DOMAIN.length > 0 && API_SUBDOMAIN.length > 0) {
    FINAL_STACK_TYPE = TemplateType.DOMAIN;
  }
}

if (AWS_PROFILE.length > 0) {
  config.credentials = new SharedIniFileCredentials({ profile: AWS_PROFILE });
}

const regionConfig = { region: AWS_REGION };

export const s3 = new S3(regionConfig);
export const lambda = new Lambda(regionConfig);
export const cloudFormation = new CloudFormation(regionConfig);
export const sts = new STS(regionConfig);

export const generateStack = (type: TemplateType, sam: boolean = false) => {
  const parameters: CloudFormation.Parameter[] = [{
    ParameterKey: 'LambdaFunctionS3BucketName',
    ParameterValue: BUCKET_NAME,
    UsePreviousValue: false,
  }];
  const template: any = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: `Stack for Lambda Function '${FUNCTION_NAME}'`,
    Parameters: {
      LambdaFunctionS3BucketName: {
        Type: 'String',
        Description: `
          The S3 bucket in which the lambda function code is stored.
          Bucket names are region-unique, so you must change this.
        `,
      },
    },
    Resources: {
      LambdaFunctionS3Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: { Ref: 'LambdaFunctionS3BucketName' },
        },
      },
    },
    Outputs: {},
  };
  if (type !== TemplateType.INITIAL) {
    template.Transform = 'AWS::Serverless-2016-10-31';
    template.Parameters.LambdaFunctionName = {
      Type: 'String',
      Description: `
        The name of the lambda function.
      `,
    };
    template.Parameters.LambdaFunctionS3Key = {
      Type: 'String',
      AllowedPattern: '.*\\.zip',
      Description: `
        The S3 object for the lambda function code package.
      `,
      Default: 'lambda-function.zip',
    };
    parameters.push({
      ParameterKey: 'LambdaFunctionName',
      ParameterValue: FUNCTION_NAME,
      UsePreviousValue: false,
    });
    template.Resources.LambdaExecutionRole = {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        },
        Policies: [
          {
            PolicyName: 'root',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                    'logs:DescribeLogStreams',
                  ],
                  Resource: 'arn:aws:logs:*:*:*',
                },
              ],
            },
          },
        ],
      },
    };
    template.Resources.LambdaFunction = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        CodeUri: {
          Bucket: { Ref: 'LambdaFunctionS3BucketName' },
          Key: { Ref: 'LambdaFunctionS3Key' },
        },
        Environment: {
          Variables: {
            GITHUB_TOKEN,
            BUCKET_NAME: sam ? LOCAL_BUCKET_NAME : BUCKET_NAME,
          },
        },
        Events: API_GATEWAY ? {
          ProxyApiGreedy: {
            Type: 'Api',
            Properties: {
              RestApiId: { Ref: 'ApiGatewayApi' },
              Path: '/{proxy+}',
              Method: 'ANY',
            },
          },
          ProxyApiRoot: {
            Type: 'Api',
            Properties: {
              Path: '/',
              Method: 'ANY',
            },
          },
        } : {},
        FunctionName: { Ref: 'LambdaFunctionName' },
        Handler: 'lambda.handler',
        MemorySize: 128,
        Role: {
          'Fn::GetAtt': [
            'LambdaExecutionRole',
            'Arn',
          ],
        },
        Runtime: 'nodejs8.10',
        Timeout: 300,
      },
    };
    template.Outputs.LambdaFunctionConsoleUrl = {
      Description: `
        Console URL for the Lambda Function.
      `,
      Value: {
        'Fn::Join': [
          '',
          [
            'https://',
            { Ref: 'AWS::Region' },
            '.console.aws.amazon.com/lambda/home?region=',
            { Ref: 'AWS::Region' },
            '#/functions/',
            { Ref: 'LambdaFunction' },
          ],
        ],
      },
    };
  }
  if (type === TemplateType.GATEWAY || type === TemplateType.DOMAIN) {
    template.Parameters.ApiGatewaySwaggerS3Key = {
      Type: 'String',
      AllowedPattern: '.*\\.yml',
      Description: `
        The S3 object for the swagger definition of the API Gateway API.
      `,
      Default: 'api.yml',
    };
    template.Parameters.LambdaFunctionPath = {
      Type: 'String',
      Description: `
        The path of the lambda function event.
      `,
      Default: '/',
    };
    template.Resources.ApiGatewayApi = {
      Type: 'AWS::Serverless::Api',
      Properties: {
        StageName: 'Prod',
        DefinitionUri: {
          Bucket: { Ref: 'LambdaFunctionS3BucketName' },
          Key: { Ref: 'ApiGatewaySwaggerS3Key' },
        },
      },
    };
    template.Resources.LambdaApiGatewayExecutionPermission = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        Action: 'lambda:InvokeFunction',
        FunctionName: {
          'Fn::GetAtt': [
            'LambdaFunction',
            'Arn',
          ],
        },
        Principal: 'apigateway.amazonaws.com',
        SourceArn: {
          'Fn::Join': [
            '',
            [
              'arn:aws:execute-api:',
              { Ref: 'AWS::Region' },
              ':',
              { Ref: 'AWS::AccountId' },
              ':',
              { Ref: 'ApiGatewayApi' },
              '/*/*',
            ],
          ],
        },
      },
    };

    template.Outputs.ApiEndpointUrl = {
      Description: `
      Root URL of the API Endpoint.
    `,
      Value: {
        'Fn::Join': [
          '',
          [
            'https://',
            { Ref: 'ServerlessRestApi' },
            '.execute-api.',
            { Ref: 'AWS::Region' },
            '.amazonaws.com/',
            { Ref: 'ServerlessRestApiProdStage' },
            { Ref: 'LambdaFunctionPath' },
          ],
        ],
      },
    };
    template.Outputs.ApiGatewayApiConsoleUrl = {
      Description: `
      Console URL for the API Gateway APIs Stage.
    `,
      Value: {
        'Fn::Join': [
          '',
          [
            'https://',
            { Ref: 'AWS::Region' },
            '.console.aws.amazon.com/apigateway/home?region=',
            { Ref: 'AWS::Region' },
            '#/apis/',
            { Ref: 'ApiGatewayApi' },
            '/stages/prod',
          ],
        ],
      },
    };
    template.Outputs.ApiRootUrl = {
      Description: `
      URL to perform a GET request on the root endpoint of the API.
    `,
      Value: {
        'Fn::Join': [
          '',
          [
            'https://',
            { Ref: 'ApiGatewayApi' },
            '.execute-api.',
            { Ref: 'AWS::Region' },
            '.amazonaws.com/prod/',
          ],
        ],
      },
    };
  }
  if (type === TemplateType.DOMAIN) {
    template.Parameters.AmazonHardcodedCloudFrontHostedZoneId = {
      Type: 'String',
      Description: `
        HostedZoneId for CloudFront. Hardcoded by Amazon and documented at
        https://docs.aws.amazon.com/general/latest/gr/rande.html#cf_region
      `,
      Default: 'Z2FDTNDATAQYW2',
    };
    template.Parameters.ACMCertificateARN = {
      Type: 'String',
      Description: `
        The ACM certificate ARN the subdomain - this is currently not included in the
        cloudformation stack because it cant be automatically verified.
      `,
    };
    template.Parameters.Domain = {
      Type: 'String',
      Description: `
        The domain part of the domain name referring to the lambda function base URL.
      `,
    };
    template.Parameters.Subdomain = {
      Type: 'String',
      Description: `
        The subdomain part of the domain name referring to the lambda function base URL.
      `,
    };
    // TODO: Add Parameter for certificate/Generate Certificate
    parameters.push({
      ParameterKey: 'ACMCertificateARN',
      ParameterValue: '',
      UsePreviousValue: false,
    });
    parameters.push({
      ParameterKey: 'Domain',
      ParameterValue: API_DOMAIN,
      UsePreviousValue: false,
    });
    parameters.push({
      ParameterKey: 'Subdomain',
      ParameterValue: API_SUBDOMAIN,
      UsePreviousValue: false,
    });
    template.Parameters.AmazonHardcodedCloudFrontHostedZoneId = {
      Type: 'String',
      Description: `
        HostedZoneId for CloudFront. Hardcoded by Amazon and documented at
        https://docs.aws.amazon.com/general/latest/gr/rande.html#cf_region
      `,
      Default: 'Z2FDTNDATAQYW2',
    };
    template.Parameters.ACMCertificateARN = {
      Type: 'String',
      Description: `
        The ACM certificate ARN the subdomain - this is currently not included in the
        cloudformation stack because it cant be automatically verified.
      `,
    };
    template.Parameters.Domain = {
      Type: 'String',
      Description: `
        The domain part of the domain name referring to the lambda function base URL.
      `,
    };
    template.Parameters.Subdomain = {
      Type: 'String',
      Description: `
        The subdomain part of the domain name referring to the lambda function base URL.
      `,
    };

    template.Resources.ApiGatewayBasePathMapping = {
      Type: 'AWS::ApiGateway::BasePathMapping',
      Properties: {
        DomainName: { Ref: 'ApiGatewayDomainName' },
        RestApiId: { Ref: 'ServerlessRestApi' },
        Stage: { Ref: 'ServerlessRestApiProdStage' },
      },
    };
    template.Resources.ApiGatewayDomainName = {
      Type: 'AWS::ApiGateway::DomainName',
      Properties: {
        DomainName: {
          'Fn::Join': [
            '',
            [
              { Ref: 'Subdomain' },
              '.',
              { Ref: 'Domain' },
            ],
          ],
        },
        CertificateArn: { Ref: 'ACMCertificateARN' },
      },
    };
    template.Resources.Route53RecordSet = {
      Type: 'AWS::Route53::RecordSet',
      Properties: {
        AliasTarget: {
          DNSName: {
            'Fn::GetAtt': [
              'ApiGatewayDomainName',
              'DistributionDomainName',
            ],
          },
          HostedZoneId: { Ref: 'AmazonHardcodedCloudFrontHostedZoneId' },
        },
        HostedZoneName: {
          'Fn::Join': [
            '',
            [
              'Domain',
              '.',
            ],
          ],
        },
        Name: {
          'Fn::Join': [
            '',
            [
              { Ref: 'Subdomain' },
              '.',
              { Ref: 'Domain' },
            ],
          ],
        },
        Type: 'A',
      },
    };

    template.Outputs.DomainUrl = {
      Description: `
        Public available URL to subdomain created with Route53.
      `,
      Value: {
        'Fn::Join': [
          '',
          [
            'https://',
            { Ref: 'Subdomain' },
            '.',
            { Ref: 'Domain' },
            '/',
          ],
        ],
      },
    };
  }

  return {
    parameters,
    template,
  };
};

export const generateSwaggerApi = async () => {
  const identity = await sts.getCallerIdentity().promise();
  const accountId = identity.Account;
  const lambdaUri = [
    `arn:aws:apigateway:${AWS_REGION}:lambda:path`,
    '2015-03-31',
    'functions',
    `arn:aws:lambda:${AWS_REGION}:${accountId}:function:${FUNCTION_NAME}`,
    'invocations',
  ].join('/');
  const allowHeaders = [
    'Content-Type',
    'Authorization',
    'X-Amz-Date',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Requested-With',
  ].join(',');

  return tsDedent`
    ---
    swagger: 2.0
    basePath: /prod
    info:
      title: LogRequest Proxy
    schemes:
    - https
    paths:
      /:
        x-amazon-apigateway-any-method:
          x-amazon-apigateway-auth:
            type: aws_iam
          produces:
          - application/json
          parameters:
          - name: proxy
            in: path
            required: true
            type: string
          responses: {}
          x-amazon-apigateway-integration:
            uri: "${lambdaUri}"
            httpMethod: POST
            type: aws_proxy
        options:
          consumes:
          - application/json
          produces:
          - application/json
          responses:
            '200':
              description: 200 response
              schema:
                $ref: "#/definitions/Empty"
              headers:
                Access-Control-Allow-Origin:
                  type: string
                Access-Control-Allow-Methods:
                  type: string
                Access-Control-Allow-Headers:
                  type: string
          x-amazon-apigateway-integration:
            responses:
              default:
                statusCode: 200
                responseParameters:
                  method.response.header.Access-Control-Allow-Methods: "'POST,OPTIONS'"
                  method.response.header.Access-Control-Allow-Headers: "'${allowHeaders}'"
                  method.response.header.Access-Control-Allow-Origin: "'*'"
            passthroughBehavior: when_no_match
            requestTemplates:
              application/json: "{\"statusCode\": 200}"
            type: mock
      /{proxy+}:
        x-amazon-apigateway-any-method:
          x-amazon-apigateway-auth:
            type: aws_iam
          produces:
          - application/json
          parameters:
          - name: proxy
            in: path
            required: true
            type: string
          responses: {}
          x-amazon-apigateway-integration:
            uri: "${lambdaUri}"
            httpMethod: POST
            type: aws_proxy
        options:
          consumes:
          - application/json
          produces:
          - application/json
          responses:
            '200':
              description: 200 response
              schema:
                $ref: "#/definitions/Empty"
              headers:
                Access-Control-Allow-Origin:
                  type: string
                Access-Control-Allow-Methods:
                  type: string
                Access-Control-Allow-Headers:
                  type: string
          x-amazon-apigateway-integration:
            responses:
              default:
                statusCode: 200
                responseParameters:
                  method.response.header.Access-Control-Allow-Methods: "'POST,OPTIONS'"
                  method.response.header.Access-Control-Allow-Headers: "'${allowHeaders}'"
                  method.response.header.Access-Control-Allow-Origin: "'*'"
            passthroughBehavior: when_no_match
            requestTemplates:
              application/json: "{\"statusCode\": 200}"
            type: mock
    definitions:
      Empty:
        type: object
        title: Empty Schema
  `;
};

export default {
  AWS_REGION,
  AWS_PROFILE,
  BUCKET_NAME,
  STACK_NAME,
  FUNCTION_NAME,
  cloudFormation,
  generateStack,
  generateSwaggerApi,
  s3,
};
