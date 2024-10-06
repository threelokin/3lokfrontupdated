import React from 'react';
import NewsList from '../components/NewsList';

const Home = ({ language }) => {
  const handleScroll = (scrollTop) => {
    // Handle scroll logic here if needed
  };

  return (
    <div className="h-screen bg-gray-300">
      <NewsList language={language} onScroll={handleScroll} />
    </div>
  );
};

export default Home;
