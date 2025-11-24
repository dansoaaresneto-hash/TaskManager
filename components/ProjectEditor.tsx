import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, ProjectBlock, Task, TaskStatus, ProjectBlockType } from '../types';
import { 
  Plus, GripVertical, Trash2, Heading1, Heading2, Type, 
  Search, Hash, CheckSquare, Square, Activity,
  Bold, Italic, Underline, Highlighter, Link2, ExternalLink,
  List, Palette, X, Circle, Timer, CheckCircle2
} from 'lucide-react';

interface ProjectEditorProps {
  project: Project;
  tasks: Task[];
  onUpdate: (project: Project) => void;
  onTaskCreate: () => Task;
  onTaskUpdate: (taskId: string, status: TaskStatus) => void;
  onTaskEdit: (task: Task) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
  onFocus: (task: Task) => void;
}

const EMOJI_LIST = [
  '🚀', '📝', '✅', '📅', '💡', '🔥', '⭐', '🚩', '💼', '🎓', 
  '🏠', '🛒', '✈️', '🎨', '💻', '📈', '📊', '🔔', '🎁', '🏆',
  '🔒', '🔑', '❤️', '💊', '⚽', '🎵', '📷', '📁', '⚙️', '🔍'
];

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', color: '#fef08a' },
  { label: 'Green', color: '#bbf7d0' },
  { label: 'Blue', color: '#bfdbfe' },
  { label: 'Pink', color: '#fbcfe8' },
  { label: 'Purple', color: '#e9d5ff' },
  { label: 'Red', color: '#fecaca' },
];

// Helper to convert hex to rgb
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : null;
}

// --- Memoized Block Component ---
interface EditorBlockProps {
  block: ProjectBlock;
  task?: Task;
  isDraggable: boolean;
  isDragTarget: boolean; 
  onUpdate: (id: string, updates: Partial<ProjectBlock>) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSlash: (id: string, rect: DOMRect) => void;
  onTaskStatus: (id: string, status: TaskStatus) => void;
  onTaskEdit: (task: Task) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
  onFocus: (task: Task) => void;
  onNavigate: (id: string, direction: 'up' | 'down') => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
}

