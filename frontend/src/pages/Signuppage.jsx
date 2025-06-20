import React, { useEffect, useState } from 'react';
import { ShipWheelIcon } from 'lucide-react';
import { Link } from 'react-router'; // Correct import
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import axiosInstance from '../lib/axios.js';
import signup from '../lib/api.js';

const themes = [
  "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk",
  "valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe",
  "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee",
  "winter", "dim", "nord", "sunset",
];

export default function Signuppage() {
  const [theme, setTheme] = useState('coffee');
  const [signupData, setsignupData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const queryClient = useQueryClient();

  const { mutate:signUpMutation, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      console.log("Signup successful:", data);
      // Add redirect or notification here if needed
    },
    onError: (err) => {
      console.error("Signup failed:", err);
    },
  });

  useEffect(() => {
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    setTheme(randomTheme);
  }, []);

  const handleSignUp = (e) => {
    e.preventDefault();
   signUpMutation(signupData);
  };

  return (
    <div className="h-screen flex items-center justify-center p-4 sm:p-6 md:p-8" data-theme={theme}>
      <div className="border border-primary/25 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden">
        {/* Left side content */}
        <div className="w-full lg:w-1/2 p-4 sm:p-8 flex flex-col">
          {/* Logo and title */}
          <div className="mb-4 flex items-center justify-start gap-2">
            <ShipWheelIcon className="size-9 text-primary" />
            <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
              Duffy
            </span>
          </div>
          {/*error message if any*/}
          {error && (
            <div className="alert alert-error shadow-lg mb-4">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error.response.data.message}</span>
              </div>
            </div>
          )}
          {/* Form */}
          <div className="w-full">
            <form onSubmit={handleSignUp}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Create an Account</h2>
                  <p className="text-sm opacity-70">
                    Join Duffy and start your language learning adventure!
                  </p>
                </div>

                {/* Full Name */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Full Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Slash Rollins"
                    className="input input-bordered w-full"
                    value={signupData.fullName}
                    onChange={(e) =>
                      setsignupData({ ...signupData, fullName: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Email */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="shutupslash@email.com"
                    className="input input-bordered w-full"
                    value={signupData.email}
                    onChange={(e) =>
                      setsignupData({ ...signupData, email: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Password */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="********"
                    className="input input-bordered w-full"
                    value={signupData.password}
                    onChange={(e) =>
                      setsignupData({ ...signupData, password: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs opacity-70 mt-1">
                    Password must be at least 6 characters
                  </p>
                </div>

                {/* Checkbox */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input type="checkbox" className="checkbox checkbox-sm" required />
                    <span className="text-xs leading-tight">
                      I agree to the{' '}
                      <span className="text-primary hover:underline">terms of service</span> and{' '}
                      <span className="text-primary hover:underline">privacy policy</span>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button className="btn btn-primary w-full" type="submit">
                  {isPending ? (
                    <span className="loading loading-spinner loading-sm">'Loading...'</span>
                  )
                    : 'Create Account'}
                </button>

                {/* Already have an account */}
                <p className="text-xs text-center opacity-70 mt-2">
                  Already have an account?{' '}
                  <Link to="/login">
                    <span className="text-primary hover:underline">Login</span>
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right side image */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-primary/10 items-center justify-center">
          <div className="max-w-md p-8">
            <div className="relative aspect-square max-w-sm mx-auto">
              <img src="/i.png" alt="Language connection illustration" className="w-full h-full" />
            </div>
            <div className="text-center space-y-3 mt-6">
              <h2 className="text-xl font-semibold">Connect with language partners worldwide</h2>
              <p className="opacity-70">
                Practice conversations, make friends, and improve your language skills together
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}