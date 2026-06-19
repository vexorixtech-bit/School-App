param(
    [string]$BackupDir = "D:\Projects 2026\School Management System\backups"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "school_erp_$timestamp.sql"
$filepath = Join-Path $BackupDir $filename

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$pgDump = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$env:PGPASSWORD = "Vignesh@1620"

& $pgDump -U postgres -h localhost -d school_erp -F c -f $filepath

if ($LASTEXITCODE -eq 0) {
    Write-Output "Backup saved: $filepath ($((Get-Item $filepath).Length / 1MB) MB)"
    
    # Keep only last 7 backups
    Get-ChildItem $BackupDir -Filter "*.sql" | Sort-Object CreationTime -Descending | Select-Object -Skip 7 | Remove-Item -Force
} else {
    Write-Error "Backup failed"
}
