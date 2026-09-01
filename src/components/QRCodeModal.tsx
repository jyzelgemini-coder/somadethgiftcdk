import { Check, Copy, ExternalLink, QrCode, X } from 'lucide-react';
import React, { useState } from 'react';

interface QRCodeModalProps {
  code: string;
  plan: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ code, plan, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = window.location.origin;
  const directLink = `${origin}/?cdk=${encodeURIComponent(code)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(directLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Simple clean SVG QR code visualizer representation
  // We can use a dynamic QR service or SVG grid representation
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(directLink)}&bgcolor=0f172a&color=38bdf8&margin=2`;

  return (
    <div
      id="qr-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        id="qr-modal-card"
        className="w-full max-w-sm bg-[#161B22] border border-[#2D333B] rounded-lg p-5 shadow-2xl relative text-[#E0E0E0]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="btn-close-qr-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-[#2D333B]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-blue-400">
          <QrCode className="w-4 h-4" />
          <h3 className="font-bold text-xs uppercase tracking-widest">CUSTOMER REDEEM LINK &amp; QR</h3>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-[#0A0C10] rounded border border-[#2D333B] mb-4">
          <img
            src={qrSvgUrl}
            alt={`QR Code for CDK ${code}`}
            className="w-44 h-44 rounded border border-[#2D333B]"
            referrerPolicy="no-referrer"
          />
          <div className="mt-3 text-center">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#1C2128] border border-[#2D333B] rounded text-blue-300">
              {code}
            </span>
            <div className="text-[10px] text-slate-400 mt-1 uppercase">
              PLAN: {plan.replace('_', ' ')} TELEGRAM PREMIUM
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">Direct URL</label>
          <div className="flex items-center gap-2 bg-[#0A0C10] p-2 rounded border border-[#2D333B] text-xs">
            <input
              type="text"
              readOnly
              value={directLink}
              className="bg-transparent text-slate-300 font-mono w-full focus:outline-none text-[11px]"
            />
            <button
              id="btn-copy-direct-url"
              onClick={handleCopy}
              className="p-1 rounded bg-[#1C2128] hover:bg-[#2D333B] text-blue-400 hover:text-blue-300 border border-[#2D333B] transition-colors shrink-0"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            id="btn-open-link-preview"
            onClick={() => window.open(directLink, '_blank')}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#0A0C10] hover:bg-[#1C2128] border border-[#2D333B] text-slate-200 text-xs uppercase tracking-wider font-bold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Test Customer View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
