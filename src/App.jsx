import { useState, useEffect, useRef } from "react";
import { FaPencilAlt, FaTrash, FaMapMarkerAlt, FaBars } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useSwipeable } from "react-swipeable";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

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
}) => {
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const selectedItem = items.find((item) => item.id === selectedId);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (selectedIndex < items.length - 1) {
        onSelect(items[selectedIndex + 1].id);
      }
    },
    onSwipedRight: () => {
      if (selectedIndex > 0) {
        onSelect(items[selectedIndex - 1].id);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
    swipeDuration: 500,
    delta: 10,
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-lg md:hidden">
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

      {selectedItem && (
        <>
          {/* Subtle swipe indicators */}
          <div className="flex items-center justify-between px-4 py-2 text-sm font-medium">
            {selectedIndex > 0 ? (
              <div className="text-blue-500">←</div>
            ) : (
              <div className="w-4" />
            )}
            <div className="text-xs font-medium text-gray-500">
              {selectedIndex + 1} / {items.length}
            </div>
            {selectedIndex < items.length - 1 ? (
              <div className="text-blue-500">→</div>
            ) : (
              <div className="w-4" />
            )}
          </div>

          <div
            {...handlers}
            className="max-h-[calc(60vh-4rem)] overflow-y-auto px-4 pb-4"
          >
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
            />
          </div>
        </>
      )}
    </div>
  );
};

