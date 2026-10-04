import React, { useState } from 'react';

export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const clean = name.trim();
  if (!clean) return '';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  // First letter of first word + first letter of second word (e.g. "John Doe" -> "JD", "Acme Corp" -> "AC")
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface ProfileAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isBusiness?: boolean;
  alt?: string;
}

const sizeClasses: Record<string, { container: string; text: string }> = {
  xs: { container: 'w-5 h-5', text: 'text-[9px] tracking-tight' },
  sm: { container: 'w-6 h-6 sm:w-7 sm:h-7', text: 'text-[10px] sm:text-xs tracking-tight' },
  md: { container: 'w-9 h-9 sm:w-10 sm:h-10', text: 'text-xs sm:text-sm font-semibold' },
  lg: { container: 'w-14 h-14 sm:w-16 sm:h-16', text: 'text-lg sm:text-xl font-bold' },
  xl: { container: 'w-20 h-20 sm:w-24 sm:h-24', text: 'text-2xl sm:text-3xl font-bold' },
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  imageUrl,
  size = 'sm',
  className = '',
  isBusiness = false,
  alt,
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name) || (isBusiness ? 'B' : 'P');
  const sizeConfig = sizeClasses[size] || sizeClasses.sm;

  // Modern subtle gradients: indigo-violet for personal, blue-cyan for business
  const gradientClass = isBusiness
    ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500'
    : 'bg-gradient-to-tr from-primary via-purple-600 to-indigo-500';

  if (imageUrl && !imageError) {
    return (
      <div
        className={`${sizeConfig.container} rounded-full overflow-hidden shrink-0 border border-gray-200/80 dark:border-white/10 shadow-sm relative ${className}`}
      >
        <img
          src={imageUrl}
          alt={alt || name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeConfig.container} rounded-full ${gradientClass} flex items-center justify-center text-white ${sizeConfig.text} font-semibold shrink-0 shadow-sm select-none uppercase ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};

/**
 * Utility to compress/resize uploaded images before setting to state/localStorage.
 * Keeps image under 400x400 to prevent quota errors and ensure instant loads.
 */
export function processImageFile(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, SVG, WebP)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use webp or jpeg with good quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Fallback to direct data URL
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
