import React, { useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { PlusIcon, UsersIcon, BookOpenIcon, ExternalLinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import useAuthUser from '../hooks/useAuthUser';
import { getClassrooms, createClassroom } from '../lib/api';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState('');

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['classrooms'],
    queryFn: ({ pageParam = null }) =>
      getClassrooms({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage?.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
  });

  const classrooms = data?.pages?.flatMap((page) => page.classrooms || []) || [];

  const { mutate: createClassroomMutation, isPending: isCreating } = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      toast.success('Classroom created');
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setClassName('');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create classroom');
    },
  });

  const handleCreateClass = (e) => {
    e.preventDefault();
    if (!className.trim()) return;
    createClassroomMutation({ name: className.trim() });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 mt-6 gap-4">
        <div>
          <h1 className="text-4xl font-bold font-mono tracking-tight mb-2">Teacher Hub</h1>
          <p className="text-base-content/70">
            Welcome back, {authUser?.fullName || 'Educator'}. Manage your active classrooms and join codes.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <PlusIcon className="size-5 mr-2" /> Create Classroom
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : classrooms.length === 0 ? (
        <div className="bg-base-100 rounded-3xl p-12 text-center border border-base-200">
          <BookOpenIcon className="size-12 mx-auto opacity-30 mb-4" />
          <h2 className="text-xl font-bold mb-2">No classrooms yet</h2>
          <p className="opacity-70 mb-6">
            Create your first classroom to generate a 6-character join code for your students.
          </p>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="size-4 mr-2" /> Create Classroom
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((cls) => (
              <div
                key={cls._id}
                onClick={() => navigate(`/teacher/${cls._id}`)}
                className="bg-base-100 rounded-3xl p-6 shadow-sm border border-base-200 hover:border-primary transition-colors group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <BookOpenIcon className="size-32" />
                </div>

                <div className="flex justify-between items-start mb-6">
                  <span className="badge badge-lg bg-base-200 font-mono font-bold tracking-widest">
                    {cls.joinCode}
                  </span>
                  <div className="btn btn-circle btn-ghost btn-sm text-base-content/50 group-hover:text-primary">
                    <ExternalLinkIcon className="size-5" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {cls.name}
                </h2>

                <div className="flex items-center gap-2 text-base-content/70 mb-4">
                  <UsersIcon className="size-4" />
                  <span className="text-sm font-medium">
                    {cls.studentCount} Enrolled Students
                  </span>
                </div>

                <div className="bg-base-200 p-3 rounded-xl">
                  <p className="text-xs font-bold text-primary mb-1">UPCOMING ASSIGNMENT</p>
                  <p className="text-sm font-medium truncate">{cls.nextAssignment}</p>
                </div>
              </div>
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <button
                className="btn btn-outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  'Load More Classrooms'
                )}
              </button>
            </div>
          )}
        </>
      )}

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
                <input
                  type="text"
                  name="className"
                  placeholder="e.g. Spanish 101 - Fall Cohort"
                  className="input input-bordered"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? (
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

export default TeacherDashboard;
