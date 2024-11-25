import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaPencilAlt,
  FaTrash,
  FaMapMarkerAlt,
  FaBars,
  FaFileExport,
  FaFileUpload,
  FaRedoAlt,
} from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useSwipeable } from "react-swipeable";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

import PositionSelector from "./PositionSelector";

import { openDB } from "idb";

// Add these constants and functions before the App component:
const DB_NAME = "memoryLaneDB";
const DB_VERSION = 1;
const ITEMS_STORE = "items";
const IMAGES_STORE = "images";

const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(ITEMS_STORE)) {
        db.createObjectStore(ITEMS_STORE);
      }
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE);
      }
    },
  });
  return db;
};

const clearAllData = async () => {
  const db = await initDB();

  // Clear all stores
  await Promise.all([db.clear(ITEMS_STORE), db.clear(IMAGES_STORE)]);
};

const saveToIndexedDB = async (items) => {
  try {
    const db = await initDB();
    // console.log(
    //   "Saving items:",
    //   items.map((i) => ({
    //     id: i.id,
    //     text: i.text,
    //     hasClue: !!i.clue,
    //     clueLength: i.clue?.length,
    //   }))
    // );
    await db.put(ITEMS_STORE, items, "items");
  } catch (error) {
    console.error("Error saving to IndexedDB:", error);
  }
};

const loadFromIndexedDB = async () => {
  try {
    const db = await initDB();
    const items = (await db.get(ITEMS_STORE, "items")) || [];
    console.log(
      "Loaded items:",
      items.map((i) => ({
        id: i.id,
        text: i.text,
        hasClue: !!i.clue,
        clueLength: i.clue?.length,
      }))
    );
    return items;
  } catch (error) {
    console.error("Error loading from IndexedDB:", error);
    return [];
  }
};

const saveImageToIndexedDB = async (imageId, imageBlob) => {
  const db = await initDB();
  await db.put(IMAGES_STORE, imageBlob, imageId);
  return imageId;
};

const loadImageFromIndexedDB = async (imageId) => {
  const db = await initDB();
  const imageBlob = await db.get(IMAGES_STORE, imageId);
  if (imageBlob) {
    return URL.createObjectURL(imageBlob);
  }
  return null;
};

const processStoredImages = async (markdown) => {
  if (!markdown) return markdown;

  const regex = /!\[([^\]]*)\]\(stored:([^)]+)\)/g;
  let match;
  let processedMarkdown = markdown;

  while ((match = regex.exec(markdown)) !== null) {
    const [fullMatch, altText, imageId] = match;
    const imageUrl = await loadImageFromIndexedDB(imageId);
    if (imageUrl) {
      processedMarkdown = processedMarkdown.replace(
        fullMatch,
        `![${altText}](${imageUrl})`
      );
    }
  }

  return processedMarkdown;
};

const findImagesInItems = (items) => {
  const imageMap = new Map();
  const regex = /!\[([^\]]*)\]\(stored:([^)]+)\)/g;

  items.forEach((item, index) => {
    if (item.clue) {
      let match;
      while ((match = regex.exec(item.clue)) !== null) {
        const [fullMatch, altText, imageId] = match;
        imageMap.set(imageId, {
          itemIndex: index,
          itemText: item.text,
          altText,
        });
      }
    }
  });

  return imageMap;
};

