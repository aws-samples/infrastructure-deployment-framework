const { Stack, RemovalPolicy } = require("aws-cdk-lib");
const codebuild = require("aws-cdk-lib/aws-codebuild");
// const cloudtrail = require('aws-cdk-lib/aws-cloudtrail');
const codepipeline = require("aws-cdk-lib/aws-codepipeline");
const codepipeline_actions = require("aws-cdk-lib/aws-codepipeline-actions");
const s3 = require("aws-cdk-lib/aws-s3");
const iam = require("aws-cdk-lib/aws-iam");

class CdkAppPipelineStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineType: codepipeline.PipelineType.V2,
      executionMode: codepipeline.ExecutionMode.PARALLEL,
    });
    const sourceBucket = new s3.Bucket(this, "CskSourceBucket", {
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    });
    const buildOutput = new codepipeline.Artifact();
    const sourceOutput = new codepipeline.Artifact();
    const key = "csk-cdk-app.zip";

    const sourceAction = new codepipeline_actions.S3SourceAction({
      actionName: "S3Source",
      bucketKey: key,
      bucket: sourceBucket,
      output: sourceOutput,
      trigger: codepipeline_actions.S3Trigger.NONE,
    });
    const sourceStage = pipeline.addStage({ stageName: "Source" });
    sourceStage.addAction(sourceAction);
    const buildStage = pipeline.addStage({ stageName: "Build" });
    let codebuildServiceRole = new iam.Role(this, "CodebuildServiceRole", {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      // amazonq-ignore-next-line
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess"), iam.ManagedPolicy.fromAwsManagedPolicyName("PowerUserAccess")],
    });
    let buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
      cache: codebuild.Cache.bucket(sourceBucket, { prefix: "buildcache" }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE,
      },
      role: codebuildServiceRole,
    });
    buildStage.addAction(
      new codepipeline_actions.CodeBuildAction({
        actionName: "Build",
        project: buildProject,
        input: sourceOutput,
        outputs: [buildOutput],
      })
    );
    this.exportValue(sourceBucket.bucketName, { name: "CskSourceBucketName" });
    this.exportValue(pipeline.pipelineName, { name: "CskPipelineName" });
  }
}

module.exports = { CdkAppPipelineStack };
