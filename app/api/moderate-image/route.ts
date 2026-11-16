import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const NSFW_FILENAME_PATTERN =
  /\b(nsfw|porn|xxx|nude|naked|sex|hentai|boobs|tits|ass|dick|pussy|bokep|bugil|telanjang|18\+|onlyfans|erotic|lewd)\b/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, fileName = '' } = body as {
      imageBase64?: string;
      fileName?: string;
    };

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { safe: false, reason: 'Data gambar tidak valid.' },
        { status: 400 }
      );
    }

    // 1. Cek nama file terhadap kata kunci 18+ / tidak senonoh
    if (NSFW_FILENAME_PATTERN.test(fileName)) {
      return NextResponse.json({
        safe: false,
        reason: 'Nama file terdeteksi mengandung unsur tidak pantas / 18+.',
      });
    }

    // Ekstrak mimeType dan base64 murni dari Data URL
    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const rawBase64 = match ? match[2] : imageBase64;

    // 2. Jika GEMINI_API_KEY tersedia, gunakan AI Vision Safety Moderation
    if (GEMINI_API_KEY) {
      const prompt = `Kamu adalah moderator keamanan konten untuk aplikasi sekolah (EduMonitor).
Periksa apakah gambar yang diunggah ini layak dijadikan foto profil di lingkungan sekolah.

TOLAK gambar (safe: false) jika mengandung SALAH SATU unsur berikut:
1. Konten 18+, pornografi, ketelanjangan (nudity/semi-nudity), pakaian dalam saja, atau pose seksual/tidak senonoh.
2. Konten vulgar, gestur jari tengah / kasar, kekerasan ekstrem / darah (gore), narkoba, atau simbol kebencian.
3. Ilustrasi/anime/kartun erotis (hentai/ecchi/lewd).

TERIMA gambar (safe: true) jika berupa:
- Foto wajah/potret normal, foto formal/santai yang sopan, foto bersama keluarga/teman yang sopan, avatar/ilustrasi sopan, pemandangan, hewan, atau logo yang pantas.

Balas HANYA dengan JSON murni tanpa markdown:
{
  "safe": true atau false,
  "reason": "alasan singkat dalam bahasa Indonesia jika ditolak, atau kosong jika aman"
}`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: rawBase64,
                  },
                },
              ],
            },
          ],
          safetySettings: [
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_LOW_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Jika diblokir langsung oleh safety filter Gemini
        const promptBlock = data?.promptFeedback?.blockReason;
        const candidate = data?.candidates?.[0];
        const finishReason = candidate?.finishReason;

        if (
          promptBlock ||
          finishReason === 'SAFETY' ||
          finishReason === 'PROHIBITED_CONTENT' ||
          finishReason === 'BLOCKLIST'
        ) {
          return NextResponse.json({
            safe: false,
            aiChecked: true,
            reason: 'Foto terdeteksi mengandung konten tidak senonoh / 18+ oleh sistem keamanan.',
          });
        }

        // Cek safetyRatings pada kandidat
        const safetyRatings = candidate?.safetyRatings;
        if (Array.isArray(safetyRatings)) {
          const explicitRating = safetyRatings.find(
            (r: any) =>
              r.category === 'HARM_CATEGORY_SEXUALLY_EXPLICIT' &&
              (r.probability === 'MEDIUM' || r.probability === 'HIGH' || r.blocked === true)
          );
          if (explicitRating) {
            return NextResponse.json({
              safe: false,
              aiChecked: true,
              reason: 'Foto terdeteksi mengandung unsur seksual / 18+ yang tidak diizinkan.',
            });
          }
        }

        const textReply: string =
          candidate?.content?.parts?.map((p: any) => p.text || '').join('') || '';
        const cleaned = textReply.replace(/```json|```/g, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          if (parsed && typeof parsed.safe === 'boolean') {
            return NextResponse.json({
              safe: parsed.safe,
              aiChecked: true,
              reason:
                parsed.reason ||
                (parsed.safe
                  ? ''
                  : 'Foto tidak memenuhi standar kesopanan profil sekolah.'),
            });
          }
        } catch {
          // Jika gagal parse JSON tetapi teks eksplisit menyebut false / tidak aman
          if (/"safe"\s*:\s*false/i.test(cleaned)) {
            return NextResponse.json({
              safe: false,
              aiChecked: true,
              reason: 'Foto terdeteksi mengandung konten tidak pantas / 18+.',
            });
          }
        }
      }
    }

    return NextResponse.json({ safe: true, aiChecked: false, reason: '' });
  } catch (err) {
    console.error('Image moderation error:', err);
    return NextResponse.json({ safe: true, aiChecked: false, reason: '' });
  }
}
