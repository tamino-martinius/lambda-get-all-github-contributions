class Test {
  constructor() {
    console.log('hello world');
  }
}

console.log('test');

export default async (event: any) => {
  return new Test();
};
