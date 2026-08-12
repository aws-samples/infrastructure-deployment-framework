#!/bin/sh
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

for f in *.yaml; do
  echo "Converting $f to JSON..."
  cfn-flip $f ${f%.yaml}.json
  rm $f
done
for f in *.yml; do
  echo "Converting $f to JSON..."
  cfn-flip $f ${f%.yml}.json
  rm $f
done
