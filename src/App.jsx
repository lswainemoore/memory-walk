import { useState } from "react";
import { FaPencilAlt, FaTrash, FaMapMarkerAlt, FaBars } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

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
  onDragOver,
  onDrop,
}) => {
  return (
    <li 
      className={`mb-4 rounded-lg bg-white p-4 shadow-md ${isSelectedForMapping ? 'ring-2 ring-blue-500' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={(e) => onDrop(e, index)}
    >
      {isEditing ? (
        <form onSubmit={onEditSubmit} className="space-y-3">
          <input
            type="text"
            name="editText"
            value={editText}
            onChange={onEditChange}
            className="w-full rounded border p-2"
          />
          <textarea
            name="editClue"
            value={editClue}
            onChange={onEditChange}
            className="w-full rounded border p-2"
          />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBars className="cursor-move text-gray-400" />
            <div>
              <span className="text-lg">#{index + 1} {item.text}</span>
              {item.clue && (
                <span className="ml-2 text-gray-600">- {item.clue}</span>
              )}
              {item.location && (
                <span className="ml-2 text-sm text-blue-500">
                  [{item.location.lat.toFixed(2)}, {item.location.lng.toFixed(2)}]
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <FaMapMarkerAlt
              onClick={() => onMapClick(index)}
              className={`cursor-pointer ${isSelectedForMapping ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
            />
            <FaPencilAlt
              onClick={onEditClick}
              className="cursor-pointer text-gray-500 hover:text-blue-500"
            />
            <FaTrash
              onClick={onDelete}
              className="cursor-pointer text-gray-500 hover:text-red-500"
            />
          </div>
        </div>
      )}
    </li>
  );
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      console.log('Map clicked:', e.latlng);
      onMapClick(e);
    },
  });
  return null;
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
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Existing handlers stay the same...
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
    if (editIndex === null) return;
    const updatedItems = [...items];
    updatedItems[editIndex] = {
      ...updatedItems[editIndex],
      text: editText,
      clue: editClue
    };
    setItems(updatedItems);
    setEditIndex(null);
    setEditText("");
    setEditClue("");
  };

  const handleEditClick = (index) => {
    setEditIndex(index);
    setEditText(items[index].text);
    setEditClue(items[index].clue);
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditText("");
    setEditClue("");
  };

  const handleDelete = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleMapItemSelect = (index) => {
    setSelectedForMapping(selectedForMapping === index ? null : index);
  };

  const handleMapClick = (e) => {
    if (selectedForMapping === null) return;
    
    const updatedItems = [...items];
    updatedItems[selectedForMapping] = {
      ...updatedItems[selectedForMapping],
      location: e.latlng
    };
    setItems(updatedItems);
    setSelectedForMapping(null);
  };

  // New drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    // Remove item from old position and insert at new position
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDrop = (e) => {
    setDraggedIndex(null);
  };

  const createCustomIcon = (index) => {
    // Force new icon creation on reorder by including index in className
    return divIcon({
      className: `custom-marker marker-${index}`,
      html: `<div class="marker-index">${index + 1}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
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
          <MapClickHandler onMapClick={handleMapClick} />
          {items.map((item, index) => 
            item.location && (
              <Marker 
                key={`${index}-${item.text}-marker`} // More specific key
                position={[item.location.lat, item.location.lng]}
                icon={createCustomIcon(index)}
              >
                <Popup>
                  <strong>#{index + 1} {item.text}</strong>
                  {item.clue && <p>{item.clue}</p>}
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
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;