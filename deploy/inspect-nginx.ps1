param([string]$Password = "")
$ErrorActionPreference = "Stop"
Import-Module Posh-SSH
$secp = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential("root", $secp)
$s = New-SSHSession -ComputerName "72.61.89.224" -Credential $cred -AcceptKey:$true
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command 'curl -skI https://serpely.com/integrations | grep -i "location\|http/"; echo "=== express-test ==="; curl -s http://127.0.0.1:4000/integrations -o /dev/null -w "%{http_code}\n"'
$r.Output -join "`n"
Remove-SSHSession -SessionId $s.SessionId | Out-Null
