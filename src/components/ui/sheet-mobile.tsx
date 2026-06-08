// M2 — iOS-native bottom-sheet powered by `vaul`. Drag handle, snap to height,
// dismiss by swipe-down. Use this instead of `Dialog` for any modal that should
// feel like a real iPhone sheet (Help, Settings sub-panels, Add-Payment, etc.).
import { Drawer } from "vaul";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Snap points as fractions of viewport height. Default = [0.6, 0.9]. */
  snapPoints?: Array<number | string>;
};

export const MobileSheet = ({ open, onClose, title, description, children, snapPoints }: Props) => (
  <Drawer.Root
    open={open}
    onOpenChange={(o) => !o && onClose()}
    shouldScaleBackground
    snapPoints={snapPoints}
  >
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
      <Drawer.Content
        className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[24px] bg-background outline-none
                   shadow-[0_-12px_40px_rgba(0,0,0,0.25)]"
      >
        {/* iOS drag handle */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/40" aria-hidden />
        <div className="px-5 pt-3 pb-2">
          {title && <Drawer.Title className="text-lg font-semibold text-foreground">{title}</Drawer.Title>}
          {description && (
            <Drawer.Description className="text-xs text-muted-foreground mt-1">
              {description}
            </Drawer.Description>
          )}
        </div>
        <div className="px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] overflow-y-auto">{children}</div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);
