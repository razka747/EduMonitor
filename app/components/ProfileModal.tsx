'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import {
  X, Camera, Trash2, KeyRound, Eye, EyeOff, Shield,
  CheckCircle, User, Mail, Save, AlertCircle, Sun, Moon, Check
} from 'lucide-react';
import { useTheme } from '@/app/lib/theme';
import { isDemoUser } from '@/app/lib/demoLimit';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { currentUser, updateUserProfile, updatePassword } = useAppStore();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setAvatar(currentUser.avatar || null);
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const initials = (name || currentUser.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format file harus berupa gambar (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Ukuran file terlalu besar. Maksimal 3 MB.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 400x400 to keep database payload light and fast
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(compressed);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    const isDemo = isDemoUser(currentUser);

    if (newPassword) {
      if (isDemo) {
        setErrorMsg('Akun demo tidak dapat mengganti kata sandi.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('Kata sandi baru minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Konfirmasi kata sandi tidak cocok.');
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Update Profile (Name & Avatar)
      await updateUserProfile(currentUser.id, {
        name: trimmedName,
        avatar: avatar ?? undefined,
      });

      // 2. Update Password if provided
      if (newPassword) {
        await updatePassword(newPassword);
      }

      setSuccessMsg('Profil dan data akun berhasil disimpan!');
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setErrorMsg(err.message || 'Gagal menyimpan perubahan profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-7 max-h-[92vh] overflow-y-auto animate-fade-in text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Edit Profil & Akun</h2>
          <p className="text-xs text-slate-500 mt-1">Perbarui nama, foto profil, dan kata sandi akun Anda</p>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fade-in font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Avatar Section ── */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            {/* Avatar Circle with pure black background for initials */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-black border-2 border-slate-800 flex items-center justify-center text-white font-bold text-2xl shadow-sm overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt="Foto Profil" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </div>

            {/* Avatar Action Buttons */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <p className="text-xs font-semibold text-slate-800">Foto Profil</p>
              <p className="text-[11px] text-slate-500">
                Pilih foto formal atau foto wajah yang jelas. Maks. 3MB.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {avatar ? 'Ganti Foto' : 'Unggah Foto'}
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-red-600 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Name & Identity Section ── */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all pl-10"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email (Login)
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm outline-none cursor-not-allowed pl-10"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Email akun login dikelola oleh sistem dan tidak dapat diubah sembarangan.</p>
            </div>

            {/* Role Info Pill */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Peran Pengguna</span>
              <span className="font-bold uppercase tracking-wider text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-[10px]">
                {currentUser.role === 'admin'
                  ? 'Administrator'
                  : currentUser.role === 'teacher'
                  ? `Guru ${currentUser.homeClass ? `· Wali Kelas ${currentUser.homeClass}` : ''}`
                  : currentUser.role === 'bk'
                  ? 'Guru BK'
                  : `Orang Tua (${currentUser.childName || 'Siswa'})`}
              </span>
            </div>
          </div>

          {/* ── Integrated Password Reset Section ── */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Ganti Kata Sandi
              </h3>
            </div>

            {isDemoUser(currentUser) ? (
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 flex items-start gap-3">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Penggantian Sandi Dinonaktifkan (Akun Demo)
                  </p>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                    Akun demo tidak dapat mengganti kata sandi demi menjaga akses login tetap tersedia untuk pengguna lainnya.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kosongkan kolom di bawah jika Anda tidak ingin mengubah kata sandi Anda saat ini.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        minLength={6}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Ulangi Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi sandi baru"
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-all pr-10 ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {newPassword && confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-red-500 font-medium">Konfirmasi kata sandi tidak cocok.</p>
                )}
              </>
            )}
          </div>

          {/* ── Pengaturan Tema (Dark / White) ── */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tema Tampilan Aplikasi
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Pilih mode tampilan</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100 font-semibold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Mode Terang (White)</p>
                    <p className="text-[10px] text-slate-400">Tampilan bersih & cerah</p>
                  </div>
                </div>
                {theme === 'light' && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-slate-900 text-white ring-2 ring-blue-400/30 font-semibold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Mode Gelap (Dark)</p>
                    <p className="text-[10px] text-slate-400">Nyaman di mata saat malam</p>
                  </div>
                </div>
                {theme === 'dark' && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
