tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        heading: ['Orbitron', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            gold: '#F59E0B',
                            amber: '#D97706',
                            dark: '#0B0B0E',
                            card: '#141419',
                            cardHover: '#1A1A22',
                            glow: '#FBBF24',
                        }
                    },
                    boxShadow: {
                        'neon-gold': '0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(245, 158, 11, 0.1)',
                        'neon-hover': '0 0 30px rgba(251, 191, 36, 0.7), 0 0 60px rgba(245, 158, 11, 0.3)',
                        'card-glow': '0 10px 30px -10px rgba(245, 158, 11, 0.2)',
                    }
                }
            }
        }
    