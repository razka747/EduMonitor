'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/app/lib/store';
import { enforceDemoLimit } from '@/app/lib/demoLimit';
import DemoQuotaBadge from '@/app/components/DemoQuotaBadge';
import {
  ScanSearch, Upload, Trash2, Play, Download, CheckCircle2,
  AlertTriangle, XCircle, Edit3, Save, Loader2, FileImage, X
} from 'lucide-react';

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

interface EditableResult extends ExamResult {
  isEditing: boolean;
  editScore: number;
  editName: string;
  editClass: string;
  editCorrect: number;
  reviewed: boolean;
}

export default function ExamCheckerPage() {
  const { currentUser, addGrade } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [subject, setSubject] = useState('Matematika');
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [passingScore, setPassingScore] = useState(70);
  const [results, setResults] = useState<EditableResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'results'>('upload');
  
  const [examType, setExamType] = useState('Ujian Harian');
  const [paperType, setPaperType] = useState('LJK');
  const [answerKey, setAnswerKey] = useState('');
  const examTypesList = ['Ujian Harian', 'Tengah Semester', 'Awal Semester', 'Akhir Semester'];

  if (!currentUser) return null;
  const isAllowed = currentUser.role === 'admin' || currentUser.role === 'teacher';
  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted text-lg">Halaman ini hanya untuk Guru dan Admin.</p>
      </div>
    );
  }

  const subjectsList = ['Matematika','Bahasa Indonesia','Bahasa Inggris','IPA','IPS','Seni Budaya','Pendidikan Agama','PJOK','Lainnya'];

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles).slice(0, 50 - files.length);
    const valid = arr.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (valid.length === 0) { setError('Format file tidak didukung. Gunakan JPG, PNG, atau PDF.'); return; }
    setError('');
    setFiles(prev => [...prev, ...valid]);
    valid.forEach(f => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string]);
        reader.readAsDataURL(f);
      } else {
        setPreviews(prev => [...prev, '']);
      }
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const analyzeExams = async () => {
    if (files.length === 0) { setError('Upload minimal 1 file.'); return; }
    try {
      enforceDemoLimit(currentUser, 'exam_checker', 'Koreksi Ujian AI');
    } catch (e: any) {
      setError(e.message);
      return;
    }
    setIsAnalyzing(true); setError(''); setProgress(0);

    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('totalQuestions', String(totalQuestions));
    formData.append('passingScore', String(passingScore));
    formData.append('answerKey', answerKey);
    formData.append('paperType', paperType);
    files.forEach((f, i) => formData.append(`file_${i}`, f));

    try {
      const res = await fetch('/api/analyze-exam', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menganalisis.');

      const editableResults: EditableResult[] = (data.results || []).map((r: ExamResult) => ({
        ...r, isEditing: false, editScore: r.score, editName: r.studentName,
        editClass: r.studentClass, editCorrect: r.correctAnswers, reviewed: false,
      }));
      setResults(editableResults);
      setStep('results');
      
      // Langsung masuk ke nilai akademik (auto-save)
      for (const res of editableResults) {
        const invalidNames = ['Tidak Terbaca', 'Gagal Membaca', 'Tanpa Nama', '-'];
        const isValidName = res.studentName && !invalidNames.includes(res.studentName);
        
        if (isValidName && res.studentClass) {
          addGrade({
            studentName: res.studentName,
            studentClass: res.studentClass,
            subject: subject,
            type: examType as any,
            score: res.score,
            date: new Date().toISOString().split('T')[0],
            createdBy: currentUser!.name
          });
        }
      }

      if (data.errors?.length > 0) {
        setError(`${data.errors.length} file gagal diproses. Detail: ${data.errors[0].error}`);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsAnalyzing(false); setProgress(100);
    }
  };

  const toggleEdit = (idx: number) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, isEditing: !r.isEditing } : r));
  };

  const saveEdit = (idx: number) => {
    setResults(prev => prev.map((r, i) => i === idx ? {
      ...r, studentName: r.editName, studentClass: r.editClass,
      correctAnswers: r.editCorrect,
      score: totalQuestions > 0 ? Math.round((r.editCorrect / totalQuestions) * 100) : r.editScore,
      isEditing: false, reviewed: true,
    } : r));
  };

  const updateEdit = (idx: number, field: string, val: any) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  const markReviewed = (idx: number) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, reviewed: !r.reviewed } : r));
  };

  const downloadExcel = () => {
    // Build CSV with BOM for Excel compatibility
    const BOM = '\uFEFF';
    const header = ['No','Nama Siswa','Kelas','Mata Pelajaran','Jumlah Soal','Jawaban Benar','Nilai','Status','Keterangan'];
    const rows = results.map((r, i) => [
      i + 1, r.studentName, r.studentClass, r.subject, r.totalQuestions,
      r.correctAnswers, r.score,
      r.score >= passingScore ? 'LULUS' : 'TIDAK LULUS',
      r.details
    ]);
    const csv = BOM + [header, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hasil_Ujian_${subject}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avgScore = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0;
  const passCount = results.filter(r => r.score >= passingScore).length;
  const failCount = results.length - passCount;

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'bg-green-100 text-green-700 border-green-200';
    if (c === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // === UPLOAD STEP ===
  if (step === 'upload') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScanSearch className="w-6 h-6 text-primary" /> Pemeriksa Ujian AI
          </h1>
          <p className="text-sm text-muted mt-1">Upload foto lembar jawaban, AI akan menganalisis dan memberikan nilai otomatis.</p>
        </div>

        {/* Settings Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-foreground mb-4">Pengaturan Ujian</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-muted">Mata Pelajaran</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30">
                {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-muted">Jenis Ujian</label>
              <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30">
                {examTypesList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-muted">Tipe Kertas</label>
              <select value={paperType} onChange={e => setPaperType(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30">
                <option value="LJK">Lembar Jawaban (LJK)</option>
                <option value="SOAL">Lembar Soal (Langsung disilang)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-muted">Jumlah Soal</label>
              <input type="number" min={1} max={200} value={totalQuestions} onChange={e => setTotalQuestions(Number(e.target.value))} className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-muted">KKM (Nilai Minimum Lulus)</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="md:col-span-3 lg:col-span-5">
              <label className="block text-xs font-semibold mb-1.5 text-muted">Kunci Jawaban (Opsional, pisahkan dengan koma atau spasi)</label>
              <textarea value={answerKey} onChange={e => setAnswerKey(e.target.value)} rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Contoh: A, B, C, D, A, C..." />
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-foreground mb-4 flex items-center justify-between">
            <span>Upload Lembar Jawaban</span>
            <span className="text-xs font-medium text-muted">{files.length}/50 file</span>
          </h3>
          <div
            className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
          >
            <Upload className="w-12 h-12 mx-auto text-primary/40 mb-3" />
            <p className="text-sm font-medium text-foreground">Klik atau seret file ke sini</p>
            <p className="text-xs text-muted mt-1">Mendukung JPG, PNG, PDF • Maks 50 file sekaligus</p>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>

          {/* File Previews */}
          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {files.map((f, i) => (
                <div key={i} className="relative group rounded-xl border border-border overflow-hidden bg-surface-hover aspect-square">
                  {previews[i] ? (
                    <img src={previews[i]} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-2">
                      <FileImage className="w-8 h-8 text-muted mb-1" />
                      <span className="text-[10px] text-muted truncate w-full text-center">{f.name}</span>
                    </div>
                  )}
                  <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1 rounded-full bg-danger text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                    <span className="text-[9px] text-white truncate block">{f.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

        <button onClick={analyzeExams} disabled={isAnalyzing || files.length === 0}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Menganalisis {files.length} file...</> : <><Play className="w-5 h-5" /> Mulai Analisis ({files.length} file)</>}
        </button>
      </div>
    );
  }

  // === RESULTS STEP ===
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScanSearch className="w-6 h-6 text-primary" /> Hasil Pemeriksaan Ujian
          </h1>
          <p className="text-sm text-muted mt-1">{subject} — {results.length} siswa dianalisis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setStep('upload'); setResults([]); }} className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-surface-hover transition-colors">
            ← Kembali
          </button>
          <button onClick={downloadExcel} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Download Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Total Siswa</p>
          <p className="text-2xl font-bold text-foreground mt-1">{results.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-medium">Rata-rata Nilai</p>
          <p className={`text-2xl font-bold mt-1 ${avgScore >= passingScore ? 'text-blue-600' : 'text-slate-700'}`}>{avgScore}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-blue-600 font-medium">Lulus (≥{passingScore})</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{passCount}</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-slate-600 font-medium">Tidak Lulus</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{failCount}</p>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-yellow-50 text-yellow-700 text-sm font-medium flex items-center gap-2 border border-yellow-200"><AlertTriangle className="w-4 h-4" />{error}</div>}

      {/* Results Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-surface-hover/50 flex items-center justify-between">
          <h3 className="font-bold text-foreground">Detail Nilai Siswa</h3>
          <p className="text-xs text-muted">Klik ✏️ untuk mengedit nilai sebelum download</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-hover border-b border-border text-xs text-muted">
                <th className="p-3 font-semibold w-10">No</th>
                <th className="p-3 font-semibold">Nama Siswa</th>
                <th className="p-3 font-semibold">Kelas</th>
                <th className="p-3 font-semibold text-center">Benar</th>
                <th className="p-3 font-semibold text-center">Nilai</th>
                <th className="p-3 font-semibold text-center">Status</th>
                <th className="p-3 font-semibold text-center">Akurasi AI</th>
                <th className="p-3 font-semibold text-center">Review</th>
                <th className="p-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={`border-b border-border last:border-0 hover:bg-surface-hover transition-colors ${r.reviewed ? 'bg-green-50/30' : ''}`}>
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3 font-medium">
                    {r.isEditing ? (
                      <input value={r.editName} onChange={e => updateEdit(i, 'editName', e.target.value)}
                        className="w-full px-2 py-1 text-sm rounded-lg border border-primary/40 bg-background outline-none" />
                    ) : r.studentName}
                  </td>
                  <td className="p-3">
                    {r.isEditing ? (
                      <input value={r.editClass} onChange={e => updateEdit(i, 'editClass', e.target.value)}
                        className="w-20 px-2 py-1 text-sm rounded-lg border border-primary/40 bg-background outline-none" />
                    ) : r.studentClass}
                  </td>
                  <td className="p-3 text-center">
                    {r.isEditing ? (
                      <input type="number" min={0} max={totalQuestions} value={r.editCorrect}
                        onChange={e => updateEdit(i, 'editCorrect', Number(e.target.value))}
                        className="w-16 px-2 py-1 text-sm rounded-lg border border-primary/40 bg-background outline-none text-center" />
                    ) : <span>{r.correctAnswers}/{r.totalQuestions}</span>}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${r.score >= passingScore ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.score}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${r.score >= passingScore ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.score >= passingScore ? 'LULUS' : 'TIDAK LULUS'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${confidenceColor(r.confidence)}`}>
                      {r.confidence === 'high' ? 'Tinggi' : r.confidence === 'medium' ? 'Sedang' : 'Rendah'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => markReviewed(i)} title="Tandai sudah direview">
                      {r.reviewed ? <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" /> : <div className="w-5 h-5 rounded-full border-2 border-muted mx-auto" />}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    {r.isEditing ? (
                      <button onClick={() => saveEdit(i)} className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors inline-flex" title="Simpan">
                        <Save className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => toggleEdit(i)} className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors inline-flex" title="Edit">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted">Belum ada hasil.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
