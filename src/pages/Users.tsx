import React, { useEffect, useState } from 'react';
import { User, Trash2, UserPlus } from 'lucide-react';
import api from '../api/client';

interface UserData {
  id: number;
  username: string;
  role: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
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
        role: newRole
      });
      setNewUsername('');
      setNewPassword('');
      setNewRole('viewer');
      setShowAddForm(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage administrator and operator accounts</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all duration-200 shadow-lg active:scale-95 ${
            showAddForm 
              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' 
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
          }`}
        >
          <UserPlus size={20} />
          {showAddForm ? 'Cancel' : 'New User'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 animate-in zoom-in-95 duration-300">
          <h2 className="text-xl font-black text-slate-900 mb-6">Create New User</h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <input 
                type="text" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold placeholder-slate-300 outline-none"
                placeholder="Unique username"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold placeholder-slate-300 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold outline-none appearance-none"
              >
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button 
              type="submit"
              className="bg-slate-900 hover:bg-brand-600 text-white px-6 py-3.5 rounded-2xl font-black transition-all duration-300 shadow-lg active:scale-95"
            >
              Create User
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-bold text-sm animate-in shake duration-500">
          {error}
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <User size={48} className="opacity-20" />
                    <span className="text-sm font-bold uppercase tracking-widest">No users found</span>
                  </div>
                </td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl group-hover:bg-brand-50 group-hover:text-brand-600 transition-all duration-200 group-hover:rotate-3 group-hover:scale-110">
                      <User size={20} />
                    </div>
                    <span className="font-black text-slate-900 group-hover:text-brand-700 transition-colors">{user.username}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'operator' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={user.username === 'admin'}
                    className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                      user.username === 'admin' 
                        ? 'text-slate-200 cursor-not-allowed' 
                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-sm'
                    }`}
                    title="Delete User"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
