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
const getConfig = (key: string) => env[`npm_config_${key}`] || env[`npm_package_config_${key}`];

export const AWS_REGION = getConfig('awsRegion') || '';
export const AWS_PROFILE = getConfig('awsProfile') || '';
export const LOCAL_BUCKET_NAME = getConfig('localBucketName') || '';
export const BUCKET_NAME = getConfig('bucketName') || '';
export const STACK_NAME = getConfig('stackName') || '';
export const FUNCTION_NAME = getConfig('functionName') || '';
export const API_GATEWAY = getConfig('apiGateway') === 'true';
export const API_DOMAIN = getConfig('apiDomain') || '';
export const API_SUBDOMAIN = getConfig('apiSubdomain') || '';
export const GITHUB_TOKEN = getConfig('gitHubToken') || '';
export const DOMAIN_NAME = getConfig('domainName') || '';
export const FULL_DOMAIN_NAME = getConfig('fullDomainName') || '';
export const ACM_CERTIFICATE_ARN = getConfig('acmCertificateArn') || '';

if (GITHUB_TOKEN.length === 0) throw 'please define "GITHUB_TOKEN" env variable';
if (DOMAIN_NAME.length === 0) throw 'please define "DOMAIN_NAME" env variable';
if (FULL_DOMAIN_NAME.length === 0) throw 'please define "FULL_DOMAIN_NAME" env variable';
if (ACM_CERTIFICATE_ARN.length === 0) throw 'please define "ACM_CERTIFICATE_ARN" env variable';

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
          WebsiteConfiguration: {
            IndexDocument: 'index.html',
            ErrorDocument: '404.html',
          },
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
    parameters.push({
      ParameterKey: 'LambdaFunctionName',
      ParameterValue: FUNCTION_NAME,
      UsePreviousValue: false,
    });
    template.Parameters.LambdaFunctionS3Key = {
      Type: 'String',
      AllowedPattern: '.*\\.zip',
      Description: `
        The S3 object for the lambda function code package.
      `,
      Default: 'lambda-function.zip',
    };
    template.Parameters.DomainName = {
      Type: 'String',
      Description: `
        The name of the domain without subdomain.
      `,
    };
    parameters.push({
      ParameterKey: 'DomainName',
      ParameterValue: DOMAIN_NAME,
      UsePreviousValue: false,
    });
    template.Parameters.FullDomainName = {
      Type: 'String',
      Description: `
        The name of the domain including subdomains.
      `,
    };
    parameters.push({
      ParameterKey: 'FullDomainName',
      ParameterValue: FULL_DOMAIN_NAME,
      UsePreviousValue: false,
    });
    template.Parameters.AcmCertificateArn = {
      Type: 'String',
      Description: `
        The Certificate arn for the domain.
      `,
    };
    parameters.push({
      ParameterKey: 'AcmCertificateArn',
      ParameterValue: ACM_CERTIFICATE_ARN,
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
                { // TODO: Restrict to Bucket
                  Effect: 'Allow',
                  Action: [
                    's3:*',
                  ],
                  Resource: '*',
                },
              ],
            },
          },
        ],
      },
    };
    template.Resources.BucketPolicy = {
      Type: 'AWS::S3::BucketPolicy',
      Properties: {
        Bucket: { Ref: 'LambdaFunctionS3Bucket' },
        PolicyDocument: {
          Statement: [{
            Sid: 'PublicReadForGetBucketObjects',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:aws:s3:::',
                  { Ref: 'LambdaFunctionS3Bucket' },
                  '/*',
                ],
              ],
            },
          }],
        },
      },
    };
    template.Resources.CloudFront = {
      Type: 'AWS::CloudFront::Distribution',
      DependsOn: [
        'LambdaFunctionS3Bucket',
      ],
      Properties: {
        DistributionConfig: {
          Comment: `CloudFront Distribution for ${FUNCTION_NAME} S3 bucket`,
          Origins: [{
            DomainName: {
              'Fn::Select': [
                2,
                {
                  'Fn::Split': [
                    '/',
                    {
                      'Fn::GetAtt': 'LambdaFunctionS3Bucket.WebsiteURL',
                    },
                  ],
                },
              ],
            },
            Id: 'S3Origin',
            CustomOriginConfig: {
              HTTPPort: '80',
              HTTPSPort: '443',
              OriginProtocolPolicy: 'http-only',
            },
          }],
          Enabled: true,
          HttpVersion: 'http2',
          DefaultRootObject: 'index.html',
          Aliases: [{ Ref: 'FullDomainName' }],
          DefaultCacheBehavior: {
            AllowedMethods: ['HEAD', 'GET'],
            Compress: true,
            ForwardedValues: {
              QueryString: false,
            },
            TargetOriginId: 'S3Origin',
            ViewerProtocolPolicy: 'redirect-to-https',
          },
          PriceClass: 'PriceClass_All',
          ViewerCertificate: {
            AcmCertificateArn: { Ref: 'AcmCertificateArn' },
            SslSupportMethod: 'sni-only',
          },
        },
      },
    };
    template.Resources.WebsiteDNSName = {
      Type: 'AWS::Route53::RecordSetGroup',
      Properties: {
        HostedZoneName: { 'Fn::Join': ['', [{ Ref: 'DomainName' }, '.']] },
        RecordSets: [{
          Name: { Ref: 'FullDomainName' },
          Type: 'A',
          AliasTarget: {
            HostedZoneId: 'Z2FDTNDATAQYW2',
            DNSName: { 'Fn::GetAtt': ['CloudFront', 'DomainName'] },
          },
        }],
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
        MemorySize: 256,
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
    template.Resources.EventsRule = {
      Type: 'AWS::Events::Rule',
      Properties: {
        Description: 'Trigger the lambda function to fetch new commits every 60 minutes',
        Name: `Trigger${FUNCTION_NAME}`,
        ScheduleExpression: 'rate(60 minutes)',
        State: 'ENABLED',
        Targets: [{
          Arn: {
            'Fn::GetAtt': ['LambdaFunction', 'Arn'],
          },
          Id: FUNCTION_NAME,
        }],
      },
    };
    template.Resources.EventsRulePermission = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: { Ref: 'LambdaFunction' },
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: {
          'Fn::GetAtt': ['EventsRule', 'Arn'],
        },
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
