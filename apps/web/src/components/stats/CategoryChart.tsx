import React from "react";
import { ProgressBar } from "../ui/ProgressBar";

export interface CategoryData {
  name: string;
  count: number;
  percentage: number;
}

interface CategoryChartProps {
  data: CategoryData[];
  title?: string;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({
  data,
  title,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="font-medium text-gray-700">
          {title || "Category Distribution"}
        </h4>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {data.map((item, index) => (
            <ProgressBar
              key={index}
              label={item.name}
              value={item.count}
              progress={item.percentage}
              color="indigo"
              height="md"
              animate={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
