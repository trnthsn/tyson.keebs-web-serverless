'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Button } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="text"
      shape="circle"
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 text-[rgba(18,18,18,0.55)] hover:!text-[#121212] dark:text-[rgba(255,255,255,0.55)] dark:hover:!text-white transition-colors"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      icon={
        theme === 'light' ? (
          <MoonOutlined className="text-[1.6rem]" />
        ) : (
          <SunOutlined className="text-[1.6rem]" />
        )
      }
    />
  );
};

export default ThemeToggle;
