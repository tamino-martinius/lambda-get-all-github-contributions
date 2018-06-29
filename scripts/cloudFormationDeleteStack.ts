import {
  AWS_REGION,
  STACK_NAME,
  cloudFormation,
} from './env';
import { action as clearAction } from './s3ClearBucket';

export const action = async () => {
  await clearAction();
  return await cloudFormation.deleteStack({
    StackName: STACK_NAME,
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
