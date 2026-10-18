import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './Auth.jsx';
import { STAGE, STAGE_LABEL } from './api.js';
import Layout from './Layout.jsx';
import Login from './Login.jsx';
import Board from './Board.jsx';
import JobDetail from './JobDetail.jsx';
import ChangePassword from './ChangePassword.jsx';

export default function App() {
  const { user, ready } = useAuth();
  useEffect(() => { document.title = 'M3 Labs \u00b7 ' + STAGE_LABEL[STAGE]; }, []);
  if (!ready) return <p className="center">Loading...</p>;
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/jobs/:ref" element={<JobDetail />} />
        <Route path="/password" element={<ChangePassword signedIn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
