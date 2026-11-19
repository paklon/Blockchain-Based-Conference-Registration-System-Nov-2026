import React, { useState, useEffect } from 'react';

export default function App() {
  const [chainData, setChainData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('register');
  const [statusMessage, setStatusMessage] = useState('');

  // Registration form state
  const [regId, setRegId] = useState('A001');
  const [regName, setRegName] = useState('Alice Yuen');
  const [regEmail, setRegEmail] = useState('alice@polyu.edu.hk');
  const [pubKey, setPubKey] = useState('');
  const [privKey, setPrivKey] = useState('');

  // Attendance form state
  const [attId, setAttId] = useState('A001');
  const [sessionId, setSessionId] = useState('COMP4334_Sec1');
  const [signatureHex, setSignatureHex] = useState('');

  // Query state
  const [queryAttendee, setQueryAttendee] = useState('A001');
  const [querySessionResult, setQuerySessionResult] = useState<any>(null);
  const [querySessionId, setQuerySessionId] = useState('COMP4334_Sec1');
  const [queryParticipantResult, setQueryParticipantResult] = useState<any>(null);

  const fetchChain = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/chain');
      const data = await res.json();
      setChainData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChain();
    const interval = setInterval(fetchChain, 3000);
    return () => clearInterval(interval);
  }, []);

  // Generate key pair
  const generateKeys = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/generate-keys');
      const data = await res.json();
      setPubKey(data.public_key_pem);
      setPrivKey(data.private_key_pem);
      setStatusMessage('RSA Key pair generated successfully!');
    } catch (e) {
      setStatusMessage('Error generating keys');
    }
  };

  // Attendee registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: regId, name: regName, email: regEmail, public_key_pem: pubKey })
      });
      const data = await res.json();
      setStatusMessage(data.message || data.error);
      fetchChain();
    } catch (e) {
      setStatusMessage('Registration failed');
    }
  };

  // Submit attendance to pending pool
  const handleSignAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const certificate = {
      attendee_id: attId,
      session_id: sessionId,
      timestamp: Math.floor(Date.now() / 1000)
    };

    try {
      const res = await fetch('http://localhost:8080/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate, signature: signatureHex })
      });
      const data = await res.json();
      setStatusMessage(data.message || data.error);
      fetchChain();
    } catch (e) {
      setStatusMessage('Attendance submission failed');
    }
  };

  // Miner mines block
  const handleMine = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/mine', { method: 'POST' });
      const data = await res.json();
      setStatusMessage(data.message || data.error);
      fetchChain();
    } catch (e) {
      setStatusMessage('Mining failed');
    }
  };

  // Query 1
  const querySessions = async () => {
    const res = await fetch(`http://localhost:8080/api/query/sessions?attendee_id=${queryAttendee}`);
    const data = await res.json();
    setQuerySessionResult(data);
  };

  // Query 2
  const queryParticipants = async () => {
    const res = await fetch(`http://localhost:8080/api/query/participants?session_id=${querySessionId}`);
    const data = await res.json();
    setQueryParticipantResult(data);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-indigo-400">🛡️</span> PolyU DSAI4202 Blockchain Conference System 23079398d
            </h1>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="bg-gray-800 px-3 py-1 rounded">Chain Height: {chainData?.chain?.length || 0}</span>
            <span className="bg-gray-800 px-3 py-1 rounded">Pending Pool: {chainData?.pending_transactions?.length || 0}</span>
          </div>
        </header>

        {statusMessage && (
          <div className="mb-6 p-4 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-200 flex items-center gap-3">
            <span>✅</span> <span>{statusMessage}</span>
          </div>
        )}

        {/* Navigation tabs */}
        <div className="flex gap-2 mb-6">
          {['register', 'attendance', 'miner', 'explorer', 'query'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition uppercase text-xs ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Registration & Keys */}
        {activeTab === 'register' && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">🔑 Attendee Registration & Wallet</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Attendee ID</label>
                  <input type="text" value={regId} onChange={e => setRegId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input type="text" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                </div>
                <div>
                  <button type="button" onClick={generateKeys} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium mr-2">Generate RSA Key Pair</button>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium">Register to Blockchain</button>
                </div>
              </form>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Public Key PEM</label>
                  <textarea readOnly value={pubKey} className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-xs font-mono text-gray-300"></textarea>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Private Key (Wallet Secret)</label>
                  <textarea readOnly value={privKey} className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-xs font-mono text-red-300"></textarea>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Attendance & Signature */}
        {activeTab === 'attendance' && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">✍️ Session Attendance & Digital Signature</h2>
            <form onSubmit={handleSignAndSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Attendee ID</label>
                <input type="text" value={attId} onChange={e => setAttId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Session ID</label>
                <input type="text" value={sessionId} onChange={e => setSessionId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Digital Signature (Hex)</label>
                <input type="text" placeholder="Enter RSA signature hex..." value={signatureHex} onChange={e => setSignatureHex(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-xs" />
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-medium">Submit Attendance to Pool</button>
            </form>
          </div>
        )}

        {/* Tab 3: Miner & Dynamic Difficulty */}
        {activeTab === 'miner' && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">💻 Proof-of-Work Miner & Dynamic Difficulty</h2>
            <p className="text-sm text-gray-400 mb-4">Miners verify signatures of pending transactions and solve cryptographic puzzles. Difficulty adjusts dynamically based on generation time.</p>
            <div className="bg-gray-900 p-4 rounded-lg mb-4">
              <h3 className="text-sm font-medium text-indigo-400 mb-2">Pending Transactions Pool ({chainData?.pending_transactions?.length || 0})</h3>
              <pre className="text-xs font-mono text-gray-300 overflow-x-auto">{JSON.stringify(chainData?.pending_transactions || [], null, 2)}</pre>
            </div>
            <button onClick={handleMine} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg">Start Mining Block (PoW)</button>
          </div>
        )}

        {/* Tab 4: Blockchain Explorer */}
        {activeTab === 'explorer' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">🗄️ Blockchain Ledger Explorer</h2>
            {chainData?.chain?.map((block: any) => (
              <div key={block.index} className="bg-gray-800 border border-gray-700 p-4 rounded-xl font-mono text-xs space-y-2">
                <div className="flex justify-between text-indigo-400 font-bold">
                  <span>BLOCK #{block.index}</span>
                  <span>Difficulty: {block.difficulty} | Nonce: {block.nonce} | Time: {block.mining_time_seconds?.toFixed(4)}s</span>
                </div>
                <div>Hash: <span className="text-emerald-400">{block.hash}</span></div>
                <div>Previous Hash: <span className="text-gray-400">{block.previous_hash}</span></div>
                <div>Transactions:</div>
                <pre className="bg-gray-900 p-2 rounded text-gray-300 overflow-x-auto">{JSON.stringify(block.transactions, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: Query Panel */}
        {activeTab === 'query' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">🔍 Query Sessions by Attendee</h2>
              <input type="text" value={queryAttendee} onChange={e => setQueryAttendee(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
              <button onClick={querySessions} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm">Query Sessions</button>
              <pre className="bg-gray-900 p-3 rounded text-xs font-mono text-emerald-400">{JSON.stringify(querySessionResult, null, 2)}</pre>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">🔍 Query Participants by Session</h2>
              <input type="text" value={querySessionId} onChange={e => setQuerySessionId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
              <button onClick={queryParticipants} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm">Query Participants</button>
              <pre className="bg-gray-900 p-3 rounded text-xs font-mono text-emerald-400">{JSON.stringify(queryParticipantResult, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}