
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserRole, Task, TaskStatus, Project, User, ProjectStatus, 
  ROLE_LABELS, APP_VERSION, AppSnapshot, GlobalChatMessage 
} from './types.ts';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectView } from './components/ProjectView.tsx';
import { ProjectForm } from './components/ProjectForm.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { GlobalChat } from './components/GlobalChat.tsx';
import { Logo } from './components/Logo.tsx';
import { 
  LayoutGrid, LogOut, RefreshCw, MessageSquare, Settings, Plus, ShieldCheck, Building2,
  CheckCircle2, Cloud, WifiOff, Zap, AlertCircle
} from 'lucide-react';

export const STORAGE_KEYS = {
  AUTH_USER: 'zodchiy_auth_session_stable_v1',
  GH_CONFIG: 'zodchiy_cloud_config_stable_v1'
};

const DB_NAME = 'ZodchiyDB';
const STORE_NAME = 'appState';
const DB_VERSION = 3;

const idb = {
  db: null as IDBDatabase | null,
  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => { this.db = request.result; resolve(request.result); };
      request.onerror = () => reject(request.error);
    });
  },
  async get(key: string): Promise<any> {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  },
  async set(key: string, value: any): Promise<void> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) { console.error("IDB Set Error", e); }
  }
};

const encodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))));
const decodeUnicode = (str: string) => decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