const EditorBlock = React.memo(({ 
  block, 
  task, 
  isDragTarget,
  onUpdate, 
  onAdd, 
  onRemove, 
  onSlash, 
  onTaskStatus,
  onTaskEdit,
  onSubtaskToggle,
  onFocus,
  onNavigate,
  registerRef,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave
}: EditorBlockProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync ref to parent
  useEffect(() => {
    if (contentRef.current && block.type !== 'task') {
        registerRef(block.id, contentRef.current);
    }
  }, [registerRef, block.id, block.type]);

  // Sync content updates ONLY if content changed externally (e.g. formatting)
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== block.content) {
       if (document.activeElement !== contentRef.current) {
          contentRef.current.innerHTML = block.content;
       }
    }
  }, [block.content]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    const textContent = e.currentTarget.textContent || "";
    
    if (textContent.endsWith('/')) {
        const rect = e.currentTarget.getBoundingClientRect();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rangeRect = range.getBoundingClientRect();
            onSlash(block.id, rangeRect);
        } else {
            onSlash(block.id, rect);
        }
    }

    onUpdate(block.id, { content: newContent });
  }, [block.id, onUpdate, onSlash]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (e.altKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
        } else {
            e.preventDefault();
            onAdd(block.id);
        }
    } else if (e.key === 'Backspace' && !contentRef.current?.textContent) {
       e.preventDefault();
       if (block.type === 'bullet') {
           onUpdate(block.id, { type: 'text' });
       } else {
           onRemove(block.id);
       }
    } else if (e.key === 'ArrowUp') {
        const selection = window.getSelection();
        if (selection && selection.anchorOffset === 0) {
            e.preventDefault();
            onNavigate(block.id, 'up');
        }
    } else if (e.key === 'ArrowDown') {
        const selection = window.getSelection();
        const textLen = contentRef.current?.textContent?.length || 0;
        if (selection && selection.anchorOffset === textLen) {
            e.preventDefault();
            onNavigate(block.id, 'down');
        }
    }
  }, [block.id, block.type, onAdd, onRemove, onUpdate, onNavigate]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'A') {
          if (e.metaKey || e.ctrlKey) {
              window.open((e.target as HTMLAnchorElement).href, '_blank');
          }
      }
  }, []);

  // --- Render ---

  return (
    <div 
        className={`group relative flex items-start gap-2 transition-all duration-200 ${isDragTarget ? 'pt-8 border-t-2 border-blue-500' : ''}`} 
        data-block-id={block.id}
        onDragOver={(e) => onDragOver(e, block.id)}
        onDrop={(e) => onDrop(e, block.id)}
        onDragLeave={(e) => onDragLeave(e, block.id)}
    >
      {/* Sidebar Controls */}
      <div className="absolute -left-24 top-1.5 opacity-0 group-hover:opacity-100 flex items-center justify-end gap-1 transition-opacity z-10 w-24 pr-2 select-none" contentEditable={false}>
        <button onClick={() => onRemove(block.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Delete block"><Trash2 size={16} /></button>
        <button onClick={() => onAdd(block.id)} className="p-1 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Add block below"><Plus size={16} /></button>
        
        {/* Drag Handle */}
        <div 
            className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 p-1"
            draggable
            onDragStart={(e) => onDragStart(e, block.id)}
        >
            <GripVertical size={16} />
        </div>
      </div>

      <div className="flex-1 flex items-start w-full">
          {block.type === 'bullet' && (
              <span className="mr-2 mt-1.5 text-2xl leading-4 text-gray-800 dark:text-gray-200 select-none" contentEditable={false}>•</span>
          )}
          
          {block.type === 'task' && block.taskId ? (
             <div className="w-full py-1" contentEditable={false}>
                {task ? (
                    <div className="flex items-center justify-between group/task px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <span className="flex-shrink-0 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => onTaskEdit(task)}>#{task.readableId}</span>
                            <span className={`text-sm truncate cursor-pointer select-none ${task.status === TaskStatus.Completed ? 'line-through text-gray-400 dark:text-gray-600' : task.status === TaskStatus.InProgress ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`} onClick={() => onTaskEdit(task)}>{task.title}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-lg p-0.5 ml-2">
                            <button onClick={() => onTaskStatus(task.id, TaskStatus.Pending)} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${task.status === TaskStatus.Pending ? 'text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700' : 'text-gray-400'}`} title="To Do"><Circle size={14} /></button>
                            <button onClick={() => onTaskStatus(task.id, TaskStatus.InProgress)} className={`p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 ${task.status === TaskStatus.InProgress ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`} title="In Progress"><Timer size={14} /></button>
                            <button onClick={() => onTaskStatus(task.id, TaskStatus.Completed)} className={`p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 ${task.status === TaskStatus.Completed ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-gray-400'}`} title="Done"><CheckCircle2 size={14} /></button>
                            <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                            <button onClick={() => onTaskEdit(task)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Open Details"><ExternalLink size={14} /></button>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 italic border border-dashed border-gray-200 dark:border-gray-700 px-2 py-1 rounded">Task not found</div>
                )}
             </div>
          ) : (
            <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onClick={handleContentClick}
                className={`w-full bg-transparent outline-none border-none p-1 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 dark:empty:before:text-gray-600 cursor-text
                    ${block.type === 'h1' ? 'text-3xl font-bold text-gray-800 dark:text-gray-100 mt-6 mb-2' : ''}
                    ${block.type === 'h2' ? 'text-2xl font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-2' : ''}
                    ${block.type === 'text' || block.type === 'bullet' ? 'text-base text-gray-700 dark:text-gray-300 leading-relaxed min-h-[1.5em]' : ''}
                    [&_a]:text-blue-500 [&_a]:underline [&_a]:cursor-pointer
                `}
                data-placeholder={block.type === 'h1' ? 'Heading 1' : block.type === 'h2' ? 'Heading 2' : "Type '/' for commands..."}
                dangerouslySetInnerHTML={{ __html: block.content }}
            />
          )}
      </div>
    </div>
  );
});

const ProjectEditor: React.FC<ProjectEditorProps> = ({ 
  project, 
  tasks, 
  onUpdate, 
  onTaskCreate,
  onTaskUpdate,
  onTaskEdit,
  onSubtaskToggle,
  onFocus
}) => {
  const [showSlashMenu, setShowSlashMenu] = useState<{ x: number, y: number, placement: 'top' | 'bottom', blockId: string } | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState<{ x: number, y: number, blockId: string } | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [toolbarState, setToolbarState] = useState<{ visible: boolean; x: number; y: number; blockId: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  
  const iconRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const draggedItem = useRef<string | null>(null);

  // Effect to handle focusing a specific block (e.g. after adding)
  useEffect(() => {
    if (focusBlockId && blockRefs.current[focusBlockId]) {
      setTimeout(() => {
        blockRefs.current[focusBlockId]?.focus();
        setFocusBlockId(null);
      }, 10);
    }
  }, [focusBlockId, project.blocks]);

  const projectTasks = project.blocks
    .filter(b => b.type === 'task' && b.taskId)
    .map(b => tasks.find(t => t.id === b.taskId))
    .filter((t): t is Task => !!t);
  
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === TaskStatus.Completed).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (iconRef.current && !iconRef.current.contains(event.target as Node)) {
        setShowIconPicker(false);
      }
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          if(!showColorPicker) setToolbarState(null); // Prevent hiding if color picker open
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColorPicker]);

  // --- Handlers ---

  const registerBlockRef = useCallback((id: string, el: HTMLDivElement | null) => {
      blockRefs.current[id] = el;
  }, []);

  const handleBlockUpdate = useCallback((id: string, updates: Partial<ProjectBlock>) => {
    onUpdate({
        ...project,
        blocks: project.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  }, [project, onUpdate]);

  const handleBlockAdd = useCallback((afterId: string) => {
    const index = project.blocks.findIndex(b => b.id === afterId);
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newBlocks = [...project.blocks];
    newBlocks.splice(index + 1, 0, { id: newId, type: 'text', content: '' });
    
    onUpdate({ ...project, blocks: newBlocks });
    setFocusBlockId(newId); // Trigger focus
  }, [project, onUpdate]);

  const handleBlockRemove = useCallback((id: string) => {
    if (project.blocks.length <= 1) return;
    
    // Find prev block to focus
    const index = project.blocks.findIndex(b => b.id === id);
    const prevId = index > 0 ? project.blocks[index - 1].id : null;

    onUpdate({ ...project, blocks: project.blocks.filter(b => b.id !== id) });
    if (prevId) setFocusBlockId(prevId);
  }, [project, onUpdate]);

  const handleNavigate = useCallback((id: string, direction: 'up' | 'down') => {
      const index = project.blocks.findIndex(b => b.id === id);
      if (direction === 'up' && index > 0) {
          const prevId = project.blocks[index - 1].id;
          blockRefs.current[prevId]?.focus();
      } else if (direction === 'down' && index < project.blocks.length - 1) {
          const nextId = project.blocks[index + 1].id;
          blockRefs.current[nextId]?.focus();
      }
  }, [project.blocks]);

  // --- Drag and Drop ---

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
      draggedItem.current = id;
      e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedItem.current !== id) {
          setDragTargetId(id);
      }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, id: string) => {
      // Optional: logic to clear drag target if leaving area
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = draggedItem.current;
      setDragTargetId(null);
      
      if (!sourceId || sourceId === targetId) return;

      const sourceIndex = project.blocks.findIndex(b => b.id === sourceId);
      const targetIndex = project.blocks.findIndex(b => b.id === targetId);

      const newBlocks = [...project.blocks];
      const [movedBlock] = newBlocks.splice(sourceIndex, 1);
      newBlocks.splice(targetIndex, 0, movedBlock);

      onUpdate({ ...project, blocks: newBlocks });
      draggedItem.current = null;
  }, [project, onUpdate]);

  // --- Empty Area Click ---
  const handleAreaClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
          const lastBlock = project.blocks[project.blocks.length - 1];
          if (lastBlock) {
              if (lastBlock.content.trim() === '') {
                  blockRefs.current[lastBlock.id]?.focus();
              } else {
                  handleBlockAdd(lastBlock.id);
              }
          }
      }
  };

  // --- Menus & Formatting ---
  
  const handleSlashTrigger = useCallback((id: string, rect: DOMRect) => {
     const spaceBelow = window.innerHeight - rect.bottom;
     const placement = spaceBelow < 300 ? 'top' : 'bottom';
     setShowSlashMenu({ x: rect.left, y: placement === 'bottom' ? rect.bottom + 5 : rect.top, placement, blockId: id });
  }, []);

  const handleLinkTaskTrigger = useCallback((id: string, rect: DOMRect) => {
      setShowTaskPicker({ x: rect.left, y: rect.bottom + 5, blockId: id });
  }, []);

  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (!showColorPicker) setToolbarState(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    let node: Node | null = range.startContainer;
    let blockId = '';
    while (node && node !== document.body) {
        if (node.nodeType === 1 && (node as Element).getAttribute('data-block-id')) {
            blockId = (node as Element).getAttribute('data-block-id') || '';
            break;
        }
        node = node.parentNode;
    }

    if (rect.width > 0) {
      setToolbarState({
        visible: true,
        x: rect.left + (rect.width / 2),
        y: rect.top - 10,
        blockId
      });
    }
  }, [showColorPicker]);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleToggleHighlight = (colorHex: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    const currentColor = document.queryCommandValue('hiliteColor');
    const targetRgb = hexToRgb(colorHex);
    
    if (colorHex === 'transparent' || currentColor === targetRgb) {
        document.execCommand('hiliteColor', false, 'transparent');
    } else {
        document.execCommand('hiliteColor', false, colorHex);
    }
    setShowColorPicker(false);
  };

  const handleCreateLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0).cloneRange();
    const url = prompt("Enter link URL:");
    if (url) {
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('createLink', false, url);
    }
  };

  const handleToggleBullet = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!toolbarState?.blockId) return;
      const block = project.blocks.find(b => b.id === toolbarState.blockId);
      if (block) {
          const newType = block.type === 'bullet' ? 'text' : 'bullet';
          handleBlockUpdate(block.id, { type: newType });
      }
  };

  // --- Slash Commands ---

  const executeSlashCommand = (command: string, blockId: string) => {
    const block = project.blocks.find(b => b.id === blockId);
    if (!block) return;

    if (command === 'newtask') {
        const newTask = onTaskCreate();
        const newBlocks = project.blocks.map(b => b.id === blockId ? { ...b, type: 'task' as const, taskId: newTask.id, content: '' } : b);
        const index = newBlocks.findIndex(b => b.id === blockId);
        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        newBlocks.splice(index + 1, 0, { id: newId, type: 'text', content: '' });
        
        onUpdate({ ...project, blocks: newBlocks });
        setFocusBlockId(newId);
    } else if (command === 'linktask') {
        if (showSlashMenu) setShowTaskPicker({ x: showSlashMenu.x, y: showSlashMenu.y, blockId });
    } else {
        onUpdate({
            ...project,
            blocks: project.blocks.map(b => b.id === blockId ? { ...b, type: command as ProjectBlockType, content: b.content.replace('/', '') } : b)
        });
    }
    setShowSlashMenu(null);
  };

  const handleLinkTask = (taskId: string) => {
      if (!showTaskPicker) return;
      onUpdate({
          ...project,
          blocks: project.blocks.map(b => b.id === showTaskPicker.blockId ? { ...b, type: 'task', taskId, content: '' } : b)
      });
      setShowTaskPicker(null);
  };

  return (
    <div 
        className="max-w-4xl mx-auto pb-32 px-8 min-h-[500px]" 
        onMouseUp={handleTextSelect} 
        onKeyUp={handleTextSelect}
        onClick={handleAreaClick}
    >
        {/* Toolbar */}
        {toolbarState && toolbarState.visible && (
            <div 
                ref={toolbarRef}
                className="fixed z-50 flex items-center gap-1 p-1 bg-gray-900 text-white rounded-lg shadow-xl animate-fade-in"
                style={{ top: toolbarState.y - 50, left: toolbarState.x, transform: 'translateX(-50%)' }}
                onMouseDown={e => e.preventDefault()}
            >
                <button onClick={() => applyFormat('bold')} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Bold"><Bold size={16}/></button>
                <button onClick={() => applyFormat('italic')} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Italic"><Italic size={16}/></button>
                <button onClick={() => applyFormat('underline')} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Underline"><Underline size={16}/></button>
                
                <div className="w-px h-4 bg-gray-700 mx-1"></div>
                <button onClick={handleToggleBullet} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Toggle Bullet List"><List size={16}/></button>
                <div className="w-px h-4 bg-gray-700 mx-1"></div>

                <div className="relative">
                    <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Highlight Color"><Palette size={16} className={showColorPicker ? 'text-blue-400' : ''}/></button>
                    {showColorPicker && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-800 border border-gray-700 rounded-lg p-2 flex gap-1 shadow-xl">
                             <button onClick={() => handleToggleHighlight('transparent')} className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center hover:bg-gray-700" title="Remove Highlight"><X size={12} /></button>
                             {HIGHLIGHT_COLORS.map(c => (
                                 <button key={c.color} onClick={() => handleToggleHighlight(c.color)} className="w-6 h-6 rounded-full border border-gray-600 hover:scale-110 transition-transform" style={{ backgroundColor: c.color }} title={c.label} />
                             ))}
                        </div>
                    )}
                </div>

                <button onMouseDown={handleCreateLink} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Create Link"><Link2 size={16}/></button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
            </div>
        )}

        {/* Header */}
        <div className="mb-8 group relative" onClick={e => e.stopPropagation()}>
             <div ref={iconRef} className="relative inline-block">
                <button onClick={() => setShowIconPicker(!showIconPicker)} className="text-6xl mb-4 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-xl transition-colors cursor-pointer select-none">{project.icon}</button>
                {showIconPicker && (
                    <div className="absolute top-full left-0 z-50 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-3 w-72 animate-fade-in">
                        <div className="grid grid-cols-6 gap-2">
                            {EMOJI_LIST.map(emoji => (
                                <button key={emoji} onClick={() => { onUpdate({ ...project, icon: emoji }); setShowIconPicker(false); }} className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center">{emoji}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <input type="text" value={project.title} onChange={(e) => onUpdate({...project, title: e.target.value})} className="text-4xl font-bold text-gray-900 dark:text-gray-100 w-full border-none focus:outline-none focus:ring-0 bg-transparent placeholder-gray-300 dark:placeholder-gray-600" placeholder="Untitled Project" />
             <div className="text-sm text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-2">
                <span>{project.blocks.length} blocks</span><span>•</span><span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
             </div>
        </div>

        <div className="mb-12 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-6 items-center" onClick={e => e.stopPropagation()}>
             <div className="flex-1 w-full">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2"><Activity size={20} className="text-blue-500"/> Project Progress</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{completedTasks} of {totalTasks} tasks completed</p>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} /></div>
             </div>
             <div className="flex items-center gap-6 divide-x divide-gray-100 dark:divide-gray-800">
                <div className="text-center px-4"><div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</div><div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total</div></div>
                <div className="text-center px-4"><div className="text-2xl font-bold text-green-500">{completedTasks}</div><div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Done</div></div>
                <div className="text-center px-4"><div className="text-2xl font-bold text-blue-500">{totalTasks - completedTasks}</div><div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Pending</div></div>
             </div>
        </div>

        {/* Blocks */}
        <div className="space-y-2">
            {project.blocks.map(block => (
                <EditorBlock
                    key={block.id}
                    block={block}
                    task={block.taskId ? tasks.find(t => t.id === block.taskId) : undefined}
                    isDraggable={true}
                    isDragTarget={dragTargetId === block.id}
                    onUpdate={handleBlockUpdate}
                    onAdd={handleBlockAdd}
                    onRemove={handleBlockRemove}
                    onSlash={handleSlashTrigger}
                    onTaskStatus={onTaskUpdate}
                    onTaskEdit={onTaskEdit}
                    onSubtaskToggle={onSubtaskToggle}
                    onFocus={onFocus}
                    onNavigate={handleNavigate}
                    registerRef={registerBlockRef}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragLeave={handleDragLeave}
                />
            ))}
        </div>

        {/* Menus */}
        {showSlashMenu && (
             <div className="fixed bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 w-48 py-1 z-50 overflow-hidden animate-fade-in" style={{ left: showSlashMenu.x, top: showSlashMenu.placement === 'bottom' ? showSlashMenu.y : 'auto', bottom: showSlashMenu.placement === 'top' ? (window.innerHeight - showSlashMenu.y + 5) : 'auto' }}>
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 py-1 uppercase tracking-wider">Basic blocks</div>
                <button onMouseDown={(e) => { e.preventDefault(); executeSlashCommand('text', showSlashMenu.blockId); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Type size={16} /> Text</button>
                <button onMouseDown={(e) => { e.preventDefault(); executeSlashCommand('h1', showSlashMenu.blockId); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Heading1 size={16} /> Heading 1</button>
                <button onMouseDown={(e) => { e.preventDefault(); executeSlashCommand('h2', showSlashMenu.blockId); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Heading2 size={16} /> Heading 2</button>
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 py-1 uppercase tracking-wider mt-2">Actions</div>
                <button onMouseDown={(e) => { e.preventDefault(); executeSlashCommand('linktask', showSlashMenu.blockId); }} className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400"><Hash size={16} /> Link Task</button>
                <button onMouseDown={(e) => { e.preventDefault(); executeSlashCommand('newtask', showSlashMenu.blockId); }} className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 text-sm text-green-700 dark:text-green-400"><Plus size={16} /> New Task</button>
            </div>
        )}

        {showTaskPicker && (
            <div className="fixed bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 w-72 max-h-60 z-50 flex flex-col animate-fade-in" style={{ left: showTaskPicker.x, top: showTaskPicker.y }}>
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1">
                        <Search size={14} className="text-gray-400" />
                        <input className="bg-transparent text-sm outline-none w-full dark:text-gray-200" placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                    </div>
                </div>
                <div className="overflow-y-auto p-1">
                    {tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).map(task => (
                        <button key={task.id} onClick={() => handleLinkTask(task.id)} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md flex items-center justify-between group">
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 rounded group-hover:bg-white dark:group-hover:bg-gray-600">#{task.readableId}</span>
                        </button>
                    ))}
                    {tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                        <div className="p-3 text-center text-xs text-gray-400 dark:text-gray-500">No tasks found</div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default ProjectEditor;