import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Requirement {
  label: string;
  isCompleted: boolean;
}

interface RequirementsTooltipProps {
    isOpen: boolean;
  requirements: Requirement[];
}

const RequirementsTooltip = ({ isOpen, requirements }: RequirementsTooltipProps) => {
  if (!isOpen) return null;

    return (
        <AnimatePresence>
                <motion.div 
        className="absolute bottom-12 right-0 w-72 bg-[#1f1239] border border-[#20DDBB]/20 rounded-lg shadow-lg p-4 z-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                >
        <h3 className="text-white font-medium mb-3">Requirements</h3>
        <ul className="space-y-2">
          {requirements.map((req, index) => (
            <li key={index} className="flex items-center justify-between">
              <span className="text-white/70 text-sm">{req.label}</span>
              {req.isCompleted ? (
                <span className="text-green-400 flex items-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                            </svg>
                </span>
              ) : (
                <span className="text-red-400 flex items-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                        </svg>
                </span>
              )}
                    </li>
                ))}
            </ul>
        <p className="text-white/50 text-xs mt-3">
          All requirements must be met before you can publish your release.
        </p>
      </motion.div>
    </AnimatePresence>
    );
};

export default RequirementsTooltip; 