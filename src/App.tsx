import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import "./styles/main.css";

const App: React.FC = () => (
  <div>
    <Header />
    <Home />
    <Footer />
  </div>
);

export default App;
