
import React, { useState, useEffect } from 'react';
import { Database, Github, Download, Upload, Package, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { User, GithubConfig, APP_VERSION, AppSnapshot } from '../types.ts';
import { STORAGE_KEYS } from '../App.tsx';

interface BackupManagerProps {
  currentUser?: User | null;
  onDataImport?: (data: any) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser, onDataImport }) => {
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'zodchiy_db.json' };
    } catch { return { token: '', repo: '', path: 'zodchiy_db.json' }; }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const getSnapshotData = (): AppSnapshot => ({
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    projects: JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]'),
    tasks: JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'),
    users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
    config: ghConfig
  });

  const createSnapshotFile = () => {
    const data = getSnapshotData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZODCHIY_LOCAL_v${APP_VERSION}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePushToGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo || !ghConfig.repo.includes('/')) {
      alert("Укажите Token и Repo в формате 'пользователь/репозиторий'");
      setShowAdvanced(true);
      return;
    }

    setIsSyncing(true);
    try {
      const data = getSnapshotData();
      const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      
      // 1. Пытаемся получить текущий файл, чтобы узнать его SHA (необходим для обновления)
      let sha = "";
      const getRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` }
      });
      
      if (getRes.ok) {
        const existingFile = await getRes.json();
        sha = existingFile.sha;
      }

      // 2. Отправляем (создаем или обновляем) файл
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ghConfig.token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Sync Zodchiy DB v${APP_VERSION} [auto]`,
          content: contentBase64,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        alert("✅ Данные успешно сохранены в Облако GitHub!");
      } else {
        const error = await putRes.json();
        throw new Error(error.message || "Ошибка API");
      }
    } catch (e: any) {
      alert(`❌ Ошибка сохранения: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Настройте параметры GitHub Sync");
      setShowAdvanced(true);
      return;
    }

    setIsSyncing(true);
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${ghConfig.token.trim()}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
        
        if (onDataImport) {
          onDataImport(content);
          alert("✅ Данные из Облака успешно загружены и применены!");
        }
      } else {
        alert("❌ Файл не найден в репозитории или доступ запрещен");
      }
    } catch (e) {
      alert("❌ Ошибка при чтении данных");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 px-1 animate-in fade-in">
      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-slate-100 shadow-2xl border border-white/5 overflow-hidden relative">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Database size={24} className="text-slate-100" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight leading-none text-slate-100">Облако v{APP_VERSION}</h2>
              <span className={`text-[9px] font-black uppercase tracking-widest mt-1 block ${ghConfig.token ? 'text-emerald-400' : 'text-amber-400'}`}>
                {ghConfig.token ? 'GitHub Sync настроен' : 'Требуется настройка'}
              </span>
            </div>
          </div>
          {isSyncing && <RefreshCw size={20} className="text-blue-400 animate-spin" />}
        </div>
        
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button 
            onClick={handlePullFromGithub} 
            disabled={isSyncing}
            className="flex flex-col items-center gap-3 bg-white/5 py-6 rounded-3xl border border-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download size={24} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">Загрузить</span>
          </button>
          <button 
            onClick={handlePushToGithub}
            disabled={isSyncing}
            className="flex flex-col items-center gap-3 bg-blue-600 py-6 rounded-3xl transition-all active:scale-95 disabled:opacity-50"
          >
            <Upload size={24} className="text-slate-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">Сохранить</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Локальная архивация</h4>
        <button 
          onClick={createSnapshotFile}
          className="w-full flex items-center justify-between p-5 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <Package size={20} className="text-blue-500" />
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-widest block">Скачать файл JSON</span>
              <span className="text-[8px] font-bold opacity-60 uppercase">Резервная копия на телефон</span>
            </div>
          </div>
          <Download size={18} />
        </button>
      </div>
      
      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Github size={14} /> GitHub Settings
          </h4>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[9px] font-black text-blue-600 uppercase">
            {showAdvanced ? 'Скрыть' : 'Настроить'}
          </button>
        </div>
        
        {showAdvanced && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Персональный токен (PAT)</label>
              <input 
                type="password" 
                value={ghConfig.token}
                onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="ghp_xxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Репозиторий (User/Repo)</label>
              <input 
                type="text" 
                value={ghConfig.repo}
                onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="например: ivanov/zodchiy-data"
              />
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <p className="text-[9px] font-bold text-amber-800 leading-relaxed uppercase">
                Важно: Репозиторий должен быть предварительно создан на GitHub вручную. Токен должен иметь права 'repo'.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
