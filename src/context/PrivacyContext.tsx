import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
  isPrivate: boolean;
  togglePrivacy: () => void;
  formatMoney: (amount: number, unit?: string) => string;
  formatManwon: (amount: number) => string;
  formatEok: (amount: number) => string;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivate: false,
  togglePrivacy: () => {},
  formatMoney: (amount: number) => `${amount.toLocaleString()}원`,
  formatManwon: (amount: number) => `${Math.round(amount / 10000).toLocaleString()}만 원`,
  formatEok: (amount: number) => `${(amount / 100000000).toFixed(2)}억 원`,
});

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPrivate, setIsPrivate] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hana_privacy_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hana_privacy_mode', String(isPrivate));
  }, [isPrivate]);

  const togglePrivacy = () => {
    setIsPrivate(prev => !prev);
  };

  const formatMoney = (amount: number = 0, unit: string = '원') => {
    if (isPrivate) return `****${unit}`;
    return `${Math.round(amount || 0).toLocaleString()}${unit}`;
  };

  const formatManwon = (amount: number = 0) => {
    if (isPrivate) return `****만 원`;
    const manwon = Math.round((amount || 0) / 10000);
    return `${manwon.toLocaleString()}만 원`;
  };

  const formatEok = (amount: number = 0) => {
    if (isPrivate) return `****억 원`;
    const eok = ((amount || 0) / 100000000).toFixed(2);
    return `${eok}억 원`;
  };

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy, formatMoney, formatManwon, formatEok }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => useContext(PrivacyContext);
