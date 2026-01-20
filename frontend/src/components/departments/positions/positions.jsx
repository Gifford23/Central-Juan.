import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PositionModal from './PositionModal'; 
import BASE_URL from '../../../../backend/server/config'; 

function Positions() {
  const { state } = useLocation();
  const { departmentId, departmentName, role } = state || {};

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  // Fetch positions for the specific department
  const fetchPositions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/departments/positions/positions.php?department_id=${departmentId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched Data:", data);

      if (!data.success) {
        alert(data.message || "Error fetching positions.");
      } else {
        setPositions(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching position data:", error);
      alert("Error fetching position data. Please check your server or connection.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (departmentId) fetchPositions();
  }, [departmentId]);

  // Handle Add/Update
  const handleAddOrUpdatePosition = async (newPosition) => {
    const payload = {
      ...newPosition,
      department_id: departmentId,
    };

    const url = editingPosition
      ? `${BASE_URL}/departments/positions/update_positions.php`
      : `${BASE_URL}/departments/positions/add_positions.php`;

    const method = editingPosition ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Position record successfully saved.');
        setIsModalOpen(false);
        setEditingPosition(null);
        fetchPositions();
      } else {
        alert(data.message || 'Failed to save position record.');
      }
    } catch (error) {
      alert('Error saving position. Please try again later.');
      console.error('Error saving position:', error);
    }
  };

  // Handle Edit
  const handleEditPosition = (position) => {
    setEditingPosition(position);
    setIsModalOpen(true);
  };

  // Handle Delete
  const handleDeletePosition = async (position_id) => {
    if (!window.confirm('Are you sure you want to delete this position?')) return;

    try {
      const response = await fetch(
        `${BASE_URL}/positions/delete_positions.php?id=${position_id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.status === 'success') {
        alert('Position deleted successfully.');
        fetchPositions();
      } else {
        alert(data.message || 'Failed to delete position.');
      }
    } catch (error) {
      alert('Error deleting position. Please try again later.');
      console.error('Error deleting position:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Positions for Department: {departmentName} (ID: {departmentId})</h1>
      <p className="mb-4">Role: {role || 'N/A'}</p>

      {/* Add Position Button */}
      {role === 'ADMIN' && (
        <button
          className="px-4 py-2 mb-4 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          onClick={() => { setEditingPosition(null); setIsModalOpen(true); }}
        >
          + Add Position
        </button>
      )}

      {loading ? (
        <p>Loading positions...</p>
      ) : (
        <div className="overflow-hidden bg-white rounded-lg shadow-md">
          <table className="w-full border-collapse">
            <thead className="text-gray-700 bg-gray-300">
              <tr>
                <th className="p-3 text-left">Position ID</th>
                <th className="p-3 text-left">Position Name</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length > 0 ? positions.map(position => (
                <tr key={position.position_id} className="border-t hover:bg-gray-100">
                  <td className="p-3">{position.position_id}</td>
                  <td className="p-3">{position.position_name}</td>
                  <td className="p-3">
                    {role === 'ADMIN' && (
                      <div className="flex space-x-2">
                        <button
                          className="px-3 py-1 text-white bg-yellow-500 rounded-md hover:bg-yellow-600"
                          onClick={() => handleEditPosition(position)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 text-white bg-red-600 rounded-md hover:bg-red-700"
                          onClick={() => handleDeletePosition(position.position_id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="text-center">No positions available for this department.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <PositionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddOrUpdatePosition}
        position={editingPosition}
        departmentId={departmentId}
      />
    </div>
  );
}

export default Positions;
