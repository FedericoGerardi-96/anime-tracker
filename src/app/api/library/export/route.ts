import { NextRequest, NextResponse } from 'next/server';
import { readLibraryExport } from '@/services/library-export';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source');
  if (source !== 'library' && source !== 'hentai') return NextResponse.json({ error: 'Elegí una colección válida.' }, { status: 400, headers });
  try {
    const data = await readLibraryExport(source);
    if (!data) return NextResponse.json({ error: 'Iniciá sesión para descargar tu colección.' }, { status: 401, headers });
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: 'No pudimos leer toda tu colección. Reintentá la descarga.' }, { status: 500, headers });
  }
}
