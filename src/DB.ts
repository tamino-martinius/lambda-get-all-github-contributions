import { DynamoDB } from 'aws-sdk';
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';
const ENDPOINT = process.env.AWS_SAM_LOCAL ? 'http://docker.for.mac.localhost:8000' : undefined;
const TABLE_NAME = 'lambda-github-contributions';
const dynamoDB = new DynamoDB({
  region: AWS_REGION,
  endpoint: ENDPOINT,
});

const dynamoDBClient = new DynamoDB.DocumentClient({
  region: AWS_REGION,
  endpoint: ENDPOINT,
});

export class DB {
  constructor() {

  }

  static async create(): Promise<DB> {
    const db = new DB();
    await db.init();
    return db;
  }

  async init() {
    // make sure table exists
    const tableList = await this.listTables();
    if (!tableList.TableNames || !tableList.TableNames.includes(TABLE_NAME)) {
      console.log(await this.createTable());
    }
  }

  async listTables() {
    return await dynamoDB.listTables({}).promise();
  }

  async createTable() {
    return await dynamoDB.createTable({
      AttributeDefinitions: [
        {
          AttributeName: 'userId',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH',
        },
      ],
      TableName: TABLE_NAME,
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    }).promise();
  }

  async deleteTable() {
    return await dynamoDB.deleteTable({
      TableName: TABLE_NAME,
    }).promise();
  }

  async getItem() {
    return await dynamoDB.getItem({
      TableName: TABLE_NAME,
      Key: {
        userId: {
          S: 'test',
        },
      },
    }).promise();
  }
}

export default DB;
