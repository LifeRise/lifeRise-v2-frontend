'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  CreditCard,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  FileText,
} from 'lucide-react';
import { authService } from '@/lib/auth/auth-service';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function VendorSignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [einTaxId, setEinTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [description, setDescription] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatEIN = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  };

  const formatPhone = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '');
    cleaned = cleaned.replace(/\+/g, '');
    cleaned = `+${cleaned}`;
    if (cleaned.length > 13) cleaned = cleaned.slice(0, 13);
    return cleaned;
  };

  const validate = () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !einTaxId ||
      !description
    ) {
      setError('Please fill in all required fields');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!/^\+\d{1,12}$/.test(phone)) {
      setError('Please enter a valid phone number with country code');
      return false;
    }
    if (!/^\d{2}-\d{7}$/.test(einTaxId)) {
      setError('EIN must be in format XX-XXXXXXX');
      return false;
    }
    if (description.length < 10) {
      setError('Description must be at least 10 characters');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    try {
      await authService.signUpVendor({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        timezone: 'UTC',
        ein_tax_id: einTaxId,
        description,
      });

      setSuccess('Account created successfully! Redirecting…');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen gradient-mesh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-125 h-125 rounded-full opacity-20 blur-[100px] orb-gold" />
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-15 blur-[100px] orb-teal" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <Image
            src="/liferise_logo.png"
            alt="LifeRise"
            width={56}
            height={56}
            className="h-14 w-auto object-contain mx-auto mb-3"
            priority
          />
          <h1 className="font-heading font-extrabold text-lr-white text-3xl leading-tight mb-1">
            Vendor Sign Up
          </h1>
          <p className="text-muted text-sm">Register as a service provider</p>
        </div>

        <div className="glass rounded-2xl p-6 mb-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-teal/10 border border-teal/20 rounded-xl px-4 py-3">
              <p className="text-teal text-sm text-center">{success}</p>
            </div>
          )}

          <SocialAuthButtons />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-muted text-xs">or sign up with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
            </div>

            <div className="relative">
              <CreditCard
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gold"
              />
              <input
                type="text"
                placeholder="EIN (Tax ID) / License - XX-XXXXXXX"
                value={einTaxId}
                onChange={(e) => setEinTaxId(formatEIN(e.target.value))}
                maxLength={10}
                className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="tel"
                placeholder="Phone (include country code)"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength={13}
                className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-lr-white transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showConfirmPass ? 'text' : 'password'}
                placeholder="Re-Enter Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-lr-white transition-colors"
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-muted" />
              <textarea
                placeholder="Tell us about the services you provide. A brief description."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-midnight/60 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-lr-white placeholder-muted focus:outline-none focus:border-gold/50 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-midnight transition-all hover:opacity-90 active:scale-95 bg-gold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-midnight/30 border-t-midnight animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Link
            href="/signup"
            className="text-muted hover:text-lr-white transition-colors text-sm flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Back
          </Link>
          <span className="text-white/10">|</span>
          <p className="text-muted text-sm">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-gold hover:opacity-80 transition-opacity font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
