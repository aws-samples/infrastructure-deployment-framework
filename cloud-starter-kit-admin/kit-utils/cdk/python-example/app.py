#!/usr/bin/env python3
import json

import aws_cdk as cdk

from stacks.example_stack import ExampleStack

params = json.load(open("parameters.json"))

app = cdk.App()
vpcStack = ExampleStack(
    app,
    "csk-example-stack",
    params,
    env=cdk.Environment(account=params["account"], region=params["region"]),
)

cdk.Tags.of(vpcStack).add("KitId", params["kitId"])
cdk.Tags.of(vpcStack).add("AppKey", params["appKey"])
cdk.Tags.of(vpcStack).add("CreatedBy", params["businessName"])

app.synth()
