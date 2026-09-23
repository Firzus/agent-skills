$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$version = (Get-Content server/package.json -Raw | ConvertFrom-Json).version
$destination = Join-Path $root 'artifacts/packages'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
foreach ($package in @('server', 'instrumentation')) {
    Push-Location $package
    try {
        $packed = npm pack --json --pack-destination $destination
        if ($LASTEXITCODE -ne 0) { throw "Packaging $package failed" }
        $manifest = @($packed | ConvertFrom-Json)[0]
        if ($manifest.version -ne $version) { throw 'Version mismatch' }
        foreach ($file in $manifest.files) {
            if ($file.path -notmatch '^(dist/[^/]+\.(js|d\.ts)|package\.json|README\.md|LICENSE)$') { throw "Unexpected package entry: $($file.path)" }
        }
        $packed | Set-Content -Encoding utf8 (Join-Path $destination "$package-manifest.json")
    } finally { Pop-Location }
}
$consumer = Join-Path ([System.IO.Path]::GetTempPath()) ('tauri-agent-kit-consumer-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $consumer | Out-Null
'{"private":true,"type":"module"}' | Set-Content -Encoding utf8 (Join-Path $consumer 'package.json')
Push-Location $consumer
try {
    npm install --ignore-scripts --no-audit --no-fund (Join-Path $destination "tauri-agent-kit-$version.tgz") (Join-Path $destination "tauri-agent-kit-instrumentation-$version.tgz")
    if ($LASTEXITCODE -ne 0) { throw 'Isolated installation failed' }
    $actual = & ./node_modules/.bin/tauri-agent-kit.cmd --version
    if ($LASTEXITCODE -ne 0 -or $actual -ne $version) { throw 'Installed binary version mismatch' }
    node --input-type=module -e "import { instrumentInvoke } from 'tauri-agent-kit-instrumentation'; if(typeof instrumentInvoke !== 'function') process.exit(1)"
    if ($LASTEXITCODE -ne 0) { throw 'Instrumentation export failed' }
    $env:AGENT_KIT_SERVER_ENTRY = Join-Path $consumer 'node_modules/tauri-agent-kit/dist/index.js'
    node (Join-Path $root 'scripts/live-test.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Installed MCP live test failed' }
} finally {
    Remove-Item Env:AGENT_KIT_SERVER_ENTRY -ErrorAction SilentlyContinue
    Pop-Location
}
Write-Output "Isolated consumer verified: $consumer"
