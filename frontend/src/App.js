import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import HomeScreen from "./components/HomeScreen";
import GameCanvas from "./components/GameCanvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeScreen API={API} />} />
          <Route path="/level/:levelNumber" element={<GameCanvas API={API} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;