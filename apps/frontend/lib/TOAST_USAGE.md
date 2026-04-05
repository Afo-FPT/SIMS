# Toast System Usage Guide

Toast system đã được tích hợp vào toàn bộ UI. Đây là cách sử dụng:

## Import

```typescript
import { useToastHelpers } from '@/lib/toast';
```

## Sử dụng trong Component

```typescript
'use client';

import { useToastHelpers } from '@/lib/toast';

export default function MyComponent() {
  const toast = useToastHelpers();
  
  const handleAction = () => {
    // Success
    toast.success('Operation completed successfully!');
    
    // Error
    toast.error('Something went wrong');
    
    // Warning
    toast.warning('Please check your input');
    
    // Info
    toast.info('Processing your request...');
    
    // Custom duration (default: 4000ms)
    toast.success('Quick message', 2000);
  };
  
  return <button onClick={handleAction}>Click me</button>;
}
```

## Các loại Toast

- **success**: Thành công (màu xanh lá)
- **error**: Lỗi (màu đỏ)
- **warning**: Cảnh báo (màu vàng)
- **info**: Thông tin (màu xanh dương)

## Đã tích hợp vào:

✅ Login/Signup/Verify pages
✅ Customer pages (rent-requests, contracts, service-requests, inventory-checking, settings)
✅ Admin pages (dashboard, users, logs)
✅ Logout action

## Best Practices

1. **Success**: Dùng khi action thành công (create, update, delete, submit)
2. **Error**: Dùng khi có lỗi (API error, validation failed)
3. **Warning**: Dùng khi cần cảnh báo (validation warning, missing fields)
4. **Info**: Dùng cho thông tin (status updates, processing)

## Ví dụ thực tế

```typescript
// Form submission
const handleSubmit = async () => {
  try {
    await saveData();
    toast.success('Data saved successfully');
  } catch (error) {
    toast.error('Failed to save data');
  }
};

// Validation
if (!email) {
  toast.warning('Please enter your email');
  return;
}

// API call
const loadData = async () => {
  try {
    const data = await fetchData();
    toast.success('Data loaded');
  } catch (error) {
    toast.error('Failed to load data');
  }
};
```
