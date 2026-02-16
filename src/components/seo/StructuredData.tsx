import { useEffect } from 'react';

interface StructuredDataProps {
  type?: 'website' | 'webapp' | 'product' | 'organization';
  pageData?: {
    name?: string;
    description?: string;
    url?: string;
    image?: string;
    datePublished?: string;
    dateModified?: string;
    author?: string;
  };
}

const StructuredData = ({ 
  type = 'webapp', 
  pageData = {} 
}: StructuredDataProps) => {
  useEffect(() => {
    const baseUrl = 'https://support@shelfmerch.com';
    
    // Organization Schema
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Signature Day Tshirt",
      "alternateName": "Signature Day Tshirt",
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`,
      "description": "Create beautiful group photo collages for farewell t-shirts and memories. Design custom signature day collages with your classmates.",
      "foundingDate": "2024",
      "founder": {
        "@type": "Person",
        "name": "SignatureayTshirt Team"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "email": "support@shelfmerch.com"
      },
      "sameAs": [
        "https://twitter.com/signaturedaytshirt",
        "https://facebook.com/signaturedaytshirt",
        "https://instagram.com/signaturedaytshirt"
      ],
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "US"
      }
    };

    // WebApplication Schema
    const webAppSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Signaturea Day Tshirt",
      "alternateName": "Signature Day Tshirt Group Photo Collage Creator",
      "url": baseUrl,
      "description": "Design custom photo collage T-shirts with your classmates. Upload photos, vote on layouts, and create the perfect farewell memory that you'll treasure forever.",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web Browser",
      "browserRequirements": "Requires JavaScript. Requires HTML5.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free to use with premium features available"
      },
      "featureList": [
        "Group photo collage creation",
        "Custom t-shirt design",
        "Photo upload and management",
        "Voting system for layouts",
        "Real-time collaboration",
        "Download high-resolution designs"
      ],
      "screenshot": `${baseUrl}/screenshot.png`,
      "author": {
        "@type": "Organization",
        "name": "SignaturedayTshirt"
      },
      "publisher": {
        "@type": "Organization",
        "name": "SignaturedayTshirt"
      }
    };

    // Website Schema
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Signature Day Tshirt",
      "alternateName": "Signature Day Tshirt",
      "url": baseUrl,
      "description": "Create beautiful group photo collages for farewell t-shirts and memories. Join thousands of students creating beautiful memories.",
      "publisher": {
        "@type": "Organization",
        "name": "SignaturedayTshirt"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    // Breadcrumb Schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Create Group",
          "item": `${baseUrl}/create-group`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Design",
          "item": `${baseUrl}/editor`
        }
      ]
    };

    // FAQ Schema
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I create a farewell t-shirt collage?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Creating a farewell t-shirt collage is easy! First, create a group and invite your classmates. Each member uploads their photo and votes on their favorite grid layout. Once everyone has voted, the winning design is automatically generated and ready for download."
          }
        },
        {
          "@type": "Question",
          "name": "Is SignaturedayTshirt free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! SignaturdayTshirt is completely free to use. You can create unlimited groups, upload photos, and download your final designs at no cost. Premium features may be available for advanced customization options."
          }
        },
        {
          "@type": "Question",
          "name": "What image formats are supported?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We support all common image formats including JPG, PNG, and WebP. For best results, we recommend uploading high-resolution images (at least 300x300 pixels) in JPG or PNG format."
          }
        },
        {
          "@type": "Question",
          "name": "Can I customize the t-shirt design?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Absolutely! You can choose from various grid layouts, adjust photo positions, add text, and customize colors. The platform offers multiple templates and design options to create the perfect farewell t-shirt."
          }
        }
      ]
    };

    // How-to Schema
    const howToSchema = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Create a Farewell T-Shirt Collage",
      "description": "Step-by-step guide to creating a custom farewell t-shirt collage with your classmates",
      "image": `${baseUrl}/how-to-image.png`,
      "totalTime": "PT30M",
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": "0"
      },
      "supply": [
        {
          "@type": "HowToSupply",
          "name": "Photos of all group members"
        },
        {
          "@type": "HowToSupply",
          "name": "Computer or mobile device"
        }
      ],
      "step": [
        {
          "@type": "HowToStep",
          "name": "Create Your Group",
          "text": "Set up your group with name, year, and number of members. Choose from beautiful grid templates and get a shareable link.",
          "image": `${baseUrl}/step1.png`
        },
        {
          "@type": "HowToStep",
          "name": "Upload & Vote",
          "text": "Each member uploads their photo and votes for their favorite grid layout. Democracy decides the final design!",
          "image": `${baseUrl}/step2.png`
        },
        {
          "@type": "HowToStep",
          "name": "Get Your Design",
          "text": "Watch your collage come together in real-time. Download the final design and print your custom farewell T-shirts!",
          "image": `${baseUrl}/step3.png`
        }
      ]
    };

    // Add all schemas to the page
    const schemas = [
      organizationSchema,
      webAppSchema,
      websiteSchema,
      breadcrumbSchema,
      faqSchema,
      howToSchema
    ];

    // Remove existing structured data
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => script.remove());

    // Add new structured data
    schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    // Cleanup function
    return () => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(script => script.remove());
    };
  }, [type, pageData]);

  return null;
};

export default StructuredData;
