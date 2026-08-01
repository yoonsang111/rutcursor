import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SearchPage from "./pages/SearchPage";
import CategoryPage from "./pages/CategoryPage";
import LocationPage from "./pages/LocationPage";
import CategoriesPage from "./pages/CategoriesPage";
import LocationsPage from "./pages/LocationsPage";

function App() {
  console.log('🎯 [App] 컴포넌트 렌더링');
  
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/location/:location" element={<LocationPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 