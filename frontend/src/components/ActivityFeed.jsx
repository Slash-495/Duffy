import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  FlameIcon,
  TrophyIcon,
  BookOpenIcon,
  MessageSquareIcon,
  StarIcon,
  SparklesIcon,
  CheckCircle2Icon,
} from 'lucide-react';
import { getActivityFeed } from '../lib/api';

const TYPE_STYLE = {
  STREAK: {
    icon: FlameIcon,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  DECK_PUBLISHED: {
    icon: BookOpenIcon,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  ACHIEVEMENT: {
    icon: TrophyIcon,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  CONVERSATION: {
    icon: MessageSquareIcon,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  QUIZ_COMPLETED: {
    icon: CheckCircle2Icon,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  LEVEL_UP: {
    icon: SparklesIcon,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
};

function formatRelativeTime(isoDate) {
  if (!isoDate) return 'recently';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const ActivityFeed = () => {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['activityFeed'],
    queryFn: ({ pageParam = null }) =>
      getActivityFeed({ cursor: pageParam, limit: 8 }),
    getNextPageParam: (lastPage) =>
      lastPage?.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
  });

  const activities = data?.pages?.flatMap((page) => page.activities || []) || [];

  return (
    <div className="bg-base-200 rounded-3xl p-6 shadow-sm sticky top-6">
      <div className="flex items-center gap-2 mb-6">
        <StarIcon className="size-5 text-primary" />
        <h3 className="font-bold text-lg tracking-tight">Community Activity</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-6 text-sm opacity-60">
          Complete a lesson, quiz, or publish a deck to appear in the community feed!
        </div>
      ) : (
        <div className="space-y-5">
          {activities.map((activity) => {
            const meta = TYPE_STYLE[activity.type] || TYPE_STYLE.ACHIEVEMENT;
            const Icon = meta.icon;
            return (
              <div key={activity._id} className="flex gap-3.5 group">
                <div className="avatar self-start mt-0.5">
                  <div className="w-9 rounded-full">
                    <img
                      src={activity.user?.profilePic || '/default-avatar.jpg'}
                      alt={activity.user?.fullName || 'Learner'}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-bold">{activity.user?.fullName || 'Learner'}</span>{' '}
                    <span className="opacity-80">{activity.content}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`p-1 rounded-md ${meta.bgColor}`}>
                      <Icon className={`size-3 ${meta.color}`} />
                    </div>
                    <span className="text-xs opacity-50">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasNextPage && (
        <button
          className="btn btn-ghost btn-sm w-full mt-5 text-primary"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            'Load More'
          )}
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
