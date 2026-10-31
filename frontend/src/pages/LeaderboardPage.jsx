import React, { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TrophyIcon, TrendingUpIcon, MedalIcon } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { getLeaderboard } from "../lib/api";

const LeaderboardPage = () => {
  const { authUser } = useAuthUser();
  const [activeTab, setActiveTab] = useState("weekly");

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["leaderboard", activeTab],
    queryFn: ({ pageParam = null }) =>
      getLeaderboard({ period: activeTab, limit: 20, cursor: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage?.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
  });

  const firstPage = data?.pages?.[0];
  const entries = data?.pages?.flatMap((page) => page.entries || []) || [];
  const currentUser = firstPage?.currentUser;
  const userRankLabel = currentUser?.rank ? `#${currentUser.rank}` : "—";
  const userXp = currentUser?.xp ?? 0;
  const userStreak = currentUser?.streak ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-primary/20 rounded-2xl">
          <TrophyIcon className="size-10 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold font-mono tracking-tight">Global Rankings</h1>
          <p className="text-base-content/60 mt-1">
            Compete with learners worldwide and climb the ranks.
          </p>
        </div>
      </div>

      <div className="tabs tabs-boxed mb-8 max-w-fit bg-base-200 p-1">
        <button
          className={`tab tab-lg ${activeTab === "daily" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          Daily
        </button>
        <button
          className={`tab tab-lg ${activeTab === "weekly" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("weekly")}
        >
          Weekly
        </button>
        <button
          className={`tab tab-lg ${activeTab === "alltime" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("alltime")}
        >
          All-Time
        </button>
      </div>

      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
        {/* Current User Highlight */}
        <div className="bg-primary text-primary-content p-4 flex items-center justify-between shadow-md z-10 relative">
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-bold w-12 text-center opacity-80">
              {userRankLabel}
            </span>
            <div className="avatar">
              <div className="w-12 rounded-full border-2 border-primary-content">
                <img
                  src={authUser?.profilePic || "/default-avatar.jpg"}
                  alt="You"
                />
              </div>
            </div>
            <div>
              <p className="font-bold text-lg">{authUser?.fullName || "You"}</p>
              <p className="text-sm opacity-80">
                {currentUser?.rank ? "Current Rank" : "Complete a lesson or quiz to rank"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold flex items-center justify-end gap-2">
              <TrendingUpIcon className="size-5" /> {userXp.toLocaleString()} XP
            </p>
            <p className="text-sm opacity-80">{userStreak} Day Streak</p>
          </div>
        </div>

        {/* Leaderboard List */}
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-base-content/60">
            No XP earned in this period yet. Complete a lesson or quiz to claim #1!
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {entries.map((user) => (
              <div
                key={`${user.userId}-${user.rank}`}
                className={`p-4 hover:bg-base-200 transition-colors flex items-center justify-between group ${
                  user.isCurrentUser ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono text-xl font-bold w-12 text-center ${
                      user.rank <= 3 ? "text-primary" : "text-base-content/40"
                    }`}
                  >
                    {user.rank === 1
                      ? "🥇"
                      : user.rank === 2
                      ? "🥈"
                      : user.rank === 3
                      ? "🥉"
                      : `#${user.rank}`}
                  </span>
                  <div className="avatar">
                    <div className="w-12 rounded-full">
                      <img
                        src={user.profilePic || "/default-avatar.jpg"}
                        alt={user.fullName}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-lg group-hover:text-primary transition-colors">
                      {user.fullName}
                      {user.isCurrentUser && (
                        <span className="badge badge-primary badge-xs ml-2">You</span>
                      )}
                    </p>
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
        )}

        {hasNextPage && (
          <div className="p-4 border-t border-base-200 flex justify-center">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Load More Rankings"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
