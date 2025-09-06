import { toast as sonnerToast } from 'sonner';

// Minimal toast wrapper compatible with useToast() usage in the codebase
// Supports title, description and a 'destructive' variant mapped to error styling
export type ToastVariant = 'default' | 'destructive';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  function toast({ title, description, variant = 'default' }: ToastOptions) {
    const message = title ? `${title}${description ? ': ' + description : ''}` : description ?? '';
    if (!message) return;

    if (variant === 'destructive') {
      sonnerToast.error(message);
    } else {
      sonnerToast(message);
    }
  }

  return { toast };
}
