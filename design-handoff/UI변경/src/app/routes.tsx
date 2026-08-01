import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Country } from "./pages/Country";
import { Category } from "./pages/Category";
import { ProductPage } from "./pages/Product";
import { Region } from "./pages/Region";
import { Popular } from "./pages/Popular";
import { Event } from "./pages/Event";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "popular", Component: Popular },
      { path: "event/:eventId", Component: Event },
      { path: "country/:id", Component: Country },
      { path: "region/:name", Component: Region },
      { path: "category/:id", Component: Category },
      { path: "product/:id", Component: ProductPage },
    ],
  },
]);