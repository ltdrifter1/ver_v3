// server.js
import express from "express";
import Stripe from "stripe";

const app = express();
app.use(express.json());

// put your own secret key in an env var in production
const stripe = new Stripe("sk_test_REDACTED");

app.post("/create-checkout-session", async (req, res) => {
  try{
    const { items, email } = req.body;

    const line_items = (items || []).map(it => ({
      price_data: {
        currency: "usd",
        product_data: { name: it.name, images: it.image ? [it.image] : [] },
        unit_amount: Math.round((it.unitAmount || 0) * 100),
      },
      quantity: it.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email: email || undefined,
      success_url: "https://yourdomain.com/thank-you.html",
      cancel_url: "https://yourdomain.com/checkout.html",
      // automatic_tax: { enabled: true }, // enable if using Stripe Tax
      // shipping_address_collection: { allowed_countries: ['US','CA'] },
    });

    res.json({ url: session.url });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: "Unable to create checkout session" });
  }
});

app.listen(3000, () => console.log("Server on http://localhost:3000"));
