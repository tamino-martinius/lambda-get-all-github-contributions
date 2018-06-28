import {
  AWS_REGION,
  BUCKET_NAME,
  s3,
} from './env';

export const action = async () => {
  return await s3.createBucket({
    Bucket: BUCKET_NAME,
    CreateBucketConfiguration: {
      LocationConstraint: AWS_REGION,
    },
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
