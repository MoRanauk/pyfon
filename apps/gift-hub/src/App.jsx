import { Routes, Route, Link } from 'react-router-dom';
import Layout from './Layout.jsx';
import Home from './Home.jsx';
import Sub from './Sub.jsx';
import Product from './Product.jsx';
import { ProductCrumbs } from './Crumbs.jsx';
import Cart from './Cart.jsx';
import Checkout from './Checkout.jsx';
import Series from './PersonalisedRoute.jsx';
import Deliver from './Deliver.jsx';
import Account from './Account.jsx';
import Orders from './Orders.jsx';
import Track from './Track.jsx';

const NotFound = () => <div className="wrap sec center"><h1>Page not found</h1><Link to="/">Back to home</Link></div>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Sub />} />
        <Route path="/c/personalised" element={<Series />} />
        <Route path="/deliver/:slug" element={<Deliver />} />
        <Route path="/c/:key" element={<Sub />} />
        <Route path="/p/:sku" element={<ProductCrumbs><Product /></ProductCrumbs>} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/account" element={<Account />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/track" element={<Track />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
