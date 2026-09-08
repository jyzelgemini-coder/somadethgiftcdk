import React, { useState } from 'react';
import { CheckCircle2, Maximize2, X, ExternalLink } from 'lucide-react';

interface TelegramAvatarProps {
  avatarUrl?: string;
  displayName: string;
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
  clickable?: boolean;
  className?: string;
}

export const TelegramAvatar: React.FC<TelegramAvatarProps> = ({
  avatarUrl,
  displayName,
  username,
  size = 'md',
  isVerified = false,
  clickable = true,
  className = '',
}) => {
  const [loadStage, setLoadStage] = useState<'proxied' | 'direct' | 'fallback'>('proxied');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute size classes
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 text-base',
    xl: 'w-20 h-20 sm:w-24 sm:h-24 text-xl',
  };

  const badgeSizeMap = {
    sm: 'w-3 h-3 -bottom-0.5 -right-0.5',
    md: 'w-4 h-4 -bottom-0.5 -right-0.5',
    lg: 'w-5 h-5 -bottom-1 -right-1',
    xl: 'w-6 h-6 bottom-0 right-0',
  };

  const cleanHandle = username.startsWith('@') ? username : `@${username}`;
  const initials = (displayName || username || 'TG')
    .replace(/^@/, '')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  // URL resolution: try proxied URL first to bypass mobile CORS/ad-block/referrer restrictions
  const proxiedUrl = avatarUrl
    ? `/api/telegram-avatar?url=${encodeURIComponent(avatarUrl)}`
    : '';

  const activeSrc =
    loadStage === 'proxied' ? proxiedUrl : loadStage === 'direct' ? avatarUrl : '';

  const handleImageError = () => {
    if (loadStage === 'proxied' && avatarUrl) {
      // Fallback 1: Try raw CDN directly
      setLoadStage('direct');
    } else {
      // Fallback 2: Initials avatar
      setLoadStage('fallback');
    }
  };

  const hasPhoto = Boolean(avatarUrl && loadStage !== 'fallback');

  return (
    <>
      <div
        className={`relative inline-block shrink-0 ${
          clickable && hasPhoto ? 'cursor-pointer group' : ''
        } ${className}`}
        onClick={() => {
          if (clickable && hasPhoto) {
            setIsModalOpen(true);
          }
        }}
        title={clickable && hasPhoto ? 'Tap to view full Telegram photo' : displayName}
      >
        <div
          className={`${sizeMap[size]} rounded-full overflow-hidden border-2 border-teal-500/40 shadow-md bg-[#07171d] flex items-center justify-center transition-transform ${
            clickable && hasPhoto ? 'group-hover:scale-105 active:scale-95' : ''
          }`}
        >
          {hasPhoto ? (
            <img
              src={activeSrc}
              alt={displayName}
              onError={handleImageError}
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-700 text-slate-950 font-bold flex items-center justify-center select-none">
              {initials}
            </div>
          )}

          {/* Hover magnifier hint on mobile/desktop when clickable */}
          {clickable && hasPhoto && (
            <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-3.5 h-3.5 text-white drop-shadow" />
            </div>
          )}
        </div>

        {/* Telegram Verified Badge */}
        {isVerified && (
          <div
            className={`absolute ${badgeSizeMap[size]} rounded-full bg-[#081519] text-teal-400 flex items-center justify-center shadow`}
            title="Verified Telegram Customer"
          >
            <CheckCircle2 className="w-full h-full fill-teal-400/20 text-teal-400" />
          </div>
        )}
      </div>

      {/* Fullscreen Photo Lightbox Modal for Mobile & PC */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-[#0a1c22] border border-teal-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-[#0e2730] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Large HD Photo */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-teal-400/50 shadow-2xl mb-4 bg-slate-900 flex items-center justify-center">
              <img
                src={activeSrc}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Customer Information */}
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-100">{displayName}</h3>
              {isVerified && <CheckCircle2 className="w-4 h-4 text-teal-400 fill-teal-400/20" />}
            </div>
            <p className="text-xs text-teal-300 font-mono-code mb-4">{cleanHandle}</p>

            {/* Actions */}
            <div className="w-full flex items-center gap-2">
              <a
                href={`https://t.me/${cleanHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View on Telegram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-[#0f2a33] text-slate-300 hover:text-white text-xs font-semibold border border-teal-500/30 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
