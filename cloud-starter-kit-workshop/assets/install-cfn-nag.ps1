# Script to install Ruby and cfn-nag

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "Please run this script as an Administrator!"
    Exit
}

Import-Module $env:ChocolateyInstall\helpers\chocolateyProfile.psm1

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Install Chocolatey if not already installed
if (-not (Test-Command choco)) {
    Write-Output "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
}

# Install Ruby if not already installed
if (-not (Test-Command ruby)) {
    Write-Output "Installing Ruby..."
    choco install ruby -y
}

# Verify Ruby installation
if (Test-Command ruby) {
    $rubyVersion = ruby -v
    Write-Output "Ruby installed successfully: $rubyVersion"
    Write-Output "Installing msys2..."
    choco install msys2 --params "/NoUpdate" -y
    Write-Output "Installing mingw..."
    choco install mingw -y
    Write-Output "Installing ridk..."
    Update-SessionEnvironment
    ridk install 2 3
    refreshenv
} else {
    Write-Error "Ruby installation failed. Please install Ruby manually and retry."
    Exit
}

# Install cfn-nag
Write-Output "Installing cfn-nag..."
gem install cfn-nag
refreshenv

# Verify cfn-nag installation
if (Test-Command cfn_nag_scan) {
    $cfnNagVersion = cfn_nag_scan --version
    Write-Output "cfn-nag installed successfully: $cfnNagVersion"
} else {
    Write-Error "cfn-nag installation failed. Please try installing it manually."
    Exit
}

Write-Output "Installation complete!"
