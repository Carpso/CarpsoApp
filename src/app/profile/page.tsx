// src/app/profile/page.tsx
// Existing imports...

    const handleBookmarkFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Allow numbers for latitude and longitude
        if (name === 'latitude' || name === 'longitude') {
             // Use a regular expression to allow numbers and a single decimal point
            const isValidNumber = /^-?\d*\.?\d*$/.test(value);
            if (isValidNumber || value === '') { // Allow empty for clearing
                setCurrentBookmark(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        setCurrentBookmark(prev => ({ ...prev, [name]: value }));
    };

// Existing code...
