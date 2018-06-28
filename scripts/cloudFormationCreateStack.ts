import {
  FUNCTION_NAME,
  BUCKET_NAME,
  STACK_NAME,
  cloudFormation,
  template,
} from './env';

export const action = async () => {
  return await cloudFormation.createStack({
    StackName: STACK_NAME,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    OnFailure: 'DELETE',
    Parameters: [
      {
        ParameterKey: 'AwsServerlessExpressS3Bucket',
        ParameterValue: BUCKET_NAME,
        UsePreviousValue: false,
      },
      {
        ParameterKey: 'LambdaFunctionName',
        ParameterValue: FUNCTION_NAME,
        UsePreviousValue: false,
      },
    ],
    TemplateBody: JSON.stringify(template),
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
