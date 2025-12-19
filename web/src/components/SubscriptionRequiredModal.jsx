import { useNavigate } from 'react-router-dom';

const SubscriptionRequiredModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubscribe = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Subscription Required</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          You need an active subscription to access this feature. Please subscribe to continue viewing profiles, sending interests, and adding favorites.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleSubscribe}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-medium"
          >
            Subscribe Now
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequiredModal;

