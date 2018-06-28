import { config } from './build';
import * as webpack from 'webpack';

const compiler = webpack(config());
compiler.watch({}, (err, stats) => {
  if (err) {
    console.log(err);
  } else {
    console.log(stats.toString({
      colors: true,
    }));
  }
});
