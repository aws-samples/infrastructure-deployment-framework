```json
{
  "tool": "iam_least_privilege",
  "critical": 0,
  "high": 4,
  "medium": 3,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## IAM Least Privilege Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| iam_least_privilege | 0 | 4 | 3 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Executive Summary

This analysis reviewed IAM policies across the Cloud Starter Kit project for least-privilege violations. The project uses a mix of AWS CDK (Python), CloudFormation templates (JSON), and Lambda functions. A total of **7 findings** were identified: **4 high-severity** and **3 medium-severity** violations.

### Detailed Findings

#### HIGH SEVERITY FINDINGS

**Finding 1: Wildcard Resource on Sensitive Services (secretsmanager, ec2, qbusiness, logs, cloudwatch, s3, kms)**
- **File**: cloud-starter-kit-hub/www/kits/cfn-templates/q-onedrive.json
- **Lines**: 84, 98, 122, 133, 140, 153, 163
- **Severity**: HIGH
- **Issue**: The QBusinessCommonDataSourceRole policy grants multiple sensitive actions with `"Resource": "*"`:
  - Line 84: `secretsmanager:GetSecretValue`, `secretsmanager:DescribeSecret`, `secretsmanager:ListSecrets` on all resources
  - Line 98: `ec2:DescribeNetworkInterfaces`, `ec2:CreateNetworkInterface`, `ec2:DeleteNetworkInterface`, `ec2:DescribeSubnets`, `ec2:DescribeSecurityGroups`, `ec2:DescribeVpcEndpoints`, `ec2:CreateNetworkInterfacePermission`, `ec2:ModifyNetworkInterfaceAttribute` on all resources
  - Line 122: `qbusiness:BatchPutDocument`, `qbusiness:BatchDeleteDocument`, `qbusiness:PutGroup`, `qbusiness:GetGroup`, `qbusiness:ListGroups`, `qbusiness:UpdateGroup`, `qbusiness:DeleteGroup`, `qbusiness:CreateUser`, `qbusiness:UpdateUser`, `qbusiness:DescribeIndex`, `qbusiness:Query`, `qbusiness:ListIndices`, `qbusiness:ListDataSources`, `qbusiness:DescribeDataSource`, `qbusiness:StartDataSourceSyncJob`, `qbusiness:StopDataSourceSyncJob`, `qbusiness:DeleteDataSource`, `qbusiness:ListDataSourceSyncJobs` on all resources
  - Line 133: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogGroups`, `logs:DescribeLogStreams` on all resources
  - Line 140: `cloudwatch:PutMetricData` on all resources
  - Line 153: `s3:ListBucket`, `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucketVersions`, `s3:ListBucketMultipartUploads`, `s3:GetBucketLocation` on all resources
  - Line 163: `kms:Decrypt`, `kms:Encrypt`, `kms:GenerateDataKey`, `kms:DescribeKey` on all resources
- **Recommendation**: Scope all resources to specific ARNs:
  - For secretsmanager: `"Resource": "arn:aws:secretsmanager:*:ACCOUNT_ID:secret:onedrive-*"`
  - For EC2: `"Resource": "arn:aws:ec2:*:ACCOUNT_ID:network-interface/*"` (or more specific ENI ARNs)
  - For QBusiness: `"Resource": "arn:aws:qbusiness:*:ACCOUNT_ID:application/APPLICATION_ID/*"`
  - For logs: `"Resource": "arn:aws:logs:*:ACCOUNT_ID:log-group:/aws/qbusiness/*"`
  - For S3: `"Resource": ["arn:aws:s3:::qbusiness-*", "arn:aws:s3:::qbusiness-*/*"]`
  - For KMS: `"Resource": "arn:aws:kms:*:ACCOUNT_ID:key/*"` with conditions limiting to specific keys

**Finding 2: Wildcard KMS Actions on Root Principal (cost-management.json)**
- **File**: cloud-starter-kit-hub/www/kits/cfn-templates/cost-management.json
- **Lines**: 31-32
- **Severity**: HIGH
- **Issue**: The BillingTopicKey KMS key policy grants `"Action": "kms:*"` to the account root principal with `"Resource": "*"`. This grants full administrative control over the KMS key.
- **Recommendation**: Replace with specific KMS actions needed for the use case:
  
**Finding 3: Wildcard KMS Actions on Root Principal (management-governance.json)**
- **File**: cloud-starter-kit-hub/www/kits/cfn-templates/management-governance.json
- **Lines**: 75-76
- **Severity**: HIGH
- **Issue**: The AdminKeyC19094DA KMS key policy grants `"Action": "kms:*"` to the account root principal with `"Resource": "*"`. This grants full administrative control over the KMS key.
- **Recommendation**: Replace with specific KMS actions:
  
**Finding 4: Wildcard S3 Actions on Account Root (management-governance.json)**
- **File**: cloud-starter-kit-hub/www/kits/cfn-templates/management-governance.json
- **Lines**: 639-643
- **Severity**: HIGH
- **Issue**: The ConfigBucketPolicy grants `["s3:GetBucket*", "s3:GetObject*", "s3:List*"]` to the account root principal. The wildcard patterns grant more permissions than necessary, including actions like `GetBucketPolicy`, `GetBucketCors`, `GetObjectVersion`, `GetObjectTagging`, etc.
- **Recommendation**: Replace with specific actions:
  
