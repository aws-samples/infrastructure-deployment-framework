# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "Please run this script as an Administrator!"
    Exit
}

# Run UglifyJS on preload.js
& "./node_modules/.bin/uglifyjs" "src/scripts/preload.js" -o "test/preload.min.js" -c

# Add copyright notice to preload.min.js
$copyright = @"

/*
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
* FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
* COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
* IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
"@

Set-Content -Path src/scripts/preload.min.js -Value $copyright
Add-Content -Path src/scripts/preload.min.js -Value (Get-Content test/preload.min.js)

# Remove and recreate renderer.concat.js
Remove-Item -Path test/renderer.concat.js -ErrorAction SilentlyContinue
New-Item -Path test/renderer.concat.js -ItemType File

# Define scripts array
$scripts = @(
    "src/scripts/utilities.js",
    "src/scripts/task-queue.js",
    "src/scripts/stack-monitoring.js",
    "src/scripts/deployments.js",
    "src/scripts/get-amis-and-instance-types.js",
    "src/scripts/get-db-engines-and-instance-types.js" ,
    "src/scripts/sdk-commands.js",
    "src/scripts/renderer.js"
)

# Concatenate scripts
foreach ($script in $scripts) {
    $header = @"

/*
* ###########################################
* ## $script
* ###########################################
*/
"@
    Add-Content -Path test/renderer.concat.js -Value $header
    Get-Content $script | Add-Content -Path test/renderer.concat.js
}

# Run UglifyJS on concatenated file
& "./node_modules/.bin/uglifyjs" "test/renderer.concat.js" -o "test/renderer.min.js" -c drop_console=true -m 

# Add copyright notice to renderer.min.js
Set-Content -Path src/scripts/renderer.min.js -Value $copyright
Add-Content -Path src/scripts/renderer.min.js -Value (Get-Content test/renderer.min.js)

# Run npm make
npm run make
