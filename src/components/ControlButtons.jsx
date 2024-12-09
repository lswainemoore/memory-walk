import { useState } from "react";
import { FaFolderOpen, FaFileAlt } from "react-icons/fa";
import ProjectModal from "./ProjectModal";
import { generateProjectId } from "../utils";

const ControlButtons = ({ projectId, onLoadProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNewProject = () => {
    onLoadProject(generateProjectId());
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
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadProject={onLoadProject}
      />
    </div>
  );
};

export default ControlButtons;
