import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./Layout";
import { CheckoutPage } from "./pages/CheckoutPage";
import { MoviesPage } from "./pages/MoviesPage";
import { CancelPage, NotFoundPage, SuccessPage } from "./pages/ResultPages";
import { SeatsPage } from "./pages/SeatsPage";

/** Vite's base ("/projects/seatpicker/") without the trailing slash. */
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MoviesPage />} />
        <Route path="seats" element={<SeatsPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="success" element={<SuccessPage />} />
        <Route path="cancel" element={<CancelPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <AppRoutes />
    </BrowserRouter>
  );
}
