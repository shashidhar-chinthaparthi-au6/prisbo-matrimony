import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { getCurrentTerms, acceptTerms } from '../services/termsService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TermsAndConditions = () => {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();
  const { user, updateUser, updateUserOptimistically } = useAuth();
  const queryClient = useQueryClient();

  // Redirect if terms are already accepted
  useEffect(() => {
    if (user?.termsAccepted) {
      // Use window.location for hard navigation to ensure fresh context load
      if (user?.role === 'super_admin') {
        window.location.href = '/admin';
      } else if (user?.role === 'vendor') {
        window.location.href = '/vendor';
      } else {
        window.location.href = '/search';
      }
    }
  }, [user]);

  const { data: termsData, isLoading } = useQuery('currentTerms', getCurrentTerms);
  const acceptMutation = useMutation(acceptTerms, {
    onMutate: async () => {
      // Optimistically update user context immediately
      updateUserOptimistically({
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      });
    },
    onSuccess: async (data) => {
      toast.success('Terms and conditions accepted');
      
      // Update user context to get latest data from server
      try {
        const updatedUser = await updateUser();
        
        // Determine navigation target based on role
        const userRole = updatedUser?.role || user?.role;
        let targetPath = '/search';
        if (userRole === 'super_admin') {
          targetPath = '/admin';
        } else if (userRole === 'vendor') {
          targetPath = '/vendor';
        }
        
        // Use window.location for hard navigation to bypass ProtectedRoute check
        // This ensures we navigate even if context hasn't fully propagated
        window.location.href = targetPath;
      } catch (error) {
        console.error('Failed to update user context:', error);
        // Fallback to React Router navigation
        const userRole = user?.role;
        if (userRole === 'super_admin') {
          navigate('/admin', { replace: true });
        } else if (userRole === 'vendor') {
          navigate('/vendor', { replace: true });
        } else {
          navigate('/search', { replace: true });
        }
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to accept terms');
      // Revert optimistic update on error by fetching fresh data
      updateUser().catch(console.error);
    },
  });

  const handleAccept = () => {
    if (!accepted) {
      toast.error('Please check the acceptance checkbox');
      return;
    }
    const version = termsData?.terms?.version || '1.0';
    acceptMutation.mutate(version);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const terms = termsData?.terms;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-red-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Terms and Conditions</h1>
            <p className="text-red-100 mt-1">Please read and accept to continue</p>
          </div>

          <div className="p-6">
            <div className="prose max-w-none mb-6">
              <div
                dangerouslySetInnerHTML={{ __html: terms?.content || 'Loading terms...' }}
                className="terms-content"
              />
            </div>

            <div className="border-t pt-6 mt-6">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  required
                />
                <span className="text-gray-700">
                  I have read and agree to the Terms and Conditions
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAccept}
                disabled={!accepted || acceptMutation.isLoading}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {acceptMutation.isLoading ? 'Accepting...' : 'Accept and Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;

