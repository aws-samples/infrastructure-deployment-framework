```json
{
  "tool": "cve",
  "critical": 3,
  "high": 63,
  "medium": 59,
  "low": 16,
  "info": 0,
  "suppressed": 0
}
```

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