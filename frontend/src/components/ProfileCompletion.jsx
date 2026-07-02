import React from 'react';
import useAuthUser from '../hooks/useAuthUser.js';
import { Link } from 'react-router';

const ProfileCompletion = () => {
  const { authUser } = useAuthUser();

  if (!authUser) return null;

  const fields = [
    { name: 'Photo', value: authUser.profilePic, weight: 15 },
    { name: 'Bio', value: authUser.bio && authUser.bio !== 'New user', weight: 20 },
    { name: 'Native Language', value: authUser.nativeLanguage, weight: 15 },
    { name: 'Learning Language', value: authUser.learningLanguage, weight: 15 },
    { name: 'Timezone', value: authUser.timezone, weight: 10 },
    { name: 'Age', value: authUser.age, weight: 5 },
    { name: 'Interests', value: authUser.interests && authUser.interests.length > 0, weight: 10 },
    { name: 'Learning Goals', value: authUser.learningGoals, weight: 10 },
  ];

  const completionDetails = fields.map(field => ({
    ...field,
    isComplete: Boolean(field.value)
  }));

  const completionPercentage = completionDetails.reduce((acc, field) => {
    return acc + (field.isComplete ? field.weight : 0);
  }, 0);

  const missingFields = completionDetails.filter(field => !field.isComplete);

  if (completionPercentage === 100) return null; // Don't show if 100% complete

  return (
    <div className="card bg-base-200 shadow-sm mb-6">
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Profile Completion</h3>
          <span className="font-bold text-primary">{completionPercentage}%</span>
        </div>
        <progress 
          className="progress progress-primary w-full" 
          value={completionPercentage} 
          max="100"
        ></progress>
        
        {missingFields.length > 0 && (
          <div className="mt-4 text-xs">
            <p className="opacity-70 mb-2">Complete your profile to get better recommendations:</p>
            <ul className="list-disc pl-4 space-y-1 text-primary">
              {missingFields.slice(0, 3).map(field => (
                <li key={field.name}>Add {field.name}</li>
              ))}
            </ul>
            <Link to="/onboarding" className="btn btn-xs btn-outline btn-primary mt-3 w-full">
              Update Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCompletion;
