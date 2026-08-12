```json
{
  "tool": "semgrep_suppressions",
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