// Now modify the exportData function
const exportData = async () => {
  try {
    // Get all data from IndexedDB
    const db = await initDB();
    const items = (await db.get(ITEMS_STORE, "items")) || [];

    // Debug: Log some items info
    console.log(`Total items: ${items.length}`);
    console.log("Items with clues:", items.filter((item) => item.clue).length);

    // Get image mapping
    const imageMap = findImagesInItems(items);
    console.log(
      "Found images:",
      Array.from(imageMap.entries()).map(([id, info]) => ({
        id,
        itemText: info.itemText,
        altText: info.altText,
      }))
    );

    // Create export bundle with images
    const images = {};
    for (const [imageId, info] of imageMap.entries()) {
      const imageBlob = await db.get(IMAGES_STORE, imageId);
      if (imageBlob) {
        const properBlob = new Blob([imageBlob], {
          type: imageBlob.type || "image/jpeg",
        });
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(properBlob);
        });
        images[imageId] = base64;
        console.log(`Processed image ${imageId} from item "${info.itemText}"`);
      } else {
        console.warn(
          `Image ${imageId} referenced in item "${info.itemText}" not found in storage`
        );
      }
    }

    const exportBundle = {
      version: 1,
      timestamp: new Date().toISOString(),
      items,
      images,
    };

    // Debug: Log export info
    console.log("Export bundle:", {
      itemCount: items.length,
      imageCount: Object.keys(images).length,
      itemsWithClues: items.filter((item) => item.clue).length,
      totalBundleSize: JSON.stringify(exportBundle).length,
    });

    // Create and download file
    const blob = new Blob([JSON.stringify(exportBundle)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memory-lane-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      imageCount: Object.keys(images).length,
      itemCount: items.length,
      itemsWithClues: items.filter((item) => item.clue).length,
    };
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
};

const handleExport = async () => {
  try {
    const result = await exportData();
    alert(
      `Export successful!\nExported ${result.itemCount} items and ${result.imageCount} images.`
    );
  } catch (error) {
    alert("Export failed: " + error.message);
  }
};

const importData = async (file) => {
  try {
    const text = await file.text();
    const fileType = file.name.split('.').pop().toLowerCase();

    if (fileType === 'json') {
      const importBundle = JSON.parse(text);

      // Version check
      if (!importBundle.version || importBundle.version !== 1) {
        throw new Error("Unsupported export version");
      }

      // Clear existing data
      const db = await initDB();
      await Promise.all([db.clear(ITEMS_STORE), db.clear(IMAGES_STORE)]);

      // Import images first
      for (const [imageId, base64] of Object.entries(importBundle.images)) {
        const response = await fetch(base64);
        const blob = await response.blob();
        await db.put(IMAGES_STORE, blob, imageId);
      }

      // Import items
      await db.put(ITEMS_STORE, importBundle.items, "items");

      return importBundle.items;
    } else if (fileType === 'csv') {
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const nameIndex = headers.indexOf('name');
      const clueIndex = headers.indexOf('clue');

      if (nameIndex === -1 || clueIndex === -1) {
        throw new Error("CSV must contain 'name' and 'clue' columns");
      }

      const items = rows.slice(1).map(row => createItem(row[nameIndex], row[clueIndex]));

      // Clear existing data
      const db = await initDB();
      await Promise.all([db.clear(ITEMS_STORE), db.clear(IMAGES_STORE)]);

      // Import items
      await db.put(ITEMS_STORE, items, "items");

      return items;
    } else {
      throw new Error("Unsupported file type");
    }
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
};

const createItem = (text, clue = "", location = null) => ({
  id: crypto.randomUUID(),
  text,
  clue,
  location,
});

const ControlButtons = ({ onImport, onReset, items }) => {
  const fileInputRef = useRef();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = async () => {
    setIsExporting(true);
    try {
      await handleExport();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-1">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/json,text/csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              await onImport(file);
              alert("Import successful!");
            } catch (error) {
              alert("Import failed: " + error.message);
            }
            e.target.value = "";
          }
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2"
        title="Import"
      >
        <FaFileUpload />
      </button>
      <button
        onClick={handleExportClick}
        disabled={isExporting}
        className="p-2"
        title="Export"
      >
        <FaFileExport />
      </button>
      {items?.length > 0 && (
        <button onClick={onReset} className="p-2" title="Reset">
          <FaRedoAlt />
        </button>
      )}
    </div>
  );
};

