import {
  FUNCTION_NAME,
  BUCKET_NAME,
  STACK_NAME,
  cloudFormation,
  FINAL_STACK_TYPE,
  generateStack,
} from './env';

export const action = async () => {
  const finalStack = generateStack(FINAL_STACK_TYPE);
  return await cloudFormation.updateStack({
    StackName: STACK_NAME,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    Parameters: finalStack.parameters,
    TemplateBody: JSON.stringify(finalStack.template),
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
