import React from "react";
import { DetailsFormProps } from "../../types/media";

export const DetailsForm: React.FC<DetailsFormProps> = ({
  title,
  description,
  category,
  categories,
  disabled,
  onChange,
}) => (
  <div className="space-y-5">
    <div>
      <label className="block text-base font-semibold mb-2">
        Title <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => onChange("title", e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        required
        disabled={disabled}
      />
    </div>

    <div>
      <label className="block text-base font-semibold mb-2">Description</label>
      <textarea
        value={description}
        onChange={(e) => onChange("description", e.target.value)}
        rows={4}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
      />
    </div>

    <div>
      <label className="block text-base font-semibold mb-2">Category</label>
      <select
        value={category}
        onChange={(e) => onChange("category", e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
      >
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  </div>
);