#### MEDIUM SEVERITY FINDINGS

**Finding 5: Wildcard Resource on Events Service (cognito_ui_stack.py)**
- **File**: cloud-starter-kit-admin/stacks/cognito_ui_stack.py
- **Lines**: 93-94
- **Severity**: MEDIUM
- **Issue**: Lambda policy grants `["events:PutRule", "events:PutTargets", "events:RemoveTargets", "events:DeleteRule"]` with resource pattern `"arn:aws:events:{}:{}:rule/CustomResourceToConfigUi*"`. The wildcard suffix allows modification of any EventBridge rule matching the prefix, which is overly broad.
- **Recommendation**: Use the exact rule name without wildcards if possible:
  ```python
  resources=[
    "arn:aws:events:{}:{}:rule/CustomResourceToConfigUi".format(
      self.region, self.account
    )
  ]
  ```
  Or if multiple rules are needed, enumerate them explicitly rather than using wildcards.

**Finding 6: Wildcard Resource on Lambda Actions (cognito_ui_stack.py)**
- **File**: cloud-starter-kit-admin/stacks/cognito_ui_stack.py
- **Lines**: 109-110
- **Severity**: MEDIUM
- **Issue**: Lambda policy grants `["lambda:AddPermission", "lambda:RemovePermission"]` with resource pattern `"arn:aws:lambda:{}:{}:function:{}-CognitoSetupUiEventHandler*"`. The wildcard suffix allows modification of any Lambda function matching the prefix.
- **Recommendation**: Use the exact function ARN without wildcards:
  ```python
  resources=[
    "arn:aws:lambda:{}:{}:function:{}-CognitoSetupUiEventHandler".format(
      self.region, self.account, self.stack_name
    )
  ]
  ```

**Finding 7: Overly Broad S3 Wildcard Actions (management-governance.json)**
- **File**: cloud-starter-kit-hub/www/kits/cfn-templates/management-governance.json
- **Lines**: 639-643
- **Severity**: MEDIUM
- **Issue**: The use of `s3:GetBucket*`, `s3:GetObject*`, and `s3:List*` patterns grants more permissions than typically needed. These patterns include actions like `GetBucketPolicy`, `GetBucketCors`, `GetObjectVersion`, `GetObjectTagging`, etc., which may not be required for the Config service.
- **Recommendation**: Replace with explicit actions:
  
### Policies Reviewed - No Issues Found

The following policies were reviewed and found to be appropriately scoped for least privilege:

1. **cloud-starter-kit-admin/stacks/api_stack.py** (Lines 147-214)
   - Uses CDK grant methods (`grant_read_write_data`, `grant_read_data`) which automatically scope permissions to specific DynamoDB tables
   - Cognito grants use specific actions and are scoped to the user pool ARN
   - This is a best-practice approach

2. **cloud-starter-kit-admin/stacks/cognito_ui_stack.py** (Lines 60-68)
   - S3 GetObject policy properly scoped to specific S3 object ARNs
   - Cognito SetUICustomization policy properly scoped to specific user pool ARN

3. **cloud-starter-kit-hub/www/kits/cfn-templates/git-repo.json** (Lines 120-123)
   - CodePipeline policy properly scoped to specific pipeline ARN
   - No wildcard resources

4. **cloud-starter-kit-hub/www/kits/cfn-templates/management-governance.json** (Lines 707-720, 733-800)
   - Config role uses AWS managed policy `AWS_ConfigRole`
   - Inline policies properly scoped to specific S3 bucket ARNs and KMS key ARNs
   - Conditions used to further restrict S3 PutObject to specific ACL values

### Summary of Recommendations

**Immediate Actions Required:**
1. Replace all `"Resource": "*"` on sensitive services (secretsmanager, kms, s3, ec2, qbusiness, logs, cloudwatch) with specific ARNs
2. Replace wildcard KMS actions (`kms:*`) with specific actions needed
3. Remove wildcard suffixes from resource ARNs where exact resources can be specified

**Best Practices to Implement:**
1. Use CDK grant methods when available (as done in api_stack.py) - they automatically apply least privilege
2. Always scope resources to specific ARNs rather than using wildcards
3. For KMS key policies, explicitly list allowed actions rather than using `*`
4. Use conditions to further restrict access when appropriate
5. Avoid wildcard patterns in resource ARNs; use exact ARNs or specific prefixes with conditions

### Classification Methodology

Findings were classified using the following criteria:
- **HIGH**: Wildcard actions or `"Resource": "*"` on sensitive services (iam, sts, kms, s3, secretsmanager, ec2, qbusiness, logs, cloudwatch)
- **MEDIUM**: Wildcard actions or `"Resource": "*"` on non-sensitive services, or wildcard resource patterns that could be more restrictive
- **LOW**: Narrow over-grants (a few extra concrete actions beyond what the code uses)
- **INFO**: Observations that are not themselves over-grants

</details>