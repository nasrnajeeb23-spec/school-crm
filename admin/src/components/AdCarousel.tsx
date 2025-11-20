import React, { useState, useEffect, useCallback } from 'react';
import { AdSlideContent } from '../types';

interface AdCarouselProps {
    slides: AdSlideContent[];
}

const AdCarousel: React.FC<AdCarouselProps> = ({ slides }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = useCallback(() => {
        const isLastSlide = currentIndex === slides.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, slides.length]);

    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    };
    
    useEffect(() => {
        const slideInterval = setInterval(goToNext, 5000); // Change slide every 5 seconds
        return () => clearInterval(slideInterval);
    }, [goToNext]);

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetHref: string) => {
        if (targetHref.startsWith('#') && targetHref.length > 1) {
            e.preventDefault();
            const targetId = targetHref.substring(1);
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    if (!slides || slides.length === 0) {
        return <div className="h-[500px] w-full m-auto relative group flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-2xl"><p>لا توجد إعلانات لعرضها.</p></div>;
    }
    
    const currentSlide = slides[currentIndex];

    return (
        <div className="h-[500px] w-full m-auto relative group">
            <div
                style={{ backgroundImage: `url(${currentSlide.imageUrl})` }}
                className="w-full h-full rounded-2xl bg-center bg-cover transition-all duration-700 ease-in-out"
            >
                {/* Overlay */}
                <div className="w-full h-full rounded-2xl bg-black/60 flex flex-col justify-center items-center text-center p-8">
                     <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 transition-all duration-500">
                        {currentSlide.title}
                    </h2>
                    <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl transition-all duration-500">
                        {currentSlide.description}
                    </p>
                    <a 
                        href={currentSlide.link} 
                        onClick={(e) => handleNavClick(e, currentSlide.link)}
                        className="px-6 py-3 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105"
                    >
                       {currentSlide.ctaText}
                    </a>
                </div>
            </div>

            {/* Left Arrow */}
            <div className="hidden group-hover:block absolute top-[50%] -translate-y-[-50%] left-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer" onClick={goToPrevious}>
                &#10094;
            </div>
            {/* Right Arrow */}
            <div className="hidden group-hover:block absolute top-[50%] -translate-y-[-50%] right-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer" onClick={goToNext}>
                &#10095;
            </div>

            <div className="flex top-4 justify-center py-2 absolute bottom-5 right-0 left-0">
                {slides.map((slide, slideIndex) => (
                    <div 
                        key={slideIndex}
                        onClick={() => goToSlide(slideIndex)}
                        className={`text-2xl cursor-pointer mx-1 transition-all duration-300 ${currentIndex === slideIndex ? 'text-white' : 'text-gray-400/50'}`}
                    >
                        ●
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdCarousel;