# ProtoShield Security Analysis Report

**Analysis Timestamp:** 2026-08-12 02:03:07 UTC<br>
**Project:** infrastructure-deployment-framework<br>
**Scan ID:** 1786499714877205000<br>
**ProtoShield Version:** v0.15.0-rc15


> ⚠️ **INCOMPLETE COVERAGE: One or more scanners could not fully analyze this project**
>
> - **CVE Scan**: NO LOCK FILE FOUND: package.json has no accompanying lock file (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lock).
>
> These scanners ran but could not analyze part of the project (for example a dependency manifest with no lock file), so the affected areas were NOT scanned and issues there may go undetected — this is not a clean pass. See "Incomplete Scan Coverage" below.


> ⚠️ **WARNING: One or more scanners could not complete analysis**
>
> - **CDK NAG**: ⚠️ **SCANNER ERROR: CDK NAG could not complete analysis**
>
> The findings below may be incomplete. Resolve the errors above and re-run the scan for full coverage.

# Security Analysis Report - Executive Summary

## Overview

The infrastructure-deployment-framework is a comprehensive cloud deployment solution comprising multiple AWS CDK projects, CloudFormation templates, Lambda functions, and supporting utilities. This security analysis scanned the entire codebase across nine specialized security tools to identify vulnerabilities, compliance issues, and infrastructure misconfigurations.

## Key Findings

### Critical Issues: 16

Critical severity findings require immediate remediation. These include 13 CDK NAG configuration errors (missing synthesized templates), 3 critical CVEs in dependencies (fast-xml-parser entity encoding bypass, tar decompression DoS, and form-data unsafe random function), and infrastructure configuration failures that prevent proper security analysis.

### High Severity Issues: 166

High severity findings represent significant security risks requiring urgent attention. These include 93 missing Apache 2.0 license headers across source files, 63 high-severity CVEs in dependencies (including prototype pollution gadgets in axios, XML injection vulnerabilities, and command injection in AWS CDK), 5 exposed API keys in git history, 4 IAM policy violations with wildcard resources on sensitive services, and 1 CloudFormation security issue.

### Medium Severity Issues: 87

Medium severity findings include 59 medium-severity CVEs in dependencies, 25 infrastructure security misconfigurations detected by Checkov (Lambda VPC configuration, security group rules, S3 bucket settings), and 3 IAM least-privilege violations.

### Low Severity Issues: 16

Low severity findings include 16 low-severity CVEs in dependencies affecting various packages.

## Summary by Tool


| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| [License Headers](#license-headers) | 0 | 93 | 0 | 0 | 0 | 0 |
| [Semgrep](#semgrep) | 0 | 0 | 0 | 0 | 0 | 0 |
| [Bandit](#bandit) | 0 | 0 | 0 | 0 | 0 | 0 |
| [CDK NAG](#cdk-nag) | 13 | 0 | 0 | 0 | 0 | 0 |
| [cfn-nag](#cfn-nag) | 0 | 1 | 0 | 0 | 0 | 0 |
| [CVE Scan](#cve-scan) | 3 | 63 | 59 | 16 | 0 | 0 |
| [Checkov](#checkov) | 0 | 0 | 25 | 0 | 0 | 0 |
| [Secrets](#secrets) | 0 | 5 | 0 | 0 | 0 | 0 |
| [IAM Least Privilege](#iam-least-privilege) | 0 | 4 | 3 | 0 | 0 | 0 |
## Recommendations by Priority

### Immediate Actions (Critical/High)

1. **Resolve CDK Synthesis Failures** - Run `cdk synth` in all 13 CDK project directories to generate CloudFormation templates. CDK NAG cannot analyze unsynthesized projects, preventing critical infrastructure security validation.

2. **Patch Critical CVEs** - Update fast-xml-parser, tar, and form-data packages immediately to address entity encoding bypass, decompression DoS, and unsafe random function vulnerabilities.

3. **Rotate Exposed Secrets** - Revoke or rotate the 5 API keys found in git history. Remove secrets from git history using `git filter-branch` or `BFG Repo-Cleaner` and implement pre-commit hooks to prevent future commits.

4. **Update Axios and Dependencies** - Address 21 high-severity vulnerabilities in axios including prototype pollution gadgets (CVE-2026-44494, CVE-2026-44495) that enable credential theft and request hijacking.

5. **Patch XML Processing Libraries** - Update @xmldom/xmldom and fast-xml-parser to address 5+ high-severity XML injection vulnerabilities that could enable XXE attacks.

6. **Generate Missing Lock Files** - Create lock files (package-lock.json, yarn.lock, etc.) for 9 package.json files currently missing them. This is essential for reliable vulnerability scanning and reproducible builds.

7. **Add License Headers** - Add Apache 2.0 license headers to all 93 source files missing them to achieve compliance and establish proper copyright attribution.

### Short-term Actions (Medium)

8. **Harden Lambda Functions** - Configure 4 Lambda functions with VPC settings, concurrent execution limits, Dead Letter Queues, and environment variable encryption as identified by Checkov.

9. **Restrict IAM Policies** - Replace wildcard resources (`"Resource": "*"`) on sensitive services (secretsmanager, KMS, S3, EC2, QBusiness) with specific ARNs in 4 high-severity and 3 medium-severity IAM policy violations.

10. **Update Dependency Packages** - Address 59 medium-severity CVEs across multiple packages including js-yaml, minimatch, brace-expansion, and others. Implement a systematic dependency update strategy.

11. **Secure Security Groups** - Add descriptions to security group rules and restrict overly permissive ingress rules (0.0.0.0/0 on port 80) to specific CIDR blocks.

12. **Enable S3 Logging and Versioning** - Configure access logging and versioning on S3 buckets used for audit trails and configuration storage.

### Long-term Improvements (Low)

13. **Implement Automated Scanning** - Add security scanning to CI/CD pipeline with pre-commit hooks for license headers and secrets detection.

14. **Establish Dependency Management Policy** - Create regular cadence for security updates, monitor advisories for affected packages, and consider tools like Dependabot or Snyk.

15. **Review and Update Low-Severity CVEs** - Address 16 low-severity CVEs in dependencies to maintain overall security posture.

## Positive Findings

**Semgrep** and **Bandit** completed their analysis with zero findings, indicating no code-level security issues detected in Python and general code patterns.

## Conclusion

The infrastructure-deployment-framework contains 285 total security findings across multiple severity levels, with the most critical issues being CDK synthesis failures preventing infrastructure validation, exposed secrets in git history, and high-severity dependency vulnerabilities. Immediate action is required to patch critical CVEs, rotate exposed credentials, and resolve infrastructure configuration issues. The project should prioritize dependency updates, implement automated security scanning in CI/CD, and establish a systematic approach to license compliance and IAM least-privilege enforcement.

---
---


## License Headers

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| license_headers | 0 | 93 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Overview

The license header compliance scan identified **93 source files** that are missing the required Apache 2.0 license header. The project has a LICENSE file in the root directory, but none of the scanned source files contain the required license header text.

**Compliance Rate:** 0.0% (0 of 93 files compliant)

### High Severity Issues

All 93 files are missing the required Apache 2.0 license header. The scan looks for the following accepted header markers:
- Apache License, Version 2.0
- apache.org/licenses/LICENSE-2.0
- SPDX-License-Identifier: Apache-2.0

**Affected Files/Locations:**

**Python Files (18):**
- cloud-starter-kit-admin/app.py
- cloud-starter-kit-admin/custom-resources/customise_hosted_ui.py
- cloud-starter-kit-admin/kit-utils/cdk/python-example/app.py
- cloud-starter-kit-admin/kit-utils/cdk/python-example/stacks/__init__.py
- cloud-starter-kit-admin/kit-utils/cdk/python-example/stacks/example_stack.py
- cloud-starter-kit-admin/kit-utils/cdk/python-example/tests/__init__.py
- cloud-starter-kit-admin/kit-utils/cdk/python-example/tests/unit/__init__.py
- cloud-starter-kit-admin/kit-utils/cdk/python-example/tests/unit/test_vpc_stack.py
- cloud-starter-kit-admin/lambda/admin.py
- cloud-starter-kit-admin/lambda/apig_authoriser.py
- cloud-starter-kit-admin/lambda/config.py
- cloud-starter-kit-admin/lambda/lambda_edge.py
- cloud-starter-kit-admin/lambda/reporting.py
- cloud-starter-kit-admin/lambda/stats.py
- cloud-starter-kit-admin/stacks/__init__.py
- cloud-starter-kit-admin/stacks/api_stack.py
- cloud-starter-kit-admin/stacks/cognito_stack.py
- cloud-starter-kit-admin/stacks/cognito_ui_stack.py
- cloud-starter-kit-admin/stacks/web_stack.py
- cloud-starter-kit-admin/tests/__init__.py
- cloud-starter-kit-admin/tests/unit/__init__.py
- cloud-starter-kit-admin/tests/unit/test_starter_kit_aws_admin_stack.py
- cloud-starter-kit-hub/app.py
- cloud-starter-kit-hub/kit-utils/cdk/python-example/app.py
- cloud-starter-kit-hub/kit-utils/cdk/python-example/stacks/__init__.py
- cloud-starter-kit-hub/kit-utils/cdk/python-example/stacks/example_stack.py
- cloud-starter-kit-hub/kit-utils/cdk/python-example/tests/__init__.py
- cloud-starter-kit-hub/kit-utils/cdk/python-example/tests/unit/__init__.py
- cloud-starter-kit-hub/kit-utils/cdk/python-example/tests/unit/test_vpc_stack.py
- cloud-starter-kit-hub/stacks/__init__.py
- cloud-starter-kit-hub/stacks/web_stack.py
- cloud-starter-kit-hub/tests/__init__.py
- cloud-starter-kit-hub/tests/unit/__init__.py
- cloud-starter-kit-hub/tests/unit/test_starter_kit_aws_admin_stack.py

**JavaScript Files (24):**
- cloud-starter-kit-admin/kit-utils/cdk/js-example/bin/example.js
- cloud-starter-kit-admin/kit-utils/cdk/js-example/lib/example-stack.js
- cloud-starter-kit-admin/www/scripts/index-template.js
- cloud-starter-kit-admin/www/scripts/index.js
- cloud-starter-kit-app/forge.config.js
- cloud-starter-kit-app/pipeline-assets/cdk-app-pipeline/bin/cdk-app-pipeline.js
- cloud-starter-kit-app/pipeline-assets/cdk-app-pipeline/jest.config.js
- cloud-starter-kit-app/pipeline-assets/cdk-app-pipeline/lib/cdk-app-pipeline-stack.js
- cloud-starter-kit-app/pipeline-assets/cdk-app-pipeline/test/cdk-app-pipeline.test.js
- cloud-starter-kit-app/src/scripts/deployments.js
- cloud-starter-kit-app/src/scripts/get-amis-and-instance-types.js
- cloud-starter-kit-app/src/scripts/get-bedrock-models.js
- cloud-starter-kit-app/src/scripts/get-db-engines-and-instance-types.js
- cloud-starter-kit-app/src/scripts/main.js
- cloud-starter-kit-app/src/scripts/preload.js
- cloud-starter-kit-app/src/scripts/preload.min.js
- cloud-starter-kit-app/src/scripts/renderer.js
- cloud-starter-kit-app/src/scripts/renderer.min.js
- cloud-starter-kit-app/src/scripts/sdk-commands.js
- cloud-starter-kit-app/src/scripts/stack-monitoring.js
- cloud-starter-kit-app/src/scripts/task-queue.js
- cloud-starter-kit-app/src/scripts/utilities.js
- cloud-starter-kit-app/test/renderer.concat.js
- cloud-starter-kit-hub/kit-utils/cdk/js-example/bin/example.js
- cloud-starter-kit-hub/kit-utils/cdk/js-example/lib/example-stack.js
- cloud-starter-kit-hub/www/kits/cdk-apps/ec2/bin/ec2.js
- cloud-starter-kit-hub/www/kits/cdk-apps/ec2/jest.config.js
- cloud-starter-kit-hub/www/kits/cdk-apps/ec2/lib/ec2-stack.js
- cloud-starter-kit-hub/www/kits/cdk-apps/ec2/test/ec2.test.js
- cloud-starter-kit-hub/www/kits/cdk-apps/mysql/bin/mysql.js
- cloud-starter-kit-hub/www/kits/cdk-apps/mysql/jest.config.js
- cloud-starter-kit-hub/www/kits/cdk-apps/mysql/lib/mysql-stack.js
- cloud-starter-kit-hub/www/kits/cdk-apps/mysql/test/mysql.test.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-with-nat/bin/vpc-with-nat.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-with-nat/jest.config.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-with-nat/lib/vpc-with-nat.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-with-nat/test/js-kit.test.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-without-nat/bin/vpc-without-nat.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-without-nat/jest.config.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-without-nat/lib/vpc-without-nat.js
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-without-nat/test/js-kit.test.js

**TypeScript Files (8):**
- cloud-starter-kit-admin/kit-utils/cdk/ts-example/bin/example.ts
- cloud-starter-kit-admin/kit-utils/cdk/ts-example/lib/example-stack.ts
- cloud-starter-kit-app/src/scripts/renderer.min.js
- cloud-starter-kit-hub/kit-utils/cdk/ts-example/bin/example.ts
- cloud-starter-kit-hub/kit-utils/cdk/ts-example/lib/example-stack.ts
- cloud-starter-kit-hub/www/kits/cdk-apps/backup/bin/aws-backup.ts
- cloud-starter-kit-hub/www/kits/cdk-apps/backup/lib/aws-backup-stack.ts
- cloud-starter-kit-hub/www/kits/cdk-apps/queue/bin/queue.ts
- cloud-starter-kit-hub/www/kits/cdk-apps/queue/lib/queue-stack.ts

**Shell Script Files (5):**
- cloud-starter-kit-admin/kit-utils/cfn/flip-yaml.sh
- cloud-starter-kit-admin/lambda/make_layer.sh
- cloud-starter-kit-app/src/userdata/linux-arm64.sh
- cloud-starter-kit-app/src/userdata/linux-x86_64.sh
- cloud-starter-kit-hub/kit-utils/cfn/flip-yaml.sh

**Other Files (14):**
- cloud-starter-kit-admin/lambda/cognito_auth/index-template.js
- cloud-starter-kit-app/pipeline-assets/cdk-app-pipeline/jest.config.js
- cloud-starter-kit-hub/www/kits/cdk-apps/queue/bin/queue.d.ts
- cloud-starter-kit-hub/www/kits/cdk-apps/queue/bin/queue.js
- cloud-starter-kit-hub/www/kits/cdk-apps/queue/lib/queue-stack.d.ts
- cloud-starter-kit-hub/www/kits/cdk-apps/queue/lib/queue-stack.js

### Recommendations

1. **Add Apache 2.0 License Headers to All Source Files**
   - Add the required Apache 2.0 license header to every source file missing it
   - Use the appropriate comment syntax for each file type:
     - Python files: Use `#` for single-line comments
     - JavaScript/TypeScript files: Use `/* */` for multi-line comments
     - Shell scripts: Use `#` for comments
   - Example Python header:
     ```python
     # Copyright [Year] [Company/Author]
     # Licensed under the Apache License, Version 2.0 (the "License");
     # you may not use this file except in compliance with the License.
     # You may obtain a copy of the License at
     #
     #     http://www.apache.org/licenses/LICENSE-2.0
     #
     # Unless required by applicable law or agreed to in writing, software
     # distributed under the License is distributed on an "AS IS" BASIS,
     # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     # See the License for the specific language governing permissions and
     # limitations under the License.
     ```
   - Example JavaScript header:
     ```javascript
     /*
      * Copyright [Year] [Company/Author]
      * Licensed under the Apache License, Version 2.0 (the "License");
      * you may not use this file except in compliance with the License.
      * You may obtain a copy of the License at
      *
      *     http://www.apache.org/licenses/LICENSE-2.0
      *
      * Unless required by applicable law or agreed to in writing, software
      * distributed under the License is distributed on an "AS IS" BASIS,
      * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
      * See the License for the specific language governing permissions and
      * limitations under the License.
      */
     ```

2. **Use Current Copyright Year**
   - Keep the copyright year current rather than copying an older year from existing files
   - Update the year to reflect when the file was created or last significantly modified

3. **Implement Automated Compliance Checking**
   - Consider adding a pre-commit hook or CI/CD pipeline step to automatically check for license headers on new files
   - This will prevent future files from being committed without proper headers

4. **Prioritize High-Impact Files**
   - Start with core application files (app.py, main.js, etc.)
   - Then address library and utility files
   - Finally, update test and configuration files

</details>

---


## Semgrep

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| semgrep | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Scan Summary

The Semgrep security scan completed successfully with **zero findings** across all severity levels.

**Scan Statistics:**
- Total files scanned: 319 files tracked by git
- Rules executed: 107 rules from the Community registry
- Parsed lines: ~100%
- Findings: 0 (0 blocking)

**Languages Analyzed:**
- Multilang: 9 rules across 162 files
- JSON: 1 rule across 74 files
- JavaScript: 20 rules across 44 files
- Python: 77 rules across 22 files
- TypeScript: 20 rules across 10 files

**Files Excluded from Scan:**
- 4 files matching --exclude patterns
- 1 file larger than 1.0 MB
- 20 files matching .semgrepignore patterns

### Recommendations

1. **Maintain Current Security Posture:** The codebase currently has no detected security issues. Continue following secure coding practices.

2. **Regular Scanning:** Maintain regular Semgrep scans as part of your CI/CD pipeline to catch any new issues early.

3. **Rule Updates:** Consider enabling additional Semgrep Registry rules by running `semgrep login` to access more comprehensive security checks.

4. **Code Review:** While automated scanning shows no issues, continue implementing manual code reviews as part of your security strategy.

5. **Monitor Excluded Files:** Review the 20 files in .semgrepignore to ensure they are intentionally excluded and not hiding potential issues.

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| semgrep_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Summary

After conducting a comprehensive search of the project at `/project`, **no Semgrep suppressions were found** in the codebase.

### Search Methodology

The following search patterns were used to locate Semgrep suppressions:
- `nosemgrep` - Direct marker search
- `semgrep-disable` - Alternative suppression marker
- `# nosemgrep:` - Comment-based suppression format
- Configuration files: `.semgrep.yml`, `.semgrep.yaml`, `semgrep.yml`

### Results

All searches returned no matches. The project does not contain any active Semgrep suppressions.

### Conclusion

Since no suppressions were found, there are no suppression patterns to evaluate for acceptability, justification quality, or scope concerns. The project either:
1. Has not yet integrated Semgrep scanning into its workflow, or
2. Has not added any suppressions to the codebase

No further analysis is required.

</details>

---


## Bandit

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| bandit | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Scan Summary

The Bandit security scan completed successfully with **no security issues identified**.

**Scan Statistics:**
- Total lines of code scanned: 2,531
- Total lines skipped (#nosec): 0
- Total potential issues skipped due to disabled tests: 0
- Python version: 3.11.2

**Results:**
- Critical Issues: 0
- High Severity Issues: 0
- Medium Severity Issues: 0
- Low Severity Issues: 0
- Info Level Issues: 0
- Suppressed Issues: 0

### Conclusion

The codebase passed the Bandit security analysis with no vulnerabilities detected. The code appears to follow security best practices and does not contain common Python security issues such as:
- Hardcoded passwords or secrets
- Insecure cryptographic operations
- SQL injection vulnerabilities
- Unsafe deserialization
- Insecure temporary file handling
- Other common security anti-patterns

**Recommendation:** Continue maintaining current security practices and regularly run Bandit scans as part of your CI/CD pipeline to catch any future security issues.

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| bandit_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Finding Summary

After conducting a comprehensive analysis of the project at `/project`, I found **no Bandit suppressions** in the codebase.

#### Search Methodology

I performed the following deterministic searches:
- Pattern searches for `# nosec`, `#nosec`, and `# bandit: skip` across all Python files
- Searches for Bandit issue codes (B### format)
- Searches for Bandit configuration files (`.bandit`, `bandit.yaml`, `bandit.yml`, `pyproject.toml`)
- Manual inspection of key Python files in the project

#### Results

**No Bandit suppressions were found.** The project contains:
- 35+ Python files across multiple directories
- CDK NAG suppressions (infrastructure-as-code validation, not Bandit)
- No inline Bandit suppressions
- No Bandit configuration files with suppression rules

#### Conclusion

Since there are no Bandit suppressions in this project, there are no suppression quality issues to report. The codebase does not use Bandit suppression markers.

</details>

---


## CDK NAG

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cdknag | 13 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

⚠️ **SCANNER ERROR: CDK NAG could not complete analysis**

CDK project found but cdk.out directory is missing. Run 'cdk synth' to generate CloudFormation templates before scanning. CDK NAG cannot analyse unsynthesized projects. 

**Affected projects:**
- /project/cloud-starter-kit-admin
- /project/cloud-starter-kit-admin/kit-utils/cdk/python-example
- /project/cloud-starter-kit-admin/kit-utils/cdk/ts-example
- /project/cloud-starter-kit-hub
- /project/cloud-starter-kit-hub/kit-utils/cdk/python-example
- /project/cloud-starter-kit-hub/kit-utils/cdk/js-example
- /project/cloud-starter-kit-hub/kit-utils/cdk/ts-example
- /project/cloud-starter-kit-hub/www/kits/cdk-apps/backup
- /project/cloud-starter-kit-hub/www/kits/cdk-apps/mysql
- /project/cloud-starter-kit-hub/www/kits/cdk-apps/queue
- /project/cloud-starter-kit-hub/www/kits/cdk-apps/vpc-without-nat
- /project/cloud-starter-kit-hub/www/kits/cdk-apps/vpc-with-nat
- /project/cloud-starter-kit-hub/www/kits/cdk-apps/ec2

**Action Required:** Run `cdk synth` in each CDK project directory before scanning.

CDK NAG requires synthesized CloudFormation templates (generated by `cdk synth`) to perform security analysis. Without the `cdk.out` directory containing the synthesized templates, CDK NAG cannot scan for security violations.

**To resolve this issue:**
1. Navigate to each CDK project directory
2. Run `cdk synth` to generate CloudFormation templates
3. Re-run the security scan

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cdknag_suppressions | 0 | 2 | 0 | 0 | 4 | 0 |

<details>
<summary>View Details</summary>

### Overview
Analyzed 6 CDK NAG suppression blocks across the project containing 18 individual rule suppressions. The suppressions are applied at both stack and resource levels to address findings from the AwsSolutionsChecks aspect.

### Detailed Findings

#### cloud-starter-kit-admin/app.py:48-59 — Cognito Stack Suppressions
**Rules Suppressed:** AwsSolutions-L1, AwsSolutions-IAM4, AwsSolutions-IAM5

**Justifications Provided:**
- AwsSolutions-L1: "Lambda created by embedded library"
- AwsSolutions-IAM4: "CDK-generated policy"
- AwsSolutions-IAM5: "CDK-generated IAM entity"

**Context:** Lines 46-47 provide a comment explaining that "resources that are flagged are generated inside L2 constructs"

**Assessment:** ACCEPTABLE
- Each suppression has a specific, documented reason
- The context comment explains the architectural rationale
- The suppressions are narrowly scoped to specific rule IDs
- Least-privilege: Suppressions are limited to CDK-generated resources within L2 constructs

---

#### cloud-starter-kit-admin/app.py:92-115 — API Stack Suppressions
**Rules Suppressed:** AwsSolutions-L1, AwsSolutions-COG4, AwsSolutions-APIG1, AwsSolutions-APIG4, AwsSolutions-APIG6, AwsSolutions-IAM4, AwsSolutions-IAM5

**Justifications Provided:**
- AwsSolutions-L1: "Lambda created by embedded library"
- AwsSolutions-COG4: "The config and reporting routes use a Lambda authorizer"
- AwsSolutions-APIG1: "Not required"
- AwsSolutions-APIG4: "OPTIONS method is generated by CDK and handled by APIG"
- AwsSolutions-APIG6: "Not required"
- AwsSolutions-IAM4: "CDK-generated policy"
- AwsSolutions-IAM5: "CDK-generated IAM entity"

**Assessment:** ACCEPTABLE (with minor concerns)
- Most suppressions have specific, documented reasons
- AwsSolutions-APIG4 provides good technical detail about CDK behavior
- AwsSolutions-APIG1 and APIG6 use "Not required" which is vague, but in context of API Gateway logging these may be acceptable architectural decisions
- Least-privilege: Suppressions are narrowly scoped to specific rule IDs

---

#### cloud-starter-kit-admin/app.py:116-134 — Web Stack Suppressions
**Rules Suppressed:** AwsSolutions-L1, AwsSolutions-S1, AwsSolutions-S10, AwsSolutions-IAM4, AwsSolutions-IAM5

**Justifications Provided:**
- AwsSolutions-L1: "Lambda created by embedded library"
- AwsSolutions-S1: "Not required"
- AwsSolutions-S10: "Not required and/or CDK-synthesized resource"
- AwsSolutions-IAM4: "CDK-generated policy"
- AwsSolutions-IAM5: "CDK-generated IAM entity"

**Assessment:** QUESTIONABLE
- AwsSolutions-S1 (S3 versioning) and AwsSolutions-S10 (S3 public access block) have weak justifications
- "Not required" lacks specificity about why these S3 security controls are not needed
- AwsSolutions-S10 adds "and/or CDK-synthesized resource" but this is still vague
- Least-privilege concern: Suppressions may be too broad; should specify which S3 buckets and why
- Risk: Could hide legitimate S3 security gaps

---

#### cloud-starter-kit-hub/app.py:55-67 — Web Stack Suppressions
**Rules Suppressed:** AwsSolutions-L1, AwsSolutions-S1, AwsSolutions-IAM4, AwsSolutions-IAM5

**Justifications Provided:**
- AwsSolutions-L1: "Lambda created by embedded library"
- AwsSolutions-S1: "Not required"
- AwsSolutions-IAM4: "CDK-generated policy"
- AwsSolutions-IAM5: "CDK-generated IAM entity"

**Assessment:** QUESTIONABLE
- AwsSolutions-S1 (S3 versioning) has weak justification: "Not required"
- Lacks specificity about why S3 versioning is not needed for this web stack
- Least-privilege concern: Stack-level suppression applies to all S3 buckets in the stack
- Risk: Could hide legitimate S3 security gaps

---

#### cloud-starter-kit-hub/app.py:70-78 — Conditional Web Stack Suppressions
**Rules Suppressed:** AwsSolutions-CFR4

**Justifications Provided:**
- AwsSolutions-CFR4: "Using CloudFront hostname, so TLSv1 is best available"

**Assessment:** ACCEPTABLE
- Specific architectural rationale provided
- Explains the constraint (CloudFront hostname) and why TLSv1 is acceptable
- Narrowly scoped to a single rule ID
- Conditional application (only when hosted_zone is empty) shows thoughtful suppression strategy
- Least-privilege: Suppression is limited to specific architectural scenario

---

#### cloud-starter-kit-hub/www/kits/cdk-apps/mysql/bin/mysql.js:21-26 — MySQL Stack Suppressions
**Rules Suppressed:** AwsSolutions-RDS11

**Justifications Provided:**
- AwsSolutions-RDS11: "DB instance is not exposed to public Internet so benefits are outweighed by complexity"

**Assessment:** ACCEPTABLE
- Specific architectural rationale: database is not publicly accessible
- Explains the risk/benefit tradeoff
- Narrowly scoped to a single rule ID
- Least-privilege: Suppression is justified by deployment architecture

---

#### cloud-starter-kit-hub/www/kits/cdk-apps/mysql/lib/mysql-stack.js:103-108 — RDS Reader Resource Suppressions
**Rules Suppressed:** AwsSolutions-RDS13

**Justifications Provided:**
- AwsSolutions-RDS13: "Instance is a read replica"

**Assessment:** ACCEPTABLE
- Specific technical reason explaining why the rule doesn't apply
- Resource-level suppression (not stack-level) shows precision
- Narrowly scoped to a single rule ID and specific resource
- Least-privilege: Suppression is limited to the read replica resource

---

### Summary by Severity

**Acceptable Suppressions (4 blocks):**
- Cognito Stack (lines 48-59): Well-documented CDK-generated resources
- API Stack (lines 92-115): Specific reasons for each suppression
- Hub Web Stack conditional (lines 70-78): Architectural constraint documented
- MySQL Stack (lines 21-26): Risk/benefit tradeoff explained
- MySQL Reader (lines 103-108): Technical reason for read replica

**Questionable Suppressions (2 blocks):**
- Admin Web Stack (lines 116-134): S1 and S10 use vague "Not required" justification
- Hub Web Stack (lines 55-67): S1 uses vague "Not required" justification

### Key Issues

1. **Vague S3 Justifications:** Multiple suppressions for S3 security controls (versioning, public access block) use "Not required" without explaining why these controls are not needed. This could hide legitimate security gaps.

2. **Stack-Level Scope:** S3-related suppressions are applied at stack level, affecting all S3 buckets in the stack rather than specific resources.

3. **Missing Context:** No documentation explaining the architectural decisions around S3 security posture.

### Recommendations

1. **Replace vague justifications:** Change "Not required" to specific reasons such as:
   - "S3 bucket is for static website content with no sensitive data"
   - "Versioning not needed due to [specific reason]"
   - "Public access block not applicable due to [specific reason]"

2. **Consider resource-level suppressions:** For S3 rules, use resource-level suppressions instead of stack-level to be more precise about which buckets are affected.

3. **Document architectural decisions:** Add comments explaining why S3 security controls are not needed in these stacks.

4. **Review S3 security posture:** Verify that the suppressed S3 rules (S1, S10) are truly not applicable to the use case, or implement the controls.

5. **Maintain good practices:** The CDK-generated and architectural suppressions are well-documented; maintain this standard for all suppressions.

</details>

---


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

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cfnnag_suppressions | 0 | 0 | 4 | 0 | 3 | 0 |

<details>
<summary>View Details</summary>

### Overview
This analysis reviews cdk-nag suppressions found in the Cloud Starter Kit project. The project uses AWS CDK with cdk-nag for security compliance checking. Two main application files contain stack-level suppressions: `cloud-starter-kit-admin/app.py` and `cloud-starter-kit-hub/app.py`.

### Detailed Findings

#### File: cloud-starter-kit-admin/app.py

**Suppression 1 (Lines 48-57): CognitoStack suppressions**
- **Rules suppressed:** AwsSolutions-L1, AwsSolutions-IAM4, AwsSolutions-IAM5
- **Justification provided:** Yes
  - L1: "Lambda created by embedded library"
  - IAM4: "CDK-generated policy"
  - IAM5: "CDK-generated IAM entity"
- **Assessment:** ACCEPTABLE
  - The comment at lines 46-47 explains the rationale: "have to suppress some nags at stack level because the resources that are flagged are generated inside L2 constructs"
  - This is a specific, documented reason for stack-level suppressions
  - The reasons are narrowly scoped to CDK-generated resources
  - Severity: INFO

**Suppression 2 (Lines 92-115): ApiStack suppressions**
- **Rules suppressed:** AwsSolutions-L1, AwsSolutions-COG4, AwsSolutions-APIG1, AwsSolutions-APIG4, AwsSolutions-APIG6, AwsSolutions-IAM4, AwsSolutions-IAM5
- **Justification provided:** Yes, all rules have specific reasons
  - L1: "Lambda created by embedded library"
  - COG4: "The config and reporting routes use a Lambda authorizer"
  - APIG1: "Not required"
  - APIG4: "OPTIONS method is generated by CDK and handled by APIG"
  - APIG6: "Not required"
  - IAM4: "CDK-generated policy"
  - IAM5: "CDK-generated IAM entity"
- **Assessment:** MEDIUM CONCERN
  - Most reasons are acceptable (CDK-generated, embedded library, specific architectural decision for COG4 and APIG4)
  - However, "Not required" (APIG1, APIG6) is vague and lacks specificity
  - These suppressions should explain WHY these checks are not required for this specific API
  - Severity: MEDIUM

**Suppression 3 (Lines 116-132): WebStack suppressions**
- **Rules suppressed:** AwsSolutions-L1, AwsSolutions-S1, AwsSolutions-S10, AwsSolutions-IAM4, AwsSolutions-IAM5
- **Justification provided:** Yes
  - L1: "Lambda created by embedded library"
  - S1: "Not required"
  - S10: "Not required and/or CDK-synthesized resource"
  - IAM4: "CDK-generated policy"
  - IAM5: "CDK-generated IAM entity"
- **Assessment:** MEDIUM CONCERN
  - "Not required" (S1) is vague without context
  - S10 reason is better ("Not required and/or CDK-synthesized resource") but still somewhat ambiguous
  - These should clarify the specific architectural decision or security posture
  - Severity: MEDIUM

#### File: cloud-starter-kit-hub/app.py

**Suppression 4 (Lines 55-65): WebStack suppressions (unconditional)**
- **Rules suppressed:** AwsSolutions-L1, AwsSolutions-S1, AwsSolutions-IAM4, AwsSolutions-IAM5
- **Justification provided:** Yes
  - L1: "Lambda created by embedded library"
  - S1: "Not required"
  - IAM4: "CDK-generated policy"
  - IAM5: "CDK-generated IAM entity"
- **Assessment:** MEDIUM CONCERN
  - Same issue as above: "Not required" lacks specificity
  - No architectural context provided
  - Severity: MEDIUM

**Suppression 5 (Lines 70-76): WebStack suppressions (conditional)**
- **Rules suppressed:** AwsSolutions-CFR4
- **Justification provided:** Yes
  - CFR4: "Using CloudFront hostname, so TLSv1 is best available"
- **Assessment:** ACCEPTABLE
  - This is a specific, documented architectural decision
  - Clearly explains the constraint (CloudFront hostname) and the consequence (TLS version limitation)
  - Narrowly scoped to a specific condition
  - Severity: INFO

### Summary of Issues

**Acceptable Suppressions (3):**
- CognitoStack suppressions with clear CDK-generated resource explanation (cloud-starter-kit-admin/app.py:48-57)
- CFR4 suppression with specific architectural constraint (cloud-starter-kit-hub/app.py:70-76)
- COG4 and APIG4 suppressions with specific architectural decisions (cloud-starter-kit-admin/app.py:99-106)

**Questionable Suppressions (4):**
- APIG1 and APIG6 "Not required" reasons without specificity (cloud-starter-kit-admin/app.py:102, 107)
- S1 "Not required" without specificity (cloud-starter-kit-admin/app.py:122, cloud-starter-kit-hub/app.py:61)
- These lack sufficient justification for why security checks are being bypassed

### Recommendations

1. **Enhance vague justifications:** Replace "Not required" with specific reasons such as:
   - "S1: Not required - static website content only, no sensitive data stored"
   - "APIG1: Not required - internal API with Lambda authorizer authentication"
   - "APIG6: Not required - API Gateway access logging handled at CloudFront level"

2. **Document architectural decisions:** Add comments in the code explaining why certain security checks are suppressed at the stack level

3. **Consider resource-level suppressions:** Where possible, suppress at the resource level rather than stack level to maintain least-privilege principle

4. **Regular review:** Schedule periodic reviews of suppressions to ensure they remain valid as the application evolves

5. **Clarify S10 suppression:** Provide more specific reasoning for S10 suppression beyond "Not required and/or CDK-synthesized resource"

</details>

---


## CVE Scan

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| cve | 3 | 63 | 59 | 16 | 0 | 0 |

<details>
<summary>View Details</summary>

### ⚠️ Incomplete Scan Coverage

**CRITICAL:** Nine (9) dependency files could NOT be scanned due to missing lock files. The vulnerability status of these files is **UNKNOWN** and must be considered a scan failure, not a clean result. Lock files are essential for reliable vulnerability scanning as they pin the full transitive dependency tree.

**Files with NO LOCK FILE FOUND:**
- cloud-starter-kit-admin/kit-utils/cdk/ts-example/package.json
- cloud-starter-kit-app/pipeline-assets/cdk-app-pipeline/package.json
- cloud-starter-kit-hub/www/kits/cdk-apps/backup/package.json
- cloud-starter-kit-hub/www/kits/cdk-apps/ec2/package.json
- cloud-starter-kit-hub/www/kits/cdk-apps/mysql/package.json
- cloud-starter-kit-hub/www/kits/cdk-apps/queue/package.json
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-with-nat/package.json
- cloud-starter-kit-hub/www/kits/cdk-apps/vpc-without-nat/package.json
- cloud-starter-kit-hub/www/kits/sam-apps/sam-api-example/package.json

**Recommendation:** Generate and commit lock files (package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock) for all package.json files to enable complete dependency vulnerability scanning.

---

### Critical Severity Issues

Three (3) critical vulnerabilities detected across the scanned dependencies:

**CVE-2026-25896** - fast-xml-parser: Entity Encoding Bypass via Regex Injection in DOCTYPE Entity Names
- **Package:** fast-xml-parser
- **Impact:** An attacker can bypass entity encoding protections through regex injection in DOCTYPE entity names, potentially leading to XML injection attacks
- **Affected Locations:** cloud-starter-kit-app/package-lock.json

**CVE-2026-59873** - node-tar: Decompression/Parse DoS via Unlimited Input
- **Package:** tar
- **Impact:** Denial of service vulnerability allowing attackers to crash the application through unlimited decompression/parsing of tar archives
- **Affected Locations:** cloud-starter-kit-app/package-lock.json

**CVE-2025-7783** - form-data: Unsafe Random Function for Boundary Selection
- **Package:** form-data
- **Impact:** Uses cryptographically weak random function for choosing multipart form-data boundaries, potentially allowing attackers to predict boundaries and craft malicious payloads
- **Affected Locations:** cloud-starter-kit-admin/lambda/cognito/auth/package-lock.json

---

### High Severity Issues

Sixty-three (63) high-severity vulnerabilities detected across multiple packages:

**AWS CDK Library Issues (2):**
- CVE-2026-11417: OS Command Injection in NodejsFunction Bundling
- CVE-2026-13760: OS Command Injection in NodejsFunction Docker Bundling
- Affected: cloud-starter-kit-hub/kit-utils/cdk/js-example/package-lock.json, cloud-starter-kit-hub/kit-utils/cdk/ts-example/package-lock.json

**brace-expansion DoS Vulnerabilities (4):**
- CVE-2026-13149: DoS via exponential-time expansion of consecutive non-expanding {} groups
- CVE-2026-14257: DoS via unbounded expansion length causing out-of-memory crash
- CVE-2026-69152: DoS via unbounded intermediate arrays (CVE-2026-14257 bypass)
- Affected: Multiple package-lock.json files

**fast-uri Host Confusion Vulnerabilities (5):**
- CVE-2026-13676: Host confusion via failed IDN canonicalization
- CVE-2026-18446: Host confusion via backslash authority introducer
- CVE-2026-6321: Path traversal via percent-encoded dot segments
- CVE-2026-16221: Host confusion via literal backslash authority delimiter
- CVE-2026-6322: Host confusion via percent-encoded authority delimiters
- Affected: cloud-starter-kit-hub/kit-utils/cdk/js-example/package-lock.json, cloud-starter-kit-hub/kit-utils/cdk/ts-example/package-lock.json

**js-yaml DoS Vulnerabilities (2):**
- CVE-2026-59869: YAML merge-key chains force quadratic CPU consumption
- GHSA-5p4m-2wfm-xmqj: Quadratic CPU consumption in !!omap resolution (3.x and 4.x)
- Affected: Multiple package-lock.json files

**minimatch ReDoS Vulnerabilities (3):**
- CVE-2026-27904: ReDoS via nested *() extglobs
- CVE-2026-26996: ReDoS via repeated wildcards with non-matching literal
- CVE-2026-27903: ReDoS via multiple non-adjacent GLOBSTAR segments
- Affected: Multiple package-lock.json files

**@xmldom/xmldom XML Injection Vulnerabilities (5):**
- CVE-2026-41673: Uncontrolled recursion in XML serialization leads to DoS
- CVE-2026-41674: XML injection through unvalidated DocumentType serialization
- CVE-2026-41672: XML node injection through unvalidated comment serialization
- CVE-2026-34601: XML injection via unsafe CDATA serialization
- CVE-2026-41675: XML node injection through unvalidated processing instruction serialization
- Affected: cloud-starter-kit-app/package-lock.json

**Electron Security Issues (11):**
- CVE-2026-34774: Use-after-free in offscreen child window paint callback
- CVE-2026-34771: Use-after-free in WebContents fullscreen/pointer-lock/keyboard-lock callbacks
- CVE-2026-70608: Sandboxed iframe can bypass allow-popups restriction
- CVE-2026-34769: Renderer command-line switch injection via undocumented webPreference
- CVE-2026-70601: Context isolation bypass via Function.prototype.bind hijack
- CVE-2026-34770: Use-after-free in PowerMonitor
- CVE-2026-70604: Custom protocol with supportFetchAPI but not corsEnabled allows cross-origin reads
- Additional issues affecting cloud-starter-kit-app/package-lock.json

**fast-xml-parser DoS Vulnerabilities (2):**
- CVE-2026-33036: Numeric entity expansion bypassing all entity expansion limits
- CVE-2026-26278: DoS through entity expansion in DOCTYPE (no expansion limit)
- Affected: cloud-starter-kit-app/package-lock.json

**flatted Vulnerabilities (2):**
- CVE-2026-32141: Unbounded recursion DoS in parse() revive phase
- CVE-2026-33228: Prototype Pollution via parse()
- Affected: cloud-starter-kit-app/package-lock.json

**image-size DoS Vulnerabilities (2):**
- CVE-2025-71329: JXL and HEIF parsers allow DoS through infinite loops
- CVE-2025-71330: ICNS parser allows DoS through infinite loop
- Affected: cloud-starter-kit-app/package-lock.json

**lodash Code Injection (1):**
- CVE-2021-23337: Code Injection via _.template imports key names
- Affected: cloud-starter-kit-app/package-lock.json

**tar Archive Vulnerabilities (10):**
- CVE-2026-24842: Arbitrary File Creation/Overwrite via Hardlink Path Traversal
- CVE-2026-26960: Arbitrary File Read/Write via Hardlink Target Escape
- CVE-2026-23745: Arbitrary File Overwrite and Symlink Poisoning
- CVE-2026-59874: Negative tar entry size causes infinite loop
- CVE-2026-31802: Symlink Path Traversal via Drive-Relative Linkpath
- CVE-2026-29786: Hardlink Path Traversal via Drive-Relative Linkpath
- CVE-2026-23950: Race Condition via Unicode Ligature Collisions on macOS APFS
- Affected: cloud-starter-kit-app/package-lock.json

**urllib3 HTTP Client Vulnerabilities (7):**
- CVE-2023-43804: Cookie handling vulnerability
- CVE-2026-44431: Cross-origin redirect vulnerability with assert_same_host=False
- CVE-2025-66471: Streaming API improperly handles highly compressed data
- CVE-2026-21441: Decompression-bomb safeguards bypassed during HTTP redirects
- CVE-2025-66418: Unbounded number of links in decompression chain
- Affected: cloud-starter-kit-admin/lambda/requirements.txt

**axios HTTP Client Vulnerabilities (21):**
- CVE-2026-44494: Full Man-in-the-Middle via Prototype Pollution in config.proxy
- CVE-2026-44495: Credential Theft and Response Hijacking via Prototype Pollution
- CVE-2026-25639: DoS via __proto__ Key in mergeConfig
- CVE-2025-58754: DoS through lack of data size check
- CVE-2026-42035: Header Injection via Prototype Pollution
- CVE-2026-44488: Allocation of Resources Without Limits or Throttling
- CVE-2026-44496: ReDoS via Cookie Name Injection
- CVE-2026-44486: Proxy-Authorization header leaks to redirect target
- CVE-2025-27152: SSRF and Credential Leakage via Absolute URL
- CVE-2026-44487: Proxy-Authorization Credential Leak across HTTP-to-HTTPS redirect
- CVE-2026-42033: Prototype Pollution Gadgets - Response Tampering and Data Exfiltration
- CVE-2026-42043: NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet
- CVE-2026-42264: Prototype pollution read-side gadgets in HTTP adapter
- Additional issues affecting cloud-starter-kit-admin/lambda/cognito/auth/package-lock.json

**form-data CRLF Injection (1):**
- CVE-2026-12143: CRLF injection via unescaped multipart field names and filenames
- Affected: cloud-starter-kit-admin/lambda/cognito/auth/package-lock.json

---

### Medium Severity Issues

Fifty-nine (59) medium-severity vulnerabilities detected across multiple packages including:

**@babel/helpers:** CVE-2025-27789 - Inefficient RegExp complexity in generated code with .replace when transpiling named capturing groups

**ajv:** CVE-2025-69873 - ReDoS when using $data option

**aws-cdk:** CVE-2025-2598 - CLI prints AWS credentials retrieved by custom credential plugins

**aws-cdk-lib:** GHSA-qq4x-c6h6-rfxh - Insertion of Sensitive Information into Log File with Cognito UserPoolClient

**brace-expansion:** CVE-2026-33750 - Zero-step sequence causes process hang and memory exhaustion

**js-yaml:** CVE-2026-53550 - Quadratic-complexity DoS in merge key handling; CVE-2025-64718 - Prototype pollution in merge (<<)

**picomatch:** CVE-2026-33672 - Method Injection in POSIX Character Classes causes incorrect Glob Matching

**yaml:** CVE-2026-33532 - Stack Overflow via deeply nested YAML collections

**electron:** Eleven (11) medium-severity issues including out-of-bounds reads, JavaScript injection, HTTP response header injection, path validation bypasses, and permission handling issues

**fast-xml-parser:** CVE-2026-41650 - XML Comment and CDATA Injection; CVE-2026-33349 - Entity Expansion Limits Bypassed

**ip-address:** CVE-2026-42338 - XSS in Address6 HTML-emitting methods

**lodash:** CVE-2025-13465 - Prototype Pollution via array path bypass in _.unset and _.omit

**tar:** Multiple issues including uncaught exception DoS, uncontrolled recursion, and PAX header handling vulnerabilities

**urllib3:** CVE-2020-26137 - CRLF injection; CVE-2023-45803 - HTTP redirect body handling; CVE-2024-37891 - Proxy-Authorization header leakage

**uuid:** CVE-2026-41907 - Missing buffer bounds check in v3/v5/v6

**axios:** Eighteen (18) medium-severity issues including CRLF injection, recursion DoS, prototype pollution gadgets, and various bypass vulnerabilities

**follow-redirects:** CVE-2026-40895 - Custom Authentication Headers leaked to Cross-Domain Redirect Targets

---

### Low Severity Issues

Sixteen (16) low-severity vulnerabilities detected:

- CVE-2026-49356: @babel/core - Arbitrary File Read via sourceMappingURL Comment
- GHSA-464c-974j-9xm6: aws-cdk-lib - CodeBuild S3 Log Encryption Boolean Inversion
- GHSA-5pq3-h73f-66hr: aws-cdk-lib - CodePipeline trusted entities too broad
- GHSA-qc59-cxj2-c2w4: aws-cdk-lib - Aspect order change causes different Permissions Boundary
- CVE-2025-5889: brace-expansion - Regular Expression Denial of Service
- GHSA-6475-r3vj-m8vf: @smithy/config-resolver - Region parameter defense in depth
- CVE-2026-3449: @tootallnate/once - Incorrect Control Flow Scoping
- CVE-2026-34766: electron - USB device selection not validated
- CVE-2026-34781: electron - Crash in clipboard.readImage() on malformed data
- CVE-2026-34768: electron - Unquoted executable path in app.setLoginItemSettings
- CVE-2026-70598: electron - Off-screen rendering trusts GPU-supplied geometry
- CVE-2026-70600: electron - Cross-origin iframe can position native autofill popup
- CVE-2026-27942: fast-xml-parser - Stack overflow in XMLBuilder with preserveOrder
- CVE-2025-54798: tmp - Arbitrary temporary file/directory write via symbolic link
- CVE-2026-24001: diff - Denial of Service in parsePatch and applyPatch
- CVE-2026-42040: axios - Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams

---

### Affected Packages

Twenty-eight (28) packages with known vulnerabilities:

1. @babel/core
2. @babel/helpers
3. @smithy/config-resolver
4. @tootallnate/once
5. @xmldom/xmldom
6. ajv
7. aws-cdk
8. aws-cdk-lib
9. axios
10. brace-expansion
11. diff
12. electron
13. fast-uri
14. fast-xml-parser
15. flatted
16. follow-redirects
17. form-data
18. image-size
19. ip-address
20. js-yaml
21. lodash
22. minimatch
23. picomatch
24. tar
25. tmp
26. urllib3
27. uuid
28. yaml

---

### Recommendations

**IMMEDIATE ACTIONS (Critical Priority):**

1. **Update fast-xml-parser** to patch CVE-2026-25896 (entity encoding bypass). This is a critical XML injection vulnerability.

2. **Update tar package** to address CVE-2026-59873 (decompression DoS). Implement input validation and size limits for archive processing.

3. **Update form-data** to patch CVE-2025-7783 (unsafe random boundary). Use cryptographically secure random generation for multipart boundaries.

4. **Generate and commit lock files** for all 9 package.json files currently missing lock files. This is essential for reliable vulnerability scanning and reproducible builds.

**HIGH PRIORITY ACTIONS:**

5. **Update axios** - Address the 21 high-severity vulnerabilities, particularly prototype pollution gadgets (CVE-2026-44494, CVE-2026-44495, CVE-2026-42033, CVE-2026-42264) that enable credential theft and request hijacking.

6. **Update @xmldom/xmldom** - Patch 5 high-severity XML injection vulnerabilities (CVE-2026-41673, CVE-2026-41674, CVE-2026-41672, CVE-2026-34601, CVE-2026-41675).

7. **Update aws-cdk-lib** - Address OS command injection vulnerabilities in NodejsFunction bundling (CVE-2026-11417, CVE-2026-13760).

8. **Update tar** - Patch 10 high-severity vulnerabilities related to path traversal, symlink poisoning, and arbitrary file operations.

9. **Update urllib3** - Address 7 high-severity HTTP client vulnerabilities affecting redirect handling and decompression.

10. **Update Electron** - Patch 11 high-severity vulnerabilities including use-after-free issues, context isolation bypass, and sandbox escapes.

**MEDIUM PRIORITY ACTIONS:**

11. **Update minimatch, brace-expansion, and picomatch** - Address ReDoS (Regular Expression Denial of Service) vulnerabilities that could cause application hangs.

12. **Update js-yaml** - Patch quadratic CPU consumption vulnerabilities in YAML merge key and omap handling.

13. **Update fast-uri** - Address 5 high-severity host confusion vulnerabilities that could enable SSRF attacks.

14. **Update fast-xml-parser** - Patch entity expansion and recursion DoS vulnerabilities.

15. **Review and update all other affected packages** - Implement a systematic dependency update strategy, prioritizing by severity and exploitability.

**PROCESS IMPROVEMENTS:**

16. **Implement automated dependency scanning** in CI/CD pipeline to catch vulnerabilities early.

17. **Establish a dependency update policy** with regular cadence for security patches.

18. **Use lock files consistently** across all projects to ensure reproducible builds and accurate vulnerability scanning.

19. **Monitor security advisories** for the 28 affected packages and subscribe to security notifications.

20. **Consider using tools like Dependabot or Snyk** for automated vulnerability detection and patch management.

</details>

---


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

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| checkov_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Executive Summary

A comprehensive analysis of the project at `/project` was conducted to identify and evaluate Checkov suppressions. The search included:

1. Direct pattern matching for Checkov suppression markers:
   - `checkov:skip=`
   - `checkov.io/skip`
   - `#checkov:skip`

2. Configuration file detection:
   - `.checkov.yaml`
   - `.checkov.yml`
   - `checkov.yaml`
   - `checkov.yml`

3. Broad pattern searches across Python, Terraform, YAML, and JSON files

### Findings

**No Checkov suppressions were found in the project.**

The project structure includes:
- cloud-starter-kit-admin/
- cloud-starter-kit-app/
- cloud-starter-kit-hub/
- cloud-starter-kit-workshop/

All source files were scanned, and no Checkov suppression markers or configuration files were detected.

### Important Note

The project does contain **CDK NAG suppressions** (a different security scanning tool) in:
- `cloud-starter-kit-admin/app.py`
- `cloud-starter-kit-hub/app.py`

These use the `NagSuppressions.add_stack_suppressions()` API with `NagPackSuppression` objects. CDK NAG is an AWS-specific linting tool for AWS CDK constructs and is distinct from Checkov, which is a general infrastructure-as-code security scanner.

### Conclusion

Since no Checkov suppressions exist in this project, there are no Checkov suppressions to evaluate for least-privilege or justification quality. The analysis is complete with zero findings across all severity categories.

</details>

---


## Secrets

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| secrets | 0 | 5 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### High Severity Issues

**Generic API Keys Detected (5 findings)**

Gitleaks identified 5 instances of generic API keys in the git history that pose a security risk. These secrets were committed across multiple files and commits, potentially exposing access to various services and sensitive operations.

**Affected Files/Locations:**

1. **cloud-starter-kit-hub/www/kits/cfn-templates/git-repo.json**
   - Line 138 (Commit: 8cafecb9e70a600a1511d97473d74e3c20cf4978, Author: guysqr, Date: 2025-09-22)
   - Line 138 (Commit: 50824bdb4bc68a4218a781da3f344d62f4cb81ce, Author: Guy Morton, Date: 2025-09-10)
   - Line 142 (Commit: af702ecde96a40f9a9ca90ee741db2ff326573c0, Author: Guy Morton, Date: 2024-11-15)
   - Secret: `eO1BNKNVkMdxzEe` (appears in multiple commits)

2. **cloud-starter-kit-workshop/csk-kit-hub/importing/importing-kits-cdk.en.md**
   - Line 87 (Commit: af702ecde96a40f9a9ca90ee741db2ff326573c0, Author: Guy Morton, Date: 2024-11-15)
   - Secret: `esMz4hynhkuYJPFc39pK` (appKey field)

3. **cloud-starter-kit-workshop/csk-kit-hub/importing/index.en.md**
   - Line 58 (Commit: af702ecde96a40f9a9ca90ee741db2ff326573c0, Author: Guy Morton, Date: 2024-11-15)
   - Secret: `vpce-0c60c92f2b64f3fc9` (AWS VPC Endpoint ID)

### Recommendations

1. **Immediate Actions:**
   - Revoke or rotate all exposed API keys immediately
   - Review AWS Secrets Manager and other credential management systems for any compromised credentials
   - Check CloudTrail logs for unauthorized access using these credentials

2. **Remediation Steps:**
   - Remove secrets from git history using `git filter-branch` or `BFG Repo-Cleaner`
   - Force push the cleaned repository to all remotes
   - Notify all team members to pull the updated repository

3. **Prevention:**
   - Implement pre-commit hooks to detect secrets before they are committed
   - Use tools like `git-secrets` or `pre-commit` framework with secret detection rules
   - Store all credentials in AWS Secrets Manager, Parameter Store, or similar secure vaults
   - Never commit secrets to version control; use environment variables or configuration management tools
   - Add `.env`, `.secrets`, and credential files to `.gitignore`

4. **Monitoring:**
   - Enable Gitleaks scanning in CI/CD pipeline to catch secrets before merge
   - Set up alerts for any new secret detection in the repository
   - Regularly audit git history for accidental secret commits

</details>

### Suppression Analysis

| Tool | Critical | High | Medium | Low | Info | Suppressed |
|------|----------|------|--------|-----|------|------------|
| secrets_suppressions | 0 | 0 | 0 | 0 | 0 | 0 |

<details>
<summary>View Details</summary>

### Finding Summary

After conducting a comprehensive search of the project at `/project`, I found **no Secrets suppressions** in the codebase.

**Search Methodology:**
- Searched for `gitleaks:allow` markers (standard Secrets suppression syntax)
- Searched for `.gitleaksignore` configuration files
- Searched for `gitleaks.toml` or `.gitleaks.toml` configuration files
- Searched for common suppression patterns (`nosec`, `suppress`, `allow`, `skip`, `ignore`)
- Examined all `.toml` and `.ignore` files in the project

**Result:**
No Secrets suppressions were detected in any form. The project does not contain:
- Inline suppression comments for Secrets findings
- Gitleaks configuration files with suppression rules
- Any documented exceptions for secret detection

### Severity Assessment

Since no Secrets suppressions were found, all severity counts are zero.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Info | 0 |
| Suppressed | 0 |

### Conclusion

This project does not employ any Secrets suppressions. This is a positive finding indicating either:
1. The project has no secrets detection findings to suppress, or
2. The project follows a policy of not suppressing secrets findings

No further action is required regarding Secrets suppressions.

</details>

---


## IAM Least Privilege

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

---

## Incomplete Scan Coverage

> ⚠️ **Coverage gap:** the following scanners ran but could not analyze part of the project, so those areas were left unscanned. Their sections reflect only what could be analyzed — treat the unscanned areas as unknown, not clean.

A common cause is a dependency manifest with no lock file, so its dependency tree cannot be resolved. Add and commit the appropriate lock file and re-run the scan for full coverage.

| Scanner | Coverage gap |
|---------|--------------|
| CVE Scan | NO LOCK FILE FOUND: package.json has no accompanying lock file (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lock). |
