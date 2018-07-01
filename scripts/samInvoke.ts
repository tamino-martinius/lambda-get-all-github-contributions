import {
  FINAL_STACK_TYPE,
  generateStack,
} from './env';
import {
  DIST_PATH,
  action as buildAction,
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
import { execSync } from 'child_process';
import tsDedent from 'ts-dedent';

const ensureDirectoryExistence = (filePath: string) => {
  const dir = dirname(filePath);
  if (existsSync(dir)) {
    return true;
  }
  ensureDirectoryExistence(dir);
  mkdirSync(dir);
};

const samPath = resolve(__dirname, '../node_modules/aws-sam-local/node_modules/.bin/sam');

export const action = async () => {
  console.log(await buildAction());
  const finalStack = generateStack(FINAL_STACK_TYPE);
  const templatePath = resolve(DIST_PATH, 'template.json');
  const eventPath = resolve(DIST_PATH, 'event.json');
  ensureDirectoryExistence(templatePath);
  ensureDirectoryExistence(eventPath);
  writeFileSync(templatePath, JSON.stringify(finalStack.template));
  writeFileSync(eventPath, JSON.stringify({}));
  return execSync(tsDedent`
    ${samPath} local invoke -t "${templatePath}" -e "${eventPath}"
  `).toString();
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  (async () => {
    const result = await action();
    console.log(result);
  })();
}
