import { useNavigate } from 'react-router-dom';

const ProfileIncompleteModal = ({ isOpen }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCompleteProfile = () => {
    navigate('/profile?edit=true');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Your profile is incomplete. Please complete all mandatory fields (Name, Date of Birth, City, State, Religion, Caste) to continue using the platform.
        </p>
        <div>
          <button
            onClick={handleCompleteProfile}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 font-medium text-lg"
          >
            Complete Profile Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileIncompleteModal;

