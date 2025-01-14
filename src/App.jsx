import { useState, useEffect, useRef } from "react";
import { parse } from 'csv-parse/sync';
import L from 'leaflet';

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

import ConflictModal from "./components/ConflictModal";
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

// const clearAllData = async () => {
//   try {
//     await saveToStorage([]); // Save empty array to clear data
//   } catch (error) {
//     console.error("Error clearing data:", error);
//     throw error;
//   }
// };

const saveToStorage = async (items, projectId, expectedModifiedTime) => {
  try {
    const currentTime = new Date().toISOString();
    let created = currentTime;

    if (expectedModifiedTime) {
      // Only do the version check if we have an expectedModifiedTime
      const currentData = await loadFromStorage(projectId);
      if (currentData?.modified !== expectedModifiedTime) {
        console.log("Version mismatch:", {
          expected: expectedModifiedTime,
          actual: currentData?.modified,
        });
        throw new Error("Data has been modified since last fetch");
      }
      created = currentData?.created || currentTime;
    }

    const data = {
      items: items,
      created,
      modified: currentTime,
    };

    const response = await fetch(`/api/items?project=${projectId}`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, modified: currentTime };
  } catch (error) {
    console.error("Error saving to storage:", error);
    throw error;
  }
};

const loadFromStorage = async (projectId) => {
  try {
    const response = await fetch(`/api/items?project=${projectId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data) return null;

    // Log metadata for debugging
    console.log("Project metadata:", {
      created: new Date(data.created).toLocaleString(),
      modified: new Date(data.modified).toLocaleString(),
      itemCount: data.items?.length || 0,
    });

    return data;
  } catch (error) {
    console.error("Error loading from storage:", error);
    return null;
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

const MapBoundsHandler = ({ items }) => {
  const map = useMap();
  const hasFramed = useRef(false);

  useEffect(() => {
    // Only frame the map if we haven't done it yet and we have items with locations
    if (!hasFramed.current) {
      const itemsWithLocations = items.filter(item => item.location);
      
      if (itemsWithLocations.length > 0) {
        // Create bounds object from all marker positions
        const bounds = itemsWithLocations.reduce((bounds, item) => {
          const latLng = [item.location.lat, item.location.lng];
          return bounds.extend(latLng);
        }, new L.LatLngBounds(
          [itemsWithLocations[0].location.lat, itemsWithLocations[0].location.lng]
        ));
        
        // Fit the map to the bounds with some padding
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16
        });
        
        hasFramed.current = true;
      }
    }
  }, [items, map]);

  return null;
};

const importCsv = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const records = parse(text, {
          skip_empty_lines: true,
          trim: true,
          columns: false,
          from: 2  // Skip the header row
        });
        
        const items = records
          .filter(row => row[0]) // Filter out rows with empty first column
          .map(row => createItem(
            row[0],           // text
            row[1] || ''     // clue (optional)
          ));
        
        resolve(items);
      } catch (error) {
        reject(new Error('Error parsing CSV file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};

function App() {
  const [items, setItems] = useState([]);
  const [lastModified, setLastModified] = useState(null);
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
  const [showConflict, setShowConflict] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);

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
    const loadItems = async () => {
      const data = await loadFromStorage(projectId);
      setItems(data?.items || []);
      setLastModified(data?.modified || null);
      setIsLoading(false);
    };
    if (projectId) {
      loadItems();
    }
  }, [projectId]);

  const saveWithOverwrite = async (itemsToSave, skipVersionCheck = false) => {
    try {
      const result = await saveToStorage(
        itemsToSave,
        projectId,
        skipVersionCheck ? null : lastModified
      );
      setLastModified(result.modified);
    } catch (error) {
      if (
        !skipVersionCheck &&
        error.message === "Data has been modified since last fetch"
      ) {
        setShowConflict(true);
        setPendingSave(itemsToSave);
      } else {
        console.error(error);
      }
    }
  };

  useEffect(() => {
    if (!isLoading && projectId) {
      console.log("Saving items for project:", projectId);
      const itemsToSave = items.map((item) => ({
        id: item.id,
        text: item.text,
        clue: item.clue || "",
        location: item.location,
      }));
      saveWithOverwrite(itemsToSave);
    }
    // lincoln note: it's a bit funny to not have saveWithOverwrite here 
    // as a dependency, but I think ti would cause thrashing. it's a little unsafe to do like this
    // tbh, but I think it works fine? I think really we may need lastModified to be a ref.
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
          <MapBoundsHandler items={items} />
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
            projectId={projectId} 
            onLoadProject={loadProject}
            onImportCsv={async (file) => {
              try {
                const newItems = await importCsv(file);
                setItems(prevItems => [...prevItems, ...newItems]);
              } catch (error) {
                console.error('Import failed:', error);
                alert('Failed to import CSV: ' + error.message);
              }
            }}
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
      <MobileToolbar projectId={projectId} onLoadProject={loadProject} />
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
      <ConflictModal
        isOpen={showConflict}
        onClose={() => setShowConflict(false)}
        onRefresh={async () => {
          setShowConflict(false);
          setPendingSave(null);
          const data = await loadFromStorage(projectId);
          setItems(data?.items || []);
          setLastModified(data?.modified || null);
        }}
        onOverwrite={async () => {
          if (pendingSave) {
            await saveWithOverwrite(pendingSave, true); // Skip version check
            setShowConflict(false);
            setPendingSave(null);
          }
        }}
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
// x put the images in properly named folders
// - clear data (images + json)
// x metadata (created, updated)
// - user-settable project metadata (title, description)
// - deal with conflicts (check version id we're overwriting is right, then decide.
//   alternatively, use modified time)
// - zoom to where there are markers
// - add the csv import back in
// - right now the conflict resolution is a little aggressive, because I think we
//   write when we load first. so we should be less aggressive about that, or actually check for changes.
