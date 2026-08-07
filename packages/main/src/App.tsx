import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import LayoutV2 from "./v2/layout/LayoutV2";
import V2HomePage from "./v2/pages/V2HomePage";
import V2ProductsPage from "./v2/pages/V2ProductsPage";
import V2ProductDetailPage from "./v2/pages/V2ProductDetailPage";
import V2PopularPage from "./v2/pages/V2PopularPage";
import V2EventPage from "./v2/pages/V2EventPage";
import V2CountryPage from "./v2/pages/V2CountryPage";
import V2RegionPage from "./v2/pages/V2RegionPage";
import V2CategoryPage from "./v2/pages/V2CategoryPage";
import V2DestinationPage from "./v2/pages/V2DestinationPage";
import V2FlightSearchPage from "./v2/pages/V2FlightSearchPage";
import V2PrivacyPolicyPage from "./v2/pages/V2PrivacyPolicyPage";
import V2TermsPage from "./v2/pages/V2TermsPage";
import V2NotFoundPage from "./v2/pages/V2NotFoundPage";

function AnalyticsTracker() {
  const location = useLocation();

  React.useEffect(() => {
    const gtag = (window as any).gtag;
    if (typeof gtag === "function") {
      gtag("event", "page_view", {
        page_path: `${location.pathname}${location.search}`,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location.pathname, location.search]);

  return null;
}

function ScrollToTop() {
  const location = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return null;
}

function AdminRedirect() {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("https://admin.tourstream.kr/");
    }
  }, []);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AnalyticsTracker />
      <Routes>
        <Route
          path="/"
          element={
            <LayoutV2>
              <V2HomePage />
            </LayoutV2>
          }
        />
        <Route
          path="/products"
          element={
            <LayoutV2>
              <V2ProductsPage />
            </LayoutV2>
          }
        />
        <Route
          path="/product/:id"
          element={
            <LayoutV2>
              <V2ProductDetailPage />
            </LayoutV2>
          }
        />
        <Route
          path="/popular"
          element={
            <LayoutV2>
              <V2PopularPage />
            </LayoutV2>
          }
        />
        <Route
          path="/event/:eventId"
          element={
            <LayoutV2>
              <V2EventPage />
            </LayoutV2>
          }
        />
        <Route
          path="/country/:id"
          element={
            <LayoutV2>
              <V2CountryPage />
            </LayoutV2>
          }
        />
        <Route
          path="/region/:name"
          element={
            <LayoutV2>
              <V2RegionPage />
            </LayoutV2>
          }
        />
        <Route
          path="/category/:id"
          element={
            <LayoutV2>
              <V2CategoryPage />
            </LayoutV2>
          }
        />
        <Route
          path="/destination/:region/:category"
          element={
            <LayoutV2>
              <V2DestinationPage />
            </LayoutV2>
          }
        />
        <Route
          path="/flights"
          element={
            <LayoutV2>
              <V2FlightSearchPage />
            </LayoutV2>
          }
        />
        <Route
          path="/privacy"
          element={
            <LayoutV2>
              <V2PrivacyPolicyPage />
            </LayoutV2>
          }
        />
        <Route
          path="/terms"
          element={
            <LayoutV2>
              <V2TermsPage />
            </LayoutV2>
          }
        />
        <Route path="/admin/*" element={<AdminRedirect />} />
        {/* /v2 경로도 당분간 동일 화면으로 유지 (북마크/외부 링크 호환) */}
        <Route
          path="/v2"
          element={
            <LayoutV2>
              <V2HomePage />
            </LayoutV2>
          }
        />
        <Route
          path="/v2/products"
          element={
            <LayoutV2>
              <V2ProductsPage />
            </LayoutV2>
          }
        />
        <Route
          path="/v2/product/:id"
          element={
            <LayoutV2>
              <V2ProductDetailPage />
            </LayoutV2>
          }
        />
        <Route
          path="/v2/popular"
          element={
            <LayoutV2>
              <V2PopularPage />
            </LayoutV2>
          }
        />
        <Route
          path="/v2/event/:eventId"
          element={
            <LayoutV2>
              <V2EventPage />
            </LayoutV2>
          }
        />
        <Route
          path="/v2/country/:id"
          element={
            <LayoutV2>
              <V2CountryPage />
            </LayoutV2>
          }
        />
        <Route
          path="/v2/region/:name"
          element={
            <LayoutV2>
              <V2RegionPage />
            </LayoutV2>
          }
        />
        <Route
          path="/v2/category/:id"
          element={
            <LayoutV2>
              <V2CategoryPage />
            </LayoutV2>
          }
        />
        <Route
          path="*"
          element={
            <LayoutV2>
              <V2NotFoundPage />
            </LayoutV2>
          }
        />
      </Routes>
    </Router>
  );
}

export default App; 