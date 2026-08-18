import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/items`)
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch((err) => console.error(err));
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const res = await fetch(`${API_URL}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input }),
    });

    const newItem = await res.json();
    setItems([newItem, ...items]);
    setInput('');
  };

  return (
    
      Supabase + Express + React Demo
      
         setInput(e.target.value)}
          placeholder="New item name..."
        /> Add Item
      
      
        {items.map((item) => (
          {item.name}
        ))}
      
    
  );
}