import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  icon,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-30"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-lg max-w-md w-full mx-auto shadow-xl p-6">
        {icon && (
          <div className="flex items-center justify-center mb-4">{icon}</div>
        )}
        <h3 className="text-lg font-medium text-center text-gray-900 mb-2">
          {title}
        </h3>
        <div className="mb-6">{children}</div>
        {actions && (
          <div className="flex justify-center space-x-3">{actions}</div>
        )}
      </div>
    </div>
  );
};
