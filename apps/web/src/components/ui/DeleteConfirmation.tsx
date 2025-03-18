import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { useTranslation } from "react-i18next";

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
  itemType: string;
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
  itemType,
}) => {
  const { t } = useTranslation(["common"]);

  const icon = (
    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
      <AlertTriangle className="text-red-600" size={24} />
    </div>
  );

  const actions = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
      >
        {t("cancel")}
      </button>
      <button
        onClick={onConfirm}
        className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700"
      >
        {t("delete")}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("deleteConfirmation.title")}
      icon={icon}
      actions={actions}
    >
      <p className="text-center text-gray-500">
        {t("deleteConfirmation.message", {
          count: itemCount,
          type: t(`itemTypes.${itemType}`, { count: itemCount }),
        })}
      </p>
    </Modal>
  );
};
