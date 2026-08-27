import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
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

export const AuthScreen = ({ onLogin }: { onLogin: () => void }) => {
  const { handleUserLogin, showToast } = useLabor();

  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    if (code.includes('popup-closed-by-user') || code.includes('cancelled') || err?.message?.includes('cancel')) {
      return 'Google sign-in was cancelled.';
    }
    return err?.message || 'Authentication failed. Please check your connection.';
  };

  const handleEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (authMode === 'SIGN_IN') {
        const user = await signInWithEmail(emailInput.trim(), passwordInput);
        await handleUserLogin(user);
        showToast('Welcome back! Signed in successfully.');
        onLogin();
      } else {
        if (passwordInput.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const user = await signUpWithEmail(emailInput.trim(), passwordInput, contractorName.trim() || undefined);
        await handleUserLogin(user);
        showToast('Account created successfully!');
        onLogin();
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Trigger Native Android Account Picker or Web Popup
      const user = await signInWithGoogle();
      if (user) {
        // 2. Firestore Database Check, Sync & Restore (Existing vs New User)
        await handleUserLogin(user);
        showToast('Signed in with Google!');
        // 3. Auto-redirect to Main Dashboard
        onLogin();
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      // If user simply closed/cancelled account picker, don't show red error banner
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('cancel') || err?.type === 'userCanceled') {
        return;
      }
      setErrorMsg(formatFirebaseError(err));
    } finally {
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
    <div className="relative min-h-[100dvh] w-full bg-[#F3F4F6] overflow-x-hidden flex flex-col items-center select-none">
      
      {/* 1. Top Deep Blue Header (Exact Jetpack Compose Color: 0xFF1E4665, Height 360px) */}
      <div
        className="absolute top-0 left-0 right-0 h-[360px] bg-[#1E4665] z-0"
      />

      {/* 2. Main Content Column */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center px-4 pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-8">
        
        {/* App Logo: 96dp circle */}
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center p-2.5 shadow-xl shadow-black/20 ring-4 ring-white/15 overflow-hidden">
          <img
            src="/ic_app_logo.png"
            alt="Laborbook Logo"
            className="w-full h-full object-contain rounded-full select-none"
          />
        </div>

        {/* Title & Subtitle */}
        <h1 className="mt-2 text-[28px] font-bold text-white tracking-tight leading-tight">
          Laborbook
        </h1>
        <p className="text-sm font-normal text-white/90 text-center tracking-normal mt-0.5">
          Smart Attendance, Wages & Cash Book
        </p>

        {/* 3. Main White Auth Card (Exact Jetpack Compose RoundedCornerShape 16dp, elevation 8dp) */}
        <div className="mt-6 w-full bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5">
            
            {/* Tabs: Sign In / Create Account */}
            <div className="flex border-b border-gray-100 mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGN_IN');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-3 text-center text-[15px] transition-colors cursor-pointer relative ${
                  authMode === 'SIGN_IN'
                    ? 'font-bold text-[#1E4665]'
                    : 'font-medium text-gray-400 hover:text-gray-600'
                }`}
              >
                Sign In
                {authMode === 'SIGN_IN' && (
                  <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-[#1E4665] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGN_UP');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-3 text-center text-[15px] transition-colors cursor-pointer relative ${
                  authMode === 'SIGN_UP'
                    ? 'font-bold text-[#1E4665]'
                    : 'font-medium text-gray-400 hover:text-gray-600'
                }`}
              >
                Create Account
                {authMode === 'SIGN_UP' && (
                  <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-[#1E4665] rounded-full" />
                )}
              </button>
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Input Fields */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {authMode === 'SIGN_UP' && (
                <div className="relative flex items-center">
                  <Building2 className="absolute left-3.5 text-slate-400 w-5 h-5 stroke-[1.8]" />
                  <input
                    type="text"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="Your Name / Contractor Name"
                    className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E4665] focus:bg-white transition"
                  />
                </div>
              )}

              {/* Email Input */}
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 text-slate-400 w-5 h-5 stroke-[1.8]" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E4665] focus:bg-white transition"
                />
              </div>

              {/* Password Input */}
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-slate-400 w-5 h-5 stroke-[1.8]" />
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-11 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E4665] focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {passwordVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              {/* Forgot Password Link */}
              {authMode === 'SIGN_IN' && (
                <div className="text-right pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(emailInput);
                      setForgotSuccess(false);
                      setShowForgotModal(true);
                    }}
                    className="text-xs font-semibold text-[#1E4665] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Email Button: 52dp height, RoundedCornerShape 10dp, #1E4665 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] mt-2 bg-[#1E4665] hover:bg-[#16364f] active:scale-[0.98] text-white text-[15px] font-bold rounded-[10px] shadow-md shadow-[#1E4665]/20 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <span>{authMode === 'SIGN_IN' ? 'Sign In with Email' : 'Create Free Account'}</span>
                )}
              </button>
            </form>

            {/* Google Button: 52dp height, RoundedCornerShape 26dp (pill), Border Color 0xFFCBD5E1 */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={loading}
                className="w-full h-[52px] bg-white hover:bg-slate-50 active:scale-[0.98] border border-[#CBD5E1] rounded-[26px] flex items-center justify-center gap-2.5 transition cursor-pointer shadow-xs"
              >
                {/* Google Multi-Color G Logo 24dp */}
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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
                <span className="text-[#1E293B] text-[15px] font-medium">
                  Continue with Google
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#1E4665]">Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  className="w-full py-2.5 bg-[#1E4665] text-white text-xs font-bold rounded-xl mt-2"
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
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1E4665]"
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
                    className="flex-1 py-2.5 bg-[#1E4665] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
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
