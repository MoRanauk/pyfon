$ErrorActionPreference = 'Stop'
$iface = Read-Host "Partner interface (m3-creative, m3-production or m3-finance)"
$email = Read-Host "Partner email"
$pw = Read-Host "Partner password" -AsSecureString
$devEmail = Read-Host "Developer email (press Enter to skip the developer check)"
if ($devEmail) { $devPw = Read-Host "Developer password" -AsSecureString }
$pass = [System.Net.NetworkCredential]::new('', $pw).Password
$U = 'http://localhost:3000'
$VID = "$U/v1/partner/videos"
function Call($method, $url, $body) {
  $a = @{ Method = $method; Uri = $url; Headers = $H; ContentType = 'application/json'; UseBasicParsing = $true }
  if ($body) { $a.Body = ($body | ConvertTo-Json -Depth 6) }
  try {
    $r = Invoke-WebRequest @a
    return @{ Code = [int]$r.StatusCode; Data = ($r.Content | ConvertFrom-Json) }
  } catch {
    return @{ Code = $_.Exception.Response.StatusCode.value__; Data = $null }
  }
}
function Pub($shop) { Invoke-RestMethod "$U/v1/videos/$shop" -Headers @{'X-Interface'='mco'} }
function Show($label, $got, $want) {
  if ("$got" -eq "$want") { "PASS  $label" } else { "FAIL  $label (got $got, wanted $want)" }
}
$r = Invoke-RestMethod -Method Post -Uri "$U/v1/auth/login" -Headers @{'X-Interface'=$iface} -ContentType 'application/json' -Body (@{email=$email;password=$pass} | ConvertTo-Json)
$H = @{'X-Interface'=$iface; Authorization=('Bearer ' + $r.token)}
$link = 'https://res.cloudinary.com/demo/video/upload/dog.mp4'
$shop = 'trim'

Show 'a page link is refused' (Call 'Post' $VID @{ storefront=$shop; title='ZZ TEST Bad'; url='https://example.com/page.html' }).Code 400
Show 'an http link is refused' (Call 'Post' $VID @{ storefront=$shop; title='ZZ TEST Bad'; url='http://example.com/a.mp4' }).Code 400
Show 'an unknown shop is refused' (Call 'Post' $VID @{ storefront='nope'; title='ZZ TEST Bad'; url=$link }).Code 400
$ids = @()
foreach ($n in 'One','Two','Three','Four','Five') {
  $c = Call 'Post' $VID @{ storefront=$shop; title="ZZ TEST $n"; url=$link }
  Show "add video $n" $c.Code 201
  $ids += $c.Data.video.id
}
Show 'a sixth video is refused' (Call 'Post' $VID @{ storefront=$shop; title='ZZ TEST Six'; url=$link }).Code 409
Show 'public list has 5 videos' @((Pub $shop).videos).Count 5
$rev = @($ids[4], $ids[3], $ids[2], $ids[1], $ids[0])
Show 'reorder' (Call 'Put' "$VID/order" @{ storefront=$shop; order=$rev }).Code 200
Show 'public list follows the new order' (Pub $shop).videos[0].title 'ZZ TEST Five'
Show 'rename' (Call 'Patch' "$VID/$($ids[0])" @{ title='ZZ TEST One renamed' }).Code 200
$rp = Call 'Post' "$VID/$($ids[1])/replace" @{ url='https://res.cloudinary.com/demo/video/upload/elephants.mp4' }
Show 'replace a video' $rp.Code 201
$list = Call 'Get' "$VID`?storefront=$shop" $null
Show 'still 5 current videos after a replace' @($list.Data.current).Count 5
Show 'the old video is in the archive' @($list.Data.archive).Count 1
Show 'archive a video' (Call 'Post' "$VID/$($ids[2])/archive" $null).Code 200
Show 'public list has 4 videos' @((Pub $shop).videos).Count 4
Show 'restore it' (Call 'Post' "$VID/$($ids[2])/restore" $null).Code 200
Show 'restoring a video that is not archived is refused' (Call 'Post' "$VID/$($ids[2])/restore" $null).Code 404
Show 'a bad id gives not found' (Call 'Post' "$VID/abc/archive" $null).Code 404
if ($devEmail) {
  $dp = [System.Net.NetworkCredential]::new('', $devPw).Password
  $d = Invoke-RestMethod -Method Post -Uri "$U/v1/auth/login" -Headers @{'X-Interface'='dev'} -ContentType 'application/json' -Body (@{email=$devEmail;password=$dp} | ConvertTo-Json)
  $H = @{'X-Interface'='dev'; Authorization=('Bearer ' + $d.token)}
  Show 'developer console can list the videos' (Call 'Get' "$U/v1/dev/videos`?storefront=$shop" $null).Code 200
}
"Done. Remove the test videos with: node --env-file=.env src/scripts/remove-test-videos.js (from backend)"
