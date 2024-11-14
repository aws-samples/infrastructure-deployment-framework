const { Stack } = require('aws-cdk-lib');
const cdk = require('aws-cdk-lib');

class CdkAppStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a VPC with NAT and otherwise default settings
    const vpc = new cdk.aws_ec2.Vpc(this, 'csk-vpc-with-nat', {
      vpcName: "csk-vpc-with-nat",
      natGateways: Number(props.params["natCount"]),
      maxAzs: 3,
      gatewayEndpoints: {
        S3: {
          service: cdk.aws_ec2.GatewayVpcEndpointAwsService.S3,
        },
        DynamoDB: {
          service: cdk.aws_ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        },
      },
    })
  }
}

module.exports = { CdkAppStack }
