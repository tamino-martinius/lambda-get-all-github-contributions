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
    // console.log(await this.deleteTable());
    const tableList = await this.listTables();
    if (!tableList.TableNames || !tableList.TableNames.includes(TABLE_NAME)) {
      console.log(await this.createTable());
    }

    console.log(await this.writeItem('test', { foo: 'bar' }));
    console.log(await this.deleteItem('test'));
    console.log(await this.readItem('test'));
  }

  async listTables() {
    return await dynamoDB.listTables({}).promise();
  }

  async createTable() {
    return await dynamoDB.createTable({
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'id',
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

  async readItem(id: string): Promise<any> {
    const record = await dynamoDB.getItem({
      TableName: TABLE_NAME,
      Key: {
        id: {
          S: id,
        },
      },
    }).promise();
    if (record.Item && record.Item.data && record.Item.data.S) {
      console.log(`read ${record.Item.data.S} chars`);
      return JSON.parse(record.Item.data.S);
    }
    return undefined;
  }

  async deleteItem(id: string) {
    return await dynamoDB.getItem({
      TableName: TABLE_NAME,
      Key: {
        id: {
          S: id,
        },
      },
    }).promise();
  }

  async writeItem(id: string, data: any) {
    const dataStr = JSON.stringify(data);
    console.log(`write ${dataStr} chars`);
    return dynamoDB.putItem({
      TableName: TABLE_NAME,
      Item: {
        id: {
          S: id,
        },
        data: {
          S: dataStr,
        },
      },
    }).promise();
  }
}

export default DB;
