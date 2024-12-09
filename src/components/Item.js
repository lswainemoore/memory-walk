import {
  FaPencilAlt,
  FaTrash,
  FaMapMarkerAlt,
  FaBars,
} from "react-icons/fa";
import ReactMarkdown from "react-markdown";

import PositionSelector from "./PositionSelector";

const Item = ({
  item,
  index,
  isEditing,
  isSelected,
  editText,
  editClue,
  onEditChange,
  onEditSubmit,
  onEditClick,
  onDelete,
  onCancelEdit,
  onMapClick,
  isSelectedForMapping,
  onDragStart,
  onDrop,
  onDragEnd,
  onItemClick,
  handleImageUpload,
  isMobile,
  totalItems,
  onListDrop,
}) => {
  return (
    <li
      className={`list-none mb-4 rounded-lg bg-white p-4 shadow-md transition-all duration-200 
    ${isSelectedForMapping ? "ring-2 ring-blue-500 bg-blue-50" : ""} 
    ${isSelected ? "md:ring-2 md:ring-blue-500 md:shadow-lg" : ""}
    hover:shadow-lg`}
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", index.toString());
        onDragStart(e, index);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
        onDrop(sourceIndex, index);
      }}
    >
      {isEditing ? (
        <form onSubmit={onEditSubmit} className="space-y-3">
          <input
            type="text"
            name="editText"
            value={editText}
            onChange={onEditChange}
            className="w-full rounded border p-2"
            placeholder="Item title"
          />
          <div className="space-y-2">
            <textarea
              name="editClue"
              value={editClue}
              onChange={onEditChange}
              onPaste={async (e) => {
                const items = e.clipboardData.items;
                for (let item of items) {
                  if (item.type.startsWith("image")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                      await handleImageUpload(file, editClue, onEditChange);
                    }
                    break;
                  }
                }
              }}
              className="h-32 w-full rounded border p-2 font-mono text-sm"
              placeholder="Add details with Markdown..."
            />
            <div className="flex space-x-2">
              <label className="cursor-pointer rounded bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
                📁 Add Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleImageUpload(file, editClue, onEditChange);
                    }
                  }}
                />
              </label>
              <label className="cursor-pointer rounded bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
                📷 Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleImageUpload(file, editClue, onEditChange);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-4">
          {isMobile ? (
            <PositionSelector
              currentPosition={index}
              totalItems={totalItems}
              onReorder={(from, to) => onListDrop(from, to)} // Use onListDrop here
            />
          ) : (
            <div className="flex items-center gap-2">
              <FaBars className="cursor-move text-gray-400" />
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                {index + 1}
              </div>
            </div>
          )}
          <div
            className="flex-grow cursor-pointer"
            onClick={() => onItemClick(index)}
          >
            <div className="flex text-start justify-between">
              <span className="text-lg font-medium">{item.text}</span>
              <div className="flex items-center space-x-2">
                <div className="relative group">
                  <FaMapMarkerAlt
                    onClick={(e) => {
                      e.stopPropagation();
                      onMapClick(index);
                    }}
                    className={`cursor-pointer transition-colors duration-200 ${
                      isSelectedForMapping
                        ? "text-yellow-500"
                        : item.location != null
                          ? "text-blue-500"
                          : "text-gray-400"
                    }`}
                  />
                  {item.location && (
                    <div className="absolute -top-8 right-0 hidden group-hover:block">
                      <div className="rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap">
                        [{item.location.lat.toFixed(4)},{" "}
                        {item.location.lng.toFixed(4)}]
                      </div>
                    </div>
                  )}
                </div>
                <FaPencilAlt
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick();
                  }}
                  className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors duration-200"
                />
                <FaTrash
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors duration-200"
                />
              </div>
            </div>
            {item.clue && (
              <div className="mt-3 prose prose-sm max-w-none border-t pt-3 text-start">
                <ReactMarkdown
                  urlTransform={(value) => {
                    // If it's a stored image URL, leave it as is
                    if (value.startsWith("stored:")) return value;
                    // Otherwise, use the original urlTransform behavior
                    return value;
                  }}
                >
                  {item.clue}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

export default Item;
