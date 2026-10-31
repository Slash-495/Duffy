import React, { useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  UserPlusIcon,
  CheckIcon,
  SearchIcon,
  MessageCircleIcon,
  VideoIcon,
  UsersIcon,
  GraduationCapIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import {
  getUserFriends,
  getFriendRequests,
  acceptFriendRequest,
  getRecommendedUsers,
  sendFriendRequest,
  getOutgoingFriendReqs,
  joinClassroom,
} from '../lib/api';

const FriendsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: getUserFriends,
  });

  const { data: friendRequestsData, isLoading: loadingRequests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: getFriendRequests,
  });

  const requests = friendRequestsData?.incomingReqs || [];

  const { data: outgoingReqs = [] } = useQuery({
    queryKey: ['outgoingFriendReqs'],
    queryFn: getOutgoingFriendReqs,
  });

  const outgoingIds = new Set(
    outgoingReqs.map((r) => r.recipient?._id).filter(Boolean)
  );

  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ['friendSearch', submittedSearch],
    queryFn: () => getRecommendedUsers({ search: submittedSearch, limit: 20 }),
    enabled: activeTab === 'find',
  });

  const { mutate: acceptMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      toast.success('Friend request accepted!');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to accept request');
    },
  });

  const { mutate: sendReqMutation, isPending: isSendingReq } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      toast.success('Friend request sent!');
      queryClient.invalidateQueries({ queryKey: ['outgoingFriendReqs'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not send friend request');
    },
  });

  const { mutate: joinClassMutation, isPending: isJoiningClass } = useMutation({
    mutationFn: joinClassroom,
    onSuccess: (res) => {
      toast.success(`Joined classroom "${res?.classroom?.name || ''}"!`);
      setJoinCode('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Invalid classroom join code');
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSubmittedSearch(searchQuery.trim());
  };

  const handleJoinClass = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    joinClassMutation(joinCode.trim().toUpperCase());
  };

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <UsersIcon className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight">Friends</h1>
            <p className="text-base-content/70">
              Connect, chat, and practice live with language learners worldwide.
            </p>
          </div>
        </div>

        {/* Join Classroom by 6-char Join Code */}
        <form onSubmit={handleJoinClass} className="flex items-center gap-2">
          <div className="relative">
            <GraduationCapIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              type="text"
              maxLength={8}
              placeholder="Classroom code"
              className="input input-sm input-bordered pl-9 font-mono uppercase w-40"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-sm btn-secondary"
            disabled={isJoiningClass || !joinCode.trim()}
          >
            Join Class
          </button>
        </form>
      </div>

      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-base-200 overflow-x-auto">
          <button
            className={`flex-1 py-4 px-6 font-bold text-sm whitespace-nowrap transition-colors ${
              activeTab === 'friends'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-base-content/60 hover:bg-base-200'
            }`}
            onClick={() => setActiveTab('friends')}
          >
            My Friends ({friends.length})
          </button>
          <button
            className={`flex-1 py-4 px-6 font-bold text-sm whitespace-nowrap transition-colors ${
              activeTab === 'requests'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-base-content/60 hover:bg-base-200'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            Friend Requests{' '}
            {requests.length > 0 && (
              <span className="badge badge-primary badge-sm ml-2">
                {requests.length}
              </span>
            )}
          </button>
          <button
            className={`flex-1 py-4 px-6 font-bold text-sm whitespace-nowrap transition-colors ${
              activeTab === 'find'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-base-content/60 hover:bg-base-200'
            }`}
            onClick={() => setActiveTab('find')}
          >
            Find Friends
          </button>
        </div>

        <div className="p-6">
          {/* FRIENDS TAB */}
          {activeTab === 'friends' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingFriends ? (
                <div className="col-span-full flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : friends.length === 0 ? (
                <div className="col-span-full text-center py-12 text-base-content/50">
                  <p>You haven&apos;t added any friends yet.</p>
                  <button
                    className="btn btn-outline btn-sm mt-4"
                    onClick={() => setActiveTab('find')}
                  >
                    Find Friends
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend._id}
                    className="bg-base-200/50 rounded-2xl p-4 flex items-center justify-between hover:bg-base-200 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`avatar ${
                          friend.isOnline ? 'online' : 'offline'
                        }`}
                      >
                        <div className="w-12 rounded-full">
                          <img
                            src={friend.profilePic || '/default-avatar.jpg'}
                            alt={friend.fullName}
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold">{friend.fullName}</h3>
                        <p className="text-xs opacity-70 capitalize">
                          Native: {friend.nativeLanguage} • Learning:{' '}
                          {friend.learningLanguage}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-circle btn-ghost btn-sm text-primary hover:bg-primary/10"
                        title="Chat"
                        onClick={() => navigate(`/chat/${friend._id}`)}
                      >
                        <MessageCircleIcon className="size-4" />
                      </button>
                      <button
                        className="btn btn-circle btn-ghost btn-sm text-secondary hover:bg-secondary/10"
                        title="Video Call"
                        onClick={() => navigate(`/call/${friend._id}`)}
                      >
                        <VideoIcon className="size-4" />
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
              {loadingRequests ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-base-content/50">
                  <p>No pending friend requests.</p>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-base-200/50 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        <div className="w-12 rounded-full">
                          <img
                            src={request.sender?.profilePic || '/default-avatar.jpg'}
                            alt={request.sender?.fullName}
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold">{request.sender?.fullName}</h3>
                        <p className="text-xs opacity-70 capitalize">
                          Native: {request.sender?.nativeLanguage} • Learning:{' '}
                          {request.sender?.learningLanguage}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptMutation(request._id)}
                        disabled={isAccepting}
                        className="btn btn-primary btn-sm gap-1"
                      >
                        <CheckIcon className="size-4" /> Accept
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
                    placeholder="Search learners by name..."
                    className="input input-bordered w-full pl-12 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary absolute right-1 top-1/2 -translate-y-1/2 btn-sm rounded-lg"
                  >
                    Search
                  </button>
                </div>
              </form>

              {isSearching ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  No matching learners found.
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm opacity-70 mb-2 uppercase tracking-wider">
                    Recommended Learners
                  </h3>
                  {searchResults.map((user) => {
                    const alreadySent = outgoingIds.has(user._id);
                    return (
                      <div
                        key={user._id}
                        className="bg-base-200/50 rounded-2xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="avatar">
                            <div className="w-10 rounded-full">
                              <img
                                src={user.profilePic || '/default-avatar.jpg'}
                                alt={user.fullName}
                              />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold">{user.fullName}</h3>
                            <p className="text-xs opacity-70 capitalize">
                              Native: {user.nativeLanguage} • Learning:{' '}
                              {user.learningLanguage}
                            </p>
                          </div>
                        </div>
                        <button
                          className={`btn btn-sm gap-2 rounded-full ${
                            alreadySent ? 'btn-disabled' : 'btn-outline'
                          }`}
                          disabled={alreadySent || isSendingReq}
                          onClick={() => sendReqMutation(user._id)}
                        >
                          <UserPlusIcon className="size-4" />
                          {alreadySent ? 'Sent' : 'Add Friend'}
                        </button>
                      </div>
                    );
                  })}
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
