import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyLinkButtonProps {
  url: string;
  className?: string;
}

/**
 * Copies `url` to the clipboard and briefly shows a checkmark. Keeps the "copied" state local
 * to this button instead of the parent modal, so clicking it doesn't re-render the whole
 * (often very large) surrounding view.
 */
export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({ url, className }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button type="button" onClick={handleClick} className={className} title="Kopiera länk">
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
};
