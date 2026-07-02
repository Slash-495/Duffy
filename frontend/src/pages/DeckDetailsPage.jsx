import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDeckById, createFlashcard, deleteFlashcard } from '../lib/api';
import { ArrowLeftIcon, PlusIcon, PlayIcon, TrashIcon, SearchIcon, DownloadIcon } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { LANGUAGES } from '../constants/index.js';

const DeckDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newCard, setNewCard] = useState({
    word: '',
    meaning: '',
    language: '',
    translation: '',
    exampleSentence: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['deck', id],
    queryFn: () => getDeckById(id),
  });

  const { mutate: addCardMutation, isPending: isAdding } = useMutation({
    mutationFn: createFlashcard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setIsModalOpen(false);
      setNewCard({ word: '', meaning: '', language: '', translation: '', exampleSentence: '' });
    }
  });

  const { mutate: deleteCardMutation } = useMutation({
    mutationFn: deleteFlashcard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    }
  });

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCard.word.trim() || !newCard.meaning.trim() || !newCard.language) return;
    addCardMutation({ ...newCard, deckId: id });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;
  }

  if (!data?.deck) {
    return <div className="p-8 text-center">Deck not found</div>;
  }

  const { deck, cards } = data;

  const filteredCards = cards?.filter(c => 
    c.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.meaning.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Link to="/flashcards" className="text-sm opacity-70 hover:opacity-100 flex items-center mb-2">
              <ArrowLeftIcon className="size-3 mr-1" /> Back to Decks
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{deck.name}</h1>
            {deck.description && <p className="opacity-70 mt-1">{deck.description}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," 
                  + "Word,Meaning,Translation,Example\n"
                  + cards.map(e => `${e.word},${e.meaning},${e.translation},${e.exampleSentence}`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `${deck.name}_cards.csv`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}>
              <DownloadIcon className="size-4 mr-2" /> Export
            </button>
            <Link to={`/review/${deck._id}`} className="btn btn-primary">
              <PlayIcon className="size-5 mr-2" /> Study Deck
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between bg-base-200 p-4 rounded-xl">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
            <input 
              type="text" 
              placeholder="Search cards..." 
              className="input input-sm input-bordered w-full pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="size-4 mr-1" /> Add Card
          </button>
        </div>

        {/* Cards List */}
        <div className="space-y-3">
          {filteredCards.length === 0 ? (
            <EmptyState icon="default" title="No cards found" description="Add some cards to this deck." />
          ) : (
            filteredCards.map(card => (
              <div key={card._id} className="card bg-base-100 shadow-sm border border-base-200">
                <div className="card-body p-4 sm:p-5 flex-row justify-between items-center">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <span className="text-xs font-bold text-primary opacity-80 uppercase">{card.language}</span>
                      <h3 className="font-semibold text-lg">{card.word}</h3>
                      {card.pronunciation && <p className="text-xs opacity-60">/{card.pronunciation}/</p>}
                    </div>
                    <div>
                      <p className="font-medium">{card.meaning}</p>
                      {card.translation && <p className="text-sm opacity-70 mt-1">{card.translation}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button 
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => {
                        if(window.confirm('Delete this card?')) deleteCardMutation(card._id);
                      }}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Add Card Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">Add New Card</h3>
            <form onSubmit={handleAddCard} className="space-y-3">
              <div className="form-control">
                <label className="label"><span className="label-text">Language</span></label>
                <select 
                  className="select select-bordered" 
                  value={newCard.language} 
                  onChange={e => setNewCard({...newCard, language: e.target.value})}
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
                  value={newCard.word} onChange={e => setNewCard({...newCard, word: e.target.value})}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Meaning</span></label>
                <input 
                  type="text" className="input input-bordered" required
                  value={newCard.meaning} onChange={e => setNewCard({...newCard, meaning: e.target.value})}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Translation (Optional)</span></label>
                <input 
                  type="text" className="input input-bordered"
                  value={newCard.translation} onChange={e => setNewCard({...newCard, translation: e.target.value})}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Example Sentence (Optional)</span></label>
                <textarea 
                  className="textarea textarea-bordered"
                  value={newCard.exampleSentence} onChange={e => setNewCard({...newCard, exampleSentence: e.target.value})}
                />
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isAdding}>
                  {isAdding ? <span className="loading loading-spinner loading-sm" /> : 'Save Card'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}></div>
        </div>
      )}
    </div>
  );
};

export default DeckDetailsPage;
