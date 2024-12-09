import { useState, useEffect, useRef } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";

import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

import "./App.css";

import ControlButtons from "./components/ControlButtons";
import MobileDrawer from "./components/MobileDrawer";
import MobileToolbar from "./components/MobileToolbar";
import Item from "./components/Item";
import { generateProjectId } from "./utils";

const PROJECT_ID_KEY = "memoryLaneProjectId";

const getStoredProjectId = () => {
  return localStorage.getItem(PROJECT_ID_KEY);
};

const setStoredProjectId = (projectId) => {
  localStorage.setItem(PROJECT_ID_KEY, projectId);
  return projectId;
};

const clearAllData = async () => {
  try {
    await saveToStorage([]); // Save empty array to clear data
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
};

const saveToStorage = async (items, projectId) => {
  try {
    const response = await fetch(`/api/items?project=${projectId}`, {
      method: "POST",
      body: JSON.stringify(items),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error saving to storage:", error);
    throw error;
  }
};

const loadFromStorage = async (projectId) => {
  try {
    const response = await fetch(`/api/items?project=${projectId}`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const items = await response.json();
    console.log(
      "Loaded items for project",
      projectId,
      items?.map((i) => ({
        id: i.id,
        text: i.text,
        hasClue: !!i.clue,
        clueLength: i.clue?.length,
      }))
    );
    return items || [];
  } catch (error) {
    console.error("Error loading from storage:", error);
    return [];
  }
};

const saveImageToStorage = async (projectId, file) => {
  try {
    const filename = `${projectId}/${file.name}`;
    const response = await fetch(`/api/image/upload?filename=${filename}`, {
      method: "POST",
      body: file,
    });
    const newBlob = await response.json();
    return newBlob.url;
  } catch (error) {
    console.error("Error uploading to blob storage:", error);
    throw error;
  }
};

// const exportData = async () => {
//   try {
//     const itemsUrl = getItemsUrl();
//     const response = await fetch(itemsUrl);
//     const items = await response.json();

//     const exportBundle = {
//       version: 1,
//       timestamp: new Date().toISOString(),
//       items,
//     };

//     const blob = new Blob([JSON.stringify(exportBundle)], {
//       type: "application/json",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `memory-lane-export-${new Date().toISOString().slice(0, 10)}.json`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);

//     return {
//       success: true,
//       itemCount: items.length,
//       itemsWithClues: items.filter((item) => item.clue).length,
//     };
//   } catch (error) {
//     console.error("Export failed:", error);
//     throw error;
//   }
// };

// const handleExport = async () => {
//   try {
//     const result = await exportData();
//     alert(`Export successful!\nExported ${result.itemCount} items.`);
//   } catch (error) {
//     alert("Export failed: " + error.message);
//   }
// };

const importData = async (file) => {
  try {
    const text = await file.text();
    const fileType = file.name.split(".").pop().toLowerCase();

    if (fileType === "json") {
      const importBundle = JSON.parse(text);

      // Version check
      if (!importBundle.version || importBundle.version !== 1) {
        throw new Error("Unsupported export version");
      }

      // Save items to storage
      await saveToStorage(importBundle.items);

      return importBundle.items;
    } else if (fileType === "csv") {
      const rows = text.split("\n").map((row) => row.split(","));
      const headers = rows[0];
      const nameIndex = headers.indexOf("name");
      const clueIndex = headers.indexOf("clue");

      if (nameIndex === -1 || clueIndex === -1) {
        throw new Error("CSV must contain 'name' and 'clue' columns");
      }

      const items = rows
        .slice(1)
        .map((row) => createItem(row[nameIndex], row[clueIndex]));

      // Save items to storage
      await saveToStorage(items);

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

const MapEventHandler = ({ onMapClick, onMapDrop }) => {
  const map = useMap();

  // TODO this should really be behind a button. also we should use the points
  // themselves when we can.
  useEffect(() => {
    map
      .locate()
      .on("locationfound", (e) => {
        map.setView(e.latlng, map.getZoom());
      })
      .on("locationerror", (e) => {
        console.warn("Location access denied");
      });
  }, [map]);

  useEffect(() => {
    // Get the container element
    const container = map.getContainer();

    // Define event handlers
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const index = e.dataTransfer.getData("text/plain");
      if (index) {
        const point = map.mouseEventToLatLng(e);
        onMapDrop(parseInt(index), point);
      }
    };

    // Add event listeners
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
    };
  }, [map, onMapDrop]);

  // Handle regular map clicks
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });

  return null;
};

function App() {
  const [items, setItems] = useState([]);
  const [projectId, setProjectId] = useState(null);
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

  useEffect(() => {
    const storedId = getStoredProjectId();
    if (storedId) {
      setProjectId(storedId);
    } else {
      const newId = generateProjectId();
      setStoredProjectId(newId);
      setProjectId(newId);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      const loadItems = async () => {
        const loadedItems = await loadFromStorage(projectId);
        setItems(loadedItems);
        setIsLoading(false);
      };
      loadItems();
    }
  }, [projectId]);

  useEffect(() => {
    if (!isLoading && projectId) {
      console.log("Saving items for project:", projectId);
      const itemsToSave = items.map((item) => ({
        id: item.id,
        text: item.text,
        clue: item.clue || "",
        location: item.location,
      }));
      saveToStorage(itemsToSave, projectId).catch(console.error);
    }
  }, [items, isLoading, projectId]);

  const loadProject = (newProjectId) => {
    setStoredProjectId(newProjectId);
    setProjectId(newProjectId);
    setIsLoading(true);
  };

  const handleImageUpload = async (file, editClue, onEditChange) => {
    try {
      const imageUrl = await saveImageToStorage(projectId, file);

      // Add the image URL directly to the markdown
      const imageMarkdown = `\n![${file.name}](${imageUrl})\n`;

      onEditChange({
        target: {
          name: "editClue",
          value: editClue + imageMarkdown,
        },
      });
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to upload image. Please try again.");
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
            projectId={projectId}
            onLoadProject={loadProject}
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
        projectId={projectId}
        onLoadProject={loadProject}
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

// TODO
// - put the images in properly named folders
// - clear data (images + json)
// - metadata (title, created, updated)
// - deal with conflicts (check version id we're overwriting is right, then decide.
//   alternatively, use modified time)
