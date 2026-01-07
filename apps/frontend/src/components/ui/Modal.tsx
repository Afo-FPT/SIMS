import { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;

  // ưu tiên dùng size (dễ xài)
  size?: 'md' | 'lg' | 'xl' | 'full';

  // nếu bạn muốn tự set tailwind max-w-... thì truyền prop này
  // ví dụ: "max-w-6xl" hoặc "max-w-[95vw]"
  maxWidth?: string;
}

const SIZE_TO_MAXWIDTH: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  maxWidth,
}: ModalProps) {
  if (!isOpen) return null;

  const widthClass = maxWidth ?? SIZE_TO_MAXWIDTH[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className={[
          'bg-white rounded-lg shadow-xl w-full',
          widthClass,
          'max-h-[90vh] overflow-y-auto overflow-x-hidden',
        ].join(' ')}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
