# build-icon.ps1
# 将 renderer/public/icon.svg 栅格化为多尺寸 Windows 安装包图标 build/icon.ico
# 用法（在仓库根目录或任意位置均可，脚本会自动定位仓库根）:
#   pwsh tools/build-icon.ps1
#
# 依赖（任选其一，脚本会按优先级自动探测）:
#   1) ImageMagick  ->  magick 命令
#   2) Inkscape     ->  inkscape 命令（仅导出 PNG，仍需要下方 python 合成 ico）
#   3) Python3 + cairosvg + Pillow  ->  pip install cairosvg pillow
#
# 若均不可用，脚本会给出明确提示后退出（exit 3），不会破坏现有 icon.ico。

$ErrorActionPreference = 'Stop'

$root = Resolve-Path "$PSScriptRoot/.."
$svg  = Join-Path $root 'renderer/public/icon.svg'
$out  = Join-Path $root 'build/icon.ico'
$sizes = @(256, 128, 64, 48, 32, 16)

if (-not (Test-Path $svg)) {
  Write-Host "未找到源文件: $svg" -ForegroundColor Red
  exit 1
}

$tmp = Join-Path $env:TEMP 'taskharbor_icon_png'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# ---------- 1) ImageMagick（PATH / 本地 tools/imagemagick / 环境变量） ----------
$magick = $null
$cands = @('magick')
if ($env:IMAGEMAGICK_PATH) { $cands += $env:IMAGEMAGICK_PATH }
$d = $root
for ($i = 0; $i -lt 4; $i++) {
  $cands += Join-Path $d 'tools' 'imagemagick' 'magick.exe'
  $d = Join-Path $d '..'
}
foreach ($c in $cands) {
  if ($c -eq 'magick') {
    if (Get-Command magick -ErrorAction SilentlyContinue) { $magick = 'magick'; break }
  } elseif (Test-Path $c) { $magick = $c; break }
}
if ($magick) {
  foreach ($s in $sizes) {
    & $magick -background none -resize "${s}x${s}" $svg (Join-Path $tmp "icon-$s.png")
  }
  & $magick (Join-Path $tmp 'icon-*.png') $out
  Write-Host "已用 ImageMagick 生成: $out" -ForegroundColor Green
  exit 0
}

# ---------- 2) Inkscape 导出 PNG（再交 python 合成 ico） ----------
$inkscapeOk = $false
if (Get-Command inkscape -ErrorAction SilentlyContinue) {
  foreach ($s in $sizes) {
    & inkscape $svg -w $s -h $s -o (Join-Path $tmp "icon-$s.png") 2>$null
  }
  $inkscapeOk = $true
}

# ---------- 3) Python3 + cairosvg + Pillow ----------
if ((Get-Command python3 -ErrorAction SilentlyContinue) -and (-not $inkscapeOk -or $true)) {
  $code = @'
import sys, io
try:
    import cairosvg
    from PIL import Image
except Exception as e:
    sys.stderr.write("缺少 cairosvg/pillow，请先执行: pip install cairosvg pillow\n")
    sys.exit(2)
svg, out = sys.argv[1], sys.argv[2]
sizes = [int(x) for x in sys.argv[3].split(',')]
imgs = []
for s in sizes:
    png = cairosvg.svg2png(url=svg, output_width=s, output_height=s)
    imgs.append(Image.open(io.BytesIO(png)).convert('RGBA'))
imgs[0].save(out, sizes=[(s, s) for s in sizes], append_images=imgs[1:])
print("OK")
'@
  $result = python3 - $svg $out ($sizes -join ',') $code 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "已用 python(cairosvg+pillow) 生成: $out" -ForegroundColor Green
    exit 0
  } else {
    Write-Host $result
  }
}

Write-Host "未找到可用的栅格化工具（ImageMagick / Inkscape / python+cairosvg+pillow）。" -ForegroundColor Yellow
Write-Host "请安装任一工具后重试；或手动将 icon.svg 导出为 256/128/64/48/32/16 多尺寸后合成 .ico。" -ForegroundColor Yellow
exit 3
