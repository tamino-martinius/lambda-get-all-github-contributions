import {
  BUCKET_NAME,
  s3,
} from './env';

s3.deleteBucket(
  {
    Bucket: BUCKET_NAME,
  },
  console.log,
);
