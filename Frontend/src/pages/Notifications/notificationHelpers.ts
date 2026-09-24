import React from 'react';
import { Inventory, CheckCircleOutlined, ErrorOutlined, Receipt, InfoOutlined } from '@mui/icons-material';

// Return the correct icon for each notification type so the UI looks consistent.
export const getIconForType = (type: string) => {
    switch (type) {
        case 'Stockout Risk':
        case 'Low Stock':
        case 'Overstock':
            return React.createElement(Inventory, { color: type === 'Stockout Risk' ? 'error' : 'warning' });
        case 'Import Completed':
            return React.createElement(CheckCircleOutlined, { color: 'success' });
        case 'Import Failed':
            return React.createElement(ErrorOutlined, { color: 'error' });
        case 'Sales Alert':
            return React.createElement(Receipt, { color: 'info' });
        case 'System Alert':
        default:
            return React.createElement(InfoOutlined, { color: 'primary' });
    }
};

// Map each notification priority to a Material UI color style.
export const getPriorityColor = (priority: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (priority) {
        case 'Critical': return 'error';
        case 'High': return 'error';
        case 'Medium': return 'warning';
        case 'Low': return 'info';
        default: return 'default';
    }
};

// Shared notification type list used in filters and UI labels.
export const NOTIFICATION_TYPES = [
    'Stockout Risk', 'Low Stock', 'Overstock', 'Import Completed',
    'Import Failed', 'Sales Alert', 'System Alert',
];

// Shared priority list used in filters and badges.
export const PRIORITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
