from aws_cdk import (
    Stack,
    Duration,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as cloudfront_origins,
    aws_wafv2 as wafv2,
    aws_s3 as s3,
    aws_s3_assets as s3_assets,
    aws_s3_deployment as s3_deploy,
    aws_route53 as route53,
    aws_certificatemanager as acm,
    aws_apigateway as apigateway,
    aws_lambda as aws_lambda,
)
from constructs import Construct
import os
import aws_cdk as cdk


class WebStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        api: apigateway.RestApi,
        user_pool_domain: str,
        params: map,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        cloudfront_web_hostname = "admin." + params["hosted_zone"]
        if params["environment"] != "prod":
            cloudfront_web_hostname = (
                params["environment"] + "." + cloudfront_web_hostname
            )

        lambda_code = open("lambda/cognito_auth/index-template.js", "r").read()
        lambda_code = lambda_code.replace("REGION", self.region)
        lambda_code = lambda_code.replace("USER_POOL_ID", params["user_pool_id"])
        lambda_code = lambda_code.replace(
            "USER_POOL_APP_ID", params["user_pool_client_id"]
        )
        lambda_code = lambda_code.replace("USER_POOL_DOMAIN", user_pool_domain)
        lambda_code = lambda_code.replace(
            "LOGOUT_URI",
            "https://auth.{}/logout?client_id={}&redirect_uri=https://{}&response_type=code".format(
                params["hosted_zone"],
                params["user_pool_client_id"],
                cloudfront_web_hostname,
            ),
        )
        lambda_code = lambda_code.replace(
            "REDIRECT_URI", "https://{}/".format(cloudfront_web_hostname)
        )
        lambda_code = lambda_code.replace("NONCE_SIGNING_SECRET", "my@hPKr@CeaN7Rb")

        with open("lambda/cognito_auth/index.js", "w") as file:
            file.write(lambda_code)

        index_js = open("www/scripts/index-template.js", "r").read()
        index_js = index_js.replace(
            "CLIENT_ID",
            params["user_pool_client_id"],
        )

        with open("www/scripts/index.js", "w") as file:
            file.write(index_js)

        web_bucket = s3.Bucket(
            self,
            "WebBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
        )

        waf = wafv2.CfnWebACL(
            self,
            "CloudFrontWebACL",
            ####################################################################################
            # Set this to allow|block to enable/prevent access to requests not matching a rule
            ####################################################################################
            default_action=wafv2.CfnWebACL.DefaultActionProperty(allow={}),
            scope="CLOUDFRONT",
            visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name="WAF",
                sampled_requests_enabled=True,
            ),
            rules=[
                wafv2.CfnWebACL.RuleProperty(
                    name="AWS-AWSManagedRulesCommonRuleSet",
                    priority=3,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS", name="AWSManagedRulesCommonRuleSet"
                        )
                    ),
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        sampled_requests_enabled=True,
                        cloud_watch_metrics_enabled=True,
                        metric_name="AWS-AWSManagedRulesCommonRuleSet",
                    ),
                ),
                wafv2.CfnWebACL.RuleProperty(
                    name="AWS-AWSManagedRulesAmazonIpReputationList",
                    priority=4,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesAmazonIpReputationList",
                        )
                    ),
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        sampled_requests_enabled=True,
                        cloud_watch_metrics_enabled=True,
                        metric_name="AWS-AWSManagedRulesAmazonIpReputationList",
                    ),
                ),
                wafv2.CfnWebACL.RuleProperty(
                    name="AWS-AWSManagedRulesKnownBadInputsRuleSet",
                    priority=5,
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesKnownBadInputsRuleSet",
                        )
                    ),
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        sampled_requests_enabled=True,
                        cloud_watch_metrics_enabled=True,
                        metric_name="AWS-AWSManagedRulesKnownBadInputsRuleSet",
                    ),
                ),
            ],
        )

        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            "HostedZone",
            zone_name=params["hosted_zone"],
            hosted_zone_id=params["hosted_zone_id"],
        )

        cloudfront_web_cert = acm.Certificate(
            self,
            "WebCertificate",
            domain_name=cloudfront_web_hostname,
            validation=acm.CertificateValidation.from_dns(hosted_zone=hosted_zone),
        )

        # oai = cloudfront.OriginAccessIdentity(
        #     self, "OAI", comment="Connects CF with S3"
        # )
        # web_bucket.grant_read(oai)

        ##############################################################################
        # Create the Distribution
        ##############################################################################
        cf_origin_req_policy = cloudfront.OriginRequestPolicy(
            self,
            "OriginReqPolicyHeaders",
            header_behavior=cloudfront.OriginRequestHeaderBehavior.allow_list(
                "x-csk", "secret", "Content-type"
            ),
            query_string_behavior=cloudfront.OriginRequestQueryStringBehavior.none(),
            cookie_behavior=cloudfront.OriginRequestCookieBehavior.none(),
        )

        auth_function = aws_lambda.Function(
            self,
            "AdminEdgeAuthLambda3",
            code=aws_lambda.Code.from_asset(
                path=os.path.join("lambda", "cognito_auth"),
            ),
            handler="index.handler",
            runtime=aws_lambda.Runtime.NODEJS_20_X,
            timeout=Duration.seconds(5),
        )
        af_version = aws_lambda.Version(
            self, "AdminEdgeAuthLambdaVersion3", lambda_=auth_function
        )
        edge_auth_lambda = cloudfront.EdgeLambda(
            event_type=cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
            function_version=af_version,
        )
        origin_modifier = aws_lambda.Function(
            self,
            "AdminEdgeLambda3",
            code=aws_lambda.Code.from_asset(
                path=os.path.join("lambda"),
            ),
            handler="lambda_edge.lambda_handler",
            runtime=aws_lambda.Runtime.PYTHON_3_11,
        )
        om_version = aws_lambda.Version(
            self, "AdminEdgeLambdaVersion3", lambda_=origin_modifier
        )
        edge_lambda = cloudfront.EdgeLambda(
            event_type=cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            function_version=om_version,
        )
        # s3_origin = cloudfront_origins.S3Origin(
        #     bucket=web_bucket,
        #     origin_access_identity=oai,
        #     origin_path="/",
        # )
        s3_origin = cloudfront_origins.S3BucketOrigin.with_origin_access_control(
            web_bucket
        )

        apig_origin = cloudfront_origins.RestApiOrigin(rest_api=api)
        cf_dist = cloudfront.Distribution(
            self,
            "StaticCloudFrontDistribution",
            geo_restriction=cloudfront.GeoRestriction.allowlist(
                "AU", "NZ", "JP", "IN", "SG", "MY", "ID", "PH", "TH", "US", "CA", "GB"
            ),
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            certificate=cloudfront_web_cert,
            domain_names=[cloudfront_web_hostname],
            web_acl_id=waf.attr_arn,
            enable_logging=True,
            log_bucket=s3.Bucket(
                self,
                "CfLogsBucket",
                access_control=s3.BucketAccessControl.LOG_DELIVERY_WRITE,
                object_ownership=s3.ObjectOwnership.OBJECT_WRITER,
                block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                enforce_ssl=True,
                encryption=s3.BucketEncryption.S3_MANAGED,
            ),
            default_behavior=cloudfront.BehaviorOptions(
                allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD,
                origin=s3_origin,
                compress=True,
                cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                edge_lambdas=[edge_auth_lambda],
            ),
            additional_behaviors={
                "/images/*": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=s3_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin_request_policy=cf_origin_req_policy,
                ),
                "/css/*": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=s3_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                ),
                "/app/reporting/report": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=apig_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin_request_policy=cf_origin_req_policy,
                    edge_lambdas=[edge_lambda],
                ),
                "/app/config/get": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=apig_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin_request_policy=cf_origin_req_policy,
                    edge_lambdas=[edge_lambda],
                ),
                # "/kits/*": cloudfront.BehaviorOptions(
                #     allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                #     origin=s3_origin,
                #     compress=True,
                #     cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                #     viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                # ),
                "/api/*": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=apig_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin_request_policy=cf_origin_req_policy,
                    edge_lambdas=[edge_auth_lambda, edge_lambda],
                ),
                "/logout": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=s3_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin_request_policy=cf_origin_req_policy,
                    edge_lambdas=[edge_auth_lambda],
                ),
            },
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_page_path="/404.html",
                    ttl=Duration.seconds(amount=0),
                    response_http_status=200,
                )
            ],
        )

        asset = s3_assets.Asset(
            self,
            "Assets",
            path=os.path.join("www"),
            exclude=[
                "cdk.out",
                "node_modules",
                "**/node_modules",
                ".venv",
                "*.zip",
                ".git*",
                "parameters.json",
                "cdk.context.json",
                "README.md",
                "**/parameters.json",
                "**/cdk.context.json",
                "**/README.md",
                "test/*",
                "**/test",
                "__pycache__",
                ".cdk.staging",
                "*.swp",
                "package-lock.json",
                "__pycache__",
                ".pytest_cache",
                ".venv",
                "*.egg-info",
                "**/.DS_Store",
            ],
            ignore_mode=cdk.IgnoreMode.GIT,
        )

        s3_deploy.BucketDeployment(
            self,
            "DeployWebsite",
            sources=[s3_deploy.Source.bucket(asset.bucket, asset.s3_object_key)],
            destination_bucket=web_bucket,
            distribution=cf_dist,
            prune=True,
        )

        route53.CfnRecordSet(
            self,
            "webRecordset",
            type="A",
            alias_target=route53.CfnRecordSet.AliasTargetProperty(
                dns_name=cf_dist.domain_name, hosted_zone_id="Z2FDTNDATAQYW2"
            ),
            name=cloudfront_web_hostname,
            hosted_zone_id=params["hosted_zone_id"],
        )
