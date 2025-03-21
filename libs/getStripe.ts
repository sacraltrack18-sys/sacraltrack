import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }

  try {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe.js failed to load.');
    }
    return stripe;
  } catch (error) {
    console.error('Error loading Stripe.js:', error);
    throw error; // Rethrow the error for further handling
  }
}

export default getStripe; 