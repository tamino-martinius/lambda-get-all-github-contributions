import {
  AWS_REGION,
  STACK_NAME,
  cloudFormation,
} from './env';

cloudFormation.deleteStack(
  {
    StackName: STACK_NAME,
  },
  console.log,
);
