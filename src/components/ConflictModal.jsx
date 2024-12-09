export default function ConflictModal({ isOpen, onClose, onOverwrite, onRefresh }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Version Conflict</h2>
        <p className="mb-4">
          This project has been modified elsewhere. Would you like to:
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Get Latest Version
          </button>
          <button
            onClick={onOverwrite}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Overwrite with My Version
          </button>
        </div>
      </div>
    </div>
  );
}