import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, Eye, Building2, ChevronRight, Key, Zap, CheckCircle2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { User, UserRole, ROLE_LABELS, APP_VERSION } from '../types.ts';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  onApplyInvite: (code: string) => boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, onApplyInvite }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error' | 'activating'>('idle');
  const [showManualLogin, setShowManualLogin] = useState(false);

  // Проверяем URL на наличие инвайта при монтировании компонента для анимации
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('invite')) {
      setInviteStatus('activating');
    }
  }, []);

  const handleApply = () => {
    if (!inviteCode.trim()) return;
    setInviteStatus('activating');
    
    setTimeout(() => {
      const success = onApplyInvite(inviteCode.trim());
      if (success) {
        setInviteStatus('success');
      } else {
        setInviteStatus('error');
        setTimeout(() => setInviteStatus('idle'), 3000);
      }
    }, 800);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield size={22} />;
      case UserRole.MANAGER: return <Activity size={22} />;
      case UserRole.FOREMAN: return <Users size={22} />;
      case UserRole.SUPERVISOR: return <Eye size={22} />;
    }
  };

  const getRoleTheme = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'from-amber-500 to-orange-600 shadow-amber-200/50';
      case UserRole.MANAGER: return 'from-indigo-500 to-purple-600 shadow-indigo-200/50';
      case UserRole.FOREMAN: return 'from-blue-500 to-cyan-600 shadow-blue-200/50';
      case UserRole.SUPERVISOR: return 'from-emerald-500 to-teal-600 shadow-emerald-200/50';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full blur-[140px]"></div>
      </div>

      <div className="w-full max-w-lg z-10 space-y-8">
        <div className="text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex bg-white/10 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl mb-6 border border-white/10">
            <Building2 size={56} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
            ЗОДЧИЙ <span className="text-blue-500">CORE</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3">
            Enterprise Construction Control
          </p>
        </div>

        {inviteStatus === 'activating' ? (
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-12 shadow-2xl flex flex-col items-center gap-6 animate-pulse">
              <Zap size={48} className="text-yellow-400 animate-bounce" />
              <h2 className="text-white font-black uppercase tracking-widest text-sm text-center">Активация доступа...</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">Подключаем облачный репозиторий</p>
           </div>
        ) : (
          <>
            {/* Секция активации */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl"><Zap size={20} /></div>
                 <div>
                   <h3 className="text-[12px] font-black text-white uppercase tracking-widest leading-none">Вход в систему</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Используйте ссылку или ключ</p>
                 </div>
               </div>
               
               <div className="space-y-4">
                 <div className="relative">
                   <input 
                     type="text" 
                     value={inviteCode}
                     onChange={(e) => setInviteCode(e.target.value)}
                     placeholder="Вставьте ключ доступа..."
                     className={`w-full bg-white/5 border ${inviteStatus === 'error' ? 'border-rose-500 shadow-rose-500/20' : 'border-white/10'} rounded-[1.5rem] px-6 py-5 text-sm font-bold text-white outline-none placeholder:text-white/20 transition-all focus:bg-white/10 focus:border-blue-500/50`}
                   />
                   {inviteStatus === 'success' && <CheckCircle2 className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-400" size={24} />}
                   {inviteStatus === 'error' && <AlertTriangle className="absolute right-5 top-1/2 -translate-y-1/2 text-rose-400" size={24} />}
                 </div>
                 <button 
                   onClick={handleApply}
                   disabled={!inviteCode.trim()}
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                 >
                   Активировать
                   <ChevronRight size={18} />
                 </button>
               </div>
               
               {inviteStatus === 'error' && (
                 <p className="text-[9px] font-black text-rose-400 mt-4 uppercase text-center tracking-[0.2em] animate-in slide-in-from-top-2">Ключ не прошел проверку системы</p>
               )}

               <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                 <div className="flex items-center gap-2 text-slate-500">
                    <LinkIcon size={14} />
                    <p className="text-[9px] font-bold uppercase tracking-widest">Ожидайте ссылку от администратора</p>
                 </div>
               </div>
            </div>

            {/* Скрытый вход для Админа / Разработчика */}
            <div className="flex flex-col items-center">
              {!showManualLogin ? (
                <button 
                  onClick={() => setShowManualLogin(true)}
                  className="text-slate-600 hover:text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
                >
                  Ручной выбор роли
                </button>
              ) : (
                <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-4 px-4">
                    <div className="h-[1px] flex-1 bg-white/5"></div>
                    <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.3em]">Авторизация персонала</p>
                    <div className="h-[1px] flex-1 bg-white/5"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {users.map((user) => (
                      <button 
                        key={user.id}
                        onClick={() => onLogin(user)}
                        className="group relative flex items-center gap-4 p-1.5 bg-white/5 backdrop-blur-md rounded-[1.8rem] border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-[0.98] text-left"
                      >
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getRoleTheme(user.role)} flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-105 shrink-0`}>
                          {getRoleIcon(user.role)}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="text-sm font-black text-slate-100 leading-none mb-1.5 truncate uppercase tracking-tight">{user.username}</h3>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{ROLE_LABELS[user.role]}</p>
                        </div>
                        <div className="pr-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                          <ChevronRight className="text-slate-100/30" size={20} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="pt-8 text-center border-t border-white/5">
           <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Zodchiy Enterprise • v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
};