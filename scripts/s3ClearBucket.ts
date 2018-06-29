import { S3 } from 'aws-sdk';
import {
  BUCKET_NAME,
  s3,
} from './env';

export const action = async () => {
  const s3data = await s3.listObjects({ Bucket: BUCKET_NAME }).promise();
  const items = s3data.Contents;
  if (items) {
    const keys: string[] = <any>items.map(item => item.Key).filter(key => key !== undefined);
    const params: S3.DeleteObjectsRequest = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
      },
    };
    if (params.Delete.Objects.length > 0) {
      return await s3.deleteObjects(params).promise();
    }
  }
  return [];
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  (async () => {
    const result = await action();
    console.log(result);
  })();
}
