<powershell>
# Create a temporary directory
$tempDir = $env:TEMP + "\ssm"
New-Item -ItemType directory -Path $tempDir -Force

# Change to the temporary directory
Set-Location $tempDir

# Download the SSM Agent installer
Invoke-WebRequest `
    -Uri "https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/windows_amd64/AmazonSSMAgentSetup.exe" `
    -OutFile "$tempDir\AmazonSSMAgentSetup.exe"

# Install the SSM Agent
Start-Process `
    -FilePath "$tempDir\AmazonSSMAgentSetup.exe" `
    -ArgumentList @("/q", "/log", "install.log") `
    -Wait

# Ensure the SSM Agent is running
Restart-Service AmazonSSMAgent

# Require elevation (must run as administrator)
# Requires -RunAsAdministrator

# Install IIS with basic features
Write-Host "Installing IIS and basic features..."
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install common IIS features
Install-WindowsFeature -Name `
    Web-Common-Http,
    Web-Default-Doc,
    Web-Dir-Browsing,
    Web-Http-Errors,
    Web-Static-Content,
    Web-Http-Logging

# Start the IIS service
Write-Host "Starting IIS service..."
Start-Service W3SVC

# Enable firewall rule for HTTP (port 80)
Write-Host "Configuring firewall rules..."
New-NetFirewallRule -DisplayName "HTTP Inbound" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Verify IIS installation and service status
$iisService = Get-Service W3SVC
Write-Host "IIS Service Status: $($iisService.Status)"

# Create a simple test page
$testPageContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>IIS Test Page</title>
</head>
<body>
    <h1>IIS Web Server is running!</h1>
    <p>If you can see this page, your IIS installation was successful.</p>
</body>
</html>
"@

$testPageContent | Out-File -FilePath "C:\inetpub\wwwroot\test.html" -Force

Write-Host "Installation complete. You can test the web server by navigating to:"
Write-Host "http://localhost/test.html"

</powershell>