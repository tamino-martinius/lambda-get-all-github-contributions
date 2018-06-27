import {
  AWS_REGION,
  STACK_NAME,
  cloudFormation,
} from './env';

export const action = async () => {
  cloudFormation.deleteStack(
    {
      StackName: STACK_NAME,
    },
    console.log,
  );
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  action();
}
