```json
{
  "tool": "cfnnag",
  "critical": 0,
  "high": 1,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## cfn-nag

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cfnnag | 0 | 1 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### High Severity Issues

**Template Validation Failures:**
The scan identified 4 CloudFormation templates with fatal validation errors that prevent deployment:

1. **sam-api-example/template.yaml** - Unresolved logical resource IDs
   - The template references a resource "SampleTable" that is not defined in the Resources section
   - This will cause deployment failure

2. **ec2-asg-dns.json** - Missing Resources section
   - Template lacks a Resources section, which is required for valid CloudFormation templates
   - This is a structural error that prevents deployment

3. **ec2.json** - Missing Resources section
   - Template lacks a Resources section, which is required for valid CloudFormation templates
   - This is a structural error that prevents deployment

4. **mysql.json** - Missing Resources section
   - Template lacks a Resources section, which is required for valid CloudFormation templates
   - This is a structural error that prevents deployment

**Affected Files/Locations:**
- cloud-starter-kit-hub/www/kits/sam-apps/sam-api-example/template.yaml
- cloud-starter-kit-hub/www/kits/cdk-apps/ec2-asg-dns.json
- cloud-starter-kit-hub/www/kits/cdk-apps/ec2.json
- cloud-starter-kit-hub/www/kits/cdk-apps/mysql.json

### Warning Issues (W89, W92, W5, W9, W2, W36, W35, W11, W28, W77)

**Lambda Security Issues (git-repo.json):**
- **W89**: CodePipelineIntegrationLambda is not deployed inside a VPC, limiting network isolation
- **W92**: CodePipelineIntegrationLambda lacks ReservedConcurrentExecutions configuration, which could lead to throttling or resource exhaustion

**Security Group Configuration Issues (git-repo.json):**
- **W5**: GitSecurityGroup allows unrestricted egress (0.0.0.0/0) to all ports
- **W9**: GitSecurityGroup ingress rules use CIDR blocks that are not /32 (overly permissive)
- **W2**: GitSecurityGroup allows unrestricted ingress (0.0.0.0/0) on unspecified ports
- **W36**: GitSecurityGroup rules lack descriptions, making their purpose unclear

**S3 Bucket Logging Issue (management-governance.json):**
- **W35**: AccessLogsBucket83982689 does not have access logging configured, limiting audit trail capabilities

**IAM and Secrets Manager Issues (q-onedrive.json):**
- **W11**: QBusinessCommonDataSourceRole IAM policy uses wildcard (*) for resources, granting overly broad permissions
- **W28**: QBusinessCommonDataSourceRole has an explicit name, which prevents CloudFormation from managing resource replacement
- **W77**: OneDriveCredentialsSecret does not specify a KmsKeyId for encryption, limiting key management control and cross-account sharing capabilities

### Recommendations

**Critical Actions Required:**

1. **Fix Template Validation Errors**
   - Add the missing "SampleTable" resource definition to sam-api-example/template.yaml
   - Add proper Resources sections to ec2-asg-dns.json, ec2.json, and mysql.json
   - Validate all templates using `cfn-lint` or `aws cloudformation validate-template` before deployment

2. **Restrict Security Group Access (git-repo.json)**
   - Replace 0.0.0.0/0 ingress rules with specific IP ranges or security group IDs
   - Use /32 CIDR blocks for individual IP addresses instead of broader ranges
   - Restrict egress to only necessary destinations and ports
   - Add descriptions to all security group rules explaining their purpose

3. **Deploy Lambda in VPC (git-repo.json)**
   - Configure CodePipelineIntegrationLambda with VpcConfig specifying appropriate subnets and security groups
   - Set ReservedConcurrentExecutions to an appropriate value based on expected workload

4. **Enable S3 Access Logging (management-governance.json)**
   - Configure AccessLogsBucket83982689 to log access to a separate logging bucket
   - Set appropriate log retention policies

5. **Restrict IAM Permissions (q-onedrive.json)**
   - Replace wildcard (*) resources in QBusinessCommonDataSourceRole with specific resource ARNs
   - Apply principle of least privilege by limiting actions to only those required
   - Remove explicit resource name to allow CloudFormation to manage naming

6. **Secure Secrets Manager (q-onedrive.json)**
   - Specify a KmsKeyId for OneDriveCredentialsSecret to enable encryption with a customer-managed key
   - This allows better key management and cross-account secret sharing if needed

</details>