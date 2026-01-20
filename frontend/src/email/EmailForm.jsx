import React, { useState } from 'react';
import axios from 'axios';

const EmailForm = () => {
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/send-email', {
        senderEmail,
        message,
      });
      setStatus(res.data.message);
    } catch (err) {
      console.error(err);
      setStatus('❌ Error sending email');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">
          Your Gmail:
          <input
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            className="w-full p-2 border rounded mt-1"
            required
          />
        </label>

        <label className="block mb-2">
          Message:
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded mt-1"
            required
          />
        </label>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Send Email
        </button>
      </form>

      {status && <p className="mt-4">{status}</p>}
    </div>
  );
};

export default EmailForm;
