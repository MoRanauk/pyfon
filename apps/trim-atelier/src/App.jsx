import { Routes, Route, Link } from 'react-router-dom';
import Layout from './Layout.jsx';
import Home from './Home.jsx';
import Shop from './Shop.jsx';
import Product from './Product.jsx';
import Cart from './Cart.jsx';
import Checkout from './Checkout.jsx';
import Account from './Account.jsx';
import Collection from './Collection.jsx';

const NotFound = () => <div className="wrap sec center"><h1>Page not found</h1><Link to="/">Back to home</Link></div>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/c/:key" element={<Shop />} />
        <Route path="/p/:sku" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
