```json
{
  "tool": "secrets",
  "critical": 0,
  "high": 5,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

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