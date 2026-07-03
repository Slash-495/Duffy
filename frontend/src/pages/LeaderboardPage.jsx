import React, { useState } from 'react';
import { TrophyIcon, TrendingUpIcon, MedalIcon } from 'lucide-react';
import useAuthUser from '../hooks/useAuthUser';

const LeaderboardPage = () => {
  const { authUser } = useAuthUser();
  const [activeTab, setActiveTab] = useState('weekly');

  // Mock data to demonstrate the UI before real backend integration
  const mockLeaderboard = [
    { rank: 1, name: "Yuki", xp: 12400, streak: 120, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yuki" },
    { rank: 2, name: "Sarah Connor", xp: 11200, streak: 45, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    { rank: 3, name: "John Doe", xp: 9800, streak: 30, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
    { rank: 4, name: "Maria Garcia", xp: 8500, streak: 15, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria" },
    { rank: 5, name: "Alex Chen", xp: 7200, streak: 7, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
    { rank: 42, name: authUser?.fullName || "You", xp: 1200, streak: 3, avatar: authUser?.profilePic, isCurrentUser: true }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-primary/20 rounded-2xl">
          <TrophyIcon className="size-10 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold font-mono tracking-tight">Global Rankings</h1>
          <p className="text-base-content/60 mt-1">Compete with learners worldwide and climb the ranks.</p>
        </div>
      </div>

      <div className="tabs tabs-boxed mb-8 max-w-fit bg-base-200 p-1">
        <button className={`tab tab-lg ${activeTab === 'daily' ? 'tab-active' : ''}`} onClick={() => setActiveTab('daily')}>Daily</button>
        <button className={`tab tab-lg ${activeTab === 'weekly' ? 'tab-active' : ''}`} onClick={() => setActiveTab('weekly')}>Weekly</button>
        <button className={`tab tab-lg ${activeTab === 'alltime' ? 'tab-active' : ''}`} onClick={() => setActiveTab('alltime')}>All-Time</button>
      </div>

      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
        {/* Current User Highlight */}
        <div className="bg-primary text-primary-content p-4 flex items-center justify-between shadow-md z-10 relative">
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-bold w-12 text-center opacity-80">#42</span>
            <div className="avatar">
              <div className="w-12 rounded-full border-2 border-primary-content">
                <img src={authUser?.profilePic || "../public/default-avatar.jpg"} alt="You" />
              </div>
            </div>
            <div>
              <p className="font-bold text-lg">{authUser?.fullName || "You"}</p>
              <p className="text-sm opacity-80">Current Rank</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold flex items-center justify-end gap-2"><TrendingUpIcon className="size-5"/> 1,200 XP</p>
            <p className="text-sm opacity-80">3 Day Streak</p>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="divide-y divide-base-200">
          {mockLeaderboard.filter(u => !u.isCurrentUser).map((user) => (
            <div key={user.rank} className="p-4 hover:bg-base-200 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <span className={`font-mono text-xl font-bold w-12 text-center ${user.rank <= 3 ? 'text-primary' : 'text-base-content/40'}`}>
                  {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                </span>
                <div className="avatar">
                  <div className="w-12 rounded-full">
                    <img src={user.avatar} alt={user.name} />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-lg group-hover:text-primary transition-colors">{user.name}</p>
                  <p className="text-sm opacity-60 flex items-center gap-1">
                    <MedalIcon className="size-3" /> {user.streak} Day Streak
                  </p>
                </div>
              </div>
              <div className="font-bold font-mono text-xl opacity-80">
                {user.xp.toLocaleString()} XP
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
