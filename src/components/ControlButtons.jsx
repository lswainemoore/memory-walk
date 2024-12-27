import { useState, useRef } from "react";
import { FaFolderOpen, FaFileAlt, FaFileUpload } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import ProjectModal from "./ProjectModal";
import { generateProjectId } from "../utils";

const ControlButtons = ({ projectId, onLoadProject, onImportCsv }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleNewProject = () => {
    onLoadProject(generateProjectId());
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsImporting(true);
        await onImportCsv(file);
      } finally {
        setIsImporting(false);
        // Reset the input so the same file can be selected again
        e.target.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
        {projectId}
      </code>
      <button
        onClick={handleNewProject}
        className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
        title="New Project"
      >
        <FaFileAlt />
      </button>
      <button
        onClick={() => setIsModalOpen(true)}
        className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
        title="Load Project"
      >
        <FaFolderOpen />
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />
      <button
        onClick={handleImportClick}
        className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
        title="Upload CSV"
      >
        <FaFileUpload />
      </button>
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadProject={onLoadProject}
      />
    </div>
  );
};

export default ControlButtons;
