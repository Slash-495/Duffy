import React, { useState } from 'react';
import { UserIcon, ShieldIcon, BellIcon, CreditCardIcon, LogOutIcon } from 'lucide-react';
import useAuthUser from '../hooks/useAuthUser';
import { axiosInstance } from '../lib/axios';

const SettingsPage = () => {
  const { authUser, logout } = useAuthUser();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);

  // Mock Form State based on authUser
  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: authUser?.privacySettings?.showOnlineStatus ?? true,
    showActivityFeed: authUser?.privacySettings?.showActivityFeed ?? true,
    allowFriendRequests: authUser?.privacySettings?.allowFriendRequests ?? true,
  });

  const handleSavePrivacy = async () => {
    setLoading(true);
    // Mock save delay
    setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen">
      <h1 className="text-3xl font-bold font-mono tracking-tight mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          <button 
            className={`btn btn-ghost justify-start w-full gap-3 ${activeTab === 'account' ? 'bg-base-200' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <UserIcon className="size-5" /> Account Profile
          </button>
          <button 
            className={`btn btn-ghost justify-start w-full gap-3 ${activeTab === 'privacy' ? 'bg-base-200' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <ShieldIcon className="size-5" /> Privacy & Security
          </button>
          <button 
            className={`btn btn-ghost justify-start w-full gap-3 ${activeTab === 'notifications' ? 'bg-base-200' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <BellIcon className="size-5" /> Notifications
          </button>
          <button 
            className={`btn btn-ghost justify-start w-full gap-3 ${activeTab === 'billing' ? 'bg-base-200' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <CreditCardIcon className="size-5" /> Billing & Plan
          </button>

          <div className="divider"></div>

          <button 
            className="btn btn-ghost text-error justify-start w-full gap-3 hover:bg-error/10"
            onClick={logout}
          >
            <LogOutIcon className="size-5" /> Logout
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-base-100 rounded-3xl p-6 md:p-8 shadow-sm border border-base-200">
          
          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Account Profile</h2>
                <p className="text-sm opacity-70">Manage your basic information.</p>
              </div>
              
              <div className="flex items-center gap-6 pb-6 border-b border-base-200">
                <div className="avatar">
                  <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img src={authUser?.profilePic || "../public/default-avatar.jpg"} alt="Profile" />
                  </div>
                </div>
                <div>
                  <button className="btn btn-sm btn-outline mb-2">Change Avatar</button>
                  <p className="text-xs opacity-60">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Full Name</span></label>
                  <input type="text" className="input input-bordered" defaultValue={authUser?.fullName} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Email Address</span></label>
                  <input type="email" className="input input-bordered" defaultValue={authUser?.email} disabled />
                </div>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Bio</span></label>
                <textarea className="textarea textarea-bordered h-24" defaultValue={authUser?.bio}></textarea>
              </div>

              <div className="flex justify-end pt-4">
                <button className="btn btn-primary">Save Changes</button>
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Privacy Settings</h2>
                <p className="text-sm opacity-70">Control who can see your activity.</p>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4 p-4 border border-base-200 rounded-xl hover:bg-base-50">
                  <input type="checkbox" className="toggle toggle-primary" 
                    checked={privacySettings.showOnlineStatus} 
                    onChange={(e) => setPrivacySettings({...privacySettings, showOnlineStatus: e.target.checked})} 
                  />
                  <div>
                    <span className="label-text font-bold block">Show Online Status</span>
                    <span className="text-xs opacity-70">Let others see when you are active on Duffy.</span>
                  </div>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4 p-4 border border-base-200 rounded-xl hover:bg-base-50">
                  <input type="checkbox" className="toggle toggle-primary" 
                    checked={privacySettings.showActivityFeed} 
                    onChange={(e) => setPrivacySettings({...privacySettings, showActivityFeed: e.target.checked})} 
                  />
                  <div>
                    <span className="label-text font-bold block">Share Activity Feed</span>
                    <span className="text-xs opacity-70">Publish your completed lessons and streaks to the community feed.</span>
                  </div>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4 p-4 border border-base-200 rounded-xl hover:bg-base-50">
                  <input type="checkbox" className="toggle toggle-primary" 
                    checked={privacySettings.allowFriendRequests} 
                    onChange={(e) => setPrivacySettings({...privacySettings, allowFriendRequests: e.target.checked})} 
                  />
                  <div>
                    <span className="label-text font-bold block">Allow Friend Requests</span>
                    <span className="text-xs opacity-70">Let other users send you connection requests.</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button className="btn btn-primary" onClick={handleSavePrivacy} disabled={loading}>
                  {loading ? <span className="loading loading-spinner"></span> : "Save Privacy"}
                </button>
              </div>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Billing & Plan</h2>
                <p className="text-sm opacity-70">Manage your subscription.</p>
              </div>
              
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Current Plan</p>
                    <h3 className="text-2xl font-bold">{authUser?.role === 'PREMIUM' ? 'Duffy Premium' : 'Basic Learner'}</h3>
                  </div>
                  <span className="badge badge-primary">{authUser?.role === 'PREMIUM' ? 'Active' : 'Free'}</span>
                </div>
                
                {authUser?.role !== 'PREMIUM' && (
                  <>
                    <p className="text-sm opacity-80 mb-6">You are currently on the free tier. Upgrade to unlock Unlimited AI capabilities.</p>
                    <button className="btn btn-primary w-full sm:w-auto" onClick={() => window.location.href = '/premium'}>
                      View Upgrade Options
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
