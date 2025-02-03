const { Stack } = require('aws-cdk-lib');

class ExampleStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, params) {
    super(scope, id, params);

    //do your thing
    console.log(params.kitId);
  }
}


module.exports = { ExampleStack }
