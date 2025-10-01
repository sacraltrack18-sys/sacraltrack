"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  selector?: string;
}

const Portal: React.FC<PortalProps> = ({ children, selector = 'body' }) => {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<Element | null>(null);

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window !== 'undefined') {
      const element = document.querySelector(selector);
      if (element) {
        setContainer(element);
        setMounted(true);
      }
    }

    return () => {
      setMounted(false);
      setContainer(null);
    };
  }, [selector]);

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      // Force cleanup on component unmount
      setMounted(false);
      setContainer(null);
    };
  }, []);

  if (!mounted || !container) {
    return null;
  }

  return createPortal(children, container);
};

export default Portal;
