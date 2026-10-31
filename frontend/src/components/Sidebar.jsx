import React from 'react';
import useAuthUser from '../hooks/useAuthUser';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  ShipWheelIcon,
  HomeIcon,
  UsersIcon,
  BellIcon,
  BookOpenIcon,
  LayersIcon,
  TrophyIcon,
  MicIcon,
  GraduationCapIcon,
  SettingsIcon,
  SparklesIcon,
} from 'lucide-react';
import ProfileCompletion from './ProfileCompletion';

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isTeacherOrAdmin =
    authUser?.role === 'TEACHER' || authUser?.role === 'ADMIN';

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300 shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <ShipWheelIcon className="size-9 text-primary" />
          <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
            Duffy
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="p-4 space-y-1">
          <Link
            to="/"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath === '/' ? 'btn-active' : ''
            }`}
          >
            <HomeIcon className="size-5 text-base-content opacity-70" />
            <span>Home</span>
          </Link>

          <Link
            to="/friends"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath === '/friends' ? 'btn-active' : ''
            }`}
          >
            <UsersIcon className="size-5 text-base-content opacity-70" />
            <span>Friends</span>
          </Link>

          <Link
            to="/notifications"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath === '/notifications' ? 'btn-active' : ''
            }`}
          >
            <BellIcon className="size-5 text-base-content opacity-70" />
            <span>Notifications</span>
          </Link>

          <Link
            to="/learning"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath.startsWith('/learning') ? 'btn-active' : ''
            }`}
          >
            <BookOpenIcon className="size-5 text-base-content opacity-70" />
            <span>Learning Hub</span>
          </Link>

          <Link
            to="/flashcards"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath.startsWith('/flashcards') || currentPath.startsWith('/review')
                ? 'btn-active'
                : ''
            }`}
          >
            <LayersIcon className="size-5 text-base-content opacity-70" />
            <span>Flashcards</span>
          </Link>

          <Link
            to="/leaderboard"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath.startsWith('/leaderboard') ? 'btn-active' : ''
            }`}
          >
            <TrophyIcon className="size-5 text-base-content opacity-70" />
            <span>Leaderboard</span>
          </Link>

          <Link
            to="/roleplay"
            className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
              currentPath.startsWith('/roleplay') ? 'btn-active' : ''
            }`}
          >
            <MicIcon className="size-5 text-base-content opacity-70" />
            <span>Roleplay</span>
          </Link>

          {isTeacherOrAdmin && (
            <Link
              to="/teacher"
              className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                currentPath.startsWith('/teacher') ? 'btn-active' : ''
              }`}
            >
              <GraduationCapIcon className="size-5 text-base-content opacity-70" />
              <span>Teacher Hub</span>
            </Link>
          )}
        </nav>

        <div className="px-4 mt-4 mb-4">
          <ProfileCompletion />
        </div>
      </div>

      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div
                className="w-10 rounded-full cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => navigate('/settings')}
              >
                <img
                  src={authUser?.profilePic || '/default-avatar.jpg'}
                  alt="User Avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-avatar.jpg';
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm truncate max-w-[100px]">
                {authUser?.fullName}
              </p>
              <Link
                to="/premium"
                className="text-xs text-secondary font-bold hover:underline flex items-center gap-1"
              >
                <SparklesIcon className="size-3" /> Upgrade
              </Link>
            </div>
          </div>
          <Link
            to="/settings"
            className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-primary"
          >
            <SettingsIcon className="size-5" />
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
