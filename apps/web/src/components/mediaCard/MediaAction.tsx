import React from "react";
import { Trash, Edit, Presentation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MediaActionProps } from "../../types/media";

export const MediaActions: React.FC<MediaActionProps> = ({
  onEdit,
  onCreateAIPresenter,
  onDelete,
}) => {
  const { t } = useTranslation(["videos"]);

  return (
    <div
      className="flex items-center space-x-3"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="p-1.5 text-gray-400 hover:text-gray-700 flex items-center"
        onClick={onEdit}
      >
        <Edit size={16} className="mr-1" />
        <span className="text-xs">{t("actions.edit")}</span>
      </button>

      <button
        className="p-1.5 text-gray-400 hover:text-gray-700 flex items-center"
        onClick={onCreateAIPresenter}
      >
        <Presentation size={16} className="mr-1" />
        <span className="text-xs">{t("actions.create_presenter")}</span>
      </button>

      <button
        className="p-1.5 text-gray-400 hover:text-red-500 flex items-center"
        onClick={onDelete}
      >
        <Trash size={16} className="mr-1" />
        <span className="text-xs">{t("actions.delete")}</span>
      </button>
    </div>
  );
};
