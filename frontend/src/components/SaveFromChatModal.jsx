import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDecks, createFlashcard } from '../lib/api';
import { LANGUAGES } from '../constants/index.js';

const SaveFromChatModal = ({ isOpen, onClose, initialText }) => {
  const queryClient = useQueryClient();
  const [deckId, setDeckId] = useState('');
  
  const [card, setCard] = useState({
    word: initialText || '',
    meaning: '',
    language: '',
    translation: '',
    source: 'chat'
  });

  const { data: decks = [] } = useQuery({
    queryKey: ['decks'],
    queryFn: getDecks,
    enabled: isOpen,
  });

  const { mutate: addCardMutation, isPending } = useMutation({
    mutationFn: createFlashcard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      if(deckId) queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
      onClose();
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!deckId || !card.word.trim() || !card.meaning.trim() || !card.language) return;
    addCardMutation({ ...card, deckId });
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg mb-4">Save to Flashcards</h3>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="form-control">
            <label className="label"><span className="label-text">Select Deck</span></label>
            <select 
              className="select select-bordered" 
              value={deckId} 
              onChange={e => setDeckId(e.target.value)}
              required
            >
              <option value="" disabled>Choose a deck</option>
              {decks.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Language</span></label>
            <select 
              className="select select-bordered" 
              value={card.language} 
              onChange={e => setCard({...card, language: e.target.value})}
              required
            >
              <option value="" disabled>Select language</option>
              {LANGUAGES.map(lang => <option key={lang} value={lang.toLowerCase()}>{lang}</option>)}
            </select>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Word / Phrase</span></label>
            <input 
              type="text" className="input input-bordered" required
              value={card.word} onChange={e => setCard({...card, word: e.target.value})}
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Meaning / Translation</span></label>
            <input 
              type="text" className="input input-bordered" required
              value={card.meaning} onChange={e => setCard({...card, meaning: e.target.value})}
              placeholder="What does it mean?"
            />
          </div>
          
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? <span className="loading loading-spinner loading-sm" /> : 'Save Card'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

export default SaveFromChatModal;
