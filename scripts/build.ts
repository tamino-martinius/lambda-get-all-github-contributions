import * as webpack from 'webpack';
import { resolve } from 'path';
import * as uglifyJsPlugin from 'uglifyjs-webpack-plugin';
import * as cleanWebpackPlugin from 'clean-webpack-plugin';

export const ROOT_PATH = resolve(__dirname, '..');
export const SRC_PATH = resolve(ROOT_PATH, 'src');
export const DIST_PATH = resolve(ROOT_PATH, 'dist');
export const TARGET_NAME = 'lambda.js';
export const TARGET_PATH = resolve(DIST_PATH, TARGET_NAME);
export const config = (isProduction: boolean = false) => {
  // legacy as fallback
  if (isProduction) process.env.NODE_ENV = 'production';

  const result: webpack.Configuration = {
    context: ROOT_PATH,
    entry: resolve(SRC_PATH, 'index.ts'),
    target: 'node',
    output: {
      library: 'handler',
      libraryTarget: 'commonjs',
      libraryExport: 'default',
      path: DIST_PATH,
      filename: TARGET_NAME,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    externals: [
      'aws-sdk',
    ],
    resolve: {
      extensions: ['.js', '.ts', '.json'],
    },
    devServer: {
      historyApiFallback: true,
      noInfo: true,
    },
    performance: {
      hints: false,
    },
    devtool: '#eval-source-map',
    plugins: [
      new cleanWebpackPlugin(DIST_PATH, {
        root: ROOT_PATH,
      }),
    ],
    mode: isProduction ? 'production' : 'development',
  };

  if (isProduction) {
    result.devtool = '#source-map';
    // http://vue-loader.vuejs.org/en/workflow/production.html
    result.plugins = (module.exports.plugins || []).concat([
      new uglifyJsPlugin({
        sourceMap: true,
        uglifyOptions: {
          compress: {
            warnings: false,
          },
        },
      }),
      new webpack.LoaderOptionsPlugin({
        minimize: true,
      }),
    ]);
  }

  return result;
};

export const action = async (isProduction: boolean = process.env.NODE_ENV === 'production') => {
  return await new Promise<string>((resolve, reject) => {
    webpack(config(isProduction), (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res.toString({
          colors: true,
        }));
      }
    });
  });
};

export default action;

if (!module.parent) {
  // run action if script is called directly
  (async () => {
    const stats = await action();
    console.log(stats);
  })();
}
