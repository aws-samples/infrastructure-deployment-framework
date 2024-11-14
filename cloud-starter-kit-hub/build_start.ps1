# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "Please run this script as an Administrator!"
    Exit
}

# Run UglifyJS on preload.js
& "./node_modules/.bin/uglifyjs" "src/scripts/preload.js" -o "src/scripts/preload.min.js" -c

# Define scripts array for ESLint
$scripts = @("src/scripts/main.js", "src/scripts/preload.js", "src/scripts/preload.min.js")

# Run ESLint on each script
foreach ($script in $scripts) {
    & "./node_modules/.bin/eslint" $script
}

# Remove and recreate renderer.concat.js
Remove-Item -Path "test/renderer.concat.js" -ErrorAction SilentlyContinue
New-Item -Path "test/renderer.concat.js" -ItemType File

# Define scripts array for concatenation
$scripts = @(
    "src/scripts/utilities.js",
    "src/scripts/task-queue.js",
    "src/scripts/stack-monitoring.js",
    "src/scripts/deployments.js",
    "src/scripts/get-amis-and-instance-types.js",
    "src/scripts/get-db-engines-and-instance-types.js",
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
    Add-Content -Path "test/renderer.concat.js" -Value $header
    Get-Content $script | Add-Content -Path "test/renderer.concat.js"
}

# Run UglifyJS on concatenated file
& "./node_modules/.bin/uglifyjs" "test/renderer.concat.js" -o "src/scripts/renderer.min.js"

# Run ESLint on concatenated file
& "./node_modules/.bin/eslint" "test/renderer.concat.js"

# Commented out ESLint on minified file
# & "./node_modules/.bin/eslint" "src/scripts/renderer.min.js"

# Run npm start
npm run start
