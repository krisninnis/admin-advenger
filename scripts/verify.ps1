$ErrorActionPreference = "Stop"

function Invoke-VerificationStep {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,

    [Parameter(Mandatory = $true)]
    [string] $Command,

    [string[]] $Arguments = @()
  )

  Write-Host ""
  Write-Host "==> $Name"
  & $Command @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE."
  }
}

Invoke-VerificationStep -Name "Tests" -Command "npm" -Arguments @("test")
Invoke-VerificationStep -Name "Lint" -Command "npm" -Arguments @("run", "lint")
Invoke-VerificationStep -Name "Build" -Command "npm" -Arguments @("run", "build")
Invoke-VerificationStep -Name "Diff whitespace check" -Command "git" -Arguments @("diff", "--check")

Write-Host ""
Write-Host "All verification checks passed."
