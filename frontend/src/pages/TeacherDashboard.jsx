import React, { useState } from 'react';
import { PlusIcon, UsersIcon, BookOpenIcon, ExternalLinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import useAuthUser from '../hooks/useAuthUser';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Mock Data for Classrooms
  const [classrooms, setClassrooms] = useState([
    { id: 'c1', name: "Spanish 101 - Fall 2026", students: 24, joinCode: "XJ92K1", nextAssignment: "Present Tense Verbs" },
    { id: 'c2', name: "Advanced Japanese", students: 12, joinCode: "JLPTN2", nextAssignment: "Keigo Practice Roleplay" }
  ]);

  const handleCreateClass = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const className = formData.get('className');
    
    // Generate a random 6 char join code
    const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    setClassrooms([...classrooms, {
      id: Date.now().toString(),
      name: className,
      students: 0,
      joinCode: newJoinCode,
      nextAssignment: "None yet"
    }]);
    
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 mt-6 gap-4">
        <div>
          <h1 className="text-4xl font-bold font-mono tracking-tight mb-2">Teacher Hub</h1>
          <p className="text-base-content/70">Welcome back, {authUser?.fullName || 'Educator'}. Here are your active classrooms.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <PlusIcon className="size-5 mr-2" /> Create Classroom
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map(cls => (
          <div key={cls.id} className="bg-base-100 rounded-3xl p-6 shadow-sm border border-base-200 hover:border-primary transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <BookOpenIcon className="size-32" />
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <span className="badge badge-lg bg-base-200 font-mono font-bold tracking-widest">{cls.joinCode}</span>
              <button 
                onClick={() => navigate(`/teacher/${cls.id}`)}
                className="btn btn-circle btn-ghost btn-sm text-base-content/50 group-hover:text-primary"
              >
                <ExternalLinkIcon className="size-5" />
              </button>
            </div>
            
            <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{cls.name}</h2>
            
            <div className="flex items-center gap-2 text-base-content/70 mb-4">
              <UsersIcon className="size-4" />
              <span className="text-sm font-medium">{cls.students} Enrolled Students</span>
            </div>
            
            <div className="bg-base-200 p-3 rounded-xl">
              <p className="text-xs font-bold text-primary mb-1">UPCOMING ASSIGNMENT</p>
              <p className="text-sm font-medium truncate">{cls.nextAssignment}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Classroom Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create New Classroom</h3>
            <form onSubmit={handleCreateClass}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Classroom Name</span>
                </label>
                <input type="text" name="className" placeholder="e.g. French 201" className="input input-bordered" required />
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
