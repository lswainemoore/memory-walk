import ControlButtons from "./ControlButtons";

const MobileToolbar = ({ projectId, onLoadProject }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b md:hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Memory Lane</h1>
          <ControlButtons projectId={projectId} onLoadProject={onLoadProject} />
        </div>
      </div>
    </div>
  );
};

export default MobileToolbar;
