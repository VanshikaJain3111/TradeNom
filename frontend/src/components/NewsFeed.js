import React, { useEffect, useState } from 'react';

const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('http://localhost:8000/news');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setNews(data.news || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (loading) return <div>Loading news...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;

  return (
    <div>
      <h2>Latest News</h2>
      {news.length === 0 ? (
        <div>No news found.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {news.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <div><strong>{item.title || 'No Title'}</strong></div>
              <div style={{ color: '#888', fontSize: '0.9em' }}>{item.date}</div>
              <div>{item.summary || item.content || ''}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NewsFeed;
