import { useState } from 'react';
import { useQuery } from 'react-query';
import { getSentInterests, getReceivedInterests, getMutualMatches, acceptInterest, rejectInterest } from '../services/interestService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Interests = () => {
  const [activeTab, setActiveTab] = useState('received');
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: sentData, refetch: refetchSent } = useQuery('sentInterests', getSentInterests);
  const { data: receivedData, refetch: refetchReceived } = useQuery('receivedInterests', getReceivedInterests);
  const { data: matchesData, refetch: refetchMatches } = useQuery('matches', getMutualMatches);

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
            {item.profile?.photos?.[0]?.url ? (
              <img
                src={getImageUrl(item.profile.photos[0].url)}
                alt="Profile"
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded"></div>
            )}
            <div className="flex-1">
              <Link to={`/profiles/${item.profile?._id}`} className="font-semibold hover:text-primary-600">
                {item.profile?.personalInfo?.firstName} {item.profile?.personalInfo?.lastName}
              </Link>
              <p className="text-sm text-gray-600">Status: {item.status}</p>
            </div>
            {item.status === 'accepted' && (
              <button
                onClick={() => handleChat(item.toUserId._id)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Chat
              </button>
            )}
          </div>
        </div>
      ));
    } else if (activeTab === 'received') {
      return receivedData?.interests?.map((item) => (
        <div key={item._id} className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            {item.profile?.photos?.[0]?.url ? (
              <img
                src={getImageUrl(item.profile.photos[0].url)}
                alt="Profile"
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded"></div>
            )}
            <div className="flex-1">
              <Link to={`/profiles/${item.profile?._id}`} className="font-semibold hover:text-primary-600">
                {item.profile?.personalInfo?.firstName} {item.profile?.personalInfo?.lastName}
              </Link>
              <p className="text-sm text-gray-600">Status: {item.status}</p>
            </div>
            {item.status === 'pending' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAccept(item._id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(item._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
            {item.status === 'accepted' && (
              <button
                onClick={() => handleChat(item.fromUserId._id)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Chat
              </button>
            )}
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
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded"></div>
            )}
            <div className="flex-1">
              <Link to={`/profiles/${item.profile?._id}`} className="font-semibold hover:text-primary-600">
                {item.profile?.personalInfo?.firstName} {item.profile?.personalInfo?.lastName}
              </Link>
            </div>
            <button
              onClick={() => {
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
        {renderInterests()}
      </div>
    </div>
  );
};

export default Interests;

