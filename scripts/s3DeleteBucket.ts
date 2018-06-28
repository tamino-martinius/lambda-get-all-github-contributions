import {
  BUCKET_NAME,
  s3,
} from './env';

export const action = async () => {
  return await s3.deleteBucket({
    Bucket: BUCKET_NAME,
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
