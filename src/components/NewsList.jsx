import React, { useEffect, useState, useRef, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { NewsContext } from '../context/NewsContext';
import Skeleton from './Skeleton';
import NewsArticle from './NewsArticle';
import { truncateDescription, isValidDescription, fallbackImage, formatDate, handleShare } from '../utils/utils';
import throttle from 'lodash/throttle';
import { unstable_batchedUpdates } from 'react-dom';

const NewsList = ({ language, onScroll = () => {} }) => {
  const { news, setNews, nextPage, setNextPage, scrollPosition, setScrollPosition } = useContext(NewsContext);
  const [loading, setLoading] = useState(false);
  const [usePrimaryApi, setUsePrimaryApi] = useState(true);
  const containerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    // Restore scroll position on home page
    if (location.pathname === '/' && containerRef.current) {
      containerRef.current.scrollTop = scrollPosition;
    }
  }, [location.pathname, scrollPosition]);

  useEffect(() => {
    const fetchNews = async () => {
      const baseUrl = usePrimaryApi
        ? 'https://backendpoints.vercel.app/telugu/news'
        : 'https://backendpoints.vercel.app/telugutwo/news';
      const url = language === 'telugu'
        ? `${baseUrl}`
        : 'https://backendpoints.vercel.app/english/news';

      try {
        const nowTime = new Date();
        const storedTimestamp = localStorage.getItem('nextPageTimestamp');
        const storedNextPage = localStorage.getItem('nextPage');


        let timeDifference = 0;
        if (storedTimestamp) {
          // Parse timestamp correctly and calculate difference in hours
          const previousTime = new Date(storedTimestamp);
          timeDifference = (nowTime - previousTime) / (1000 * 60 * 60); // in hours
     
        }

        // Use stored nextPage if within 3-hour limit
        if (storedNextPage && timeDifference < 3) {

          const response = await fetch(`${baseUrl}?page=${storedNextPage}`);
          if (!response.ok) throw new Error('Failed to fetch data using nextPage');
          const data = await response.json();

          unstable_batchedUpdates(() => {
            setNews(data.results);
            setNextPage(data.nextPage);
            localStorage.setItem('nextPage', data.nextPage);
            localStorage.setItem('nextPageTimestamp', nowTime.toISOString()); // Save as ISO format
          });
        } else {
          // Fetch fresh news

          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch initial data');
          const data = await response.json();

          unstable_batchedUpdates(() => {
            setNews(data.results);
            setNextPage(data.nextPage);
            localStorage.setItem('nextPage', data.nextPage);
            localStorage.setItem('nextPageTimestamp', nowTime.toISOString()); // Save as ISO format
          });
        }
      } catch (error) {

        if (language === 'telugu') {
          setUsePrimaryApi(prev => !prev);
        }
      }
    };

    if (news.length === 0) {
      fetchNews();
    }
  }, [language, news.length, setNews, setNextPage, usePrimaryApi]);

  const loadMore = async () => {
    if (!nextPage || loading) return;

    setLoading(true);
    const baseUrl = usePrimaryApi
      ? `https://backendpoints.vercel.app/telugu/news?page=${nextPage}`
      : `https://backendpoints.vercel.app/telugutwo/news?page=${nextPage}`;
    const url = language === 'telugu'
      ? baseUrl
      : `https://backendpoints.vercel.app/english/news?page=${nextPage}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch more data');
      const data = await response.json();
      unstable_batchedUpdates(() => {
        setNews([...news, ...data.results]);
        setNextPage(data.nextPage);
        localStorage.setItem('nextPage', data.nextPage);
        localStorage.setItem('nextPageTimestamp', new Date().toISOString()); // Save ISO
      });
    } catch (error) {

      if (language === 'telugu') {
        setUsePrimaryApi(prev => !prev);
      }
    } finally {
      setLoading(false);
    }
  };

  // Prefetch next page when user is about to reach the last few articles
  const prefetchNextPage = async () => {
    if (!nextPage || loading) return;

    setLoading(true);
    const baseUrl = usePrimaryApi
      ? `https://backendpoints.vercel.app/telugu/news?page=${nextPage}`
      : `https://backendpoints.vercel.app/telugutwo/news?page=${nextPage}`;
    const url = language === 'telugu'
      ? baseUrl
      : `https://backendpoints.vercel.app/english/news?page=${nextPage}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to prefetch data');
      const data = await response.json();
      unstable_batchedUpdates(() => {
        setNews([...news, ...data.results]);
        setNextPage(data.nextPage);
        localStorage.setItem('nextPage', data.nextPage);
        localStorage.setItem('nextPageTimestamp', new Date().toISOString()); // Save ISO
      });
    } catch (error) {

      if (language === 'telugu') {
        setUsePrimaryApi(prev => !prev);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prefetch when user is about to reach the last few articles
    if (news.length > 0 && news.length % 7 === 0) {
      prefetchNextPage();
    }
  }, [news.length]);

  // Throttled scroll event handler
  const handleScroll = throttle(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      unstable_batchedUpdates(() => {
        setScrollPosition(scrollTop);
        const buffer = 500;
        if (scrollTop + clientHeight >= scrollHeight - buffer) {
          loadMore();
        }
        onScroll(scrollTop);
      });
    }
  }, 100);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  return (
    <div ref={containerRef} className="h-screen overflow-y-scroll pt-14" >
      {news.length === 0 ? (
        <Skeleton />
      ) : (
        news.map(article => {
          if (!isValidDescription(article.description)) return null;
          return (
            <NewsArticle
              key={article.article_id}
              article={article}
              fallbackImage={fallbackImage}
              formatDate={formatDate}
              truncateDescription={truncateDescription}
              handleShare={handleShare}
              language={language}
            />
          );
        })
      )}
      {loading && <div className="text-center p-4">Loading...</div>}
    </div>
  );
};

export default NewsList;
