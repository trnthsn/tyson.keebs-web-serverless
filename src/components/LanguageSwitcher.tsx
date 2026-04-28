'use client';

import { useTranslation } from 'react-i18next';
import { Dropdown, Button } from 'antd';
import { DownOutlined, CheckOutlined } from '@ant-design/icons';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = languages.find((l) => l.code === i18n.language) || languages[0];

  const items = languages.map((lang) => ({
    key: lang.code,
    label: (
      <span className="flex items-center justify-between gap-4">
        <span>{lang.label}</span>
        {i18n.language === lang.code && <CheckOutlined className="text-xs" />}
      </span>
    ),
    onClick: () => {
      localStorage.setItem('tysonkeebs-language', lang.code);
      localStorage.setItem('i18nextLng', lang.code);
      i18n.changeLanguage(lang.code);
    },
  }));

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Button
        type="text"
        className="flex items-center gap-1 text-[1.2rem] tracking-wide text-[rgba(18,18,18,0.55)] hover:!text-[#121212] dark:text-[rgba(255,255,255,0.55)] dark:hover:!text-white transition-colors"
      >
        <span className="uppercase font-medium">{current.code}</span>
        <DownOutlined className="text-[1rem]" />
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
