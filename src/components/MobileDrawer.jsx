import { useSwipeable } from "react-swipeable";

import Item from "./Item";

const MobileDrawer = ({
  items,
  selectedId,
  newItemName,
  onNewItemNameChange,
  onNewItemSubmit,
  onEditChange,
  onEditSubmit,
  onEditClick,
  onDelete,
  onCancelEdit,
  onMapClick,
  selectedForMapping,
  handleImageUpload,
  editIndex,
  editText,
  editClue,
  onSelect,
  onListDrop,
}) => {
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const selectedItem = items.find((item) => item.id === selectedId);

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onSelect(items[selectedIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (selectedIndex < items.length - 1) {
      onSelect(items[selectedIndex + 1].id);
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrevious,
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 10,
  });

  const handleToggle = () => {
    if (selectedId) {
      onSelect(null); // Collapse
    } else if (items.length > 0) {
      onSelect(items[0].id); // Expand and select first item
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-lg md:hidden">
      {/* Add handle for collapse/expand */}
      <div className="cursor-pointer hover:bg-gray-50" onClick={handleToggle}>
        <div className={`drawer-handle ${!selectedId ? "collapsed" : ""}`} />
      </div>

      <div className="px-4 py-3 border-b">
        <form onSubmit={onNewItemSubmit} className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={onNewItemNameChange}
            placeholder="Add new item"
            className="flex-1 rounded border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            className="rounded bg-blue-500 px-5 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            Add
          </button>
        </form>
      </div>

      {/* Wrap the item view in a transition */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          selectedId
            ? "max-h-[60vh] opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        {selectedItem && (
          <>
            <div className="flex items-center justify-between px-4 py-2 text-sm font-medium">
              {selectedIndex > 0 ? (
                <button
                  onClick={handlePrevious}
                  className="p-2 -mx-2 text-blue-500 hover:text-blue-600 focus:outline-none"
                >
                  ←
                </button>
              ) : (
                <div className="w-8" />
              )}
              <div className="text-xs font-medium text-gray-500">
                {selectedIndex + 1} / {items.length}
              </div>
              {selectedIndex < items.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="p-2 -mx-2 text-blue-500 hover:text-blue-600 focus:outline-none"
                >
                  →
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>

            <div {...handlers} className="overflow-y-auto px-4 pb-4">
              <Item
                item={selectedItem}
                index={selectedIndex}
                isEditing={editIndex === selectedIndex}
                editText={editText}
                editClue={editClue}
                onEditChange={onEditChange}
                onEditSubmit={onEditSubmit}
                onEditClick={() => onEditClick(selectedIndex)}
                onDelete={() => onDelete(selectedIndex)}
                onCancelEdit={onCancelEdit}
                onMapClick={() => onMapClick(selectedIndex)}
                isSelectedForMapping={selectedForMapping === selectedIndex}
                isSelected={true}
                handleImageUpload={handleImageUpload}
                totalItems={items.length}
                onListDrop={onListDrop}
                isMobile={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileDrawer;
