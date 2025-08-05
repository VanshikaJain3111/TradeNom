import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Change if backend is hosted elsewhere
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
