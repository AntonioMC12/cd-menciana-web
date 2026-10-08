$ErrorActionPreference = 'Stop'
$assetRoot = Join-Path $PSScriptRoot '../public/images/equipos'
# Official RFAF match cards, season 2026/27, group 17, round 1.
$sourceRoot = 'https://rfaf.filesnovanet.es/pnfg/pimg/Clubes/'
$crests = @{
  'decorseneca.jpg' = '00100_0000978449_a90c0f5e_dc3c_426b_827e_377b068aa927_copia.JPG'
  'cadiz-futsal.jpg' = '00100_0001363107_X_Escudo_CD_C_diz_Futsal2.png'
  'alcala-guadaira.png' = '01875.png'
  'adyo.jpg' = '00100_0002205899_logo_ADYO_512x512.jpg'
  'alchoyano.jpg' = '00100_0001162576_PCD_UD_ALCHOYANO___3288.jpg'
  'olimpic-triana.jpg' = '00100_0001375486_Escudo_Olimpic.jpg'
  'villalba.jpg' = '00100_0000287509_IMG_0133.JPG'
  'isleno-san-fernando.png' = '00100_0001284111_logo_isle_90_.png'
}
foreach ($crest in $crests.GetEnumerator()) {
  $destination = Join-Path $assetRoot $crest.Key
  Invoke-WebRequest -Uri ($sourceRoot + $crest.Value) -OutFile $destination -TimeoutSec 25
  Write-Output $crest.Key
}
