
import React, { useState } from 'react';
import { Project, User, UserRole, ROLE_LABELS, FileCategory, ProjectFile } from '../types.ts';
import { 
  Building2, 
  Phone, 
  Send, 
  Navigation, 
  Pencil, 
  Plus, 
  ChevronLeft, 
  MessageSquare, 
  FileText, 
  Image as ImageIcon, 
  DraftingCompass, 
  Download,
  FolderOpen,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { ProjectChat } from './ProjectChat.tsx';
import TaskCard from './TaskCard.tsx';
import { FilePreviewer } from './FilePreviewer.tsx';

interface ProjectViewProps {
  project: Project;
  tasks: any[];
  currentUser: User;
  activeRole: UserRole;
  onBack: () => void;
  onEdit: (p: Project) => void;
  onAddTask: () => void;
  onSelectTask: (tid: number) => void;
  onSendMessage: (text: string) => void;
  onAddFile?: (projectId: number, file: File, category: FileCategory) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  tasks,
  currentUser,
  activeRole,
  onBack,
  onEdit,
  onAddTask,
  onSelectTask,
  onSendMessage,
  onAddFile
}) => {
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const canEdit = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;
  
  const filesByCategory = {
    [FileCategory.DRAWING]: project.fileLinks?.filter(f => f.category === FileCategory.DRAWING) || [],
    [FileCategory.DOCUMENT]: project.fileLinks?.filter(f => f.category === FileCategory.DOCUMENT) || [],
    [FileCategory.PHOTO]: project.fileLinks?.filter(f => f.category === FileCategory.PHOTO) || [],
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, category: FileCategory) => {
    const file = e.target.files?.[0];
    if (file && onAddFile) {
      onAddFile(project.id, file, category);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {previewFile && (
        <FilePreviewer 
          url={previewFile.url} 
          name={previewFile.name} 
          category={previewFile.category} 
          onClose={() => setPreviewFile(null)} 
        />
      )}

      <div className="flex items-center justify-between px-1">
        <button onClick={onBack} className="text-slate-600 font-black text-[10px] uppercase flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm active:scale-95 transition-all">
          <ChevronLeft size={16}/> Назад
        </button>
        {canEdit && (
          <button onClick={() => onEdit(project)} className="p-3 bg-white text-blue-600 rounded-xl border border-slate-100 shadow-sm active:scale-90 transition-all flex items-center gap-2 hover:bg-blue-50 transition-colors">
            <Pencil size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Изменить</span>
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm text-left">
        <div className="flex gap-4 mb-8">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-slate-900 truncate leading-tight tracking-tighter uppercase">{project.name}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 truncate">{project.address}</p>
          </div>
        </div>

        {/* КНОПКИ СВЯЗИ */}
        <div className="space-y-3 mb-8">
          <a href={`tel:${project.phone}`} className="flex items-center justify-center gap-4 p-5 bg-emerald-50 text-emerald-700 rounded-[1.8rem] border border-emerald-100 active:scale-[0.98] transition-all shadow-sm group">
            <div className="p-2.5 bg-white rounded-xl text-emerald-600 shadow-sm flex items-center justify-center">
              <Phone size={24} />
            </div>
            <span className="text-lg font-black tracking-widest text-emerald-800">{project.phone || 'НОМЕР НЕ УКАЗАН'}</span>
          </a>
          <div className="grid grid-cols-2 gap-3">
            <a href={`https://t.me/${project.telegram?.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-[1.5rem] border border-blue-100 active:scale-95 transition-all shadow-sm">
              <Send size={20} className="rotate-[-20deg]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-800">Telegram</span>
            </a>
            <a href={`https://maps.yandex.ru/?text=${encodeURIComponent(project.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-4 bg-amber-50 text-amber-700 rounded-[1.5rem] border border-amber-100 active:scale-95 transition-all shadow-sm">
              <Navigation size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Маршрут</span>
            </a>
          </div>
        </div>

        {/* ФАЙЛОВАЯ СТРУКТУРА */}
        <div className="mb-10 border-t border-slate-50 pt-8">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <FolderOpen size={14} /> Файловое хранилище
          </h4>
          
          <div className="space-y-4">
            {/* ЧЕРТЕЖИ */}
            <div className="bg-slate-50/50 rounded-3xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><DraftingCompass size={18} /></div>
                  <h5 className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Чертежи</h5>
                </div>
                {canEdit && (
                  <label className="cursor-pointer bg-white p-2 rounded-xl border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                    <Plus size={16} />
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, FileCategory.DRAWING)} />
                  </label>
                )}
              </div>
              <div className="space-y-2">
                {filesByCategory[FileCategory.DRAWING].length === 0 ? (
                  <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-200 italic">Чертежи не загружены</p>
                ) : (
                  filesByCategory[FileCategory.DRAWING].map((file, i) => (
                    <div key={i} onClick={() => setPreviewFile(file)} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-indigo-200 transition-all group">
                      <div className="flex items-center gap-3 truncate">
                        <FileText size={16} className="text-slate-400 group-hover:text-indigo-600" />
                        <span className="text-[10px] font-bold text-slate-700 truncate">{file.name}</span>
                      </div>
                      <Download size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ДОКУМЕНТЫ */}
            <div className="bg-slate-50/50 rounded-3xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 text-slate-600 rounded-xl"><FileText size={18} /></div>
                  <h5 className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Документы</h5>
                </div>
                {canEdit && (
                  <label className="cursor-pointer bg-white p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all shadow-sm">
                    <Plus size={16} />
                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, FileCategory.DOCUMENT)} />
                  </label>
                )}
              </div>
              <div className="space-y-2">
                {filesByCategory[FileCategory.DOCUMENT].length === 0 ? (
                  <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-200 italic">Документы не загружены</p>
                ) : (
                  filesByCategory[FileCategory.DOCUMENT].map((file, i) => (
                    <div key={i} onClick={() => setPreviewFile(file)} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-slate-300 transition-all group">
                      <div className="flex items-center gap-3 truncate">
                        <FileText size={16} className="text-slate-400 group-hover:text-slate-600" />
                        <span className="text-[10px] font-bold text-slate-700 truncate">{file.name}</span>
                      </div>
                      <Download size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ФОТО */}
            <div className="bg-slate-50/50 rounded-3xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><ImageIcon size={18} /></div>
                  <h5 className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Фото объекта</h5>
                </div>
                <label className="cursor-pointer bg-white p-2 rounded-xl border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                  <Plus size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, FileCategory.PHOTO)} />
                </label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {filesByCategory[FileCategory.PHOTO].length === 0 ? (
                  <div className="col-span-4 text-[9px] font-bold text-slate-400 uppercase text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-200 italic">Фото отсутствуют</div>
                ) : (
                  filesByCategory[FileCategory.PHOTO].map((file, i) => (
                    <div key={i} onClick={() => setPreviewFile(file)} className="aspect-square bg-white rounded-lg border border-slate-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shadow-sm">
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ЧАТ ОБЪЕКТА */}
        <div className="mb-10 border-t border-slate-50 pt-8">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageSquare size={14} /> Чат объекта
          </h4>
          <ProjectChat messages={project.comments || []} currentUser={currentUser} currentRole={activeRole} onSendMessage={onSendMessage} />
        </div>

        {/* ЗАДАЧИ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={14} /> Работы на объекте
            </h4>
            {canEdit && (
              <button onClick={onAddTask} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg active:scale-90 transition-all text-[9px] font-black uppercase tracking-widest">
                <Plus size={16} /> Добавить
              </button>
            )}
          </div>
          <div className="grid gap-3">
            {tasks.length === 0 ? (
              <div className="p-12 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-100 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-200"><ClipboardList size={24} /></div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Список задач пуст</p>
              </div>
            ) : (
              tasks.map(t => (
                <div key={t.id} onClick={() => onSelectTask(t.id)}>
                  <TaskCard task={t} role={activeRole} onStatusChange={() => {}} onAddComment={() => {}} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
