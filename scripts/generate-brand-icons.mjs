import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Executive TKG Icon Design
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Deep Luxury Royal Navy / Obsidian Background Gradient -->
    <radialGradient id="navyBg" cx="35%" cy="28%" r="85%">
      <stop offset="0%" stop-color="#14263b"/>
      <stop offset="45%" stop-color="#0a1a2b"/>
      <stop offset="100%" stop-color="#040b13"/>
    </radialGradient>

    <!-- Luxury Metallic Gold Gradient -->
    <linearGradient id="gold" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#fff0c7"/>
      <stop offset="25%" stop-color="#ecd087"/>
      <stop offset="55%" stop-color="#c8a45b"/>
      <stop offset="85%" stop-color="#9f782f"/>
      <stop offset="100%" stop-color="#76541b"/>
    </linearGradient>

    <!-- Outer Rim Accent Gradient -->
    <linearGradient id="rimGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faecc1" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#c8a45b" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#76541b" stop-opacity="0.75"/>
    </linearGradient>

    <!-- Drop Shadow for Dimensionality -->
    <filter id="goldGlow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Squircle / Rounded Outer Container -->
  <rect width="512" height="512" rx="116" fill="url(#navyBg)"/>

  <!-- Precision Metallic Gold Border -->
  <rect x="20" y="20" width="472" height="472" rx="98" fill="none" stroke="url(#rimGold)" stroke-width="4"/>

  <!-- Inner Subtle Crest Ring -->
  <circle cx="256" cy="256" r="216" fill="none" stroke="url(#rimGold)" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.35"/>

  <!-- Top Executive Accent (Diamond Crest) -->
  <g fill="url(#gold)" filter="url(#goldGlow)">
    <polygon points="256,112 264,122 256,132 248,122"/>
  </g>

  <!-- Central TKG Monogram -->
  <g filter="url(#goldGlow)">
    <text x="256" y="318" 
          font-family="'Source Serif 4', 'Georgia', 'Times New Roman', serif" 
          font-size="168" 
          font-weight="700" 
          letter-spacing="5" 
          text-anchor="middle" 
          fill="url(#gold)">TKG</text>
  </g>

  <!-- Sophisticated Foundation Rule / Underline -->
  <g stroke="url(#gold)" filter="url(#goldGlow)">
    <line x1="152" y1="352" x2="360" y2="352" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  </g>
  <circle cx="256" cy="352" r="4" fill="url(#gold)"/>
</svg>`;

async function main() {
  const publicDir = path.resolve('public');
  
  // Write vector SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg, 'utf8');
  console.log('Saved public/icon.svg');

  // Generate PNG sizes
  const sizes = [512, 192, 180, 48, 32, 16];
  const pngBuffers = {};

  for (const size of sizes) {
    const buf = await sharp(Buffer.from(svg))
      .resize(size, size, { fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    pngBuffers[size] = buf;
  }

  // Save specific standard files
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffers[192]);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffers[180]);
  console.log('Saved public/icon-512.png, icon-192.png, apple-touch-icon.png');

  // Build multi-icon .ico file containing 16x16, 32x32, 48x48
  const icoSizes = [16, 32, 48];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(icoSizes.length, 4); // Number of images

  let currentOffset = 6 + (icoSizes.length * 16);
  const directoryEntries = [];
  const imageBuffers = [];

  for (const s of icoSizes) {
    const imgBuf = pngBuffers[s];
    imageBuffers.push(imgBuf);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(s, 0); // Width
    entry.writeUInt8(s, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(imgBuf.length, 8); // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset
    directoryEntries.push(entry);

    currentOffset += imgBuf.length;
  }

  const icoBuffer = Buffer.concat([header, ...directoryEntries, ...imageBuffers]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Saved public/favicon.ico (' + icoBuffer.length + ' bytes)');
}

main().catch(console.error);
