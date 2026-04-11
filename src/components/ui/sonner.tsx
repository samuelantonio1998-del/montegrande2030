import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [hasToasts, setHasToasts] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const toasts = document.querySelectorAll('[data-sonner-toast]');
      setHasToasts(toasts.length > 1);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="top-right"
        expand={true}
        duration={Infinity}
        closeButton={true}
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            closeButton: "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border",
          },
        }}
        {...props}
      />
      {hasToasts && (
        <button
          onClick={() => sonnerToast.dismiss()}
          className="fixed top-2 right-2 z-[99999] rounded-full bg-muted/90 backdrop-blur-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors shadow-sm"
          title="Limpar todas as notificações"
        >
          <span className="flex items-center gap-1">
            <X className="h-3 w-3" />
            Limpar tudo
          </span>
        </button>
      )}
    </>
  );
};

export { Toaster };
