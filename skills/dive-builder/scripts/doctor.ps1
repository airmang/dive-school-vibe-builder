# Read-only probe for Windows PowerShell 5.1+ and PowerShell 7.
# No runtime installation, network calls, policy changes, or persistent PATH edits.
[CmdletBinding()]
param([switch]$Webapp)

$ready = $true
Write-Output ("mode=" + $(if ($Webapp) { "webapp" } else { "general" }))
function Test-NativeCommand([string]$Name) {
    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $command) { return $false }
    try {
        & $command.Source --version *> $null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false }
}

$nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $nodeCommand) {
    Write-Output "node=missing (check installation and PATH)"
    $ready = $false
} else {
    try {
        $nodeOutput = @(& $nodeCommand.Source --version 2>$null)
        $nodeResult = $LASTEXITCODE
        $minimum = $(if ($Webapp) { [version]"20.9.0" } else { [version]"20.0.0" })
        if ($nodeResult -ne 0 -or $nodeOutput.Count -ne 1 -or $nodeOutput[0] -notmatch '^v(\d+\.\d+\.\d+)$') {
            throw "Invalid version response"
        }
        $nodeVersion = [version]$Matches[1]
        if ($nodeVersion -lt $minimum) { throw "Below minimum" }
        Write-Output ("node=ready (v" + $nodeVersion + ")")
    } catch {
        Write-Output "node=needs-attention (failed version check or below minimum)"
        $ready = $false
    }
}
# Prefer npm.cmd so a restricted npm.ps1 does not require ExecutionPolicy changes.
if (Test-NativeCommand "npm.cmd") {
    Write-Output "npm=ready"
} else {
    Write-Output "npm=missing-or-failed (provided by Node installation)"
    $ready = $false
}
if (Test-NativeCommand "git.exe") {
    Write-Output "git=ready"
} else {
    Write-Output "git=missing-or-failed (required for shared webapps; optional for local general tools)"
    if ($Webapp) { $ready = $false }
}
if ($ready) {
    Write-Output "READY: current-shell tools only; check app-specific requirements separately."
    exit 0
}
Write-Output "ACTION NEEDED: read references/setup.md; do not mark installation complete yet."
exit 1
