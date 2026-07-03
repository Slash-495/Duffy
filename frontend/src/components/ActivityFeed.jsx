import React from 'react';
import { FlameIcon, TrophyIcon, BookOpenIcon, MessageSquareIcon, StarIcon } from 'lucide-react';

const ActivityFeed = () => {
  // Mock data for the activity feed
  const activities = [
    {
      id: 1,
      user: { name: "Sarah", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
      type: "STREAK",
      content: "reached a 7-day streak! 🔥",
      time: "2 hours ago",
      icon: FlameIcon,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      id: 2,
      user: { name: "Yuki", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yuki" },
      type: "DECK_PUBLISHED",
      content: "published a new deck 'Travel Japanese'.",
      time: "5 hours ago",
      icon: BookOpenIcon,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      id: 3,
      user: { name: "Alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
      type: "ACHIEVEMENT",
      content: "earned the 'Conversation Master' badge! 🏆",
      time: "1 day ago",
      icon: TrophyIcon,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      id: 4,
      user: { name: "Maria", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria" },
      type: "CONVERSATION",
      content: "completed a 30-minute voice call.",
      time: "2 days ago",
      icon: MessageSquareIcon,
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

  return (
    <div className="bg-base-200 rounded-3xl p-6 shadow-sm sticky top-6">
      <div className="flex items-center gap-2 mb-6">
        <StarIcon className="size-5 text-primary" />
        <h3 className="font-bold text-lg tracking-tight">Friend Activity</h3>
      </div>

      <div className="space-y-6">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex gap-4 group">
              <div className="avatar self-start mt-1">
                <div className="w-10 rounded-full">
                  <img src={activity.user.avatar} alt={activity.user.name} />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-bold hover:text-primary cursor-pointer transition-colors">{activity.user.name}</span>{' '}
                  <span className="opacity-80">{activity.content}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`p-1 rounded-md ${activity.bgColor}`}>
                    <Icon className={`size-3 ${activity.color}`} />
                  </div>
                  <span className="text-xs opacity-50">{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="btn btn-ghost btn-sm w-full mt-6 text-primary">View All</button>
    </div>
  );
};

export default ActivityFeed;