const MapEventHandler = ({ onMapClick, onMapDrop }) => {
  const map = useMap();

  useEffect(() => {
    map
      .locate()
      .on("locationfound", (e) => {
        map.flyTo(e.latlng, map.getZoom());
      })
      .on("locationerror", (e) => {
        console.warn("Location access denied");
      });
  }, [map]);

  // Get the container element
  const container = map.getContainer();

  // Add event listeners to the container
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const index = e.dataTransfer.getData("text/plain");
    if (index) {
      const point = map.mouseEventToLatLng(e);
      onMapDrop(parseInt(index), point);
    }
  });

  // Handle regular map clicks
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });

  return null;
};

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
            <div className="text-sm text-gray-600">
              Clue supports Markdown and images
            </div>
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
              placeholder="Add details with Markdown... (Paste images directly)"
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
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
            {index + 1}
          </div>
          <div
            className="flex-grow cursor-pointer"
            onClick={() => onItemClick(index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaBars className="cursor-move text-gray-400" />
                <span className="text-lg font-medium">{item.text}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative group">
                  <FaMapMarkerAlt
                    onClick={(e) => {
                      e.stopPropagation();
                      onMapClick(index);
                    }}
                    className={`cursor-pointer transition-colors duration-200 ${
                      isSelectedForMapping
                        ? "text-blue-500"
                        : "text-gray-400 hover:text-blue-500"
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
              <div className="mt-3 prose prose-sm max-w-none border-t pt-3">
                <ReactMarkdown urlTransform={(value) => value}>
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

function App() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [editClue, setEditClue] = useState("");
  const [mapCenter] = useState([51.505, -0.09]);
  const [zoom] = useState(13);
  const [selectedForMapping, setSelectedForMapping] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const itemsContainerRef = useRef(null);

  const [tempUrls, setTempUrls] = useState(new Set()); // Track URLs to revoke

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      tempUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [tempUrls]);

  const handleImageUpload = async (file, editClue, onEditChange) => {
    try {
      const tempUrl = URL.createObjectURL(file);
      setTempUrls((prev) => new Set(prev).add(tempUrl));

      const imageMarkdown = `\n![${file.name}](${tempUrl})\n`;
      onEditChange({
        target: {
          name: "editClue",
          value: editClue + imageMarkdown,
        },
      });
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  const handleChange = (e) => {
    setNewItemName(e.target.value);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === "editText") {
      setEditText(value);
    } else if (name === "editClue") {
      setEditClue(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newItemName.trim() === "") return;
    const newItem = {
      id: crypto.randomUUID(),
      text: newItemName,
      clue: "",
      location: null,
    };
    setItems([...items, newItem]);
    setSelectedId(newItem.id);
    setNewItemName("");
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editIndex === null || editIndex < 0 || editIndex >= items.length)
      return;

    const updatedItems = [...items];
    updatedItems[editIndex] = {
      ...items[editIndex],
      text: editText,
      clue: editClue,
    };
    setItems(updatedItems);
    setEditIndex(null);
    setEditText("");
    setEditClue("");
    // Selection remains unchanged after edit
  };

  const handleEditClick = (index) => {
    if (index < 0 || index >= items.length) return;
    const item = items[index];
    setEditIndex(index);
    setEditText(item.text);
    setEditClue(item.clue || "");
    setSelectedId(item.id);
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditText("");
    setEditClue("");
    // Selection remains unchanged after cancel
  };

  const handleDelete = (index) => {
    if (index < 0 || index >= items.length) return;
    const deletedId = items[index].id;
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    if (selectedId === deletedId) {
      setSelectedId(null);
    }
  };

  const handleSelect = (id) => {
    setSelectedId(id);

    // Find the index of the item to scroll to
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1 && itemsContainerRef.current) {
      const itemElement = itemsContainerRef.current.children[index];
      if (itemElement) {
        itemElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleMapItemSelect = (index) => {
    if (index < 0 || index >= items.length) return;
    const item = items[index];
    setSelectedId(item.id);
    setSelectedForMapping(selectedForMapping === index ? null : index);
  };

  const handleMapClick = (e) => {
    if (
      selectedForMapping === null ||
      selectedForMapping < 0 ||
      selectedForMapping >= items.length
    )
      return;

    const updatedItems = [...items];
    if (!updatedItems[selectedForMapping]) return;

    const item = updatedItems[selectedForMapping];
    updatedItems[selectedForMapping] = {
      ...item,
      location: e.latlng,
    };
    setItems(updatedItems);
    setSelectedId(item.id);
    setSelectedForMapping(null);
  };

  const handleMapDrop = (index, latlng) => {
    if (index < 0 || index >= items.length) return;

    const updatedItems = [...items];
    if (!updatedItems[index]) return;

    const item = updatedItems[index];
    updatedItems[index] = {
      ...item,
      location: latlng,
    };
    setItems(updatedItems);
    setSelectedId(item.id);
  };

  const handleDragStart = (e, index) => {
    const item = items[index];
    e.dataTransfer.setData("text/plain", index.toString());
    document.body.classList.add("dragging-item");
    setSelectedId(item.id);
  };

  const handleDragEnd = () => {
    document.body.classList.remove("dragging-item");
  };

  const handleListDrop = (sourceIndex, targetIndex) => {
    if (
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= items.length ||
      targetIndex >= items.length
    )
      return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);
    setItems(newItems);
    setSelectedId(movedItem.id);
  };

  const createCustomIcon = (id, isSelected) => {
    return divIcon({
      className: `custom-marker marker-${id}`,
      html: `<div class="marker-index ${isSelected ? "selected" : ""}">${
        items.findIndex((item) => item.id === id) + 1
      }</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
  };

  const onSelect = (id) => {
    setSelectedId(id);
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="flex-grow h-full md:w-2/3">
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapEventHandler
            onMapClick={handleMapClick}
            onMapDrop={handleMapDrop}
          />
          {items.map(
            (item) =>
              item?.location && (
                <Marker
                  key={item.id}
                  position={[item.location.lat, item.location.lng]}
                  icon={createCustomIcon(item.id, selectedId === item.id)}
                  eventHandlers={{
                    click: () => handleSelect(item.id),
                  }}
                />
              )
          )}
        </MapContainer>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-1/3 bg-white p-6 shadow-xl overflow-auto">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">
          Memory Walk
        </h1>
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              placeholder="Add new item"
              value={newItemName}
              onChange={handleChange}
              className="flex-1 rounded border p-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
            >
              Add
            </button>
          </form>
        </div>
        <div
          className="h-[calc(100vh-20rem)] overflow-y-auto"
          ref={itemsContainerRef}
        >
          <ol className="space-y-4">
            {items.map((item, index) => (
              <Item
                key={item.id}
                index={index}
                item={item}
                isEditing={editIndex === index}
                editText={editText}
                editClue={editClue}
                onEditChange={handleEditChange}
                onEditSubmit={handleEditSubmit}
                onEditClick={() => handleEditClick(index)}
                onDelete={() => handleDelete(index)}
                onCancelEdit={handleCancelEdit}
                onMapClick={handleMapItemSelect}
                isSelectedForMapping={selectedForMapping === index}
                isSelected={selectedId === item.id}
                onDragStart={handleDragStart}
                onDrop={handleListDrop}
                onDragEnd={handleDragEnd}
                handleImageUpload={handleImageUpload}
                onItemClick={() => handleSelect(item.id)}
              />
            ))}
          </ol>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        items={items}
        selectedId={selectedId}
        newItemName={newItemName}
        onNewItemNameChange={handleChange}
        onNewItemSubmit={handleSubmit}
        onEditChange={handleEditChange}
        onEditSubmit={handleEditSubmit}
        onEditClick={handleEditClick}
        onDelete={handleDelete}
        onCancelEdit={handleCancelEdit}
        onMapClick={handleMapItemSelect}
        selectedForMapping={selectedForMapping}
        handleImageUpload={handleImageUpload}
        editIndex={editIndex}
        editText={editText}
        editClue={editClue}
        onSelect={onSelect}
      />
    </div>
  );
}

export default App;
