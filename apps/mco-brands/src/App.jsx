import { Routes, Route, Link } from 'react-router-dom';
import Layout from './Layout.jsx';
import Home from './Home.jsx';
import Shop from './Shop.jsx';
import Product from './Product.jsx';
import Group from './Group.jsx';
import Cart from './Cart.jsx';
import Account from './Account.jsx';
import Quote from './Quote.jsx';

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
        <Route path="/c/:key" element={<Group />} />
        <Route path="/p/:sku" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/account" element={<Account />} />
        <Route path="/quote" element={<Quote />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
