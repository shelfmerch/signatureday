
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateName = (value: string) => {
    // Clear error if field is empty
    if (value.length === 0) {
      setNameError('');
      return;
    }

    // Check minimum length (at least 3 characters)
    if (value.length < 3) {
      setNameError('Name must be at least 3 characters');
      return;
    }

    // Check maximum length (reasonable limit, e.g., 50 characters)
    if (value.length > 50) {
      setNameError('Name must be less than 50 characters');
      return;
    }

    // Check for numeric-only input
    if (/^\d+$/.test(value)) {
      setNameError('Name cannot contain only numbers');
      return;
    }

    // Check for repetitive characters (same character repeated 5+ times)
    if (/(.)\1{4,}/.test(value)) {
      setNameError('Name cannot contain repetitive characters');
      return;
    }

    // Regex validation: only letters and spaces
    if (!/^[A-Za-z\s]+$/.test(value)) {
      setNameError('Name can only contain letters and spaces');
      return;
    }

    // All validations passed
    setNameError('');
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    validateName(value);
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    // Validate password length - backend requires at least 6 characters
    if (value.length > 0 && value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else {
      setPasswordError('');
    }
    // Re-validate confirm password if it has been entered
    if (formData.confirmPassword.length > 0) {
      if (value !== formData.confirmPassword) {
        setConfirmPasswordError('Password did not match');
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setFormData({ ...formData, confirmPassword: value });
    // Validate if passwords match
    if (value.length > 0 && value !== formData.password) {
      setConfirmPasswordError('Password did not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name
    validateName(formData.name);
    if (nameError || !formData.name || formData.name.length < 3) {
      if (!nameError) {
        setNameError('Name must be at least 3 characters');
      }
      toast.error(nameError || 'Please enter a valid name');
      return;
    }

    // Validate password length - backend requires at least 6 characters
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const success = await register(formData.name, formData.email, formData.password);
      if (success) {
        toast.success('Registration successful!');
        // Keep flag (no longer used on home), but send user directly to create-group/GridBoard.
        sessionStorage.setItem('showWelcomeTour', 'true');
        navigate('/create-group');
      } else {
        toast.error('Registration failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-heading bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
          Register
        </CardTitle>
        <CardDescription className="text-slate-500">Create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`h-11 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl ${
                nameError ? 'border-red-500' : ''
              }`}
              required
            />
            {nameError && (
              <p className="text-sm text-red-500">{nameError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-11 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className={`h-11 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl pr-10 ${
                  passwordError ? 'border-red-500' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                className={`h-11 bg-slate-50/50 border-slate-200 focus:border-purple-400 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl pr-10 ${
                  confirmPasswordError ? 'border-red-500' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPasswordError && (
              <p className="text-sm text-red-500">{confirmPasswordError}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all font-semibold"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onToggleMode}>
            Already have an account? Sign in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
