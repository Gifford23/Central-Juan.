import React, { useState, useEffect } from "react";

const VerseOfTheDay = ({ className = "" }) => {
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVerse = async () => {
      try {
        const res = await fetch(
          "https://beta.ourmanna.com/api/v1/get/?format=json&order=daily",
        );
        const data = await res.json();

        if (data.verse) {
          setVerse({
            text: data.verse.details.text,
            reference: data.verse.details.reference,
            version: data.verse.details.version,
          });
        }
      } catch (error) {
        console.error("Failed to fetch verse:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVerse();
  }, []);

  if (loading || !verse) return null;

  return (
    <div className={`w-full flex justify-center px-4 py-2 ${className}`}>
      <div
        className="
          w-full
          max-w-xs sm:max-w-lg md:max-w-2xl
          text-center
          break-words
          min-w-0
        "
      >
        <p
          className="
            text-[10px] sm:text-xs md:text-sm
            text-slate-600
            font-medium
            leading-relaxed
            whitespace-pre-line
          "
        >
          <span className="font-serif italic text-slate-700">
            “{verse.text}”
          </span>
        </p>

        {/* Reference */}
        <a
          href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(
            verse.reference,
          )}&version=NIV`}
          target="_blank"
          rel="noopener noreferrer"
          className="
            mt-2
            block
            font-bold
            text-sky-800
            text-[10px] sm:text-xs md:text-sm
            uppercase
            tracking-wide
            hover:text-sky-600
            transition-colors
          "
        >
          — {verse.reference}
        </a>
      </div>
    </div>
  );
};

export default VerseOfTheDay;
