import React, { useEffect, useRef } from 'react';
import { X, Terminal as TerminalIcon, Monitor } from 'lucide-react';
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

      term.writeln(`\x1b[1;32mConnected to ${resource.name} (${resourceType})\x1b[0m`);
      term.writeln('Type "exit" to close the console.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[600px]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            {resourceType === 'vms' ? <Monitor className="text-blue-600" size={20} /> : <TerminalIcon className="text-blue-600" size={20} />}
            <h2 className="text-lg font-bold text-slate-900">Console: {resource.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 bg-slate-900 p-2 overflow-hidden relative">
          {resourceType === 'vms' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="p-4 bg-slate-800 rounded-full">
                <Monitor size={48} />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-white">VNC Console Placeholder</p>
                <p className="text-sm">noVNC integration would appear here for VM management.</p>
                <button 
                  className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => alert('VNC Connection would be established to bhyve instance.')}
                >
                  Connect via VNC
                </button>
              </div>
            </div>
          ) : (
            <div ref={terminalRef} className="h-full w-full" />
          )}
        </div>
        
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <div>Status: <span className="text-emerald-600 font-medium">Connected</span></div>
          <div>Resource ID: {resource.id} | Type: {resourceType}</div>
        </div>
      </div>
    </div>
  );
};

export default ConsoleModal;
