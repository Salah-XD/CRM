import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ClientTable from "./Components/Pages/ClientTable";
import AddClientForm from "./Components/Pages/AddClient";
import BusinessDetail from "./Components/Pages/BussinessDetail";
import OutletDetail from "./Components/Pages/OutletDetail";
import ClientOnboarding from "./Components/Pages/ClientOnboarding";
import AdminDashboard from "./Components/Layout/AdminDashboard";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<ClientTable />} />
        <Route path="/add-business" element={<BusinessDetail />} />
        <Route
          path="/add-client"
          element={
            <AdminDashboard>
              <AddClientForm />
            </AdminDashboard>
          }
        />
        <Route path="/add-outlet" element={<OutletDetail />} />
        <Route path="/client-onboarding" element={<ClientOnboarding />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
