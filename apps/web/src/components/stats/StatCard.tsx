import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "indigo" | "purple" | "green" | "blue" | "red";
  subtext?: string;
  subtextIcon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  subtext,
  subtextIcon,
}) => {
  const colorClasses = {
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      text: "text-indigo-700",
      title: "text-indigo-900",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      subtextColor: "text-indigo-600",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-100",
      text: "text-purple-700",
      title: "text-purple-900",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      subtextColor: "text-purple-600",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-100",
      text: "text-green-700",
      title: "text-green-900",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      subtextColor: "text-green-600",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      text: "text-blue-700",
      title: "text-blue-900",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      subtextColor: "text-blue-600",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-100",
      text: "text-red-700",
      title: "text-red-900",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      subtextColor: "text-red-600",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} rounded-lg p-4 border ${classes.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`${classes.text} text-sm font-medium mb-1`}>{title}</p>
          <h4 className={`text-2xl font-bold ${classes.title}`}>{value}</h4>
        </div>
        <div className={`${classes.iconBg} p-2 rounded-lg`}>
          <div className={classes.iconColor}>{icon}</div>
        </div>
      </div>
      {subtext && (
        <p className={`${classes.subtextColor} text-sm mt-2 flex items-center`}>
          {subtextIcon && <span className="mr-1">{subtextIcon}</span>}
          {subtext}
        </p>
      )}
    </div>
  );
};
