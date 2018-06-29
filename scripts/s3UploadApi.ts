import {
  BUCKET_NAME,
  s3,
  swaggerApi,
} from './env';

export const action = async () => {
  return await s3.upload({
    Bucket: BUCKET_NAME,
    Key: 'api.yml',
    Body: swaggerApi,
    ContentType: 'text/yaml',
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
