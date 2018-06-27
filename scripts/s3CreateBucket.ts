import {
  AWS_REGION,
  BUCKET_NAME,
  s3,
} from './env';

export const action = async () => {
  s3.createBucket(
    {
      Bucket: BUCKET_NAME,
      CreateBucketConfiguration: {
        LocationConstraint: AWS_REGION,
      },
    },
    console.log,
  );
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  action();
}
