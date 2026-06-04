/**
 * Aplica marca d'água com a logo da Alphamix centrada na imagem.
 *
 * Para ajustar o watermark:
 *   - Opacidade: alterar o multiplicador em `data[i] = Math.round(data[i] * 0.25)`
 *   - Tamanho: alterar o valor `120` no resize
 *   - Posição: alterar `gravity: 'center'` (opções: 'north', 'south', 'east', 'west', 'southeast', etc.)
 *   - Qualidade JPEG de saída: alterar `quality: 85`
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

// Cache da logo processada — evita reprocessar a cada request na mesma instância
let logoCache: Buffer | null = null;

async function getWatermarkLogo(): Promise<Buffer> {
  if (logoCache) return logoCache;

  // icon.png tem fundo transparente real (hasAlpha: true, channels: 4)
  // alphamix-logo.png NÃO tem alpha — causaria quadrado branco visível no watermark
  const logoPath = join(process.cwd(), "app", "icon.png");
  const logoRaw = readFileSync(logoPath);

  // Redimensionar para 120px — icon.png já tem canal alpha (RGBA)
  const { data, info } = await sharp(logoRaw)
    .resize(120, 120, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Reduzir opacidade para 25% (alpha * 0.25)
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * 0.25);
  }

  // Converter buffer raw de volta para PNG
  logoCache = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  return logoCache;
}

export async function applyWatermark(inputBuffer: ArrayBuffer): Promise<Buffer> {
  const logo = await getWatermarkLogo();

  return sharp(Buffer.from(inputBuffer))
    .composite([{ input: logo, gravity: "center", blend: "over" }])
    .jpeg({ quality: 85 })
    .toBuffer();
}
