import {
  BUCKET_NAME,
  s3,
  generateSwaggerApi,
} from './env';

export const action = async () => {
  const api = await generateSwaggerApi();
  return await s3.upload({
    Bucket: BUCKET_NAME,
    Key: 'api.yml',
    Body: api,
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
