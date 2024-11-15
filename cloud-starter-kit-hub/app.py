#!/usr/bin/env python

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
# COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
# IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import os

import aws_cdk as cdk
import json

from aws_cdk import Aspects

from stacks.web_stack import WebStack

from cdk_nag import AwsSolutionsChecks, NagSuppressions, NagPackSuppression

# the hosted zone has to be set up before we begin
# we have to set these via params because we need them to create a Lambda@edge function which
# cannot use ENV variables, and there is no way to pass this configuration that resolves
# during synth

global_region = cdk.Environment(
    account=os.environ["CDK_DEFAULT_ACCOUNT"], region="us-east-1"
)

app = cdk.App()

env = app.node.try_get_context("env")

if env is None:
    raise ValueError("Environment not set")
else:
    params = json.load(open(f"parameters-{env}.json"))

    env_label = ""
    if env != "prod":
        env_label = f"-{env}"

    web_stack = WebStack(
        app,
        f"csk-kit-hub{env_label}-stack",
        params,
        env=global_region,
        cross_region_references=True,
    )

    Aspects.of(web_stack).add(AwsSolutionsChecks())

    NagSuppressions.add_stack_suppressions(
        web_stack,
        suppressions=[
            NagPackSuppression(
                id="AwsSolutions-L1", reason="Lambda created by embedded library"
            ),
            NagPackSuppression(id="AwsSolutions-S1", reason="Not required"),
            NagPackSuppression(id="AwsSolutions-IAM4", reason="CDK-generated policy"),
            NagPackSuppression(
                id="AwsSolutions-IAM5", reason="CDK-generated IAM entity"
            ),
        ],
    )

    if "hosted_zone" in params and params["hosted_zone"] == "":
        NagSuppressions.add_stack_suppressions(
            web_stack,
            suppressions=[
                NagPackSuppression(
                    id="AwsSolutions-CFR4",
                    reason="Using CloudFront hostname, so TLSv1 is best available",
                ),
            ],
        )

    Aspects.of(app).add(cdk.Tag("created-by", "CSK Kit Hub"))

    app.synth()
