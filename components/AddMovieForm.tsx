import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface AddMovieFormProps {
  onAdd: (title: string, year: string, notes: string) => void;
}

export const AddMovieForm: React.FC<AddMovieFormProps> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onAdd(title, year, notes);
    setTitle('');
    setNotes('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 border-2 border-dashed border-cinema-700 text-cinema-text hover:border-cinema-accent hover:text-cinema-accent rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
      >
        <Plus size={20} /> Add New Movie
      </button>
    );
  }

  return (
    <div className="bg-cinema-800 border border-cinema-700 rounded-lg p-4 mb-6 shadow-xl animate-in fade-in zoom-in duration-200">
      <h3 className="text-white font-bold mb-4">Add Movie Entry</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Movie Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-cinema-accent"
            placeholder="e.g. Dune: Part Two"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Year Viewed</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-cinema-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Format / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-cinema-accent"
              placeholder="e.g. IMAX, Dolby Cinema"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-cinema-accent text-cinema-900 font-bold rounded hover:bg-amber-400 transition-colors"
          >
            Save Movie
          </button>
        </div>
      </form>
    </div>
  );
};
