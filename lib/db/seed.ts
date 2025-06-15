import { stripe } from '../payments/stripe';

// Note: User creation has been removed from this seed script.
// With Firebase Authentication, users should be created through the
// application's sign-up flow to ensure they are registered with
// the authentication provider. This script now only handles
// setting up other initial data, like Stripe products.

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  try {
    // It's good practice to check if products exist before creating them
    const existingProducts = await stripe.products.list({ limit: 10, active: true });
    
    const hasPlus = existingProducts.data.some(p => p.name === 'Plus');
    const hasPro = existingProducts.data.some(p => p.name === 'Pro');

    if (!hasPlus) {
        const plusProduct = await stripe.products.create({
            id: 'prod_plus_plan', // Use a static ID for consistency
            name: 'Plus',
            description: 'Plus subscription plan',
        });
        await stripe.prices.create({
            product: plusProduct.id,
            unit_amount: 799, // $7.99 in cents
            currency: 'usd',
            recurring: { interval: 'month' },
        });
        console.log('Created "Plus" product and price.');
    } else {
        console.log('"Plus" product already exists.');
    }

    if (!hasPro) {
        const proProduct = await stripe.products.create({
            id: 'prod_pro_plan', // Use a static ID for consistency
            name: 'Pro',
            description: 'Pro subscription plan',
        });
        await stripe.prices.create({
            product: proProduct.id,
            unit_amount: 3999, // $39.99 in cents
            currency: 'usd',
            recurring: { interval: 'month' },
        });
        console.log('Created "Pro" product and price.');
    } else {
        console.log('"Pro" product already exists.');
    }

    console.log('Stripe product setup checked/completed successfully.');

  } catch (error) {
    console.error('Error creating Stripe products:', error);
    // Throw the error to ensure the seed process fails loudly
    throw error;
  }
}

async function seed() {
  console.log('Starting seed process...');
  await createStripeProducts();
  console.log('Seed process finished.');
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });