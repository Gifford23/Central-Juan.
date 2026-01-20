import { useNavigate } from 'react-router-dom';

const BackAttndance = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Your existing content (attendance table or grid here) */}

      <div className="flex justify-end mt-6">
        <button
          onClick={() => navigate(-1)} // ⬅️ Navigate back
          className="px-4 py-2 text-white transition-all duration-300 bg-blue-600 rounded hover:bg-blue-700"
        >
          ← Back
        </button>
      </div>
    </>
  );
};

export default BackAttndance;