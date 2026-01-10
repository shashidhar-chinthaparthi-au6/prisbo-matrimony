import { useState, useRef, useEffect } from 'react';
import ImageWithFallback from './ImageWithFallback';

const LazyImage = ({ src, alt, className, fallbackSrc, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView ? (
        <div className="relative w-full h-full">
          <ImageWithFallback
            src={src}
            alt={alt}
            className={`w-full h-full transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            fallbackSrc={fallbackSrc}
            onLoad={() => setIsLoaded(true)}
            {...props}
          />
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="text-gray-400 text-xs">Loading...</div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}
        >
          <div className="text-gray-400 text-xs">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;

