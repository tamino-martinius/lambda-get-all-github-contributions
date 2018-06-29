import {
  STACK_NAME,
  cloudFormation,
  FINAL_STACK_TYPE,
  generateStack,
} from './env';

export const action = async () => {
  const finalStack = generateStack(FINAL_STACK_TYPE);
  const changeSetName = `Update-${Date.now()}`;
  await cloudFormation.createChangeSet({
    StackName: STACK_NAME,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    ChangeSetName: changeSetName,
    Parameters: finalStack.parameters,
    TemplateBody: JSON.stringify(finalStack.template),
  }).promise();
  await cloudFormation.waitFor(
    'changeSetCreateComplete',
    {
      StackName: STACK_NAME,
      ChangeSetName: changeSetName,
    },
  ).promise();
  await cloudFormation.executeChangeSet({
    StackName: STACK_NAME,
    ChangeSetName: changeSetName,
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
