# Runs the partner-rule tests. Passwords are typed into hidden prompts and kept only for this run.
function Ask($label) {
  $s = Read-Host $label -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  [Runtime.InteropServices.Marshal]::PtrToStringAuto($b)
}
$env:PB_CUST_EMAIL = Read-Host "Customer email (link.a@example.com)"
$env:PB_CUST_PW = Ask "Customer password"
$env:PB_DEV_EMAIL = Read-Host "Developer email"
$env:PB_DEV_PW = Ask "Developer password"
$env:PB_CREATIVE_EMAIL = Read-Host "Creative partner email"
$env:PB_CREATIVE_PW = Ask "Creative partner password"
$env:PB_PRODUCTION_EMAIL = Read-Host "Production partner email"
$env:PB_PRODUCTION_PW = Ask "Production partner password"
$env:PB_FINANCE_EMAIL = Read-Host "Finance partner email"
$env:PB_FINANCE_PW = Ask "Finance partner password"
try { npm test }
finally {
  'PB_CUST_EMAIL','PB_CUST_PW','PB_DEV_EMAIL','PB_DEV_PW','PB_CREATIVE_EMAIL','PB_CREATIVE_PW',
  'PB_PRODUCTION_EMAIL','PB_PRODUCTION_PW','PB_FINANCE_EMAIL','PB_FINANCE_PW' |
    ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
}
