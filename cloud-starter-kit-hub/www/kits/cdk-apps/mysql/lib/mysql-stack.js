const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const ec2 = require('aws-cdk-lib/aws-ec2');
const rds = require('aws-cdk-lib/aws-rds');
const cdk_nag = require("cdk-nag");

class MySqlStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    //default
    let engineConfig = rds.DatabaseInstanceEngine.mysql({ version: props.params["dbEngineVersion"] });
    let instanceClass = props.params["instanceClass"].replace(/^db\./, "");
    let replicaInstanceClass = props.params["replicaInstanceClass"].replace(/^db\./, "");

    if (props.params["dbEngineVersion-engine"] !== "mysql") {
      // could do other things here
    }

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: props.params["vpcId"],
    });

    let subnetOne = ec2.Subnet.fromSubnetAttributes(this, "subnetOne", {
      subnetId: props.params["subnetOneId"],
      availabilityZone: props.params["subnetOneId-az"]
    })

    let subnetTwo = ec2.Subnet.fromSubnetAttributes(this, "subnetTwo", {
      subnetId: props.params["subnetTwoId"],
      availabilityZone: props.params["subnetTwoId-az"]
    })

    // Create a security group for the RDS instance
    const securityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Allow database connections',
      allowAllOutbound: false
    });
    securityGroup.addIngressRule(ec2.Peer.ipv4(props.params["ingressIp"]), ec2.Port.MYSQL_AURORA);
    securityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.MYSQL_AURORA);
    securityGroup.addEgressRule(ec2.Peer.ipv4(props.params["ingressIp"]), ec2.Port.allTcp());
    securityGroup.addEgressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.allTcp());

    // Create the RDS instance
    const myDatabase = new rds.DatabaseInstance(this, 'RdsInstance', {
      engine: engineConfig,
      instanceType: instanceClass,
      vpc,
      vpcSubnets: {
        subnets: [subnetOne, subnetTwo]
      },
      port: ec2.Port.MYSQL_AURORA.toString(),
      multiAz: true,
      securityGroups: [securityGroup],
      allocatedStorage: Number(props.params["initialStorage"]),
      maxAllocatedStorage: Number(props.params["maxStorage"]),
      storageEncrypted: true,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(Number(props.params["backupRetentionDays"])),
      deleteAutomatedBackups: false,
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
      deletionProtection: true,
      databaseName: props.params["dbName"],
      storageType: rds.StorageType.GP3,
      publiclyAccessible: false
    });

    myDatabase.addRotationSingleUser({
      excludeCharacters: '/@"',
      automaticallyAfter: Duration.days(30),
      rotateImmediatelyOnUpdate: true
    });

    if (props.params["createReadReplica"] === "Yes") {
      let reader = new rds.DatabaseInstanceReadReplica(this, 'ReadReplica', {
        sourceDatabaseInstance: myDatabase,
        instanceType: replicaInstanceClass,
        vpc,
        // vpcSubnets: {
        //   subnets: [subnetOne, subnetTwo]
        // },
        subnetGroup: myDatabase.subnetGroup,
        port: ec2.Port.MYSQL_AURORA.toString(),
        multiAz: true,
        securityGroups: [securityGroup],
        allocatedStorage: Number(props.params["initialStorage"]),
        maxAllocatedStorage: Number(props.params["maxStorage"]),
        storageEncrypted: true,
        allowMajorVersionUpgrade: false,
        autoMinorVersionUpgrade: true,
        backupRetention: Duration.days(0),
        deleteAutomatedBackups: true,
        removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        deletionProtection: true,
        storageType: rds.StorageType.GP3,
        publiclyAccessible: false
      });
      new CfnOutput(this, 'RdsReaderEndpoint', {
        value: reader.instanceEndpoint.hostname,
        description: 'RDS Reader Instance Endpoint',
      });
      cdk_nag.NagSuppressions.addResourceSuppressions(reader, [
        {
          id: 'AwsSolutions-RDS13',
          reason: 'Instance is a read replica'
        },
      ])
    }

    // Output the instance endpoint
    new CfnOutput(this, 'RdsEndpoint', {
      value: myDatabase.instanceEndpoint.hostname,
      description: 'RDS Instance Endpoint',
    });
    new CfnOutput(this, 'RdsCredentials', {
      value: myDatabase.secret.secretName,
      description: 'Secret containing the RDS credentials',
    });
  }

}

module.exports = { MySqlStack }
