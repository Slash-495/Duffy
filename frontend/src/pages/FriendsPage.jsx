import React, { useState } from 'react';
import { UserPlusIcon, CheckIcon, XIcon, SearchIcon, MessageCircleIcon, SwordsIcon, UsersIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

const FriendsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'find'
  
  // Mock Data
  const [friends, setFriends] = useState([
    { id: 'u1', name: 'Maria Garcia', username: 'mariag99', avatar: 'https://i.pravatar.cc/150?u=1', status: 'online', nativeLanguage: 'Spanish', learningLanguage: 'English', xp: 4520 },
    { id: 'u2', name: 'Kenji Sato', username: 'kenjitokyo', avatar: 'https://i.pravatar.cc/150?u=2', status: 'offline', nativeLanguage: 'Japanese', learningLanguage: 'English', xp: 8200 },
    { id: 'u3', name: 'Sarah Miller', username: 'sarahm', avatar: 'https://i.pravatar.cc/150?u=3', status: 'online', nativeLanguage: 'English', learningLanguage: 'French', xp: 1250 }
  ]);

  const [requests, setRequests] = useState([
    { id: 'u4', name: 'David Chen', username: 'dchen88', avatar: 'https://i.pravatar.cc/150?u=4', nativeLanguage: 'Mandarin', learningLanguage: 'English', mutualFriends: 2 },
    { id: 'u5', name: 'Elena Rossi', username: 'elenar', avatar: 'https://i.pravatar.cc/150?u=5', nativeLanguage: 'Italian', learningLanguage: 'Spanish', mutualFriends: 0 }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleAcceptRequest = (request) => {
    // Add to friends
    setFriends([...friends, {
      ...request,
      status: 'online',
      xp: Math.floor(Math.random() * 5000)
    }]);
    // Remove from requests
    setRequests(requests.filter(r => r.id !== request.id));
  };

  const handleDeclineRequest = (id) => {
    setRequests(requests.filter(r => r.id !== id));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Mock Search Results
    setSearchResults([
      { id: 'u6', name: 'Lucia Fernandez', username: 'lucia_f', avatar: 'https://i.pravatar.cc/150?u=6', nativeLanguage: 'Spanish', isFriend: false },
      { id: 'u7', name: 'Lucas Silva', username: 'lucas_br', avatar: 'https://i.pravatar.cc/150?u=7', nativeLanguage: 'Portuguese', isFriend: false }
    ]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <UsersIcon className="size-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">Friends</h1>
          <p className="text-base-content/70">Connect, chat, and compete with language learners worldwide.</p>
        </div>
      </div>

      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-base-200 overflow-x-auto">
          <button 
            className={`flex-1 py-4 px-6 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'friends' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-base-content/60 hover:bg-base-200'}`}
            onClick={() => setActiveTab('friends')}
          >
            My Friends ({friends.length})
          </button>
          <button 
            className={`flex-1 py-4 px-6 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'requests' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-base-content/60 hover:bg-base-200'}`}
            onClick={() => setActiveTab('requests')}
          >
            Friend Requests {requests.length > 0 && <span className="badge badge-primary badge-sm ml-2">{requests.length}</span>}
          </button>
          <button 
            className={`flex-1 py-4 px-6 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'find' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-base-content/60 hover:bg-base-200'}`}
            onClick={() => setActiveTab('find')}
          >
            Find Friends
          </button>
        </div>

        <div className="p-6">
          {/* FRIENDS TAB */}
          {activeTab === 'friends' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.length === 0 ? (
                <div className="col-span-full text-center py-12 text-base-content/50">
                  <p>You haven't added any friends yet.</p>
                  <button className="btn btn-outline btn-sm mt-4" onClick={() => setActiveTab('find')}>Find Friends</button>
                </div>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="bg-base-200/50 rounded-2xl p-4 flex items-center justify-between hover:bg-base-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`avatar ${friend.status === 'online' ? 'online' : 'offline'}`}>
                        <div className="w-12 rounded-full">
                          <img src={friend.avatar} alt={friend.name} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold">{friend.name}</h3>
                        <p className="text-xs opacity-70">@{friend.username} • {friend.xp} XP</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-circle btn-ghost btn-sm text-primary hover:bg-primary/10"
                        title="Chat"
                        onClick={() => navigate(`/chat/${friend.id}`)}
                      >
                        <MessageCircleIcon className="size-4" />
                      </button>
                      <button 
                        className="btn btn-circle btn-ghost btn-sm text-secondary hover:bg-secondary/10"
                        title="Challenge"
                      >
                        <SwordsIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-12 text-base-content/50">
                  <p>No pending friend requests.</p>
                </div>
              ) : (
                requests.map(request => (
                  <div key={request.id} className="bg-base-200/50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        <div className="w-12 rounded-full">
                          <img src={request.avatar} alt={request.name} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold">{request.name}</h3>
                        <p className="text-xs opacity-70">Learning {request.learningLanguage} • {request.mutualFriends} mutual friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDeclineRequest(request.id)}
                        className="btn btn-circle btn-ghost btn-sm hover:bg-error hover:text-error-content"
                      >
                        <XIcon className="size-5" />
                      </button>
                      <button 
                        onClick={() => handleAcceptRequest(request)}
                        className="btn btn-circle btn-primary btn-sm"
                      >
                        <CheckIcon className="size-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* FIND FRIENDS TAB */}
          {activeTab === 'find' && (
            <div>
              <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-base-content/50" />
                  <input 
                    type="text" 
                    placeholder="Search by name or username..." 
                    className="input input-bordered w-full pl-12 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary absolute right-1 top-1/2 -translate-y-1/2 btn-sm rounded-lg">
                    Search
                  </button>
                </div>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm opacity-70 mb-2 uppercase tracking-wider">Results</h3>
                  {searchResults.map(result => (
                    <div key={result.id} className="bg-base-200/50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="avatar">
                          <div className="w-10 rounded-full">
                            <img src={result.avatar} alt={result.name} />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold">{result.name}</h3>
                          <p className="text-xs opacity-70">@{result.username}</p>
                        </div>
                      </div>
                      <button className="btn btn-outline btn-sm gap-2 rounded-full">
                        <UserPlusIcon className="size-4" /> Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
