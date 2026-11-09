import sharp from 'sharp';
import { PROFILE_IMAGE_INPUT_LIMIT, PROFILE_IMAGE_SPECS, type ProfileImageKind } from '@/lib/profile-image';

export class ProfileImageInputError extends Error {
  constructor(message: string, readonly status: 413 | 415 | 422) {
    super(message);
  }
}

export async function readProfileImage(request: Request) {
  const tooLarge = () => new ProfileImageInputError('La imagen pesa más de 4 MB.', 413);
  if (Number(request.headers.get('content-length')) > PROFILE_IMAGE_INPUT_LIMIT) throw tooLarge();
  if (!request.body) throw new ProfileImageInputError('Elegí una imagen.', 422);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > PROFILE_IMAGE_INPUT_LIMIT) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

export async function encodeProfileImage(input: Buffer, kind: ProfileImageKind) {
  const jpeg = input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
  const png = input.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const webp = input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP';
  if (!jpeg && !png && !webp) {
    throw new ProfileImageInputError('Elegí una imagen JPG, PNG o WebP.', 415);
  }

  const { width, height, maxBytes } = PROFILE_IMAGE_SPECS[kind];
  try {
    const source = sharp(input, { limitInputPixels: 24_000_000, failOn: 'warning' });
    const metadata = await source.metadata();
    if ((metadata.pages ?? 1) > 1) throw new ProfileImageInputError('Elegí una imagen estática.', 415);

    const aspect = width / height;
    const sourceSize = metadata.autoOrient;
    const maxHeight = Math.min(height, sourceSize.height, Math.floor(sourceSize.width / aspect));
    for (const [scale, quality] of [[1, 80], [1, 65], [1, 50], [0.75, 60], [0.5, 55]]) {
      const outputHeight = Math.max(1, Math.round(maxHeight * scale));
      const resized = source.clone().autoOrient().resize({
        width: outputHeight * aspect, height: outputHeight, fit: 'cover',
      });
      const output = await resized.webp({ quality, alphaQuality: quality }).toBuffer();
      if (output.length <= maxBytes) return output;
    }
  } catch (error) {
    if (error instanceof ProfileImageInputError) throw error;
    throw new ProfileImageInputError('No pudimos leer la imagen. Revisá que sea válida y tenga hasta 24 megapíxeles.', 422);
  }
  throw new ProfileImageInputError('No pudimos reducir el tamaño de esta imagen. Probá con otra.', 422);
}
