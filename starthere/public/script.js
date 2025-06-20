const { createApp } = Vue;

createApp({
    data() {
        return {
            dogImage: '',
            dogName: 'Princess Sparkles McMuffin III',
            dogBreed: 'Royal Golden Retriever Mix',
            dogAge: 3,
            dogSize: 'Medium-Large',
            walkRate: 25,
            rating: 4.8,
            loading: false,
            error: ''
        }
    },
    mounted() {
        this.fetchNewDog();
    },
    methods: {
        async fetchNewDog() {
            this.loading = true;
            this.error = '';

            // Artificial delay to increase frustration
            await new Promise(resolve => setTimeout(resolve, 3000));

            try {
                const response = await fetch('https://dog.ceo/api/breeds/image/random');
                const data = await response.json();

                if (data.status === 'success') {
                    this.dogImage = data.message;
                    // Update with random details
                    this.updateDogDetails();
                } else {
                    this.error = 'Failed to load dog picture. Try refreshing 15 times!';
                }
            } catch (err) {
                this.error = 'Network error! Check your internet connection and try again!';
            } finally {
                this.loading = false;
            }
        },
        updateDogDetails() {
            const names = ['Fluffy McFlufferson', 'Sir Barksalot', 'Princess Wiggles', 'Mr. Snugglepaws', 'Lady Biscuitface'];
            const breeds = ['Majestic Golden Mix', 'Royal Labrador Blend', 'Premium Retriever Special', 'Deluxe Spaniel Edition'];
            const ages = [1, 2, 3, 4, 5, 6, 7];
            const sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Extra Large'];
            const rates = [15, 20, 25, 30, 35, 40];
            const ratings = [4.2, 4.5, 4.7, 4.8, 4.9, 5.0];

            this.dogName = names[Math.floor(Math.random() * names.length)];
            this.dogBreed = breeds[Math.floor(Math.random() * breeds.length)];
            this.dogAge = ages[Math.floor(Math.random() * ages.length)];
            this.dogSize = sizes[Math.floor(Math.random() * sizes.length)];
            this.walkRate = rates[Math.floor(Math.random() * rates.length)];
            this.rating = ratings[Math.floor(Math.random() * ratings.length)];
        },
        bookWalker() {
            alert('🎉 CONGRATULATIONS! 🎉\n\nYou have successfully maybe potentially possibly booked a walker!\n\nWe will contact you sometime between now and never!\n\nPlease pay $50 booking fee first!');
        },
        showContact() {
            alert('📞 CONTACT INFO 📞\n\nEmail: maybe@dogwalkers.fake\nPhone: 555-FAKE-DOG\nAddress: 123 Nowhere Street, Imaginary City\n\nWe are open:\nMondays: Closed\nTuesdays: 2:17 AM - 2:23 AM\nWednesday-Sunday: Maybe');
        },
        showRates() {
            alert('💰 OUR AMAZING RATES 💰\n\nBasic Walk: $25/hour\nPremium Walk: $50/hour\nLuxury Walk: $100/hour\nVIP Walk: $200/hour\nRoyal Walk: $500/hour\n\n⚠️ Additional fees may apply:\n- Booking fee: $20\n- Service fee: $15\n- Processing fee: $10\n- Convenience fee: $25\n- Insurance fee: $30\n- Weather fee: $40\n- Weekend fee: $50\n- Holiday fee: $75');
        },
        showReviews() {
            alert('⭐ CUSTOMER REVIEWS ⭐\n\n"Amazing service! My dog loved it!" - Anonymous\n"Best walker ever!!!" - Definitely Real Person\n"Five stars! Would recommend!" - Totally Not Fake\n"Life changing experience!" - Real Customer #4\n\n⚠️ Individual results may vary. Reviews may not reflect actual experiences.');
        },
        showSpecials() {
            alert('🎁 LIMITED TIME OFFERS 🎁\n\n🔥 TODAY ONLY: Buy 10 walks, get 1 free*\n🔥 WEEKEND SPECIAL: 50% off premium walks**\n🔥 NEW CUSTOMER: First walk free***\n\n*Terms and conditions apply\n**Premium pricing still applies\n***Booking and processing fees still required\n\nOffer expires in 3... 2... 1... EXPIRED!\nJust kidding! Offer valid until we change our minds!');
        }
    }
}).mount('#app');
