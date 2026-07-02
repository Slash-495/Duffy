import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDecks, createDeck, deleteDeck } from '../lib/api';
import { Link } from 'react-router';
import { BookOpenIcon, PlusIcon, TrashIcon, PlayIcon, BarChartIcon } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const FlashcardsPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');

  const { data: decks = [], isLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: getDecks,
  });

  const { mutate: createDeckMutation, isPending: isCreating } = useMutation({
    mutationFn: createDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setIsModalOpen(false);
      setNewDeckName('');
      setNewDeckDescription('');
    }
  });

  const { mutate: deleteDeckMutation } = useMutation({
    mutationFn: deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    }
  });

  const handleCreateDeck = (e) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    createDeckMutation({ name: newDeckName, description: newDeckDescription });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpenIcon className="size-8 text-primary" />
              Flashcards
            </h1>
            <p className="opacity-70 mt-1">Master your vocabulary with spaced repetition.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <PlusIcon className="size-5 mr-2" />
            New Deck
          </button>
        </div>

        {/* Dashboard Stats / Due Today Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-6">
              <h2 className="card-title text-sm opacity-70">Total Decks</h2>
              <p className="text-3xl font-bold">{decks.length}</p>
            </div>
          </div>
          <div className="card bg-primary text-primary-content shadow-sm">
            <div className="card-body p-6">
              <h2 className="card-title text-sm opacity-90">Due Today</h2>
              <p className="text-3xl font-bold">
                {decks.reduce((acc, deck) => acc + (deck.stats?.dueCards || 0), 0)}
              </p>
              <div className="card-actions justify-end mt-2">
                <Link to="/review" className="btn btn-sm btn-ghost bg-base-100 text-primary hover:bg-base-200">
                  <PlayIcon className="size-4 mr-1" />
                  Review All
                </Link>
              </div>
            </div>
          </div>
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-6">
              <h2 className="card-title text-sm opacity-70">Cards Learned</h2>
              <p className="text-3xl font-bold">
                {decks.reduce((acc, deck) => acc + (deck.stats?.masteredCards || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Decks List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Your Decks</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : decks.length === 0 ? (
            <EmptyState 
              icon="default" 
              title="No decks found" 
              description="Create your first deck to start learning!" 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map((deck) => (
                <div key={deck._id} className="card bg-base-200 hover:shadow-lg transition-all">
                  <div className="card-body p-5">
                    <div className="flex justify-between items-start">
                      <Link to={`/flashcards/deck/${deck._id}`} className="hover:underline flex-1">
                        <h3 className="card-title text-lg truncate">{deck.name}</h3>
                      </Link>
                      <button 
                        className="btn btn-ghost btn-xs btn-square text-error"
                        onClick={() => {
                          if(window.confirm('Are you sure you want to delete this deck and all its cards?')) {
                            deleteDeckMutation(deck._id);
                          }
                        }}
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                    {deck.description && <p className="text-sm opacity-70 line-clamp-2 mt-1">{deck.description}</p>}
                    
                    <div className="flex gap-4 mt-4 text-sm opacity-80">
                      <div><span className="font-semibold">{deck.stats?.totalCards || 0}</span> Cards</div>
                      <div><span className="font-semibold text-warning">{deck.stats?.dueCards || 0}</span> Due</div>
                    </div>

                    <div className="card-actions justify-between items-center mt-4 pt-4 border-t border-base-300">
                      <Link to={`/flashcards/deck/${deck._id}`} className="text-sm font-semibold hover:text-primary">
                        Manage Cards
                      </Link>
                      <Link to={`/review/${deck._id}`} className="btn btn-primary btn-sm">
                        <PlayIcon className="size-4 mr-1" />
                        Study
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Deck Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create New Deck</h3>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Name</span></label>
                <input 
                  type="text" 
                  className="input input-bordered w-full" 
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="e.g. Spanish Basics"
                  required
                  autoFocus
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Description (Optional)</span></label>
                <textarea 
                  className="textarea textarea-bordered w-full" 
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="What is this deck about?"
                />
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? <span className="loading loading-spinner loading-sm" /> : 'Create Deck'}
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

export default FlashcardsPage;