const MobileToolbar = ({ onImport, onReset, items }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm border-b md:hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Memory Lane</h1>
          <div className="flex items-center gap-2">
            <ControlButtons
              onImport={onImport}
              onReset={onReset}
              items={items}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

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
  isMobile,
  totalItems,
  onListDrop,
}) => {
  const [processedClue, setProcessedClue] = useState(item.clue);
  useEffect(() => {
    const processClue = async () => {
      if (item.clue) {
        const processed = await processStoredImages(item.clue);
        setProcessedClue(processed);
      } else {
        setProcessedClue("");
      }
    };
    processClue();
  }, [item.clue]);

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
            <div className="flex items-center justify-between">
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
                <ReactMarkdown
                  urlTransform={(value) => {
                    // If it's a stored image URL, leave it as is
                    if (value.startsWith("stored:")) return value;
                    // Otherwise, use the original urlTransform behavior
                    return value;
                  }}
                >
                  {processedClue}
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
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const loadItems = async () => {
      const loadedItems = await loadFromIndexedDB();
      setItems(loadedItems);
      // Auto-select first item if we have items and nothing is selected
      if (loadedItems.length > 0 && !selectedId) {
        setSelectedId(loadedItems[0].id);
      }
      setIsLoading(false);
    };
    loadItems();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      console.log("Triggering save for items:", items.length);
      // Ensure we're saving the complete item objects
      const itemsToSave = items.map((item) => ({
        id: item.id,
        text: item.text,
        clue: item.clue || "", // Ensure clue is at least an empty string
        location: item.location,
      }));
      saveToIndexedDB(itemsToSave);
    }
  }, [items, isLoading]);

  const handleImageUpload = async (file, editClue, onEditChange) => {
    try {
      // Generate a unique ID for the image
      const imageId = `image-${crypto.randomUUID()}`;

      // Save the image to IndexedDB
      await saveImageToIndexedDB(imageId, file);

      // Create a temporary URL for immediate display
      const tempUrl = URL.createObjectURL(file);
      setTempUrls((prev) => new Set(prev).add(tempUrl));

      // Add a special marker in the markdown to identify our stored images
      const imageMarkdown = `\n![${file.name}](stored:${imageId})\n`;

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
    const newItem = createItem(newItemName);
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
    setEditIndex(null);

    // Find the index of the item to scroll to
    // TODO I don't think this is working...
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
      selectedForMapping !== null &&
      selectedForMapping >= 0 &&
      selectedForMapping < items.length
    ) {
      // Handle setting location (existing functionality)
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
    } else {
      // Deselect when clicking empty map space
      setSelectedId(null);
      setSelectedForMapping(null);
      setEditIndex(null);
    }
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

  const handleImport = async (file) => {
    if (window.confirm("Importing will replace all current data. Continue?")) {
      try {
        const importedItems = await importData(file);
        setItems(importedItems);
        if (importedItems.length > 0) {
          setSelectedId(importedItems[0].id);
        }
      } catch (error) {
        console.error("Import failed:", error);
        throw error;
      }
    }
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
    setEditIndex(null);
  };

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This cannot be undone!"
      )
    ) {
      try {
        // Clear IndexedDB
        await clearAllData();

        // Reset all state
        setItems([]);
        setSelectedId(null);
        setEditIndex(null);
        setEditText("");
        setEditClue("");
        setSelectedForMapping(null);

        // Clear any temporary URLs
        tempUrls.forEach((url) => URL.revokeObjectURL(url));
        setTempUrls(new Set());

        alert("All data has been cleared successfully.");
      } catch (error) {
        console.error("Error clearing data:", error);
        alert("There was an error clearing the data. Please try again.");
      }
    }
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Memory Lane</h1>
          <ControlButtons
            onImport={handleImport}
            onReset={handleReset}
            items={items}
          />
        </div>
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
          <ol className="space-y-4 m-1">
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
                totalItems={items.length}
              />
            ))}
          </ol>
        </div>
      </div>
      <MobileToolbar
        onImport={handleImport}
        onReset={handleReset}
        items={items}
      />
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
        onListDrop={handleListDrop}
      />
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
}

export default App;
