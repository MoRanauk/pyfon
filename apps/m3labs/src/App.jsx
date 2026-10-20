import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './Auth.jsx';
import { STAGE, STAGE_LABEL } from './api.js';
import Layout from './Layout.jsx';
import Home from './Home.jsx';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import Orders from './Orders.jsx';
import Board from './Board.jsx';
import JobDetail from './JobDetail.jsx';
import JobExtras from './JobExtras.jsx';
import JobSteps from './JobSteps.jsx';
import Products from './Products.jsx';
import ProductEdit from './ProductEdit.jsx';
import Videos from './Videos.jsx';
import Invoice from './Invoice.jsx';
import Approvals from './Approvals.jsx';
import CsvImport from './CsvImport.jsx';
import Tickets from './Tickets.jsx';
import DevHealth from './DevHealth.jsx';
import DevLogs from './DevLogs.jsx';
import DevUsers from './DevUsers.jsx';
import ErrorExplainer from './ErrorExplainer.jsx';
import DevGraphs from './DevGraphs.jsx';
import DevUptime from './DevUptime.jsx';
import DevReports from './DevReports.jsx';
import Money from './Money.jsx';
import Activity from './Activity.jsx';
import InvoiceSheet from './InvoiceSheet.jsx';
import Customers from './Customers.jsx';
import Connect from './Connect.jsx';
import Tools from './Tools.jsx';
import Settings from './Settings.jsx';
import Help from './Help.jsx';
import ChangePassword from './ChangePassword.jsx';

function JobPage() {
  return (
    <>
      <JobExtras />
      <JobSteps />
      <JobDetail />
      <Invoice />
    </>
  );
}

export default function App() {
  const { user, ready } = useAuth();
  useEffect(() => { document.title = 'M3 Labs' + (STAGE ? ' \u00b7 ' + STAGE_LABEL[STAGE] : ''); }, []);
  if (!STAGE) return <Home />;
  if (!ready) return <p className="center">Loading...</p>;
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/queue" element={<Board />} />
        <Route path="/jobs/:ref" element={<JobPage />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:sku" element={<ProductEdit />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/csv" element={<CsvImport />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/health" element={<DevHealth />} />
        <Route path="/logs" element={<DevLogs />} />
        <Route path="/users" element={<DevUsers />} />
        <Route path="/errors" element={<ErrorExplainer />} />
        <Route path="/graphs" element={<DevGraphs />} />
        <Route path="/uptime" element={<DevUptime />} />
        <Route path="/reports" element={<DevReports />} />
        <Route path="/money" element={<Money />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/invoice/:id" element={<InvoiceSheet />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/team" element={<Navigate to="/connect" replace />} />
        <Route path="/messages" element={<Navigate to="/connect" replace />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/password" element={<ChangePassword signedIn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
