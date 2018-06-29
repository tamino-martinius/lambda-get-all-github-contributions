import {
  FINAL_STACK_TYPE,
  generateStack,
} from './env';
import {
  DIST_PATH,
} from './build';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'fs';
import {
  dirname,
  resolve,
} from 'path';

const ensureDirectoryExistence = (filePath: string) => {
  const dir = dirname(filePath);
  if (existsSync(dir)) {
    return true;
  }
  ensureDirectoryExistence(dir);
  mkdirSync(dir);
};

export const action = async () => {
  const finalStack = generateStack(FINAL_STACK_TYPE);
  const filePath = resolve(DIST_PATH, 'template.json');
  ensureDirectoryExistence(filePath);
  writeFileSync(filePath, JSON.stringify(finalStack.template));
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  (async () => {
    const result = await action();
    console.log(result);
  })();
}
