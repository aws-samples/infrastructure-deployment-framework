```json
{
  "tool": "checkov_suppressions",
  "critical": 0,
  "high": 0,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## Suppression Analysis

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