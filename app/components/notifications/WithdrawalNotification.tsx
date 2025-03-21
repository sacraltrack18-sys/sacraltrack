"use client";

import { Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { format } from 'date-fns';

interface WithdrawalNotification {
  type: 'withdrawal';
  status: 'pending' | 'completed' | 'failed';
  amount: string;
  method: string;
  date: string;
  message: string;
}

interface WithdrawalNotificationsProps {
  notifications: WithdrawalNotification[];
  onDismiss: (index: number) => void;
}

export default function WithdrawalNotifications({ notifications, onDismiss }: WithdrawalNotificationsProps) {
  const getIcon = (status: WithdrawalNotification['status']) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500 text-xl" />;
      case 'pending':
        return <FaClock className="text-yellow-500 text-xl" />;
      case 'failed':
        return <FaTimesCircle className="text-red-500 text-xl" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-4">
      {notifications.map((notification, index) => (
        <Transition
          key={notification.date}
          show={true}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto overflow-hidden">
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getIcon(notification.status)}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Withdrawal {notification.status}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {format(new Date(notification.date), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => onDismiss(index)}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className={`h-1 ${
              notification.status === 'completed' ? 'bg-green-500' :
              notification.status === 'pending' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
          </div>
        </Transition>
      ))}
    </div>
  );
} 