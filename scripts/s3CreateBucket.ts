import {
  AWS_REGION,
  BUCKET_NAME,
  s3,
} from './env';

s3.createBucket(
  {
    Bucket: BUCKET_NAME,
    CreateBucketConfiguration: {
      LocationConstraint: AWS_REGION,
    },
  },
  console.log,
);
