import {
  BUCKET_NAME,
  s3,
} from './env';
import { action as packageAction } from './lambdaPackage';

export const action = async () => {
  const zip = await packageAction();
  return await s3.upload({
    Bucket: BUCKET_NAME,
    Key: 'lambda-function.zip',
    Body: Buffer.from(zip, 'base64'),
    ContentType: 'application/zip',
  }).promise();
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  (async () => {
    const result = await action();
    console.log(result);
  })();
}
