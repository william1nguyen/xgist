interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
      <div className="min-h-screen px-4 py-8 overflow-y-auto">
        <div className="flex items-start justify-center">
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl my-8">
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
