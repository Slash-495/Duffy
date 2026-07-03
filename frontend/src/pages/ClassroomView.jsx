import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeftIcon, SearchIcon, FileTextIcon, FlameIcon } from 'lucide-react';

const ClassroomView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');

  // Mock Data
  const students = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", xp: 4500, streak: 12, completedAssigments: 8, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", xp: 3200, streak: 5, completedAssigments: 7, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
    { id: 3, name: "Charlie Davis", email: "charlie@example.com", xp: 800, streak: 1, completedAssigments: 2, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie", needsHelp: true }
  ];

  const assignments = [
    { id: 1, title: "Present Tense Verbs Quiz", type: "Grammar", due: "2026-10-15", completionRate: "85%" },
    { id: 2, title: "Ordering Food Roleplay", type: "AI Roleplay", due: "2026-10-20", completionRate: "10%" }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/teacher')} className="btn btn-circle btn-ghost">
          <ArrowLeftIcon className="size-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">Classroom Details</h1>
          <p className="text-base-content/70">Manage students and track assignments.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-8 max-w-fit bg-base-200 p-1">
        <button className={`tab tab-lg ${activeTab === 'students' ? 'tab-active' : ''}`} onClick={() => setActiveTab('students')}>Roster</button>
        <button className={`tab tab-lg ${activeTab === 'assignments' ? 'tab-active' : ''}`} onClick={() => setActiveTab('assignments')}>Assignments</button>
      </div>

      {/* Content */}
      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden min-h-[500px]">
        {activeTab === 'students' && (
          <div>
            <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-50">
              <div className="relative max-w-xs w-full">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
                <input type="text" placeholder="Search students..." className="input input-sm input-bordered w-full pl-9" />
              </div>
              <button className="btn btn-sm btn-outline">Export CSV</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="bg-base-200">
                    <th>Student</th>
                    <th>Total XP</th>
                    <th>Current Streak</th>
                    <th>Assignments</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="hover">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="mask mask-squircle w-10 h-10">
                              <img src={s.avatar} alt={s.name} />
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">{s.name}</div>
                            <div className="text-xs opacity-50">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono font-bold text-primary">{s.xp.toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-1 font-bold">
                          <FlameIcon className="size-4 text-orange-500" /> {s.streak}
                        </div>
                      </td>
                      <td>{s.completedAssigments} done</td>
                      <td>
                        {s.needsHelp ? (
                          <span className="badge badge-error badge-sm">Needs Intervention</span>
                        ) : (
                          <span className="badge badge-success badge-sm">On Track</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Active Assignments</h2>
              <button className="btn btn-primary btn-sm">Create Assignment</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map(a => (
                <div key={a.id} className="bg-base-200 p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <FileTextIcon className="size-6" />
                    </div>
                    <span className="badge badge-outline">{a.type}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{a.title}</h3>
                  <p className="text-sm opacity-70 mb-4">Due: {a.due}</p>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Completion Rate</span>
                      <span className="font-bold">{a.completionRate}</span>
                    </div>
                    <progress className="progress progress-primary w-full" value={parseInt(a.completionRate)} max="100"></progress>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomView;
