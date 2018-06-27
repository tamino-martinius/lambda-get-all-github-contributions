import {
  BUCKET_NAME,
  s3,
} from './env';

export const action = async () => {
  s3.deleteBucket(
    {
      Bucket: BUCKET_NAME,
    },
    console.log,
  );
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  action();
}
