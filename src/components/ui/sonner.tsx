import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { toast as sonnerToast } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <div className="relative">
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
      <ClearAllButton />
    </div>
  );
};

function ClearAllButton() {
  // We use a MutationObserver approach via CSS to show/hide
  // But simpler: always render, sonner hides the container when empty
  return (
    <button
      onClick={() => sonnerToast.dismiss()}
      className="fixed top-2 right-2 z-[99999] hidden group-[.toaster]:block opacity-0 group-has-[.toast]:opacity-100 transition-opacity rounded-full bg-muted/80 backdrop-blur-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm"
      title="Limpar todas as notificações"
    >
      <span className="flex items-center gap-1">
        <X className="h-3 w-3" />
        Limpar tudo
      </span>
    </button>
  );
}

export { Toaster };
