const { Stack } = require('aws-cdk-lib');
const cdk = require('aws-cdk-lib');
const iam = require('aws-cdk-lib/aws-iam');
const ec2 = require('aws-cdk-lib/aws-ec2');
const route53 = require('aws-cdk-lib/aws-route53');
const targets = require('aws-cdk-lib/aws-route53-targets');
const acm = require('aws-cdk-lib/aws-certificatemanager');
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const autoscaling = require('aws-cdk-lib/aws-autoscaling');

class Ec2Stack extends Stack {
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

    let isPublicSubnet = false;

    let subnetToDeployTo = ec2.Subnet.fromSubnetAttributes(this, "mysubnet", {
      subnetId: props.params["subnetId"],
      availabilityZone: props.params["subnetId-az"]
    })

    if (props.params["subnetId-type"] === "public") {
      isPublicSubnet = true;
    }

    const role = new iam.Role(this, props.params["ec2Name"] + '-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')]
    });

    const securityGroup = new ec2.SecurityGroup(this, props.params["ec2Name"] + 'sg', {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: props.params["ec2Name"] + '-sg',
    });
    // open the SSH port
    securityGroup.addIngressRule(ec2.Peer.ipv4(props.params["ingressIp"]), ec2.Port.tcp(22));
    //allow 443 from local network for SSM
    if (props.params["enableEic"] === "Yes" && !isPublicSubnet) {
      securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(443));
    }

    const amiMap = {};
    if (props.params["customAmiId"] !== "") {
      amiMap[this.region] = props.params["customAmiId"];
    }
    else {
      amiMap[this.region] = props.params["amiId"];
    }

    let machineImage = null;
    if (props.params["amiId-os"] === "Linux") {
      machineImage = ec2.MachineImage.genericLinux(amiMap);
    }
    else {
      machineImage = ec2.MachineImage.genericWindows(amiMap);
    }
    let instanceProps = {
      role: role,
      requireImdsv2: true,
      securityGroup: securityGroup,
      instanceName: props.params["ec2Name"],
      instanceType: props.params["instanceType"],
      machineImage: machineImage,
      keyPair: ec2.KeyPair.fromKeyPairName(this, "key", props.params["keyPair"]),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(Number(props.params["diskSize"]), {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
          encrypted: true,
        },
      ],
    }
    if (props.params["userData"]) {
      const rawUserData = Buffer.from(props.params["userData"], 'base64').toString('utf8');
      instanceProps["userData"] = ec2.UserData.custom(rawUserData);
    }
    //if hostedZoneId provided, create ALB, ASG and ACM cert
    if (props.params["hostedZoneId"]) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.params["hostedZoneId"],
        zoneName: props.params["hostedZoneId-zonename"]
      });

      const albCert = new acm.Certificate(this, 'Certificate', {
        domainName: `${props.params["subdomain"]}.${props.params["hostedZoneId-zonename"]}`,
        certificateName: `Certificate for ${props.params["ec2Name"]}`,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });

      const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
        vpc: vpc,
        internetFacing: true
      });
      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: `${props.params["subdomain"]}.${props.params["hostedZoneId-zonename"]}`,
        target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(lb)),
      })
      const listener = lb.addListener('Listener', {
        port: 443,
        open: true,
        certificates: [albCert],
      });
      const launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', instanceProps);

      const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
        vpc: vpc,
        launchTemplate: launchTemplate,
        minCapacity: 1,
        maxCapacity: 1,
      })
      if (props.params.hasOwnProperty("maxCapacity") && Number(props.params["maxCapacity"]) > 0) {
        asg.maxCapacity = Number(props.params["maxCapacity"]);
      }
      if (props.params.hasOwnProperty("minCapacity") && Number(props.params["minCapacity"]) > 0) {
        asg.maxCapacity = Number(props.params["minCapacity"]);
      }
      listener.addTargets('ApplicationFleet', {
        port: 80,
        targets: [asg]
      });
      this.exportValue(lb.loadBalancerDnsName);
    }
    else {
      const instance = new ec2.Instance(this, props.params["ec2Name"], {
        vpc: vpc,
        vpcSubnets: { subnets: [subnetToDeployTo] },
        ...instanceProps
      });

      this.exportValue(instance.instanceId);
      if (isPublicSubnet) {
        if (props.params["eicPrefixList"] !== "") {
          securityGroup.addIngressRule(ec2.Peer.prefixList(props.params["eicPrefixList"]), ec2.Port.tcp(22));
        }
        this.exportValue(instance.instancePublicIp);
        this.exportValue(instance.instancePublicDnsName);
      }
    }

    if (props.params["enableEic"] === "Yes" && !isPublicSubnet) {
      new cdk.aws_ec2.CfnInstanceConnectEndpoint(this, 'InstanceConnectEndpoint', {
        subnetId: subnetToDeployTo.subnetId,
      });
      securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(22));
    }

  }
}


module.exports = { Ec2Stack }
