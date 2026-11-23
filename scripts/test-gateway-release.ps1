# Offline Docker rehearsal. The connector stand-in never opens a Tunnel.
param(
    [string]$Image = 'farmers-b3-gateway:local',
    [switch]$SimulateCaddy
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$id = [guid]::NewGuid().ToString('N').Substring(0, 10)
$working = Join-Path $root ".b3-gateway-$id"
$containers = [System.Collections.Generic.List[string]]::new()
$utf8 = [System.Text.UTF8Encoding]::new($false)
$connector = Join-Path $working 'cloudflared'
$caddy = Join-Path $working 'caddy'

New-Item -ItemType Directory -Path $working | Out-Null
try {
    $standIn = @'
#!/bin/bash
set -eu
[[ $TUNNEL_TOKEN == local-synthetic-connector-token ]]
[[ -z ${MARKET_API_INGRESS_KEY+x} ]]
if [[ ${SMOKE_FAIL_PROCESS:-} == connector ]]; then
    sleep 2
    exit 0
fi
trap 'echo CONNECTOR_DRAINED; exit 0' TERM
echo CONNECTOR_STARTED
while true; do sleep 0.1; done
'@
    [IO.File]::WriteAllText($connector, $standIn.Replace("`r`n", "`n") + "`n", $utf8)
    if ($SimulateCaddy) {
        $standIn = @'
#!/bin/bash
set -eu
[[ -z ${TUNNEL_TOKEN+x} ]]
[[ -n $MARKET_API_INGRESS_KEY ]]
if [[ $1 == validate ]]; then exit 0; fi
if [[ ${SMOKE_FAIL_PROCESS:-} == caddy ]]; then
    sleep 2
    exit 0
fi
trap 'echo CADDY_DRAINED; exit 0' TERM
echo CADDY_STARTED
while true; do sleep 0.1; done
'@
        [IO.File]::WriteAllText($caddy, $standIn.Replace("`r`n", "`n") + "`n", $utf8)
    }

    $opts = @(
        '--pull=never', '--network', 'none', '--workdir', '/app',
        '--mount', "type=bind,src=$working,dst=/fixture,readonly",
        '-e', 'DEPLOYMENT_ENV=staging', '-e', 'TUNNEL_TOKEN=local-synthetic-connector-token',
        '-e', 'MARKET_ADMIN_HOST=admin.example.com', '-e', 'MARKET_ACCOUNT_HOST=auth.example.com',
        '-e', 'MARKET_API_HOST=api.example.com',
        '-e', 'STOREFRONT_PILOT_HOSTS=vendor-pilot.example.com market-pilot.example.com',
        '-e', 'MARKET_ADMIN_UPSTREAM=http://admin.railway.internal:4322',
        '-e', 'MARKET_STOREFRONT_UPSTREAM=http://storefront.railway.internal:4321',
        '-e', 'MARKET_API_UPSTREAM=http://api.railway.internal:3000'
    )
    foreach ($service in @('ADMIN', 'STOREFRONT', 'API')) {
        $key = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
        $opts += @('-e', "MARKET_${service}_INGRESS_KEY=$key")
    }
    if ($SimulateCaddy) {
        foreach ($file in @('Caddyfile.hosted', 'hosted-gateway.mjs', 'run-hosted-gateway.sh')) {
            $opts += @('--mount', "type=bind,src=$(Join-Path $PSScriptRoot $file),dst=/app/scripts/$file,readonly")
        }
    }
    $run = 'mkdir -p /tmp/gateway-bin; cp /fixture/* /tmp/gateway-bin/; chmod +x /tmp/gateway-bin/*; export PATH=/tmp/gateway-bin:$PATH; exec bash scripts/run-hosted-gateway.sh'

    function Start-SmokeGateway($Mode) {
        $name = "market-gateway-$id-$Mode"
        docker run -d --name $name @opts -e "SMOKE_FAIL_PROCESS=$Mode" --entrypoint bash $Image -c $run | Out-Null
        $containers.Add($name)
        return $name
    }
    function Wait-ForConnector($Name) {
        for ($i = 0; $i -lt 40; $i++) {
            if (docker logs $Name | Select-String 'CONNECTOR_STARTED') { return }
            Start-Sleep -Milliseconds 250
        }
        throw 'The synthetic connector failed to start'
    }

    $graceful = Start-SmokeGateway 'none'
    Wait-ForConnector $graceful
    if (!$SimulateCaddy) {
        docker exec $graceful node scripts/hosted-gateway.mjs probe
    }
    docker stop --time 40 $graceful | Out-Null
    $logs = docker logs $graceful
    if ((docker inspect --format '{{.State.ExitCode}}' $graceful) -ne '0' -or
        !($logs -match 'CONNECTOR_DRAINED') -or ($SimulateCaddy -and !($logs -match 'CADDY_DRAINED'))) {
        throw 'The supervisor failed to drain both processes'
    }
    $connectorFailure = Start-SmokeGateway 'connector'
    $status = docker wait $connectorFailure
    $logs = docker logs $connectorFailure 2>&1 | Out-String
    if ($status -ne '1' -or $logs -notmatch 'Gateway process exited unexpectedly' -or
        ($SimulateCaddy -and $logs -notmatch 'CADDY_DRAINED')) {
        throw 'The supervisor failed to handle connector exit'
    }
    if ($SimulateCaddy) {
        $caddyFailure = Start-SmokeGateway 'caddy'
        $status = docker wait $caddyFailure
        $logs = docker logs $caddyFailure 2>&1 | Out-String
        if ($status -ne '1' -or $logs -notmatch 'CONNECTOR_DRAINED') {
            throw 'The supervisor failed to handle Caddy exit'
        }
    }
    Write-Output 'PASS isolated gateway shutdown and unexpected process exit'
} finally {
    $PSNativeCommandUseErrorActionPreference = $false
    foreach ($container in $containers) { docker rm -f $container | Out-Null }
    foreach ($file in @($connector, $caddy)) {
        if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file }
    }
    Remove-Item -LiteralPath $working
}
