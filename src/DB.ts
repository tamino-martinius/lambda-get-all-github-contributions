import { DynamoDB } from 'aws-sdk';
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';
const ENDPOINT = process.env.AWS_SAM_LOCAL ? 'http://docker.for.mac.localhost:8000' : undefined;
console.log(process.env);

const dynamoDB = new DynamoDB({
  region: AWS_REGION,
  endpoint: ENDPOINT,
});

const dynamoDBClient = new DynamoDB.DocumentClient({
  region: AWS_REGION,
  endpoint: ENDPOINT,
});

export class DB {

}

export default DB;
