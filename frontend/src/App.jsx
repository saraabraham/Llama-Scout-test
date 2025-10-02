import React, { useState } from 'react';
import './App.css'; // You can use the default Vite CSS

const API_URL = 'http://localhost:3001/analyze';

function App() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setResponse(null); // Clear previous response

    try {
      // 1. Send the resume text to your Node.js API
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeText: input }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setResponse(data.data); // Set the structured JSON data
      } else {
        setResponse({ error: data.message }); // Display API error message
      }

    } catch (error) {
      console.error("Fetch Error:", error);
      setResponse({ error: "Could not connect to the analysis server (API is down)." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>Llama 4 Scout Resume Analyzer</h1>
      <p>Enter resume text below to get structured JSON data from your Groq agent.</p>

      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste resume text here (e.g., Name, Experience, Skills...)"
          rows="10"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </form>

      {/* Response Display */}
      {response && (
        <div className="response-box">
          <h2>Analysis Result</h2>
          {response.error ? (
            <pre className="error">{response.error}</pre>
          ) : (
            <pre className="json-output">
              {JSON.stringify(response, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Guidance for testing */}
      <small>
        To test: Copy a resume's text content and paste it above.
      </small>
    </div>
  );
}

export default App;