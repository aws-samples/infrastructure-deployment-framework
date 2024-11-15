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

    // Create a VPC without NAT and otherwise default settings
    const vpc = new cdk.aws_ec2.Vpc(this, 'csk-vpc-without-nat', {
      vpcName: "csk-vpc-without-nat",
      natGateways: 0,
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

    if (props.params["addSecretsManagerEndpoint"] === "Yes") {
      new cdk.aws_ec2.InterfaceVpcEndpoint(
        this,
        "SecretsManagerVpcEndpoint", {
        service: new cdk.aws_ec2.InterfaceVpcEndpointService("com.amazonaws." + this.region + ".secretsmanager"),
        vpc: vpc,
        subnets: {
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED
        }
      })
    }

    if (props.params["addSsmEndpoints"] === "Yes") {
      new cdk.aws_ec2.InterfaceVpcEndpoint(
        this,
        "SsmVpcEndpoint", {
        service: new cdk.aws_ec2.InterfaceVpcEndpointService("com.amazonaws." + this.region + ".ssm"),
        vpc: vpc,
        subnets: {
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED
        }
      })

      new cdk.aws_ec2.InterfaceVpcEndpoint(
        this,
        "Ec2MessagesVpcEndpoint", {
        service: new cdk.aws_ec2.InterfaceVpcEndpointService("com.amazonaws." + this.region + ".ec2messages"),
        vpc: vpc,
        subnets: {
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED
        }
      })

      new cdk.aws_ec2.InterfaceVpcEndpoint(
        this,
        "SsmMessagesVpcEndpoint", {
        service: new cdk.aws_ec2.InterfaceVpcEndpointService("com.amazonaws." + this.region + ".ssmmessages"),
        vpc: vpc,
        subnets: {
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED
        }
      })
    }

  }
}

module.exports = { CdkAppStack }
