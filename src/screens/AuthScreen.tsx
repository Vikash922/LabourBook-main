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
  X
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
  const { handleUserLogin, updateProfile, showToast } = useLabor();

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

  // Handle Redirect Result on Page Mount (if mobile browser completed redirect)
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
      return 'Invalid email or password. Please try again.';
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
    if (code.includes('popup-closed-by-user')) {
      return 'Google sign-in was cancelled.';
    }
    return err?.message || 'Authentication failed. Please check your connection.';
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithEmail(email.trim(), password);
      await handleUserLogin(user);
      showToast('Signed in successfully!');
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
      setErrorMsg('Please enter email and password');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await signUpWithEmail(
        email.trim(),
        password,
        contractorName.trim() || businessName.trim() || 'Contractor'
      );
      await handleUserLogin(user);
      updateProfile({
        businessName: businessName.trim() || 'LabourBook Construction',
        name: contractorName.trim() || 'Contractor',
        mobile: mobile.trim(),
        email: user.email || email.trim(),
        isLoggedIn: true
      });
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
      // If user is null, it redirected (checkGoogleRedirectResult on return handles it)
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
    <div className="min-h-screen flex flex-col bg-[#F0F2F5]">
      {/* Top Section - Dark Blue Branding */}
      <div className="bg-[#22495F] pt-8 pb-16 px-4 flex flex-col items-center flex-shrink-0">
        {/* Real App Logo */}
        <div className="w-[80px] h-[80px] sm:w-[88px] sm:h-[88px] bg-white rounded-2xl flex items-center justify-center shadow-xl mb-3 overflow-hidden p-1 border border-white/20">
          <img
            src="/ic_app_logo.png"
            alt="LabourBook Logo"
            className="w-full h-full object-contain rounded-xl select-none"
          />
        </div>
        <h1 className="text-white text-2xl font-bold tracking-wide mb-1">LabourBook</h1>
        <p className="text-[#a8c1d1] text-xs sm:text-[13px] font-medium text-center">Smart Attendance, Wages & Cash Book</p>
      </div>

      {/* Main Card */}
      <div className="flex-1 px-4 -mt-12 pb-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto relative z-10 border border-slate-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-3.5 text-[15px] font-bold transition-colors relative cursor-pointer ${
                activeTab === 'signin' ? 'text-[#1C3B4E]' : 'text-[#707A8A] hover:text-slate-700'
              }`}
            >
              Sign In
              {activeTab === 'signin' && (
                <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-[#1656D6] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-3.5 text-[15px] font-bold transition-colors relative cursor-pointer ${
                activeTab === 'signup' ? 'text-[#1C3B4E]' : 'text-[#707A8A] hover:text-slate-700'
              }`}
            >
              Create Account
              {activeTab === 'signup' && (
                <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-[#1656D6] rounded-full" />
              )}
            </button>
          </div>

          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {activeTab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-1 top-3.5 text-[#707A8A] w-[20px] h-[20px]" strokeWidth={1.7} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full pl-9 py-3 border-b border-[#EAEAEA] text-[14px] text-slate-800 focus:outline-none focus:border-[#1656D6] placeholder-[#707A8A]"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-1 top-3.5 text-[#707A8A] w-[20px] h-[20px]" strokeWidth={1.7} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-9 pr-10 py-3 border-b border-[#EAEAEA] text-[14px] text-slate-800 focus:outline-none focus:border-[#1656D6] placeholder-[#707A8A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-3 text-[#707A8A] hover:text-slate-800 cursor-pointer p-1"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-right pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotSuccess(false);
                      setShowForgotModal(true);
                    }}
                    className="text-[12px] font-bold text-[#1656D6] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1656D6] hover:bg-blue-700 active:scale-98 text-white rounded-xl py-3.5 text-[15px] font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In with Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="relative">
                  <Building2 className="absolute left-1 top-3.5 text-[#707A8A] w-[20px] h-[20px]" strokeWidth={1.7} />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Business / Firm Name"
                    className="w-full pl-9 py-3 border-b border-[#EAEAEA] text-[14px] text-slate-800 focus:outline-none focus:border-[#1656D6] placeholder-[#707A8A]"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-1 top-3.5 text-[#707A8A] w-[20px] h-[20px]" strokeWidth={1.7} />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Mobile Number (Optional)"
                    className="w-full pl-9 py-3 border-b border-[#EAEAEA] text-[14px] text-slate-800 focus:outline-none focus:border-[#1656D6] placeholder-[#707A8A]"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-1 top-3.5 text-[#707A8A] w-[20px] h-[20px]" strokeWidth={1.7} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full pl-9 py-3 border-b border-[#EAEAEA] text-[14px] text-slate-800 focus:outline-none focus:border-[#1656D6] placeholder-[#707A8A]"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-1 top-3.5 text-[#707A8A] w-[20px] h-[20px]" strokeWidth={1.7} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (Min 6 characters)"
                    className="w-full pl-9 pr-10 py-3 border-b border-[#EAEAEA] text-[14px] text-slate-800 focus:outline-none focus:border-[#1656D6] placeholder-[#707A8A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-3 text-[#707A8A] hover:text-slate-800 cursor-pointer p-1"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1656D6] hover:bg-blue-700 active:scale-98 text-white rounded-xl py-3.5 text-[15px] font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account with Email'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 flex items-center justify-center relative">
              <div className="w-full h-px bg-[#EAEAEA] absolute top-1/2 -translate-y-1/2"></div>
              <span className="px-3 text-[10px] uppercase font-bold text-[#707A8A] tracking-wider relative bg-white">
                OR WITH GOOGLE
              </span>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="mt-4 w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-3 hover:bg-slate-50 active:scale-98 transition cursor-pointer font-bold text-slate-700 text-sm shadow-2xs"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#1656D6]" />
              ) : (
                <>
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="mt-8 flex justify-center gap-6 text-center max-w-md mx-auto">
          <div className="flex flex-col items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-[#1656D6]" strokeWidth={2.2} />
            <span className="text-[11px] font-bold text-[#112940]">Auto Cloud Sync</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Cloud className="w-4 h-4 text-[#1656D6]" strokeWidth={2.2} />
            <span className="text-[11px] font-bold text-[#112940]">Instant Restore</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" strokeWidth={2.2} />
            <span className="text-[11px] font-bold text-[#112940]">100% Offline Safe</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-3 text-center py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Mail className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Password reset link sent to <strong>{forgotEmail}</strong>. Please check your inbox.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-[#1656D6] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-[11px] text-slate-500 font-medium">
                  Enter your registered email address and we'll send you a link to reset your password.
                </p>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#1656D6]"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 bg-[#1656D6] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
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
