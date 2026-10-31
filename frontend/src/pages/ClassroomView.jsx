import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ArrowLeftIcon, SearchIcon, FileTextIcon, FlameIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClassroomById, createAssignment } from '../lib/api';

const ClassroomView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    type: 'QUIZ',
    description: '',
    dueDate: '',
  });

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['classroom', id],
    queryFn: ({ pageParam = null }) =>
      getClassroomById(id, { cursor: pageParam, limit: 25 }),
    getNextPageParam: (lastPage) =>
      lastPage?.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
  });

  const firstPage = data?.pages?.[0];
  const classroom = firstPage?.classroom;
  const students = data?.pages?.flatMap((page) => page.students || []) || [];
  const assignments = firstPage?.assignments || [];

  const filteredStudents = students.filter(
    (s) =>
      s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { mutate: createAssignmentMutation, isPending: isCreatingAssignment } =
    useMutation({
      mutationFn: (payload) => createAssignment(id, payload),
      onSuccess: () => {
        toast.success('Assignment created');
        queryClient.invalidateQueries({ queryKey: ['classroom', id] });
        queryClient.invalidateQueries({ queryKey: ['classrooms'] });
        setIsAssignmentModalOpen(false);
        setNewAssignment({ title: '', type: 'QUIZ', description: '', dueDate: '' });
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to create assignment');
      },
    });

  const handleCreateAssignment = (e) => {
    e.preventDefault();
    if (!newAssignment.title.trim() || !newAssignment.dueDate) return;
    createAssignmentMutation({
      title: newAssignment.title.trim(),
      type: newAssignment.type,
      description: newAssignment.description.trim() || undefined,
      dueDate: new Date(newAssignment.dueDate).toISOString(),
    });
  };

  const handleExportCsv = () => {
    const rows = [
      ['Name', 'Email', 'XP', 'Streak', 'CompletedAssignments'].join(','),
      ...filteredStudents.map((s) =>
        [
          `"${(s.fullName || '').replace(/"/g, '""')}"`,
          `"${(s.email || '').replace(/"/g, '""')}"`,
          s.xp,
          s.streak,
          s.completedAssignments,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${classroom?.name || 'classroom'}_roster.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teacher')}
            className="btn btn-circle btn-ghost"
          >
            <ArrowLeftIcon className="size-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight">
              {classroom?.name || 'Classroom Details'}
            </h1>
            <p className="text-base-content/70">
              {classroom?.totalStudents || 0} enrolled students
            </p>
          </div>
        </div>
        {classroom?.joinCode && (
          <div className="badge badge-lg badge-primary badge-outline font-mono font-bold tracking-widest p-4">
            JOIN CODE: {classroom.joinCode}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-8 max-w-fit bg-base-200 p-1">
        <button
          className={`tab tab-lg ${activeTab === 'students' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Roster
        </button>
        <button
          className={`tab tab-lg ${activeTab === 'assignments' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments ({assignments.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden min-h-[500px]">
        {activeTab === 'students' && (
          <div>
            <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-50 gap-3">
              <div className="relative max-w-xs w-full">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
                <input
                  type="text"
                  placeholder="Search students..."
                  className="input input-sm input-bordered w-full pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={handleExportCsv}
                disabled={filteredStudents.length === 0}
              >
                Export CSV
              </button>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-base-content/60">
                No students enrolled yet. Share join code{' '}
                <span className="font-mono font-bold">{classroom?.joinCode}</span> with your learners!
              </div>
            ) : (
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
                    {filteredStudents.map((s) => (
                      <tr key={s._id} className="hover">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              <div className="mask mask-squircle w-10 h-10">
                                <img
                                  src={s.profilePic || '/default-avatar.jpg'}
                                  alt={s.fullName}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="font-bold">{s.fullName}</div>
                              <div className="text-xs opacity-50">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono font-bold text-primary">
                          {(s.xp || 0).toLocaleString()}
                        </td>
                        <td>
                          <div className="flex items-center gap-1 font-bold">
                            <FlameIcon className="size-4 text-orange-500" /> {s.streak || 0}
                          </div>
                        </td>
                        <td>{s.completedAssignments || 0} done</td>
                        <td>
                          {s.needsHelp ? (
                            <span className="badge badge-error badge-sm">
                              Needs Intervention
                            </span>
                          ) : (
                            <span className="badge badge-success badge-sm">On Track</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    'Load More Students'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Active Assignments</h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsAssignmentModalOpen(true)}
              >
                Create Assignment
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="py-12 text-center text-base-content/60">
                No assignments created for this classroom yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((a) => (
                  <div
                    key={a._id}
                    className="bg-base-200 p-5 rounded-2xl flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileTextIcon className="size-6" />
                      </div>
                      <span className="badge badge-outline">{a.type}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{a.title}</h3>
                    {a.description && (
                      <p className="text-xs opacity-70 mb-2">{a.description}</p>
                    )}
                    <p className="text-sm opacity-70 mb-4">
                      Due: {new Date(a.dueDate).toLocaleDateString()}
                    </p>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Completion Rate</span>
                        <span className="font-bold">{a.completionRate}%</span>
                      </div>
                      <progress
                        className="progress progress-primary w-full"
                        value={a.completionRate}
                        max="100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {isAssignmentModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Assignment</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="e.g. Subjunctive Mood Quiz"
                  value={newAssignment.title}
                  onChange={(e) =>
                    setNewAssignment({ ...newAssignment, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Type</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newAssignment.type}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, type: e.target.value })
                    }
                  >
                    <option value="QUIZ">Quiz</option>
                    <option value="LESSON">Lesson</option>
                    <option value="DECK">Flashcard Deck</option>
                    <option value="ROLEPLAY">AI Roleplay</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Due Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={newAssignment.dueDate}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, dueDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Instructions (Optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="Instructions for enrolled students..."
                  value={newAssignment.description}
                  onChange={(e) =>
                    setNewAssignment({ ...newAssignment, description: e.target.value })
                  }
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsAssignmentModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreatingAssignment}
                >
                  {isCreatingAssignment ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomView;
