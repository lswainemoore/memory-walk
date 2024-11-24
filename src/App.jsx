import { useState } from "react";
import { FaPencilAlt, FaTrash } from "react-icons/fa";
import "./App.css";

const Item = ({
  item,
  isEditing,
  editText,
  editClue,
  onEditChange,
  onEditSubmit,
  onEditClick,
  onDelete,
}) => {
  return (
    <li>
      {isEditing ? (
        <form onSubmit={onEditSubmit}>
          <input
            type="text"
            name="editText"
            value={editText}
            onChange={onEditChange}
          />
          <textarea
            name="editClue"
            value={editClue}
            onChange={onEditChange}
          />
          <button type="submit">Save</button>
        </form>
      ) : (
        <>
          <span>{item.text}</span>
          {item.clue && <span> - {item.clue}</span>}
          <FaPencilAlt
            onClick={onEditClick}
            style={{ cursor: "pointer", marginLeft: "10px" }}
          />
          <FaTrash
            onClick={onDelete}
            style={{ cursor: "pointer", marginLeft: "10px" }}
          />
        </>
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
    setItems([...items, { text: newItem, clue: "" }]);
    setNewItem("");
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editIndex === null) return;
    const updatedItems = [...items];
    updatedItems[editIndex] = { text: editText, clue: editClue };
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

  const handleDelete = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  return (
    <>
      <h1>Memory Walk</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Item"
            value={newItem}
            onChange={handleChange}
          />
          <button type="submit">Add</button>
        </form>
      </div>
      <ol className="items">
        {items.map((item, index) => (
          <Item
            key={index}
            item={item}
            isEditing={editIndex === index}
            editText={editText}
            editClue={editClue}
            onEditChange={handleEditChange}
            onEditSubmit={handleEditSubmit}
            onEditClick={() => handleEditClick(index)}
            onDelete={() => handleDelete(index)}
          />
        ))}
      </ol>
    </>
  );
}

export default App;
