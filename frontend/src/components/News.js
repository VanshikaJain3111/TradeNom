import React, { useState, useEffect } from "react";
import "./News.css";

// Import the news data (you'll need to create this file or adjust the path)
import newsData from "../data/newsData.json";

function News() {
  const [selectedDate, setSelectedDate] = useState("");
  const [filteredNews, setFilteredNews] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  useEffect(() => {
    // Get all available dates and sort them
    const dates = Object.keys(newsData).sort((a, b) => b.localeCompare(a));
    setAvailableDates(dates);

    // Set today's date as default (or most recent available)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const defaultDate = dates.includes(today) ? today : dates[0];
    setSelectedDate(defaultDate);
  }, []);

  useEffect(() => {
    if (selectedDate && newsData[selectedDate]) {
      let news = newsData[selectedDate];

      // Filter by search term
      if (searchTerm) {
        news = news.filter((item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by topic
      if (selectedTopic) {
        news = news.filter((item) =>
          item.topics.some((topic) => topic.topic === selectedTopic)
        );
      }

      setFilteredNews(news);
    } else {
      setFilteredNews([]);
    }
  }, [selectedDate, searchTerm, selectedTopic]);

  const formatDate = (dateString) => {
    if (dateString.length === 8) {
      const year = dateString.slice(0, 4);
      const month = dateString.slice(4, 6);
      const day = dateString.slice(6, 8);
      return new Date(`${year}-${month}-${day}`).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return dateString;
  };

  const formatTime = (timeString) => {
    if (timeString && timeString.includes("T")) {
      const time = timeString.split("T")[1];
      const hours = time.slice(0, 2);
      const minutes = time.slice(2, 4);
      return `${hours}:${minutes}`;
    }
    return timeString;
  };

  const getSentimentColor = (label) => {
    switch (label) {
      case "Bullish":
        return "#4caf50";
      case "Somewhat-Bullish":
        return "#8bc34a";
      case "Neutral":
        return "#ffc107";
      case "Somewhat-Bearish":
        return "#ff9800";
      case "Bearish":
        return "#f44336";
      default:
        return "#9e9e9e";
    }
  };

  const getAllTopics = () => {
    const topics = new Set();
    Object.values(newsData).forEach((dayNews) => {
      dayNews.forEach((news) => {
        news.topics.forEach((topic) => topics.add(topic.topic));
      });
    });
    return Array.from(topics).sort();
  };

  return (
    <div className="news-container">
      <div className="news-header">
        <h1>Market News</h1>
        <p>Stay updated with the latest financial news and market insights</p>
      </div>

      <div className="news-filters">
        <div className="filter-group">
          <label htmlFor="date-select">Select Date:</label>
          <select
            id="date-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-select"
          >
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="search-input">Search News:</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="topic-select">Filter by Topic:</label>
          <select
            id="topic-select"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="topic-select"
          >
            <option value="">All Topics</option>
            {getAllTopics().map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="news-stats">
        <div className="stat-item">
          <span className="stat-number">{filteredNews.length}</span>
          <span className="stat-label">News Articles</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {selectedDate ? formatDate(selectedDate) : "No Date"}
          </span>
          <span className="stat-label">Selected Date</span>
        </div>
      </div>

      <div className="news-grid">
        {filteredNews.length > 0 ? (
          filteredNews.map((news, index) => (
            <div key={index} className="news-card">
              <div className="news-card-header">
                <h3 className="news-title">{news.title}</h3>
                <span className="news-time">
                  {formatTime(news.time_published)}
                </span>
              </div>

              <div className="news-topics">
                {news.topics.map((topic, topicIndex) => (
                  <span
                    key={topicIndex}
                    className="topic-tag"
                    style={{ opacity: parseFloat(topic.relevance_score) }}
                  >
                    {topic.topic} (
                    {(parseFloat(topic.relevance_score) * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>

              {news.ticker_sentiment && news.ticker_sentiment.length > 0 && (
                <div className="ticker-sentiment">
                  <h4>Stock Sentiment</h4>
                  <div className="sentiment-list">
                    {news.ticker_sentiment.map((sentiment, sentimentIndex) => (
                      <div key={sentimentIndex} className="sentiment-item">
                        <div className="ticker-info">
                          <span className="ticker-symbol">
                            {sentiment.ticker}
                          </span>
                          <span className="relevance-score">
                            Relevance:{" "}
                            {(
                              parseFloat(sentiment.relevance_score) * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="sentiment-details">
                          <span
                            className="sentiment-label"
                            style={{
                              backgroundColor: getSentimentColor(
                                sentiment.ticker_sentiment_label
                              ),
                              color: "white",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8em",
                            }}
                          >
                            {sentiment.ticker_sentiment_label}
                          </span>
                          <span className="sentiment-score">
                            Score:{" "}
                            {parseFloat(
                              sentiment.ticker_sentiment_score
                            ).toFixed(3)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-news">
            <h3>No news available</h3>
            <p>No news articles found for the selected date and filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default News;
