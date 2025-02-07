const { Stack } = require('aws-cdk-lib');
const ec2 = require('aws-cdk-lib/aws-ec2');

class ExampleStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: props.params["vpcId"],
    });

    //do your thing

  }
}


module.exports = { ExampleStack }
