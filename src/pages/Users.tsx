import React, { useEffect, useState } from 'react';
import { User, Trash2, UserPlus, Shield, Languages, Key, X } from 'lucide-react';
import api from '../api/client';
import { useTranslation } from 'react-i18next';
import { getSortedLanguages } from '../constants/languages';
import ConfirmationModal from '../components/ConfirmationModal';

interface UserData {
  id: number;
  username: string;
  role: string;
  language: string;
}

const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [newLanguage, setNewLanguage] = useState('en');

  const sortedLanguages = getSortedLanguages();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || t('common.loading_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        username: newUsername,
        password: newPassword,
        role: newRole,
        language: newLanguage
      });
      setNewUsername('');
      setNewPassword('');
      setNewRole('viewer');
      setNewLanguage('en');
      setShowAddForm(false);
      setFormError('');
      fetchUsers();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setFormError(errorResponse.response?.data?.message || t('common.create_error'));
    }
  };

  const handleDeleteUser = async (id: number) => {
    setDeletingId(id);
    setIsConfirmationOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (deletingId === null) return;
    try {
      await api.delete(`/users/${deletingId}`);
      fetchUsers();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || t('common.delete_error'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{t('users.management')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('users.management_desc')}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all duration-200 shadow-lg active:scale-95 ${
            showAddForm 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700' 
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
          }`}
        >
          <UserPlus size={20} />
          {showAddForm ? t('common.cancel') : t('users.new_user')}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6">{t('users.create_new')}</h2>
          
          {formError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                  <X size={18} />
                </div>
                <span className="text-sm font-bold text-red-700 dark:text-red-400">{formError}</span>
              </div>
              <button 
                onClick={() => setFormError('')}
                className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('common.username')}</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-slate-900 dark:text-slate-100 font-bold placeholder-slate-300 dark:placeholder-slate-600 outline-none"
                  placeholder={t('users.unique_username')}
                  required
                />
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('common.password')}</label>
              <div className="relative group">
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-slate-900 dark:text-slate-100 font-bold placeholder-slate-300 dark:placeholder-slate-600 outline-none"
                  placeholder="••••••••"
                  required
                />
                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('common.role')}</label>
              <div className="relative group">
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-slate-900 dark:text-slate-100 font-bold outline-none appearance-none cursor-pointer"
                >
                  <option value="admin">{t('common.admin')}</option>
                  <option value="operator">{t('common.operator')}</option>
                  <option value="viewer">{t('common.viewer')}</option>
                </select>
                <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('common.language')}</label>
              <div className="relative group">
                <select 
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-slate-900 dark:text-slate-100 font-bold outline-none appearance-none cursor-pointer"
                >
                  {sortedLanguages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
                <Languages size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors pointer-events-none" />
              </div>
            </div>
            <button 
              type="submit"
              className="bg-slate-900 dark:bg-brand-600 hover:bg-brand-600 dark:hover:bg-brand-700 text-white px-6 py-3.5 rounded-2xl font-black transition-all duration-300 shadow-lg active:scale-95"
            >
              {t('common.save')}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-500/20 font-bold text-sm animate-in shake duration-500">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('common.username')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('common.role')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('common.language')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('common.loading')}</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
                    <User size={48} className="opacity-20" />
                    <span className="text-sm font-bold uppercase tracking-widest">{t('users.no_users')}</span>
                  </div>
                </td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all duration-200">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all duration-200 group-hover:rotate-3 group-hover:scale-110">
                      <User size={20} />
                    </div>
                    <span className="font-black text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{user.username}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                    user.role === 'operator' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {t(`common.${user.role}`)}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Languages size={14} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">{user.language}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={user.username === 'admin'}
                    className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                      user.username === 'admin' 
                        ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-sm'
                    }`}
                    title={t('common.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDeleteUser}
        title={t('common.delete')}
        message={t('users.delete_confirm')}
        variant="danger"
      />
    </div>
  );
};

export default Users;
