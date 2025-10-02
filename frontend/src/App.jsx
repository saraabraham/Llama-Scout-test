import React, { useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/analyze';

function App() {
  // Use state to hold the selected file object
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    // Get the file object from the input element
    setFile(e.target.files[0]);
    setResponse(null); // Clear previous response
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResponse(null);

    // Create a FormData object to handle the file upload
    const formData = new FormData();
    // 'resumeFile' must match the field name used in api.js: upload.single('resumeFile')
    formData.append('resumeFile', file);

    try {
      // 1. Send the FormData to the Node.js API
      const res = await fetch(API_URL, {
        method: 'POST',
        // DO NOT set Content-Type header; FormData sets it correctly as multipart/form-data
        body: formData,
      });

      const data = await res.json();

      if (data.status === 'success') {
        setResponse(data.data);
      } else {
        setResponse({ error: `Analysis Failed: ${data.message || 'Unknown error'}` });
      }

    } catch (error) {
      console.error("Fetch Error:", error);
      setResponse({ error: "Could not connect to the analysis server (API is down)." });
    } finally {
      setLoading(false);
      // Optional: Clear the file input after submission
      setFile(null);
      document.getElementById('fileInput').value = null;
    }
  };

  return (
    <div className="app-container">
      <h1>Llama 4 Scout Resume Analyzer</h1>
      <p>Upload a PDF resume below for structural analysis by your Groq agent.</p>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          id="fileInput"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Analyzing...' : 'Upload & Analyze Resume'}
        </button>
      </form>

      {file && !loading && (
        <p className="file-info">Selected file: <strong>{file.name}</strong></p>
      )}


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
    </div>
  );
}

export default App;