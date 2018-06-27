export default class Test {
  constructor() {
    console.log('hello world');
  }
}

exports.handler = async (event: any) => {
  new Test();
};
