import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Phone,
  RefreshCw,
  Cloud,
  Shield,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  checkGoogleRedirectResult,
  sendPasswordReset
} from '../services/firebaseAuth';
import { useLabor } from '../store/laborStore';
import { isNativePlatform } from '../services/nativeBridge';

export const AuthScreen = ({ onLogin }: { onLogin: () => void }) => {
  const { handleUserLogin, showToast } = useLabor();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [mobile, setMobile] = useState('');

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Handle Redirect Result on Page Mount
  useEffect(() => {
    let mounted = true;
    checkGoogleRedirectResult().then(async (user) => {
      if (user && mounted) {
        setLoading(true);
        await handleUserLogin(user);
        showToast('Signed in with Google!');
        onLogin();
      }
    }).catch((err) => {
      console.warn("Redirect result error:", err);
    });

    return () => {
      mounted = false;
    };
  }, [handleUserLogin, showToast, onLogin]);

  const formatFirebaseError = (err: any): string => {
    const code = err?.code || '';
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
      return 'Invalid email or password. Please check your credentials.';
    }
    if (code.includes('email-already-in-use')) {
      return 'This email is already registered. Please sign in instead.';
    }
    if (code.includes('weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (code.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code.includes('unauthorized-domain')) {
      return 'Please sign in with Email & Password for instant in-app access on Android.';
    }
    if (code.includes('popup-closed-by-user') || code.includes('cancelled')) {
      return 'Sign-in cancelled.';
    }
    return err?.message || 'Authentication failed. Please check your connection.';
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithEmail(email.trim(), password);
      await handleUserLogin(user);
      showToast('Welcome back! Signed in successfully.');
      onLogin();
    } catch (err: any) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const displayName = contractorName.trim() || businessName.trim() || undefined;
      const user = await signUpWithEmail(email.trim(), password, displayName);
      await handleUserLogin(user);
      showToast('Account created successfully!');
      onLogin();
    } catch (err: any) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        await handleUserLogin(user);
        showToast('Signed in with Google!');
        onLogin();
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseError(err));
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await sendPasswordReset(forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err: any) {
      showToast(formatFirebaseError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between bg-gradient-to-b from-[#163D59] via-[#1E4E70] to-[#F1F5F9] select-none">
      
      {/* 1. Header Branding (Proper Safe Area & Balanced Spacing) */}
      <div className="pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-6 px-4 flex flex-col items-center text-center">
        {/* App Logo */}
        <div className="w-20 h-20 bg-white rounded-3xl p-2.5 shadow-2xl shadow-black/20 flex items-center justify-center mb-3 ring-4 ring-white/20">
          <img
            src="/ic_app_logo.png"
            alt="LabourBook Logo"
            className="w-full h-full object-contain rounded-2xl"
          />
        </div>
        
        {/* App Title */}
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
          <span>Labour</span>
          <span className="text-[#FBBF24]">Book</span>
        </h1>
        <p className="text-slate-200/90 text-xs font-medium mt-0.5">
          Staff Attendance, Wages & Cash Book
        </p>
      </div>

      {/* 2. Main Login / Signup Card (Centered & Well Proportioned) */}
      <div className="w-full max-w-md mx-auto px-4 pb-4">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/15 border border-slate-100 overflow-hidden">
          
          {/* Tabs Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 m-3 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-sm font-bold rounded-xl transition-all ${
                activeTab === 'signin'
                  ? 'bg-white text-[#164E72] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-sm font-bold rounded-xl transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-[#164E72] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="px-6 pb-6 pt-2">
            {/* Error Message Box */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {activeTab === 'signin' ? (
              /* SIGN IN FORM */
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1656D6]/20 focus:border-[#1656D6] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotSuccess(false);
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-semibold text-[#1656D6] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1656D6]/20 focus:border-[#1656D6] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1656D6] hover:bg-[#1244AA] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In to LabourBook</span>
                  )}
                </button>
              </form>
            ) : (
              /* CREATE ACCOUNT FORM */
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    Your Name / Contractor Name
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="absolute left-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
                      placeholder="Vikash Singh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1656D6]/20 focus:border-[#1656D6] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1656D6]/20 focus:border-[#1656D6] transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    Create Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1656D6]/20 focus:border-[#1656D6] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1656D6] hover:bg-[#1244AA] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Free Account</span>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-3 font-bold text-slate-400 tracking-wider">
                  OR WITH GOOGLE
                </span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2.5 text-sm shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Security & Sync Badges (Pinned to bottom) */}
      <div className="pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] px-4 flex items-center justify-center gap-6 text-slate-500 text-[11px] font-semibold">
        <div className="flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-[#1656D6]" />
          <span>Auto Cloud Sync</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5 text-[#1656D6]" />
          <span>Instant Restore</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Offline Safe</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  Password reset link sent!
                </p>
                <p className="text-xs text-slate-500">
                  Please check your inbox at <span className="font-bold text-slate-700">{forgotEmail}</span> to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl mt-2"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Enter your registered email address and we'll send you a password reset link.
                </p>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1656D6]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 bg-[#1656D6] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
