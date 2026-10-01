"use client";

import React, { useState } from "react";
import { UIComponentItem } from "./types";
import { CodeModal } from "./CodeModal";
import { FiCode, FiMaximize2, FiCheck, FiCopy } from "react-icons/fi";

interface ComponentCardProps {
  item: UIComponentItem;
  index: number;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export function ComponentCard({ item, index, onSelect, isSelected }: ComponentCardProps) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullView, setFullView] = useState(false);

  const Component = item.component;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div 
        id={item.id}
        className={`group bg-card border transition-all duration-300 flex flex-col justify-between ${
          isSelected 
            ? "border-foreground ring-2 ring-foreground" 
            : "border-card-border hover:border-foreground/60 shadow-sm hover:shadow-md"
        }`}
      >
        {/* Frame Chrome Header */}
        <div className="p-3 border-b border-card-border bg-muted/5 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted text-[10px] font-bold">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-bold text-foreground tracking-tight truncate max-w-[180px] sm:max-w-[240px]">
              {item.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 border border-card-border bg-card text-[10px] text-muted uppercase font-bold tracking-wider hidden sm:inline">
              {item.styleTag}
            </span>
            <span className="px-2 py-0.5 bg-foreground/10 text-foreground text-[9px] font-mono font-semibold rounded">
              {item.aestheticVibe}
            </span>
            <button
              onClick={() => setCodeOpen(true)}
              title="Inspect & Copy JSX Code"
              className="p-1.5 border border-card-border hover:border-foreground hover:bg-card text-muted hover:text-foreground transition-colors"
            >
              <FiCode className="text-xs" />
            </button>
            <button
              onClick={() => setFullView(true)}
              title="Full Preview Modal"
              className="p-1.5 border border-card-border hover:border-foreground hover:bg-card text-muted hover:text-foreground transition-colors hidden sm:block"
            >
              <FiMaximize2 className="text-xs" />
            </button>
          </div>
        </div>

        {/* Live Component Preview Canvas */}
        <div className="p-4 sm:p-6 bg-card flex-1 flex items-center justify-center overflow-x-auto min-h-[140px]">
          <div className="w-full">
            <Component />
          </div>
        </div>

        {/* Card Footer Details */}
        <div className="p-3 border-t border-card-border bg-card/60 flex items-center justify-between font-mono text-xs">
          <p className="text-[11px] text-muted line-clamp-1 flex-1 pr-3">
            {item.description}
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] border border-card-border hover:border-foreground text-muted hover:text-foreground transition-colors"
            >
              {copied ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
              <span>{copied ? "COPIED" : "COPY CODE"}</span>
            </button>

            {onSelect && (
              <button
                onClick={() => onSelect(item.id)}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-colors ${
                  isSelected 
                    ? "bg-foreground text-background" 
                    : "border border-foreground text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                {isSelected ? "SELECTED ✓" : "SELECT"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Code Inspector Modal */}
      <CodeModal
        isOpen={codeOpen}
        onClose={() => setCodeOpen(false)}
        title={item.name}
        code={item.codeSnippet}
        styleTag={item.styleTag}
      />

      {/* Fullscreen Preview Modal */}
      {fullView && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10 bg-black/70 backdrop-blur-md animate-in fade-in"
          onClick={() => setFullView(false)}
        >
          <div 
            className="w-full max-w-5xl bg-card border-2 border-foreground p-6 sm:p-10 max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-card-border font-mono text-xs">
              <div>
                <span className="text-[10px] text-muted block uppercase">Full Scale Canvas</span>
                <span className="font-bold text-foreground text-base uppercase">{item.name}</span>
              </div>
              <button
                onClick={() => setFullView(false)}
                className="px-3 py-1.5 bg-foreground text-background font-bold text-xs uppercase"
              >
                CLOSE [ESC]
              </button>
            </div>
            <div className="py-8">
              <Component />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
