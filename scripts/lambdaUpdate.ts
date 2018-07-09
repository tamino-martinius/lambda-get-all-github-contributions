import {
  FUNCTION_NAME,
  lambda,
} from './env';
import { action as packageAction } from './lambdaPackage';

export const action = async () => {
  const zip = await packageAction();
  return await lambda.updateFunctionCode({
    FunctionName: FUNCTION_NAME,
    ZipFile: new Buffer(zip, 'base64'),
    Publish: true,
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
