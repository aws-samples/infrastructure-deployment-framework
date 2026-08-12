```json
{
  "tool": "checkov",
  "critical": 0,
  "high": 0,
  "medium": 25,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## Checkov

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| checkov | 0 | 0 | 25 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Medium Severity Issues

The Checkov scan identified 25 medium severity infrastructure security issues across four CloudFormation templates. These issues span Lambda function configuration, security group rules, S3 bucket settings, and IAM policy permissions.

#### Lambda Function Configuration Issues (12 issues)

**CKV_AWS_115: Missing Concurrent Execution Limit**
Three Lambda functions lack function-level concurrent execution limits, which could lead to uncontrolled scaling and potential resource exhaustion:
- `getAllItemsFunction` in sam-api-example/template.yaml (lines 43-67)
- `getByIdFunction` in sam-api-example/template.yaml (lines 72-96)
- `putItemFunction` in sam-api-example/template.yaml (lines 101-125)
- `CodePipelineIntegrationLambda` in git-repo.json (lines 268-303)

**CKV_AWS_117: Lambda Functions Not Configured Inside VPC**
Four Lambda functions are not configured to run within a VPC, limiting network isolation and security:
- Same four functions listed above

**CKV_AWS_116: Missing Dead Letter Queue (DLQ) Configuration**
Four Lambda functions lack Dead Letter Queue configuration for handling failed asynchronous invocations:
- Same four functions listed above

**CKV_AWS_173: Lambda Environment Variable Encryption Not Configured**
Four Lambda functions do not encrypt environment variables, potentially exposing sensitive configuration data:
- Same four functions listed above

#### Security Group Issues (2 issues)

**CKV_AWS_23: Security Group Rules Missing Descriptions**
The GitSecurityGroup in git-repo.json (lines 55-79) lacks descriptions for its ingress rules, making it difficult to understand the purpose and scope of each rule.

**CKV_AWS_260: Overly Permissive Ingress Rule**
The GitSecurityGroup in git-repo.json (lines 55-79) allows ingress from 0.0.0.0:0 to port 80, exposing HTTP traffic to the entire internet without restriction.

#### Lambda Permission Issues (1 issue)

**CKV_AWS_364: Lambda Permission Not Limited by SourceArn or SourceAccount**
The CodePipelineCustomActionFunctionPermissions in git-repo.json (lines 347-356) grants permissions without restricting the source, potentially allowing unauthorized services to invoke the Lambda function.

#### S3 Bucket Issues (2 issues)

**CKV_AWS_18: S3 Bucket Missing Access Logging**
The AccessLogsBucket83982689 in management-governance.json (lines 207-238) does not have access logging enabled, preventing audit trails of bucket access.

**CKV_AWS_21: S3 Bucket Versioning Not Enabled**
The AccessLogsBucket83982689 in management-governance.json (lines 207-238) lacks versioning, preventing recovery from accidental deletions or modifications.

#### IAM Policy Issues (3 issues)

**CKV_AWS_111: IAM Policy Allows Unrestricted Write Access**
The QBusinessCommonDataSourceRole in q-onedrive.json (lines 55-170) contains a policy that permits write operations without resource constraints, violating the principle of least privilege.

**CKV_AWS_109: IAM Policy Allows Unrestricted Permissions Management**
The QBusinessCommonDataSourceRole in q-onedrive.json (lines 55-170) allows permissions management actions without constraints, creating a privilege escalation risk.

**CKV_AWS_108: IAM Policy Allows Data Exfiltration**
The QBusinessCommonDataSourceRole in q-onedrive.json (lines 55-170) permits actions that could enable unauthorized data exfiltration.

#### Secrets Manager Issues (1 issue)

**CKV_AWS_149: Secrets Manager Secret Not Encrypted with KMS CMK**
The OneDriveCredentialsSecret in q-onedrive.json (lines 244-259) uses default encryption instead of a customer-managed KMS key, reducing control over encryption key management.

**Affected Files/Locations:**
- /cloud-starter-kit-hub/www/kits/sam-apps/sam-api-example/template.yaml
- /cloud-starter-kit-hub/www/kits/cfn-templates/git-repo.json
- /cloud-starter-kit-hub/www/kits/cfn-templates/management-governance.json
- /cloud-starter-kit-hub/www/kits/cfn-templates/q-onedrive.json

### Recommendations

1. **Lambda Function Hardening:**
   - Add `ReservedConcurrentExecutions` property to all Lambda functions to limit concurrent execution
   - Configure Lambda functions to run within a VPC by specifying `VpcConfig` with appropriate subnet and security group IDs
   - Add Dead Letter Queue configuration using `DeadLetterConfig` to handle failed asynchronous invocations
   - Enable environment variable encryption by specifying a KMS key in the Lambda function configuration

2. **Security Group Improvements:**
   - Add descriptive `GroupDescription` and `Description` fields to all ingress rules in the GitSecurityGroup
   - Restrict the ingress rule for port 80 to specific CIDR blocks or security groups instead of 0.0.0.0/0
   - Consider using HTTPS (port 443) instead of HTTP (port 80) for encrypted communication

3. **Lambda Permission Restrictions:**
   - Add `SourceArn` or `SourceAccount` constraints to the CodePipelineCustomActionFunctionPermissions to limit which services can invoke the Lambda function

4. **S3 Bucket Configuration:**
   - Enable access logging on the AccessLogsBucket83982689 by configuring a logging destination bucket
   - Enable versioning on the AccessLogsBucket83982689 to maintain object history and enable recovery

5. **IAM Policy Refinement:**
   - Review and restrict the QBusinessCommonDataSourceRole policy to follow the principle of least privilege
   - Replace wildcard actions with specific, required actions
   - Add resource constraints to limit the scope of permissions
   - Remove or restrict actions that could enable data exfiltration

6. **Secrets Manager Encryption:**
   - Update the OneDriveCredentialsSecret to use a customer-managed KMS key for encryption instead of the default AWS-managed key
   - Ensure proper key rotation policies are in place for the KMS key

</details>