"use client";

import { useEffect, useState } from "react";

export default function Typewriter({
  words,
  className = "",
  typeSpeed = 55,
  deleteSpeed = 28,
  hold = 1800,
}: {
  words: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  hold?: number;
}) {
  const [text, setText] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setText(words[0]);
      return;
    }

    const current = words[wordIdx % words.length];
    let delay = deleting ? deleteSpeed : typeSpeed;

    if (!deleting && text === current) {
      delay = hold;
    } else if (deleting && text === "") {
      delay = 350;
    }

    const id = setTimeout(() => {
      if (!deleting && text === current) {
        setDeleting(true);
      } else if (deleting && text === "") {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % words.length);
      } else {
        setText(
          deleting
            ? current.slice(0, text.length - 1)
            : current.slice(0, text.length + 1)
        );
      }
    }, delay);

    return () => clearTimeout(id);
  }, [text, deleting, wordIdx, words, typeSpeed, deleteSpeed, hold]);

  return (
    <span className={className}>
      {text}
      <span className="cursor-blink text-cyan">▮</span>
    </span>
  );
}
