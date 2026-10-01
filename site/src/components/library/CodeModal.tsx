"use client";

import React, { useState } from "react";
import { FiX, FiCheck, FiCopy, FiCode } from "react-icons/fi";

interface CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string;
  styleTag: string;
}

export function CodeModal({ isOpen, onClose, title, code, styleTag }: CodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-card border-2 border-foreground shadow-2xl flex flex-col max-h-[85vh] font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-card-border flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2">
            <FiCode className="text-base text-foreground" />
            <span className="font-bold text-foreground text-sm uppercase tracking-tight">{title}</span>
            <span className="px-2 py-0.5 bg-foreground text-background text-[10px] font-bold">
              {styleTag}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-muted/10 text-muted hover:text-foreground transition-colors"
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-neutral-950 text-neutral-200 text-[11px] leading-relaxed select-all">
          <pre className="font-mono whitespace-pre-wrap">{code}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-card-border flex items-center justify-between bg-card">
          <span className="text-[10px] text-muted">Tailwind CSS + Next.js compatible</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background font-bold text-xs uppercase hover:opacity-90 transition-opacity"
          >
            {copied ? <FiCheck className="text-sm" /> : <FiCopy className="text-sm" />}
            <span>{copied ? "COPIED TO CLIPBOARD" : "COPY SNIPPET"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
