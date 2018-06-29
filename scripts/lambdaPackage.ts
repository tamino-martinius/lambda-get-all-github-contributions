import {
  action as buildAction,
  TARGET_PATH,
  TARGET_NAME,
} from './build';
import { readFileSync } from 'fs';

import * as JSZip from 'jszip';

export const action = async () => {
  console.log(await buildAction(true));
  const zip = new JSZip();
  zip.file(TARGET_NAME, readFileSync(TARGET_PATH));
  return await zip.generateAsync({
    type: 'base64',
  });
};
export default action;

if (!module.parent) {
  // run action if script is called directly
  (async () => {
    const result = await action();
    console.log(result);
  })();
}
