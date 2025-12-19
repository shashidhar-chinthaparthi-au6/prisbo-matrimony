import { useNavigate } from 'react-router-dom';

const SubscriptionRequiredModal = ({ isOpen }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubscribe = () => {
    navigate('/subscription');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Subscription Required</h2>
        </div>
        <p className="text-gray-600 mb-6">
          You need an active subscription to access this feature. Please subscribe to continue viewing profiles, sending interests, and adding favorites.
        </p>
        <div>
          <button
            onClick={handleSubscribe}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 font-medium text-lg"
          >
            Subscribe Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequiredModal;

