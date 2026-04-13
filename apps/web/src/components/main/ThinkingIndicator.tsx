import { Wand, Sparkle, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTypewriter } from '@/hooks/useTypewriter';

const ANIMATION_DELAY_MS = 120;
const TYPEWRITER_SPEED_MS = 120;
const TYPEWRITER_PAUSE_MS = 1500;

const THINKING_ICONS: { icon: LucideIcon; colorClass: string }[] = [
  { icon: Wand, colorClass: 'text-purple-500' },
  { icon: Sparkle, colorClass: 'text-pink-500' },
  { icon: Sparkle, colorClass: 'text-blue-500' },
  { icon: Sparkles, colorClass: 'text-amber-500' },
];

export function ThinkingIndicator() {
  const { t } = useTranslation();
  const text = useTypewriter(t('main.thinking'), TYPEWRITER_SPEED_MS, TYPEWRITER_PAUSE_MS);

  return (
    <div className="py-3 mb-8" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-0.5" aria-hidden="true">
          {THINKING_ICONS.map(({ icon: Icon, colorClass }, i) => (
            <Icon
              key={i}
              className={`h-4 w-4 animate-wave ${colorClass}`}
              style={{
                animationDelay: `${i * ANIMATION_DELAY_MS}ms`,
              }}
            />
          ))}
        </div>
        <span className="min-w-[85px] text-muted-foreground">
          {text}
          <span className="animate-pulse">|</span>
        </span>
      </div>
    </div>
  );
}
