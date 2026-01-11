import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { getSentInterests, getReceivedInterests, getMutualMatches, acceptInterest, rejectInterest, withdrawInterest, bulkAcceptInterests, bulkRejectInterests, getInterestHistory } from '../services/interestService';
import { getMyProfile } from '../services/profileService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const Interests = () => {
  const [activeTab, setActiveTab] = useState('received');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: subscriptionData } = useQuery(
    'current-subscription', 
    getCurrentSubscription,
    {
      enabled: !!user && !!localStorage.getItem('token'),
      retry: false,
      refetchInterval: 15000, // Refetch every 15 seconds to catch subscription updates
      onError: () => {}, // Silently handle errors
    }
  );
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const { data: sentData, refetch: refetchSent } = useQuery('sentInterests', getSentInterests, {
    retry: false,
    onError: (error) => {
      // Skip subscription modal for super_admin and vendor
      if (user?.role !== 'super_admin' && user?.role !== 'vendor' && (error.response?.status === 403 || error.response?.data?.requiresSubscription)) {
        setShowSubscriptionModal(true);
      }
    }
  });
  const { data: receivedData, refetch: refetchReceived } = useQuery('receivedInterests', getReceivedInterests, {
    retry: false,
    onError: (error) => {
      // Skip subscription modal for super_admin and vendor
      if (user?.role !== 'super_admin' && user?.role !== 'vendor' && (error.response?.status === 403 || error.response?.data?.requiresSubscription)) {
        setShowSubscriptionModal(true);
      }
    }
  });
  const { data: matchesData, refetch: refetchMatches } = useQuery('matches', getMutualMatches, {
    retry: false,
    onError: (error) => {
      // Skip subscription modal for super_admin and vendor
      if (user?.role !== 'super_admin' && user?.role !== 'vendor' && (error.response?.status === 403 || error.response?.data?.requiresSubscription)) {
        setShowSubscriptionModal(true);
      }
    }
  });

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    // Skip subscription checks for super_admin and vendor
    if (user?.role === 'super_admin' || user?.role === 'vendor') {
      setShowSubscriptionModal(false);
      setShowProfileIncompleteModal(false);
      return;
    }

    // Show subscription modal if user doesn't have active subscription
    if (subscriptionData && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      setShowProfileIncompleteModal(false);
    } else if (hasActiveSubscription && subscriptionData) {
      // Check if profile exists and is complete
      if (!profileData?.profile || !isProfileComplete(profileData.profile)) {
        setShowProfileIncompleteModal(true);
        setShowSubscriptionModal(false);
      } else {
        setShowProfileIncompleteModal(false);
      }
    }
  }, [subscriptionData, hasActiveSubscription, profileData, user]);

  const handleAccept = async (id) => {
    try {
      await acceptInterest(id);
      toast.success('Interest accepted!');
      refetchReceived();
      refetchMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept interest');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectInterest(id);
      toast.success('Interest rejected');
      refetchReceived();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject interest');
    }
  };

  const handleWithdraw = async (id) => {
    try {
      await withdrawInterest(id);
      toast.success('Interest withdrawn');
      refetchSent();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to withdraw interest');
    }
  };

  const handleBulkAccept = async () => {
    if (selectedInterests.length === 0) {
      toast.error('Please select at least one interest');
      return;
    }
    try {
      await bulkAcceptInterests(selectedInterests);
      toast.success(`${selectedInterests.length} interest(s) accepted`);
      setSelectedInterests([]);
      setIsBulkMode(false);
      refetchReceived();
      refetchMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept interests');
    }
  };

  const handleBulkReject = async () => {
    if (selectedInterests.length === 0) {
      toast.error('Please select at least one interest');
      return;
    }
    try {
      await bulkRejectInterests(selectedInterests);
      toast.success(`${selectedInterests.length} interest(s) rejected`);
      setSelectedInterests([]);
      setIsBulkMode(false);
      refetchReceived();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject interests');
    }
  };

  const toggleInterestSelection = (id) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleChat = async (userId) => {
    try {
      const response = await getOrCreateChat(userId);
      navigate('/chats', { state: { chatId: response.chat._id } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start chat');
    }
  };

  const renderInterests = () => {
    if (activeTab === 'sent') {
      return sentData?.interests?.map((item) => (
        <div key={item._id} className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            {isBulkMode && item.status === 'pending' && (
              <input
                type="checkbox"
                checked={selectedInterests.includes(item._id)}
                onChange={() => toggleInterestSelection(item._id)}
                className="w-4 h-4"
              />
            )}
            {item.profile?.photos?.[0]?.url ? (
              <img
                src={getImageUrl(item.profile.photos[0].url)}
                alt="Profile"
                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/profiles/${item.profile?._id}`)}
              />
            ) : (
              <div 
                className="w-16 h-16 bg-gray-200 rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/profiles/${item.profile?._id}`)}
              ></div>
            )}
            <div className="flex-1">
              <Link to={`/profiles/${item.profile?._id}`} className="font-semibold hover:text-primary-600">
                {item.profile?.personalInfo?.firstName} {item.profile?.personalInfo?.lastName}
              </Link>
              <p className="text-sm text-gray-600">Status: {item.status}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profiles/${item.profile?._id}`);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                View Profile
              </button>
              {item.status === 'accepted' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChat(item.toUserId._id);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Chat
                </button>
              )}
              {item.status === 'pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWithdraw(item._id);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        </div>
      ));
    } else if (activeTab === 'received') {
      return receivedData?.interests?.map((item) => (
        <div key={item._id} className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            {isBulkMode && item.status === 'pending' && (
              <input
                type="checkbox"
                checked={selectedInterests.includes(item._id)}
                onChange={() => toggleInterestSelection(item._id)}
                className="w-4 h-4"
              />
            )}
            {item.profile?.photos?.[0]?.url ? (
              <img
                src={getImageUrl(item.profile.photos[0].url)}
                alt="Profile"
                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/profiles/${item.profile?._id}`)}
              />
            ) : (
              <div 
                className="w-16 h-16 bg-gray-200 rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/profiles/${item.profile?._id}`)}
              ></div>
            )}
            <div className="flex-1">
              <Link to={`/profiles/${item.profile?._id}`} className="font-semibold hover:text-primary-600">
                {item.profile?.personalInfo?.firstName} {item.profile?.personalInfo?.lastName}
              </Link>
              <p className="text-sm text-gray-600">Status: {item.status}</p>
              {/* Compatibility Score */}
              {item.compatibility !== undefined && (
                <div className="mt-1">
                  <span className="text-xs text-gray-500">Compatibility: </span>
                  <span className={`text-xs font-semibold ${
                    item.compatibility >= 80 ? 'text-green-600' :
                    item.compatibility >= 60 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {item.compatibility}%
                  </span>
                </div>
              )}
              {/* Expiry Warning */}
              {item.daysUntilExpiry !== null && item.daysUntilExpiry <= 7 && item.status === 'pending' && (
                <p className="text-xs text-orange-600 mt-1">
                  ⏰ Expires in {item.daysUntilExpiry} day{item.daysUntilExpiry !== 1 ? 's' : ''}
                </p>
              )}
              {item.isExpired && (
                <p className="text-xs text-red-600 mt-1">⚠️ Expired</p>
              )}
              {/* Mutual Interests */}
              {item.mutualInterests && item.mutualInterests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.mutualInterests.slice(0, 3).map((mutual, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {mutual.value}
                    </span>
                  ))}
                  {item.mutualInterests.length > 3 && (
                    <span className="text-xs text-gray-500">+{item.mutualInterests.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profiles/${item.profile?._id}`);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                View Profile
              </button>
              {item.status === 'pending' && !isBulkMode && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccept(item._id);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReject(item._id);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              {item.status === 'accepted' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChat(item.fromUserId._id);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Chat
                </button>
              )}
            </div>
          </div>
        </div>
      ));
    } else {
      return matchesData?.matches?.map((item) => (
        <div key={item._id} className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            {item.profile?.photos?.[0]?.url ? (
              <img
                src={getImageUrl(item.profile.photos[0].url)}
                alt="Profile"
                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/profiles/${item.profile?._id}`)}
              />
            ) : (
              <div 
                className="w-16 h-16 bg-gray-200 rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/profiles/${item.profile?._id}`)}
              ></div>
            )}
            <div className="flex-1">
              <Link to={`/profiles/${item.profile?._id}`} className="font-semibold hover:text-primary-600">
                {item.profile?.personalInfo?.firstName} {item.profile?.personalInfo?.lastName}
              </Link>
              {/* Compatibility Score */}
              {item.compatibility !== undefined && (
                <div className="mt-1">
                  <span className="text-xs text-gray-500">Compatibility: </span>
                  <span className={`text-xs font-semibold ${
                    item.compatibility >= 80 ? 'text-green-600' :
                    item.compatibility >= 60 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {item.compatibility}%
                  </span>
                </div>
              )}
              {/* Mutual Interests */}
              {item.mutualInterests && item.mutualInterests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.mutualInterests.slice(0, 3).map((mutual, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {mutual.value}
                    </span>
                  ))}
                  {item.mutualInterests.length > 3 && (
                    <span className="text-xs text-gray-500">+{item.mutualInterests.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profiles/${item.profile?._id}`);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                View Profile
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const userId = item.profile?.userId?._id || item.profile?.userId;
                    const history = await getInterestHistory(userId);
                    setHistoryData(history);
                    setSelectedUserId(userId);
                    setShowHistoryModal(true);
                  } catch (error) {
                    toast.error('Failed to load history');
                  }
                }}
                className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700"
                title="View interest history"
              >
                📜 History
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentUserId = user?.id;
                  const otherUserId = item.fromUserId._id.toString() === currentUserId 
                    ? item.toUserId._id 
                    : item.fromUserId._id;
                  handleChat(otherUserId);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Chat
              </button>
          </div>
          </div>
        </div>
      ));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Interests</h1>
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'received'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Received ({receivedData?.interests?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'sent'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Sent ({sentData?.interests?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'matches'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Matches ({matchesData?.matches?.length || 0})
        </button>
      </div>
      <div className="space-y-4">
        {activeTab === 'sent' && (!sentData?.interests || sentData.interests.length === 0) ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">💌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Sent Interests</h2>
              <p className="text-gray-600 mb-6">
                You haven't sent any interests yet. Browse profiles and send interests to people you're interested in!
              </p>
              <button
                onClick={() => navigate('/search')}
                className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
              >
                Browse Profiles
              </button>
            </div>
          </div>
        ) : activeTab === 'received' && (!receivedData?.interests || receivedData.interests.length === 0) ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">📬</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Received Interests</h2>
              <p className="text-gray-600 mb-6">
                You haven't received any interests yet. Complete your profile to increase your visibility and attract more matches!
              </p>
              <button
                onClick={() => navigate('/profile?edit=true')}
                className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
              >
                Complete Profile
              </button>
            </div>
          </div>
        ) : activeTab === 'matches' && (!matchesData?.matches || matchesData.matches.length === 0) ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">💕</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Matches Yet</h2>
              <p className="text-gray-600 mb-6">
                You don't have any mutual matches yet. When someone accepts your interest, they'll appear here!
              </p>
              <button
                onClick={() => navigate('/search')}
                className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
              >
                Browse More Profiles
              </button>
            </div>
          </div>
        ) : (
          renderInterests()
        )}
      </div>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
      />
      
      {/* Interest History Modal */}
      {showHistoryModal && historyData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Interest History</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryData(null);
                  setSelectedUserId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {/* Compatibility Score */}
            {historyData.compatibility !== undefined && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-semibold">Compatibility Score: </span>
                <span className={`text-lg font-bold ${
                  historyData.compatibility >= 80 ? 'text-green-600' :
                  historyData.compatibility >= 60 ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {historyData.compatibility}%
                </span>
              </div>
            )}
            
            {/* Mutual Interests */}
            {historyData.mutualInterests && historyData.mutualInterests.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Common Preferences:</h3>
                <div className="flex flex-wrap gap-2">
                  {historyData.mutualInterests.map((mutual, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {mutual.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Timeline:</h3>
              <div className="space-y-2">
                {historyData.timeline && historyData.timeline.length > 0 ? (
                  historyData.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {event.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleString()}
                        </p>
                        {event.message && (
                          <p className="text-sm text-gray-600 mt-1 italic">"{event.message}"</p>
                        )}
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                          event.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          event.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No history available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interests;

