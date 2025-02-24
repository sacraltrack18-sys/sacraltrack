import React from 'react';
import { NewsItem } from '@/app/stores/newsStore'; // Import the correct NewsItem

interface NewsCardProps {
    news: NewsItem;
}

const NewsCard: React.FC<NewsCardProps> = ({ news }) => {
    //Handle potential undefined values
    const title = news.name || "Untitled News";
    const description = news.description || "No description available";

    const {img_url, author, likes, created } = news;
  
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-0 mx-auto w-full md:w-600px lg:w-600px mb-6 max-w-full"> {/* Added max-w-full */}
        <div className="flex justify-between items-center mb-4">
          {/* <div className="text-white font-medium text-sm">{author}</div> */}
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M4.343 12.343 7 15.657l2.657-2.657a.5.5 0 01.708.708l3 3a.5.5 0 01-.708.708l-3 3a.5.5 0 01-.708-.708l2.657-2.657-2.657-2.657a.5.5 0 01.708-.708l3 3z" />
            </svg>
            <span className="text-white ml-1 text-xs">{likes}</span>
          </div>
        </div>
        <img
          src={img_url}
          alt={title}
          className="w-full rounded-lg h-40 object-cover mb-2"
        />
        <div className="relative"> {/* Added relative for absolute positioning */}
          <div
            className="text-white font-bold text-lg mb-2"
            style={{ marginBottom: '20px' }}
          >
         ///
           
          </div>
       
         
        </div>
        <div className="h-20 bg-gray-900 rounded-b-lg relative">

        
        {title}
        <p className="text-gray-300 text-sm mb-2">{description}</p>
        <div className="text-gray-400 text-xs">{created}</div>


        <div className="absolute bottom-4 right-4 flex space-x-2"> {/* Absolute positioned buttons */}
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">
              Read
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 inline-block ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">
              
            </button>
          </div>


        </div> {/* Extended background */}
      </div>
    );
  };
  
  export default NewsCard;

