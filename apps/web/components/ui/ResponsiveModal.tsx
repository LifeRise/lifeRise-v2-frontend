'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  className,
  title,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  const dragControls = useDragControls();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-midnight/80 backdrop-blur-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => onOpenChange(false)}
              />
            </Dialog.Overlay>

            {/* Content */}
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed inset-0 z-50 flex p-0 sm:p-6',
                  isMobile ? 'items-end' : 'items-center justify-center'
                )}
                initial={isMobile ? { opacity: 1, y: '100%' } : { opacity: 0, scale: 0.95, y: 12 }}
                animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { opacity: 1, y: '100%' } : { opacity: 0, scale: 0.97, y: 6 }}
                transition={
                  isMobile
                    ? { type: 'spring', stiffness: 350, damping: 30 }
                    : { type: 'spring', stiffness: 350, damping: 28 }
                }
                drag={isMobile ? 'y' : false}
                dragControls={dragControls}
                dragConstraints={{ top: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (isMobile && info.offset.y > 120) {
                    onOpenChange(false);
                  }
                }}
              >
                <div
                  className={cn(
                    'relative w-full bg-slate-deep/95 shadow-2xl overflow-hidden',
                    isMobile
                      ? 'max-h-[90vh] rounded-t-3xl border-t border-x border-white/10'
                      : 'max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10',
                    className
                  )}
                  style={{
                    touchAction: isMobile ? 'pan-y' : undefined,
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Accessibility title (visible when provided, sr-only otherwise) */}
                  <Dialog.Title
                    className={cn(
                      'px-6 pt-6 text-lg font-heading font-semibold text-lr-white',
                      !title && 'sr-only'
                    )}
                  >
                    {title || 'Modal'}
                  </Dialog.Title>

                  {/* Drag handle on mobile */}
                  {isMobile && (
                    <div
                      className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
                      onPointerDown={(e) => dragControls.start(e)}
                      style={{ touchAction: 'pan-y' }}
                    >
                      <div className="w-10 h-1 rounded-full bg-white/20" />
                    </div>
                  )}

                  {/* Close button (desktop only; mobile uses swipe or backdrop) */}
                  {!isMobile && (
                    <Dialog.Close className="absolute top-4 right-4 z-10 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center glass hover:bg-white/10 transition-colors text-muted hover:text-lr-white">
                      <X size={16} />
                    </Dialog.Close>
                  )}

                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
