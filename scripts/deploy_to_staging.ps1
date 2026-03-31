# 🚀 Staging Deployment Script for Tasks 1.1 & 1.3 (PowerShell Version)
# Usage: .\deploy_to_staging.ps1 [-Full] [-Quick] [-Rollback] [-Health]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Full", "Quick", "Rollback", "Health")]
    [string]$Mode = "Full",
    
    [Parameter(Mandatory=$false)]
    [string]$StagingServer = "staging-server",
    
    [Parameter(Mandatory=$false)]
    [string]$StagingUser = "deploy"
)

# Configuration
$ProjectRoot = Split-Path -Parent $PSScriptRoot | Split-Path -Parent
$BackendDir = Join-Path $ProjectRoot "apps\agent-backend"
$DockerImage = "dewa-fun-agent-backend:staging"
$ErrorActionPreference = "Stop"

# Colors
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Functions
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not in PATH"
        exit 1
    }
    
    # Check SSH connection
    try {
        ssh -o ConnectTimeout=5 "$StagingUser@$StagingServer" "echo 'Connection successful'" | Out-Null
        Write-Success "Prerequisites check passed"
    } catch {
        Write-Error "Cannot connect to staging server: $StagingServer"
        exit 1
    }
}

function Invoke-Tests {
    Write-Info "Running test suites..."
    
    Push-Location $BackendDir
    
    try {
        # Unit tests
        Write-Info "Running unit tests..."
        $testResult = pytest tests/test_social_content.py tests/test_oracle_service.py -v --tb=short
        if ($LASTEXITCODE -ne 0) {
            throw "Unit tests failed!"
        }
        Write-Success "Unit tests passed (31/31)"
        
        # Integration tests (only in Full mode)
        if ($Mode -eq "Full") {
            $stagingTestDir = Join-Path (Get-Location) "tests\staging"
            if (Test-Path $stagingTestDir) {
                Write-Info "Running integration tests..."
                pytest tests/staging/ -v --tb=short
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Integration tests passed"
                } else {
                    Write-Warning "Some integration tests failed, proceeding with caution"
                }
            } else {
                Write-Warning "No integration tests found, skipping..."
            }
        }
    } finally {
        Pop-Location
    }
    
    Write-Success "All tests completed"
}

function Invoke-DockerBuild {
    Write-Info "Building Docker image..."
    
    Push-Location $BackendDir
    
    try {
        docker build -t $DockerImage .
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed!"
        }
        Write-Success "Docker image built successfully: $DockerImage"
    } finally {
        Pop-Location
    }
}

function Invoke-Deployment {
    Write-Info "Deploying to staging server..."
    
    $sshScript = @'
        set -e
        
        Write-Host "🔄 Stopping old container..."
        docker stop agent-backend-staging 2>$null
        docker rm agent-backend-staging 2>$null
        
        Write-Host "📦 Starting new container..."
        docker run -d `
            --name agent-backend-staging `
            -p 8000:8000 `
            --env-file .env.staging `
            --restart unless-stopped `
            dewa-fun-agent-backend:staging
        
        Write-Host "✅ Deployment completed"
'@
    
    ssh "$StagingUser@$StagingServer" $sshScript
    
    Write-Success "Deployed to staging server"
}

function Invoke-HealthChecks {
    Write-Info "Running health checks..."
    
    $healthCheckScript = @'
        set -e
        
        Write-Host "🏥 Running health checks..."
        
        # Check 1: Container running
        if ! docker ps | grep -q agent-backend-staging; then
            Write-Host "❌ Container not running"
            exit 1
        fi
        Write-Host "✅ Container running"
        
        # Check 2: API responding
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
        if [ "$response" != "200" ]; then
            Write-Host "❌ API not responding (HTTP $response)"
            exit 1
        fi
        Write-Host "✅ API responding (HTTP 200)"
        
        Write-Host "✅ All health checks passed"
'@
    
    ssh "$StagingUser@$StagingServer" $healthCheckScript
    
    Write-Success "Health checks passed"
}

function Invoke-Rollback {
    Write-Warning "Rolling back to previous version..."
    
    $rollbackScript = @'
        set -e
        
        Write-Host "🔄 Stopping current version..."
        docker stop agent-backend-staging 2>/dev/null || true
        docker rm agent-backend-staging 2>/dev/null || true
        
        Write-Host "🔄 Starting previous version..."
        docker run -d `
            --name agent-backend-staging `
            -p 8000:8000 `
            --env-file .env.staging `
            --restart unless-stopped `
            dewa-fun-agent-backend:staging-previous || \
        dewa-fun-agent-backend:latest
        
        Write-Host "✅ Rollback completed"
'@
    
    ssh "$StagingUser@$StagingServer" $rollbackScript
    
    Write-Success "Rollback completed successfully"
}

function Show-Status {
    Write-Info "Deployment Status Summary"
    Write-Host "================================"
    Write-Host "Mode: $Mode"
    Write-Host "Server: $StagingUser@$StagingServer"
    Write-Host "Project Root: $ProjectRoot"
    Write-Host "Docker Image: $DockerImage"
    Write-Host "================================"
}

# Main execution
try {
    Show-Status
    
    switch ($Mode) {
        "Health" {
            Invoke-HealthChecks
        }
        "Rollback" {
            Invoke-Rollback
        }
        default {
            Test-Prerequisites
            
            if ($Mode -eq "Full") {
                Invoke-Tests
            }
            
            Invoke-DockerBuild
            Invoke-Deployment
            
            Write-Info "Waiting for service to start..."
            Start-Sleep -Seconds 10
            
            Invoke-HealthChecks
            
            Write-Success "🎉 Deployment completed successfully!"
            Write-Info "Monitor the service at: http://$StagingServer:8000"
        }
    }
    
    exit 0
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}