const cloud = {
  isSyncing: false,
  getConfig: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.GH_CONFIG) || 'null');
    } catch { return null; }
  },
  
  sync: async (local: AppSnapshot): Promise<AppSnapshot | null> => {
    if (cloud.isSyncing) return null;
    const config = cloud.getConfig();
    if (!config?.token || !config?.repo) return null;

    cloud.isSyncing = true;
    const url = `https://api.github.com/repos/${config.repo}/contents/${config.path || 'db.json'}`;
    const headers = { 'Authorization': `Bearer ${config.token.trim()}`, 'Accept': 'application/vnd.github.v3+json' };

    try {
      const getRes = await fetch(url, { headers, cache: 'no-store' });
      let cloudDb: AppSnapshot | null = null;
      let sha = "";

      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
        const decoded = decodeUnicode(data.content);
        cloudDb = JSON.parse(decoded);
      }

      // Функция безопасного слияния: берем всё из обоих источников, 
      // при конфликте ID оставляем тот, у которого новее дата изменения
      const merge = (l: any[] = [], c: any[] = []) => {
        const map = new Map();
        // Сначала облако, потом локал (локал может быть новее)
        [...(c || []), ...(l || [])].forEach(item => {
          if (!item?.id) return;
          const ex = map.get(item.id);
          const itemDate = new Date(item.updatedAt || item.createdAt || 0).getTime();
          const exDate = ex ? new Date(ex.updatedAt || ex.createdAt || 0).getTime() : -1;
          
          if (!ex || itemDate > exDate) {
            map.set(item.id, item);
          }
        });
        return Array.from(map.values());
      };

      const final: AppSnapshot = {
        ...local,
        users: merge(local.users, cloudDb?.users),
        projects: merge(local.projects, cloudDb?.projects),
        tasks: merge(local.tasks, cloudDb?.tasks),
        chatMessages: merge(local.chatMessages, cloudDb?.chatMessages),
        lastSync: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      // Сохраняем объединенную версию обратно в облако
      const content = encodeUnicode(JSON.stringify(final));
      await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Sync ${new Date().toISOString()}`, content, sha: sha || undefined })
      });

      return final;
    } catch (e) {
      console.error("Cloud Sync Error:", e);
      return null;
    } finally {
      cloud.isSyncing = false;
    }
  }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_USER) || 'null');
    } catch { return null; }
  });
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [db, setDb] = useState<AppSnapshot | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local_only'>('synced');
  const [isLoading, setIsLoading] = useState(true);
  
  const syncDebounceRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  const performSync = useCallback(async (current: AppSnapshot) => {
    const config = cloud.getConfig();
    if (!config?.token) {
      setSyncStatus('local_only');
      return;
    }
    setSyncStatus('syncing');
    const result = await cloud.sync(current);
    if (result) {
      setDb(result);
      await idb.set('state', result);
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
  }, []);

  // 1. Загрузка данных при старте
  useEffect(() => {
    const init = async () => {
      // Пытаемся достать локальную базу
      const saved = await idb.get('state');
      let currentDb: AppSnapshot;
      
      if (saved && saved.projects) {
        currentDb = saved;
      } else {
        // Дефолтная база, если совсем ничего нет
        currentDb = {
          version: APP_VERSION,
          timestamp: new Date().toISOString(),
          projects: [],
          tasks: [],
          notifications: [],
          chatMessages: [],
          users: [{ id: 1, username: 'Администратор', role: UserRole.ADMIN, password: '123' }]
        };
        await idb.set('state', currentDb);
      }
      
      setDb(currentDb);
      setIsLoading(false);
      
      // Сразу пробуем синхронизироваться с облаком
      performSync(currentDb);
    };
    
    init();
  }, [performSync]);

  // 2. Фоновая проверка обновлений (Polling)
  useEffect(() => {
    const startPolling = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        if (db && syncStatus !== 'syncing' && document.visibilityState === 'visible') {
          performSync(db);
        }
      }, 20000); // Опрос раз в 20 секунд
    };

    startPolling();
    window.addEventListener('focus', () => db && performSync(db));
    return () => clearInterval(pollIntervalRef.current);
  }, [db, performSync, syncStatus]);

  const handleUpdateDB = useCallback((updater: (prev: AppSnapshot) => AppSnapshot) => {
    setDb(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      next.timestamp = new Date().toISOString();
      
      // Локальное сохранение мгновенно
      idb.set('state', next);
      
      // Отложенная отправка в облако
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = setTimeout(() => performSync(next), 2000);
      
      return next;
    });
  }, [performSync]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'admin' | 'settings'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);

  if (isLoading || !db) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Загрузка базы данных...</p>
    </div>
  );

  if (!currentUser) return (
    <LoginPage 
      users={db.users || []} 
      onLogin={(u) => { setCurrentUser(u); setActiveRole(u.role); localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(u)); }} 
      onApplyInvite={(code) => {
        try {
          const decoded = JSON.parse(decodeUnicode(code));
          localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify({ token: decoded.token, repo: decoded.repo, path: decoded.path }));
          window.location.reload();
          return true;
        } catch { return false; }
      }}
      onReset={() => {
        if(confirm("Это полностью очистит локальные данные. Продолжить?")) {
           localStorage.clear();
           indexedDB.deleteDatabase(DB_NAME);
           window.location.reload();
        }
      }}
    />
  );

  const selectedProject = db.projects.find(p => p.id === selectedProjectId);
  const selectedTask = db.tasks.find(t => t.id === selectedTaskId);

  return (
    <div className={`flex flex-col h-full overflow-hidden ${activeRole === UserRole.ADMIN ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
      <header className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-md transition-all ${activeRole === UserRole.ADMIN ? 'bg-slate-900/80 border-slate-800 shadow-lg' : 'bg-white/80 border-slate-100 shadow-sm'}`}>
        <button onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); setActiveTab('dashboard'); }} className="flex items-center gap-3 active:scale-95 transition-transform group">
          <Logo size={32} isMaster={activeRole === UserRole.ADMIN} />
          <div className="text-left">
            <h1 className={`text-xs font-black uppercase tracking-widest leading-none ${activeRole === UserRole.ADMIN ? 'text-white' : 'text-slate-900'}`}>Зодчий</h1>
            <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-blue-600 text-white mt-1 inline-block">{ROLE_LABELS[activeRole]}</span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => db && performSync(db)}
            className={`flex flex-col items-end gap-1 px-3 py-1.5 rounded-xl border transition-all active:scale-90 ${
              syncStatus === 'syncing' ? 'bg-blue-50 border-blue-200 shadow-inner' : 
              syncStatus === 'error' ? 'bg-rose-50 border-rose-200' : 
              syncStatus === 'local_only' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {syncStatus === 'syncing' ? <RefreshCw size={10} className="text-blue-500 animate-spin" /> : 
               syncStatus === 'synced' ? <Zap size={10} className="text-emerald-500 fill-emerald-500" /> : 
               syncStatus === 'local_only' ? <Cloud size={10} className="text-amber-500" /> : <AlertCircle size={10} className="text-rose-500" />}
              <span className={`text-[8px] font-black uppercase tracking-tighter ${
                syncStatus === 'syncing' ? 'text-blue-600' : syncStatus === 'synced' ? 'text-emerald-600' : syncStatus === 'local_only' ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {syncStatus === 'syncing' ? 'СИНХРО...' : syncStatus === 'synced' ? 'ОБЩАЯ БАЗА' : syncStatus === 'local_only' ? 'OFFLINE' : 'СЕТЬ?'}
              </span>
            </div>
            {db.lastSync && <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">{new Date(db.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </button>
          <button onClick={() => { localStorage.removeItem(STORAGE_KEYS.AUTH_USER); setCurrentUser(null); }} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        {selectedTaskId && selectedTask ? (
          <TaskDetails 
            task={selectedTask} role={activeRole} isAdmin={activeRole === UserRole.ADMIN} onClose={() => setSelectedTaskId(null)}
            onStatusChange={(tid, st, file, comm) => handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, status: st, supervisorComment: comm || t.supervisorComment, updatedAt: new Date().toISOString() } : t) }))}
            onAddComment={(tid, txt) => handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, updatedAt: new Date().toISOString(), comments: [...(t.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : t) }))}
            onAddEvidence={(tid, file) => { /* logic */ }}
            onUpdateTask={(ut) => handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === ut.id ? { ...ut, updatedAt: new Date().toISOString() } : t) }))}
          />
        ) : selectedProjectId && selectedProject ? (
          isEditingProject ? (
            <ProjectForm project={selectedProject} onSave={(p) => { handleUpdateDB(prev => ({ ...prev, projects: prev.projects.map(item => item.id === p.id ? { ...p, updatedAt: new Date().toISOString() } : item) })); setIsEditingProject(false); }} onCancel={() => setIsEditingProject(false)} />
          ) : (
            <ProjectView 
              project={selectedProject} tasks={db.tasks.filter(t => t.projectId === selectedProjectId)} currentUser={currentUser} activeRole={activeRole}
              onBack={() => setSelectedProjectId(null)} onEdit={() => setIsEditingProject(true)}
              onAddTask={() => { const nid = Date.now(); handleUpdateDB(prev => ({ ...prev, tasks: [{ id: nid, projectId: selectedProjectId, title: 'Новая задача', description: 'Описание...', status: TaskStatus.TODO, evidenceUrls: [], evidenceCount: 0, comments: [], updatedAt: new Date().toISOString() }, ...prev.tasks] })); setSelectedTaskId(nid); }}
              onSelectTask={setSelectedTaskId} onSendMessage={(txt) => handleUpdateDB(prev => ({ ...prev, projects: prev.projects.map(p => p.id === selectedProjectId ? { ...p, updatedAt: new Date().toISOString(), comments: [...(p.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : p) }))}
            />
          )
        ) : isAddingProject ? (
          <ProjectForm project={{} as Project} onSave={(p) => { const nid = Date.now(); handleUpdateDB(prev => ({ ...prev, projects: [{ ...p, id: nid, status: ProjectStatus.NEW, fileLinks: [], progress: 0, comments: [], updatedAt: new Date().toISOString() }, ...prev.projects] })); setIsAddingProject(false); setSelectedProjectId(nid); }} onCancel={() => setIsAddingProject(false)} />
        ) : (
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <>
                <div className="flex items-center justify-between"><h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Объекты</h2>{activeRole === UserRole.ADMIN && <button onClick={() => setIsAddingProject(true)} className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl active:scale-95 transition-transform"><Plus size={20} /></button>}</div>
                {db.projects.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300"><Building2 size={32}/></div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Объектов пока нет</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {db.projects.map(p => (
                      <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-500 cursor-pointer transition-all active:scale-[0.98]">
                        <div className="flex gap-4 mb-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Building2 size={24} /></div>
                          <div><h3 className="text-base font-black text-slate-800 uppercase leading-tight">{p.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{p.address}</p></div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50"><span className="text-[10px] font-black text-blue-600 uppercase">Прогресс: {p.progress}%</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {activeTab === 'chat' && <GlobalChat messages={db.chatMessages || []} currentUser={currentUser} currentRole={activeRole} onSendMessage={(txt) => handleUpdateDB(prev => ({...prev, chatMessages: [...(prev.chatMessages || []), {id: Date.now(), userId: currentUser.id, username: currentUser.username, role: activeRole, text: txt, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString()}]}))} />}
            {activeTab === 'admin' && activeRole === UserRole.ADMIN && <AdminPanel users={db.users} onUpdateUsers={(users) => handleUpdateDB(prev => ({ ...prev, users }))} currentUser={currentUser} activeRole={activeRole} onRoleSwitch={setActiveRole} />}
            {activeTab === 'settings' && <BackupManager currentUser={currentUser} currentDb={db} onDataImport={(data) => { handleUpdateDB(() => data); performSync(data); }} />}
          </div>
        )}
      </main>

      {!selectedProjectId && !selectedTaskId && !isAddingProject && (
        <nav className={`fixed bottom-0 left-0 right-0 p-4 pb-8 border-t flex justify-around backdrop-blur-lg z-50 transition-colors ${activeRole === UserRole.ADMIN ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}><LayoutGrid size={22} /><span className="text-[8px] font-black uppercase">Объекты</span></button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'chat' ? 'text-indigo-500' : 'text-slate-400'}`}><MessageSquare size={22} /><span className="text-[8px] font-black uppercase">Команда</span></button>
          {activeRole === UserRole.ADMIN && <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'admin' ? 'text-amber-500' : 'text-slate-400'}`}><ShieldCheck size={22} /><span className="text-[8px] font-black uppercase">Админ</span></button>}
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'settings' ? 'text-slate-600' : 'text-slate-400'}`}><Settings size={22} /><span className="text-[8px] font-black uppercase">Облако</span></button>
        </nav>
      )}

      {selectedProjectId && <AIAssistant projectContext={`Проект: ${selectedProject?.name}.`} />}
    </div>
  );
};

export default App;
