import {
  AWS_REGION,
  STACK_NAME,
  cloudFormation,
} from './env';

export const action = async () => {
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
