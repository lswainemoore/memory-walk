import { useState } from "react";
import { FaFolderOpen, FaTimes } from "react-icons/fa";

export default function ProjectModal({ isOpen, onClose, onLoadProject }) {
  const [projectInput, setProjectInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectInput.trim()) {
      onLoadProject(projectInput.trim());
      setProjectInput("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Load Project</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project ID
            </label>
            <input
              type="text"
              value={projectInput}
              onChange={(e) => setProjectInput(e.target.value)}
              placeholder="Enter project ID"
              className="w-full rounded border p-2 text-sm"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Load Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
