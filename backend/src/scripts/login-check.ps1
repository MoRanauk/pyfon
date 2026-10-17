$ErrorActionPreference = 'Stop'
$iface = Read-Host "Interface (m3-creative, m3-production or m3-finance)"
$email = Read-Host "Email"
$pw = Read-Host "Password" -AsSecureString
$p = [System.Net.NetworkCredential]::new('', $pw).Password
$r = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/v1/auth/login' -Headers @{'X-Interface'=$iface} -ContentType 'application/json' -Body (@{email=$email;password=$p} | ConvertTo-Json)
if ($r.token) { 'LOGIN WORKS for ' + $r.user.fullName + ' (' + $r.user.stage + ')' }
