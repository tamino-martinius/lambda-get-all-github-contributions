import {
  STACK_NAME,
  FINAL_STACK_TYPE,
  TemplateType,
  cloudFormation,
  generateStack,
} from './env';
import { action as s3UploadAction } from './s3UploadApi';
import { action as lambdaUploadAction } from './lambdaUpload';
import { action as updateAction } from './cloudFormationUpdateStack';

export const action = async () => {
  const initialStack = generateStack(TemplateType.INITIAL);
  await cloudFormation.createStack({
    StackName: STACK_NAME,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    OnFailure: 'ROLLBACK',
    Parameters: initialStack.parameters,
    TemplateBody: JSON.stringify(initialStack.template),
  }).promise();
  await cloudFormation.waitFor(
    'stackCreateComplete',
    { StackName: STACK_NAME },
  ).promise();
  if (FINAL_STACK_TYPE !== TemplateType.FUNCTION) {
    await s3UploadAction();
  }
  await lambdaUploadAction();
  return await updateAction();
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  (async () => {
    const result = await action();
    console.log(result);
  })();
}
