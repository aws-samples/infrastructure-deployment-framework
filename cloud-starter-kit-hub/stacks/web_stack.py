# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
# COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
# IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


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
    aws_lambda as aws_lambda,
    aws_secretsmanager as secretsmanager,
)
from constructs import Construct
import os
import json
import aws_cdk as cdk


class WebStack(Stack):
    def __init__(
        self, scope: Construct, construct_id: str, params: map, **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        if params["hosted_zone"] != "":
            if params["environment"] == "prod":
                cloudfront_web_hostname = "kits." + params["hosted_zone"]
            else:
                cloudfront_web_hostname = (
                    params["environment"] + ".kits." + params["hosted_zone"]
                )
            domain_names = [cloudfront_web_hostname]
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
        else:
            domain_names = []
            cloudfront_web_cert = None

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

        store = cloudfront.KeyValueStore(
            self,
            "KeyValueStore",
            source=cloudfront.ImportSource.from_inline(json.dumps(params["kvs_data"])),
        )
        check_request = cloudfront.Function(
            self,
            "ViewerRequestFunction",
            code=cloudfront.FunctionCode.from_inline(
                """
import cf from 'cloudfront';
const kvsHandle = cf.kvs();

async function handler(event) {
    if (event.request.uri.endsWith('/')) {
        event.request.uri += 'index.html';
    }
    else if (!event.request.uri.includes('.')) {
        event.request.uri += '/index.html';
    }
    //any file other than html has to be access controlled
    if (!event.request.uri.startsWith('/images') && !event.request.uri.startsWith('/index.html') && !event.request.uri.startsWith('/help/index.html') && !event.request.uri.startsWith('/about/index.html')) {
        if (event.request.headers.hasOwnProperty('x-access-control')) {
            const code = event.request.headers['x-access-control'].value;
            const header = 'x-access-control';
            let key = "";
            console.log(`code is ${code}`);
            try {
                key = await kvsHandle.get(header);
                console.log(`key is ${key}`);
                if (key && code !== key) {
                    console.log(`code not ok ${code}!=${key}`);
                    event.request.uri = '/403.html'
                }
            }
            catch (err) {
                event.request.uri = '/403.html'
                console.log(`Error when fetching key ${code}:${key}:${err}`);
            }
        }
        else {
            console.log(`No x-access-control header`);
            event.request.uri = '/403.html'
        }
    }
    return event.request;
}
"""
            ),
            runtime=cloudfront.FunctionRuntime.JS_2_0,
        )

        cfn_res = check_request.node.default_child
        cfn_res.function_config = cloudfront.CfnFunction.FunctionConfigProperty(
            runtime="cloudfront-js-2.0",
            comment="AddIndexFunction",
            key_value_store_associations=[
                cloudfront.CfnFunction.KeyValueStoreAssociationProperty(
                    key_value_store_arn=store.key_value_store_arn
                )
            ],
        )

        web_bucket = s3.Bucket(
            self,
            "WebBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
        )

        s3_origin = cloudfront_origins.S3BucketOrigin.with_origin_access_control(
            bucket=web_bucket, origin_path="/"
        )

        ##############################################################################
        # Create the Distribution
        ##############################################################################

        cf_dist = cloudfront.Distribution(
            self,
            "StaticCloudFrontDistribution",
            geo_restriction=cloudfront.GeoRestriction.allowlist(
                "AU", "NZ", "JP", "IN", "SG", "MY", "ID", "PH", "TH", "US", "CA", "GB"
            ),
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            certificate=cloudfront_web_cert,
            domain_names=domain_names,
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
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                function_associations=[
                    cloudfront.FunctionAssociation(
                        event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                        function=check_request,
                    )
                ],
            ),
            additional_behaviors={
                "/kits/*": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=s3_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    function_associations=[
                        cloudfront.FunctionAssociation(
                            event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                            function=check_request,
                        )
                    ],
                ),
                "/help/*": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=s3_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    function_associations=[
                        cloudfront.FunctionAssociation(
                            event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                            function=check_request,
                        )
                    ],
                ),
                "/about/*": cloudfront.BehaviorOptions(
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    origin=s3_origin,
                    compress=True,
                    cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    function_associations=[
                        cloudfront.FunctionAssociation(
                            event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                            function=check_request,
                        )
                    ],
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
                # "package-lock.json",
                "__pycache__",
                ".pytest_cache",
                ".venv",
                "*.egg-info",
                "**/.DS_Store",
            ],
            ignore_mode=cdk.IgnoreMode.GIT,
        )

        deployment = s3_deploy.BucketDeployment(
            self,
            "DeployWebsite",
            sources=[s3_deploy.Source.bucket(asset.bucket, asset.s3_object_key)],
            destination_bucket=web_bucket,
            distribution=cf_dist,
            prune=True,
        )
        if params["hosted_zone"] != "":
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

        self.export_value(exported_value=web_bucket.bucket_name)
        self.export_value(
            exported_value=cf_dist.distribution_domain_name,
        )
