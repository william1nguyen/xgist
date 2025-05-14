import React from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  className = "",
}) => {
  return (
    <div
      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
        checked ? "bg-indigo-600" : "bg-gray-200"
      } transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer ${className}`}
      onClick={() => onCheckedChange(!checked)}
    >
      <span
        className={`${
          checked ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </div>
  );
};
