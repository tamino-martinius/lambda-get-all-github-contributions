# Webpack Template for TypeScript

This is a Webpack Template for transpiling [TypeScript](http://www.typescriptlang.org/) to JavaScript.
This readme explains how to build this Template from scratch, or how to extend an existing webpack project.

## TOC
- [Webpack Template for TypeScript](#webpack-template-for-typescript)
  - [TOC](#toc)
  - [Initialize your project](#initialize-your-project)
  - [Initialize the project](#initialize-the-project)
  - [Install our dependencies](#install-our-dependencies)
  - [Add a TypeScript configuration file](#add-a-typescript-configuration-file)
  - [Adding Webpack](#adding-webpack)
  - [Add a build script](#add-a-build-script)
  - [Create a basic project](#create-a-basic-project)
  - [What next](#what-next)

## Initialize your project

Let's create a new package.

```sh
mkdir webpack-typescript
cd webpack-typescript
```

Next, we'll scaffold our project in the following way:

```txt
webpack-typescript/
├─ dist/
├─ public/
└─ src/
   └─ components/
```

TypeScript files will start out in your `src` folder, run through the TypeScript compiler, then webpack, and end up in a `index.js` file in `dist`.

Let's scaffold this out:

```shell
mkdir src
```

Webpack will eventually generate the `dist` directory for us.

## Initialize the project

Now we'll turn this folder into an npm package.

```shell
npm init
```

You'll be given a series of prompts.
You can use the defaults except for your entry point.
You can always go back and change these in the `package.json` file that's been generated for you.

## Install our dependencies

Ensure TypeScript, Webpack, Vue and the necessary loaders are installed.
Additionally its recommended to also install tslint to improve your code quality.

```shell
npm install --save-dev \
  @types/node \
  ts-loader \
  tslint \
  tslint-config-airbnb \
  typescript \
  webpack \
  webpack-cli
```

Webpack is a tool that will bundle your code and optionally all of its dependencies into a single `.js` file. Webpack itself is not needed to transpile `.ts` files to `.js`, but its easy to extend if you need more then the base functionalety later.

We didn't need to [add `.d.ts` files](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html), but if we were using a package which didn't ship declaration files, we'd need to install the appropriate `@types/` package.
[Read more about using definition files in our documentation](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html).

## Add a TypeScript configuration file

You'll want to bring your TypeScript files together - both the code you'll be writing as well as any necessary declaration files.

To do this, you'll need to create a `tsconfig.json` which contains a list of your input files as well as all your compilation settings. Simply create a new file in your project root named `tsconfig.json` and fill it with the following contents:

```json
{
  "compilerOptions": {
    "outDir": "./built/",
    "sourceMap": true,
    "strict": true,
    "module": "es2015",
    "moduleResolution": "node",
    "target": "es5",
    "experimentalDecorators": true,
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "src/*"
      ]
    }
  },
  "exclude": [
    "node_modules"
  ],
  "include": [
    "src/**/*.ts"
  ]
}

```

Notice the `strict` flag is set to true. Strict gives you the `noImplicitThis` flag aswell as `noImplicitAny`, `strictNullChecks` and some others.
We strongly recommend using TypeScript's stricter options for a better experience.

## Adding Webpack

We'll need to add a `webpack.config.js` to bundle our app.

```js
const path = require('path');
const webpack = require('webpack');
const uglifyJsPlugin = require('uglifyjs-webpack-plugin');
const cleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'index.js',
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
  resolve: {
    extensions: ['.ts', '.json'],
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
    new cleanWebpackPlugin('./dist'),
  ],
};

if (process.env.NODE_ENV === 'production') {
  module.exports.devtool = '#source-map';
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
    new uglifyJsPlugin({
      uglifyOptions: {
        sourceMap: true,
        compress: {
          warnings: false,
        },
      },
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
    }),
  ]);
} else {
  module.exports.mode = 'development';
}
```

## Add a build script

Open up your `package.json` and add a script named `build` to run Webpack.
Your `"scripts"` field should look something like this:

```json
  "scripts": {
    "build": "rm -rf dist && webpack",
    "build:production": "npm run build --production",
    "watch": "npm run build -- --watch"
  },
```

Once we add an entry point, we'll be able to build by running

```sh
npm run build
```

If you want to build the minified release version

```sh
npm run build --production
# or
npm run build:production
```

and have builds get triggered on changes by running

```sh
npm run build -- --watch
# or
npm run watch
```

## Create a basic project

Last but not least you need to have an TypeScript file which will be the entry to your code. This file needs to be saved as `./src/index.ts`, unless you change it at the webpack entry setting

## What next

You can build your code based on [this template](https://github.com/tamino-martinius/template-webpack-typescript).

If you want to get started with TypeScript without installing anything you can use the [TypeScript Playground](http://www.typescriptlang.org/play/). It shows you the transpiled code and also supports many features which you might just know from rich code editors.
