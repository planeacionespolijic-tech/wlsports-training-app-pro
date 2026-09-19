import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Standard Brand SVG (Transparent / Clean)
const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2B2"/>
      <stop offset="35%" stop-color="#D4AF37"/>
      <stop offset="70%" stop-color="#AA771C"/>
      <stop offset="100%" stop-color="#85580F"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1c1c22"/>
      <stop offset="100%" stop-color="#08080a"/>
    </linearGradient>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Shield -->
  <path d="M256 32 C340 32 430 54 430 54 C430 180 410 340 256 470 C102 340 82 180 82 54 C82 54 172 32 256 32 Z" 
        fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="8"/>

  <!-- Inner Crest Line -->
  <path d="M256 56 C326 56 404 74 404 74 C404 186 386 324 256 438 C126 324 108 186 108 74 C108 74 186 56 256 56 Z" 
        fill="none" stroke="url(#goldGrad)" stroke-width="2.5" opacity="0.6"/>

  <!-- Stylized Monogram "WL" -->
  <!-- 'W' Wing Shape Left -->
  <path d="M145 155 L182 315 L225 195 L256 265 L287 195 L330 315 L367 155 L328 155 L306 255 L276 185 L236 185 L206 255 L184 155 Z" 
        fill="url(#goldGrad)" filter="url(#goldGlow)"/>

  <!-- Lightning Dynamic Slash -->
  <polygon points="256,120 236,230 266,230 246,335 284,215 254,215" fill="#FFFFFF" opacity="0.9"/>

  <!-- WLSPORTS Ribbon & Text -->
  <rect x="140" y="350" width="232" height="36" rx="18" fill="#0c0c0e" stroke="url(#goldGrad)" stroke-width="2"/>
  <text x="256" y="374" fill="url(#goldGrad)" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="900" letter-spacing="4" text-anchor="middle">WLSPORTS</text>
</svg>`;

// 2. Maskable SVG with Safe Zone (central 80% circle with full-bleed luxury dark background)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141418"/>
      <stop offset="50%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="goldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2B2"/>
      <stop offset="35%" stop-color="#D4AF37"/>
      <stop offset="70%" stop-color="#AA771C"/>
      <stop offset="100%" stop-color="#85580F"/>
    </linearGradient>
    <radialGradient id="ambientGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Full Bleed Background -->
  <rect width="512" height="512" fill="url(#bgGrad)" />
  <circle cx="256" cy="256" r="230" fill="url(#ambientGold)" />

  <!-- Inner Safe Zone Content (scaled to 78% of canvas to fit comfortably in maskable circle/squircle) -->
  <g transform="translate(56, 56) scale(0.78)">
    <!-- Background Shield -->
    <path d="M256 32 C340 32 430 54 430 54 C430 180 410 340 256 470 C102 340 82 180 82 54 C82 54 172 32 256 32 Z" 
          fill="#111115" stroke="url(#goldGradM)" stroke-width="10"/>

    <!-- Inner Crest Line -->
    <path d="M256 56 C326 56 404 74 404 74 C404 186 386 324 256 438 C126 324 108 186 108 74 C108 74 186 56 256 56 Z" 
          fill="none" stroke="url(#goldGradM)" stroke-width="3" opacity="0.6"/>

    <!-- 'W' Wing Shape Left -->
    <path d="M145 155 L182 315 L225 195 L256 265 L287 195 L330 315 L367 155 L328 155 L306 255 L276 185 L236 185 L206 255 L184 155 Z" 
          fill="url(#goldGradM)"/>

    <!-- Lightning Dynamic Slash -->
    <polygon points="256,120 236,230 266,230 246,335 284,215 254,215" fill="#FFFFFF" opacity="0.95"/>

    <!-- WLSPORTS Ribbon & Text -->
    <rect x="140" y="350" width="232" height="38" rx="19" fill="#000000" stroke="url(#goldGradM)" stroke-width="2.5"/>
    <text x="256" y="375" fill="url(#goldGradM)" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="900" letter-spacing="4" text-anchor="middle">WLSPORTS</text>
  </g>
</svg>`;

async function generate() {
  console.log('Writing icon.svg...');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), brandSvg);

  console.log('Generating pwa-192x192.png...');
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  console.log('Generating pwa-512x512.png...');
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  console.log('Generating pwa-maskable-512x512.png...');
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Generating apple-touch-icon.png (180x180)...');
  await sharp(Buffer.from(maskableSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Generating favicon.ico (64x64 PNG format ico)...');
  await sharp(Buffer.from(maskableSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('All icons generated successfully in /public!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
