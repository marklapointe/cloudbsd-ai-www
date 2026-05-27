import React, { useEffect, useRef } from 'react';
import { X, Terminal as TerminalIcon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import socket from '../api/socket';

interface Resource {
  id: string | number;
  name: string;
  status: string;
}

interface ConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
  resourceType: string;
}

const ConsoleModal: React.FC<ConsoleModalProps> = ({ isOpen, onClose, resource, resourceType }) => {
  const { t } = useTranslation();
  const [showVncAlert, setShowVncAlert] = React.useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (isOpen && resourceType !== 'vms' && terminalRef.current) {
      // Initialize xterm.js
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#0f172a', // Slate-900
        }
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      xtermRef.current = term;

      // Connect to socket
      socket.emit('terminal_join', { resourceId: resource.id, resourceType });

      term.onData((data) => {
        socket.emit('terminal_data', { resourceId: resource.id, data });
      });

      socket.on('terminal_output', (data: { resourceId: string | number, output: string }) => {
        if (data.resourceId === resource.id) {
          term.write(data.output);
        }
      });

      term.writeln(`\x1b[1;32m${t('console_modal.connected_to')} ${resource.name} (${resourceType})\x1b[0m`);
      term.writeln(t('console_modal.type_exit'));
      term.write('\r\n$ ');

      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        socket.off('terminal_output');
        socket.emit('terminal_leave', { resourceId: resource.id });
        term.dispose();
      };
    }
  }, [isOpen, resource.id, resource.name, resourceType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
      <div className="relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[600px] border border-white/30 dark:border-slate-700/40 transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-800/30 dark:via-transparent dark:to-slate-900/20 pointer-events-none" />
        
        <div className="relative px-6 py-4 border-b border-white/30 dark:border-slate-700/40 flex justify-between items-center bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {resourceType === 'vms' ? <Monitor className="text-blue-500 dark:text-blue-400" size={20} /> : <TerminalIcon className="text-blue-500 dark:text-blue-400" size={20} />}
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('console_modal.title')}: {resource.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-2 hover:bg-white/40 dark:hover:bg-slate-700/40 rounded-xl backdrop-blur-xl">
            <X size={24} />
          </button>
        </div>
        
        <div className="relative flex-1 bg-slate-900 p-2 overflow-hidden">
          {resourceType === 'vms' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4">
              <div className="p-4 bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50">
                <Monitor size={48} />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-white dark:text-slate-100">{t('console_modal.vnc_placeholder')}</p>
                <p className="text-sm dark:text-slate-400">{t('console_modal.vnc_desc')}</p>
                <button 
                  className="mt-6 px-6 py-3 bg-brand-500/80 backdrop-blur-xl text-white rounded-xl hover:bg-brand-500/90 transition-all active:scale-95 shadow-lg shadow-brand-500/30 font-bold ring-1 ring-inset ring-brand-400/40"
                  onClick={() => setShowVncAlert(true)}
                >
                  {t('console_modal.connect_vnc')}
                </button>
              </div>
            </div>
          ) : (
            <div ref={terminalRef} className="h-full w-full" />
          )}
        </div>
        
        {showVncAlert && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-xl">
            <div className="relative bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-white/40 dark:border-slate-700/40 animate-in zoom-in-95 duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-800/30 dark:via-transparent dark:to-slate-900/20 pointer-events-none rounded-2xl" />
              <div className="relative flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 backdrop-blur-xl rounded-xl text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/30">
                  <Monitor size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{t('common.info')}</h3>
              </div>
              <p className="relative text-slate-700 dark:text-slate-300 font-bold mb-6">
                {t('console_modal.vnc_alert')}
              </p>
              <button 
                onClick={() => setShowVncAlert(false)}
                className="relative w-full py-4 bg-brand-500/80 backdrop-blur-xl text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-brand-500/90 transition-all active:scale-95 shadow-lg shadow-brand-500/30 ring-1 ring-inset ring-brand-400/40"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
        
        <div className="relative px-6 py-3 border-t border-white/30 dark:border-slate-700/40 bg-white/20 dark:bg-slate-800/30 backdrop-blur-xl flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-bold">
          <div>{t('console_modal.status')}: <span className="text-emerald-500 dark:text-emerald-400 font-black uppercase tracking-widest">{t('console_modal.connected')}</span></div>
          <div>{t('console_modal.resource_id')}: {resource.id} | {t('common.type')}: {resourceType}</div>
        </div>
      </div>
    </div>
  );
};

export default ConsoleModal;
