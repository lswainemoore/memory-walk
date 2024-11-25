import { useState, useEffect } from "react";
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
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

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
  handleImageUpload,
}) => {
  return (
    <li
      className={`mb-4 rounded-lg bg-white p-4 shadow-md transition-all duration-200 ${
        isSelectedForMapping ? "ring-2 ring-blue-500 bg-blue-50" : ""
      } hover:shadow-lg`}
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
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaBars className="cursor-move text-gray-400" />
                <span className="text-lg font-medium">{item.text}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative group">
                  <FaMapMarkerAlt
                    onClick={() => onMapClick(index)}
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
                  onClick={onEditClick}
                  className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors duration-200"
                />
                <FaTrash
                  onClick={onDelete}
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
  const [newItem, setNewItem] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [editClue, setEditClue] = useState("");
  const [mapCenter] = useState([51.505, -0.09]);
  const [zoom] = useState(13);
  const [selectedForMapping, setSelectedForMapping] = useState(null);

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
    setNewItem(e.target.value);
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
    if (newItem.trim() === "") return;
    setItems([...items, { text: newItem, clue: "", location: null }]);
    setNewItem("");
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
  };

  const handleEditClick = (index) => {
    if (index < 0 || index >= items.length) return;
    setEditIndex(index);
    setEditText(items[index].text);
    setEditClue(items[index].clue || "");
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditText("");
    setEditClue("");
  };

  const handleDelete = (index) => {
    if (index < 0 || index >= items.length) return;
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleMapItemSelect = (index) => {
    if (index < 0 || index >= items.length) return;
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

    updatedItems[selectedForMapping] = {
      ...updatedItems[selectedForMapping],
      location: e.latlng,
    };
    setItems(updatedItems);
    setSelectedForMapping(null);
  };

  const handleMapDrop = (index, latlng) => {
    if (index < 0 || index >= items.length) return;

    const updatedItems = [...items];
    if (!updatedItems[index]) return;

    updatedItems[index] = {
      ...updatedItems[index],
      location: latlng,
    };
    setItems(updatedItems);
  };

  const handleDragStart = (e, index) => {
    document.body.classList.add("dragging-item");
  };

  const handleDragEnd = () => {
    document.body.classList.remove("dragging-item");
  };

  // This is the key fix - simplify the list drop logic
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
  };

  const createCustomIcon = (index) => {
    return divIcon({
      className: `custom-marker marker-${index}`,
      html: `<div class="marker-index">${index + 1}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
  };

  const CustomPopup = ({ index, item }) => {
    return (
      <div className="popup-content min-w-[200px] max-w-[300px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-sm">
            {index + 1}
          </div>
          <strong className="text-gray-900">{item.text}</strong>
        </div>
        {item.clue && (
          <div className="prose prose-sm max-w-none border-t pt-2">
            <ReactMarkdown
              components={{
                img: ({ node, ...props }) => (
                  <img
                    {...props}
                    className="max-w-full h-auto rounded-lg shadow-sm my-2"
                    alt={props.alt || "Location image"}
                  />
                ),
                p: ({ node, ...props }) => <p {...props} className="my-2" />,
              }}
              urlTransform={(url) => {
                // Handle blob URLs correctly
                if (url.startsWith("blob:")) {
                  return url;
                }
                return url;
              }}
            >
              {item.clue}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="w-2/3 h-full">
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
          <MapEventHandler
            onMapClick={handleMapClick}
            onMapDrop={handleMapDrop}
          />
          {items.map(
            (item, index) =>
              item &&
              item.location && (
                <Marker
                  key={`${index}-${item.text}-marker`}
                  position={[item.location.lat, item.location.lng]}
                  icon={createCustomIcon(index)}
                >
                  <Popup>
                    <CustomPopup index={index} item={item} />
                  </Popup>
                </Marker>
              )
          )}
        </MapContainer>
      </div>

      <div className="w-1/3 h-full bg-white p-6 shadow-xl overflow-auto">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">
          Memory Walk
        </h1>
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              placeholder="Item"
              value={newItem}
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
        <div className="h-[calc(100vh-20rem)] overflow-y-auto">
          <ol className="space-y-4">
            {items.map((item, index) => (
              <Item
                key={`${index}-${item.text}`}
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
                onDragStart={handleDragStart}
                onDrop={handleListDrop}
                onDragEnd={handleDragEnd}
                handleImageUpload={handleImageUpload}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;
