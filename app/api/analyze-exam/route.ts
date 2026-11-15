import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

interface ExamResult {
  fileName: string;
  studentName: string;
  studentClass: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  details: string;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

async function fetchWithRetry(url: string, options: any, retries = 5, delay = 5000): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      lastResponse = response;
      let waitTime = delay;
      try {
        const clone = response.clone();
        const errJson = await clone.json();
        const details = errJson?.error?.details;
        if (Array.isArray(details)) {
          const retryInfo = details.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          if (retryInfo && retryInfo.retryDelay) {
            const seconds = parseFloat(retryInfo.retryDelay);
            if (!isNaN(seconds)) {
              waitTime = Math.ceil(seconds * 1000) + 1500; // Tambah buffer 1.5 detik
            }
          }
        }
      } catch (e) {
        // Gagal mengurai, gunakan default backoff
      }

      console.warn(`[Gemini API] Terkena batas limit (Rate Limit 429). Mencoba kembali dalam ${waitTime}ms... (Percobaan ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      delay *= 2; // exponential backoff
      continue;
    }
    return response;
  }
  return lastResponse || fetch(url, options);
}

async function analyzeFileWithGemini(
  fileData: string,
  mimeType: string,
  fileName: string,
  examInfo: { subject: string; totalQuestions: number; passingScore: number; answerKey?: string; paperType: string }
): Promise<ExamResult> {
  const prompt = `Kamu adalah asisten pemeriksa ujian sekolah yang sangat teliti.
Analisis gambar berikut dengan cermat.

Informasi Ujian:
- Mata Pelajaran: ${examInfo.subject}
- Jumlah Soal: ${examInfo.totalQuestions}
- Nilai KKM/Passing Score: ${examInfo.passingScore}
${examInfo.answerKey ? `- KUNCI JAWABAN: ${examInfo.answerKey}` : ''}
- Tipe Kertas: ${examInfo.paperType === 'SOAL' ? 'Lembar Soal (Siswa menyilang langsung pada lembaran soal)' : 'Lembar Jawaban Komputer (LJK)'}

Tugas kamu:
1. Identifikasi NAMA SISWA. ${examInfo.paperType === 'SOAL' ? 'Jika ini Lembar Soal dan tidak ada nama siswa tertulis, maka kembalikan "Tanpa Nama". JANGAN gagal hanya karena tidak ada nama.' : 'Biasanya di bagian atas/header lembar jawaban.'}
2. Identifikasi KELAS siswa (jika ada).
3. Evaluasi jawaban siswa:
   ${examInfo.paperType === 'SOAL' ? '-> Perhatikan tanda silang (X) atau lingkaran yang dibuat siswa langsung pada pilihan ganda A,B,C,D di teks soal.' : '-> Perhatikan bulatan/silang pada lembar jawaban khusus.'}
   ${examInfo.answerKey ? '-> COCOKKAN pilihan ganda siswa dengan KUNCI JAWABAN di atas.' : '-> Karena tidak ada kunci jawaban, evaluasi kebenaran jawaban berdasarkan analisis gambar teks soal dan pengetahuanmu.'}
4. Hitung jumlah jawaban BENAR.
5. Hitung jumlah jawaban SALAH / kosong.
6. Berikan analisis singkat.

Jika tidak dapat membaca dengan jelas, berikan perkiraan terbaik dan tandai dengan confidence rendah.

PENTING: KAMU TIDAK BOLEH MEMBALAS DENGAN TEKS APAPUN SELAIN JSON. JIKA TIDAK ADA KUNCI JAWABAN, TEBAK SAJA JAWABANNYA.

Format respons HARUS dalam JSON murni berikut (jangan tambahkan teks markdown seperti \`\`\`json):
{
  "studentName": "nama siswa atau 'Tidak Terbaca'",
  "studentClass": "kelas atau 'Tidak Terbaca'",
  "correctAnswers": 0,
  "totalAnswered": 0,
  "details": "deskripsi singkat hasil pemeriksaan",
  "confidence": "high | medium | low",
  "rawText": "teks yang berhasil dibaca dari lembar jawaban"
}`;

  const response = await fetchWithRetry(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
                data: fileData,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ]
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini Error:", errText);
    // Provide a user-friendly message for quota errors
    if (response.status === 429) {
      throw new Error(
        'Kuota Gemini API telah habis. Silakan tunggu beberapa saat (biasanya reset dalam 1 menit atau coba lagi besok), atau aktifkan billing di Google AI Studio untuk kuota yang lebih besar.'
      );
    }
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse JSON from Gemini response
  let parsed: any = {};
  try {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Regex tidak menemukan objek JSON.");
    }
  } catch (err: any) {
    console.error("Gemini JSON Parse Error:", err.message);
    console.error("Raw Gemini Output:", textContent);
    // If parsing fails, extract what we can
    parsed = {
      studentName: 'Gagal Membaca',
      studentClass: '-',
      correctAnswers: 0,
      totalAnswered: 0,
      details: 'Gagal mengurai respons AI. Pastikan gambar jelas.',
      confidence: 'low',
      rawText: textContent,
    };
  }

  const correctAnswers = Math.max(0, Math.min(parsed.correctAnswers || 0, examInfo.totalQuestions));
  const score = examInfo.totalQuestions > 0
    ? Math.round((correctAnswers / examInfo.totalQuestions) * 100)
    : 0;

  return {
    fileName,
    studentName: parsed.studentName || 'Tidak Terbaca',
    studentClass: parsed.studentClass || '-',
    subject: examInfo.subject,
    totalQuestions: examInfo.totalQuestions,
    correctAnswers,
    score,
    details: parsed.details || '',
    rawText: parsed.rawText || textContent,
    confidence: parsed.confidence || 'low',
  };
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return Response.json(
      { error: 'GEMINI_API_KEY belum dikonfigurasi di .env.local' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const subject = (formData.get('subject') as string) || 'Umum';
    const totalQuestions = parseInt((formData.get('totalQuestions') as string) || '10', 10);
    const passingScore = parseInt((formData.get('passingScore') as string) || '70', 10);
    const answerKey = (formData.get('answerKey') as string) || '';
    const paperType = (formData.get('paperType') as string) || 'LJK';

    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return Response.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }
    if (files.length > 50) {
      return Response.json({ error: 'Maksimal 50 file dalam sekali analisis.' }, { status: 400 });
    }

    // Process each file
    const results: ExamResult[] = [];
    const errors: { fileName: string; error: string }[] = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'image/jpeg';

        const result = await analyzeFileWithGemini(base64, mimeType, file.name, {
          subject,
          totalQuestions,
          passingScore,
          answerKey,
          paperType,
        });
        results.push(result);
      } catch (err: any) {
        errors.push({ fileName: file.name, error: err.message });
      }
    }

    return Response.json({ results, errors, total: files.length });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
