import { Routes, Route, Link } from 'react-router-dom';
import Layout from './Layout.jsx';
import Home from './Home.jsx';
import Shop from './Shop.jsx';
import Product from './Product.jsx';

function NotFound() {
  return (
    <div className="wrap section">
      <h2>Page not found</h2>
      <p className="muted">This page does not exist yet.</p>
      <Link to="/">Back to home</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/p/:sku" element={<Product />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
