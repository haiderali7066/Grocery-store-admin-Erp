"use client";

import React from "react";

const WhatsAppButton = () => {
  const phoneNumber = "923001234567"; // 👉 replace with your number (no + sign)
  const message = "Hello, I want to inquire about a product.";

  const whatsappUrl = `https://wa.me/${923335170817}?text=${encodeURIComponent(
    message,
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50"
    >
      <div className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition duration-300 animate-bounce">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          className="w-6 h-6 fill-current"
        >
          <path d="M16.004 3C8.824 3 3 8.822 3 16c0 2.82.92 5.43 2.48 7.56L3 29l5.64-2.44A12.94 12.94 0 0 0 16.004 29C23.18 29 29 23.178 29 16S23.18 3 16.004 3zm0 23.5c-2.22 0-4.3-.68-6.03-1.84l-.43-.27-3.35 1.45.72-3.58-.28-.46A10.44 10.44 0 0 1 5.5 16c0-5.8 4.7-10.5 10.5-10.5S26.5 10.2 26.5 16 21.8 26.5 16 26.5zm5.76-7.77c-.32-.16-1.88-.93-2.17-1.04-.29-.11-.5-.16-.7.16-.2.32-.8 1.04-.98 1.25-.18.21-.36.24-.68.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.6-1.9-1.78-2.22-.18-.32-.02-.5.14-.66.14-.14.32-.36.48-.54.16-.18.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.7-1.7-.96-2.33-.25-.6-.5-.52-.7-.53h-.6c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.1 1.31 3.32.16.21 2.27 3.46 5.5 4.86.77.33 1.37.53 1.84.68.77.24 1.47.21 2.02.13.62-.09 1.88-.77 2.15-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37z" />
        </svg>
      </div>
    </a>
  );
};

export default WhatsAppButton;
