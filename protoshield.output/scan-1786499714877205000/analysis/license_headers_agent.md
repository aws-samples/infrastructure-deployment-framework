```json
{
  "tool": "license_headers",
  "critical": 0,
  "high": 93,
  "medium": 0,
  "low": 0,
  "info": 0,
  "suppressed": 0
}
```

## License Headers Compliance

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