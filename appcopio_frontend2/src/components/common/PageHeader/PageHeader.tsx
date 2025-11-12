import React from 'react';
import { Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import './PageHeader.css';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  variant?: 'default' | 'centered';
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  variant = 'default'
}) => {
  const navigate = useNavigate();

  const handleBreadcrumbClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box className={`page-header ${variant === 'centered' ? 'page-header--centered' : ''}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs 
          aria-label="breadcrumb" 
          className="page-header__breadcrumbs"
          separator="›"
        >
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.path ? (
                <Link
                  color="inherit"
                  onClick={() => handleBreadcrumbClick(crumb.path!)}
                  sx={{ cursor: 'pointer' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <Typography color="text.primary">
                  {crumb.label}
                </Typography>
              )}
            </React.Fragment>
          ))}
        </Breadcrumbs>
      )}
      
      <Box className="page-header__main">
        <Box className="page-header__content">
          <Typography 
            variant="titlePage" 
            component="h1"
            className="page-header__title"
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="bodyBase" 
              color="text.secondary"
              className="page-header__subtitle"
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {actions && (
          <Box className="page-header__actions">
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;